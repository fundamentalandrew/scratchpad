# Implementation Plan — Core Infrastructure

## 1. Project Overview

We are building the foundational layer of an AI Code Review Agent ("Macro-Reviewer") — a TypeScript CLI tool that uses a multi-agent pipeline with the Claude API to identify the most critical files in a pull request or repository that need human attention.

This split (01-core-infrastructure) provides everything the subsequent agent splits depend on: CLI framework, agent orchestration engine, configuration system, shared types, and API client wrappers for Claude and GitHub.

### What This Produces

- A runnable CLI with three commands: `review-pr`, `review-repo`, `init`
- A typed sequential pipeline runner that executes agents in order
- Configuration loading with directory-tree discovery
- Claude API client wrapper with structured output via Zod
- GitHub API client wrapper with auth resolution, throttling, and pagination
- All shared TypeScript types and Zod schemas for agent contracts

### Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| CLI framework | Commander.js | Zero deps, 180KB, sufficient for 3 commands |
| LLM provider | Claude (Anthropic) only | Single-provider simplicity |
| Structured output | `output_config.format` + Zod | GA feature, cleaner than tool_use hack |
| GitHub client | Octokit + throttling + retry plugins | Official SDK, built-in pagination |
| Pipeline architecture | Hardcoded 4-stage sequential | Fixed stages, no plugin system needed |
| Error strategy | Retry 3x with backoff, then halt | No partial/degraded results |
| Streaming | Batch only | Simpler; structured output needs complete response |
| Config discovery | Walk up directory tree | Familiar pattern (eslint/prettier) |
| Test framework | Vitest | Fast, native TS/ESM, Jest-compatible API |
| Module system | ESM | Modern standard, Node >= 20 |

---

## 2. Project Setup & Tooling

### Directory Structure

```
src/
  index.ts                  # CLI entry point
  config/
    schema.ts               # Zod config schema + defaults
    loader.ts               # Config discovery + loading + merging
  pipeline/
    runner.ts               # Sequential pipeline executor
    types.ts                # Agent interface, pipeline types
  agents/
    types.ts                # All agent I/O contract types
    schemas.ts              # Zod schemas for all contracts
  clients/
    claude.ts               # Claude API wrapper
    github.ts               # GitHub API wrapper
  types/
    common.ts               # FileScore, Recommendation, RiskLevel, ReviewMode
  commands/
    review-pr.ts            # review-pr command handler
    review-repo.ts          # review-repo command handler
    init.ts                 # init command handler
  utils/
    url-parser.ts           # GitHub URL parsing + validation
    logger.ts               # Verbose-aware logging utility
    redact.ts               # Secret redaction for logs/errors
```

### Package Configuration

Initialize with `npm init`. Configure `package.json` with:
- `"type": "module"` for ESM
- `"bin"` entry pointing to compiled CLI entry point
- `"engines": { "node": ">=20" }`
- Build script using `tsc`

### TypeScript Configuration

Enable strict mode. Target ES2022 (Node 20 compatible). Module resolution: `"bundler"` or `"node16"`. Output to `dist/`.

**ESM + shebang note**: The CLI entry point needs `#!/usr/bin/env node` as its first line. `tsc` preserves shebangs in output. Verify that `dist/index.js` retains the shebang and that `package.json` `"bin"` points to `dist/index.js`. Add a `dev` script using `tsx` for development iteration without compilation.

### Dependencies

**Runtime:**
- `commander` — CLI framework
- `@anthropic-ai/sdk` — Claude API
- `@octokit/rest` — GitHub API
- `@octokit/plugin-throttling` — Rate limit handling
- `@octokit/plugin-retry` — Auto retry
- `zod` — Schema validation
- `chalk` — Terminal colors
- `picomatch` — Glob pattern matching for ignore patterns

**Dev:**
- `typescript`
- `vitest`
- `@types/node`

---

## 3. Shared Types & Zod Schemas

This is the foundation everything else depends on. Define types first, then build on them.

### Common Types (`src/types/common.ts`)

Define these base types:

```typescript
type ReviewMode = "pr" | "repo";
type RiskLevel = "critical" | "high" | "medium" | "low";

interface FileScore {
  path: string;
  score: number;          // 0-10
  riskLevel: RiskLevel;
  reasons: string[];
}

interface Recommendation {
  file: string;
  line?: number;
  severity: RiskLevel;
  category: string;       // "security", "performance", "logic", etc.
  message: string;
  suggestion?: string;
}
```

### Agent Contract Types (`src/agents/types.ts`)

Define the input/output shapes for each pipeline stage:

**ContextOutput** — produced by the Context Agent:
- `mode`: ReviewMode
- `repository`: owner, repo, defaultBranch
- `pr?`: number, title, description, author, baseBranch, headBranch, files array, diff (full unified diff string)
  - PR files shape: `{ path, status, additions, deletions, patch?: string | null }` — note `patch` can be null/truncated for large diffs or binary files; `getPRDiff` is the authoritative diff source
- `repoFiles?`: array of `{ path: string }` — only present in repo mode
- `domainRules`: string or null (contents of DOMAIN_RULES.md)
- `architectureDoc`: string or null (contents of ARCHITECTURE.md)

**Note:** PR mode uses `pr.files` for the file list; repo mode uses `repoFiles`. There is no overloaded `files` field.

**AnalysisOutput** — produced by the Analysis Agent:
- `scoredFiles`: FileScore array (all files with scores)
- `criticalFiles`: FileScore array (files above threshold)
- `summary`: totalFiles, criticalCount, highCount, categories record

**ReviewOutput** — produced by the Review Agent:
- `recommendations`: Recommendation array
- `coreDecision`: string (high-level summary)
- `focusAreas`: string array (top areas needing human review)

### Zod Schemas (`src/agents/schemas.ts`)

Create Zod schemas corresponding to each type above. These serve dual purpose:
1. Runtime validation of LLM output at pipeline stage boundaries
2. JSON Schema generation for Claude's `output_config.format`

Use `z.infer<typeof Schema>` to derive TypeScript types from the Zod schemas, ensuring types and validation stay in sync. Export both the schemas and the inferred types.

---

## 4. Configuration System

### Config Schema (`src/config/schema.ts`)

Define a Zod schema for the configuration:

```typescript
interface CodeReviewConfig {
  ignorePatterns: string[];        // default: common non-code patterns
  criticalThreshold: number;       // default: 8
  domainRulesPath: string;         // default: "./DOMAIN_RULES.md"
  architecturePath: string;        // default: "./ARCHITECTURE.md"
  apiKey?: string;                 // Claude API key
  githubToken?: string;            // GitHub token
  model: string;                   // default: "claude-sonnet-4-5-20250514"
  maxRetries: number;              // default: 3
  output: {
    console: boolean;              // default: true
    markdown: boolean;             // default: false
    markdownPath: string;          // default: "./code-review-report.md"
    githubComment: boolean;        // default: false
  };
}
```

Define sensible defaults for `ignorePatterns`: `["node_modules/**", "dist/**", "build/**", "coverage/**", ".next/**", "vendor/**", "*.lock", "*.min.*", ".git/**", "*.png", "*.jpg", "*.svg", "*.gif", "*.ico", "*.woff", "*.woff2", ".turbo/**", ".pnpm-store/**"]`.

Use **picomatch** as the glob matching engine for ignore patterns. Document that patterns follow picomatch semantics (not gitignore). Add `picomatch` to runtime dependencies.

### Config Loader (`src/config/loader.ts`)

Implement a `loadConfig` function that:

1. **Discovers** `.codereview.json` by walking up from CWD, stopping at the **git repository root** (directory containing `.git`), not the filesystem root. This prevents accidentally picking up an unrelated config from a parent monorepo. If `--config` is provided, skip discovery entirely.
2. **Parses** the JSON file with error handling for malformed JSON.
3. **Merges** in priority order: hardcoded defaults ← config file ← environment variables ← CLI flags.
4. **Validates** the merged config against the Zod schema. On validation failure, print which fields are invalid and what's expected.

Environment variable mapping:
- `ANTHROPIC_API_KEY` → `apiKey`
- `GITHUB_TOKEN` → `githubToken`

The `--config <path>` CLI flag bypasses discovery and loads from the specified path directly.

---

## 5. CLI Entry Point & Commands

### Entry Point (`src/index.ts`)

Set up Commander.js program with:
- Program name, description, version (from package.json)
- Global flags: `--verbose`, `--config <path>`
- Register three commands: `review-pr`, `review-repo`, `init`
- Add shebang (`#!/usr/bin/env node`) for direct execution

### URL Parser (`src/utils/url-parser.ts`)

Parse GitHub URLs using `new URL()` (not regex) for robustness:
1. Parse with `new URL(input)` — handles edge cases (trailing slashes, query params, fragments)
2. Validate hostname is `github.com` (no GitHub Enterprise support initially)
3. Strip trailing slashes, ignore search/hash
4. Extract path segments to get owner/repo/pull number

For PR URLs: return `{ owner: string, repo: string, number: number }`. For repo URLs: return `{ owner: string, repo: string }`. Throw `URLParseError` with a descriptive message showing the expected format.

### `review-pr` Command (`src/commands/review-pr.ts`)

1. Parse the GitHub PR URL argument
2. Load configuration (merge with CLI flags)
3. Validate that required credentials exist (Claude API key, GitHub token)
4. Construct the initial pipeline input with mode `"pr"` and parsed URL data
5. Create pipeline stages (stub agents for now — actual agents come in later splits)
6. Execute the pipeline via the runner
7. Handle and display results or errors

### `review-repo` Command (`src/commands/review-repo.ts`)

Same flow as `review-pr` but with mode `"repo"` and a repo URL. Uses `git ls-files` (via GitHub tree API) as the starting file set, filtered by ignore patterns.

### `init` Command (`src/commands/init.ts`)

1. Check if `DOMAIN_RULES.md` exists in CWD — if not, write a starter template
2. Check if `ARCHITECTURE.md` exists in CWD — if not, write a starter template
3. Print which files were created vs skipped
4. Templates should have clear section headers and placeholder comments guiding the user on what to fill in

---

## 6. Logger Utility

### Design (`src/utils/logger.ts`)

A simple logging utility that respects the `--verbose` flag:

- `logger.info(msg)` — always prints (normal output)
- `logger.verbose(msg)` — only prints when verbose mode is on
- `logger.error(msg)` — always prints to stderr, with red coloring via chalk
- `logger.success(msg)` — always prints, with green coloring
- `logger.warn(msg)` — always prints, with yellow coloring

Use a **factory function** `createLogger(options: { verbose: boolean })` that returns a logger instance. Pass the logger through the pipeline and into clients via dependency injection rather than using a mutable global singleton — this makes testing straightforward and avoids shared state issues with Vitest parallelism.

The CLI entry point creates the logger once and threads it through to pipeline runner, clients, and commands.

---

## 7. Claude API Client

### Design (`src/clients/claude.ts`)

A thin wrapper around `@anthropic-ai/sdk` providing:

**Constructor**: Takes `apiKey` (string), optional `model` (default: `claude-sonnet-4-5-20250514`), optional `maxRetries` (default: 3).

**`query<T>(options)` method**: The primary interface. Accepts:
- `messages`: Array of message objects (role + content)
- `schema`: A Zod schema defining the expected response shape
- `systemPrompt?`: Optional system prompt string
- `maxTokens?`: Max response tokens (default: 4096)

Behavior:
1. Convert the Zod schema to JSON Schema (use `zod-to-json-schema` or Zod's built-in `.toJSONSchema()`)
2. Call `client.messages.create()` with `output_config.format` set to the JSON Schema
3. Check `stop_reason` — if `"refusal"`, throw a `ClaudeAPIError` with the refusal reason
4. Extract text from the response content blocks (iterate `content`, find blocks with `type: "text"`, join their text). Do **not** blindly access `content[0].text` — the response may have multiple blocks.
5. Parse the extracted text with `JSON.parse`
6. Validate against the Zod schema with `.safeParse()`
7. Return `{ data: T, usage: { inputTokens, outputTokens } }`

**Retry strategy — single layer only**: The Anthropic SDK already handles network/transient retries internally. The Claude client wrapper does **not** add its own retry logic. Retries for agent-level failures happen in the pipeline runner only. This avoids multiplicative retry stacking (SDK retries × wrapper retries × runner retries).

**Error classification** for the pipeline runner's benefit:
- Zod validation failures → throw `ClaudeAPIError` with `retryable: true` (LLM may produce valid output on next attempt)
- Refusals → throw with `retryable: false` (retrying won't help)
- SDK errors (rate limit, network) → already handled by SDK internally

**Other responsibilities**:
- Track cumulative token usage across calls within a pipeline run
- Log API calls in verbose mode (model, token counts, duration) — **redact any secrets** in logged payloads
- Accept a `Logger` instance via constructor (dependency injection)

---

## 8. GitHub API Client

### Design (`src/clients/github.ts`)

**Authentication resolution** — implement as a function `resolveGitHubToken(config)`:
1. Check `GITHUB_TOKEN` env var
2. If not set, try `gh auth token` via `child_process.execSync`:
   - Wrap in try/catch for when `gh` isn't installed
   - Set `stdio: ['ignore', 'pipe', 'ignore']` to suppress stderr
   - Set a 5-second timeout to avoid hanging in sandboxed CI environments
   - Trim whitespace from output
3. If not set, check `config.githubToken` (warn if token is in config file — users may accidentally commit it)
4. If none found, throw with message: "No GitHub authentication found. Set GITHUB_TOKEN env var, install gh CLI, or add githubToken to .codereview.json"

**Octokit setup**: Create Octokit instance with throttling and retry plugins:
```typescript
const MyOctokit = Octokit.plugin(throttling, retry);
```

Configure throttle handlers to log rate limit events and auto-retry up to 2 times.

**Methods to implement:**

`getPR(owner, repo, number)` → Returns PR metadata (title, description, author, state, base/head branches). Maps Octokit response to a clean typed object.

`getPRFiles(owner, repo, number)` → Returns all changed files using `octokit.paginate()` with `per_page: 100`. Maps to array of `{ path, status, additions, deletions, patch?: string | null }`. Note: `patch` may be null for binary files or truncated for very large diffs — consumers should not rely on it as the sole diff source.

`getPRDiff(owner, repo, number)` → Fetches unified diff as string using `mediaType: { format: "diff" }`.

`postPRComment(owner, repo, number, body)` → Posts a comment on the PR. Used by the Output Agent in a later split.

`getRepoTree(owner, repo, branch?)` → Fetches the repo file tree via the Git Trees API (`recursive: true`). Returns array of file paths. This is the `review-repo` equivalent of `git ls-files`. **Important**: Check for `truncated: true` in the API response — large repos may have incomplete tree listings. If truncated, log a warning with the count of files returned and advise the user that results may be incomplete.

Each method should:
- Return cleanly typed objects (not raw Octokit responses)
- Log the API call in verbose mode
- Let Octokit plugins handle rate limiting and retries

---

## 9. Agent Orchestration Pipeline

### Agent Interface (`src/pipeline/types.ts`)

```typescript
interface Agent<TInput, TOutput> {
  name: string;
  idempotent: boolean;    // whether this agent can be safely retried
  run(input: TInput): Promise<TOutput>;
}
```

The `idempotent` flag controls retry behavior: agents that produce side effects (e.g., Output Agent posting PR comments) should set `idempotent: false` so the pipeline runner does not auto-retry them. Pure analysis agents set `idempotent: true`.

Also define:
- `PipelineResult<T>`: Wraps the final output with metadata (total duration, per-stage timing, token usage)
- `StageResult<T>`: Per-stage result with success/error status, duration, and data

### Pipeline Runner (`src/pipeline/runner.ts`)

Implement `runPipeline(agents, initialInput, options)`:

1. Accept an ordered array of agents and the initial input
2. For each agent:
   a. Log "Running {agent.name}..."
   b. Attempt `agent.run(input)`
   c. On failure: if `agent.idempotent`, retry up to `maxRetries` times with exponential backoff (1s, 2s, 4s). If not idempotent, fail immediately without retrying.
   d. On success: validate output if a Zod schema is provided, store timing
   e. On final failure: halt with error identifying the agent, attempt number, and error message
3. Pass each agent's output as the next agent's input
4. Return `PipelineResult` with the final output and all stage metadata

The runner itself is generic — it doesn't know about specific agent types. It just chains `Agent<any, any>` instances. Type safety comes from how the agents are composed at the call site.

### Stub Agents

For this split, create **stub/placeholder agents** that return hardcoded data matching the contract types. This allows end-to-end testing of the pipeline, CLI, and configuration without the actual LLM logic (which comes in splits 02-05).

Each stub should:
- Log that it's a stub (verbose mode)
- Return valid typed output matching its contract
- Simulate a small delay (100ms) to test pipeline timing

---

## 10. Init Command Templates

### DOMAIN_RULES.md Template

```markdown
# Domain Rules

## Business Rules
<!-- Describe key business rules that reviewers should be aware of -->

## Naming Conventions
<!-- Document naming patterns specific to this project -->

## Review Criteria
<!-- List domain-specific things to watch for in code reviews -->
```

### ARCHITECTURE.md Template

```markdown
# Architecture

## System Overview
<!-- High-level description of the system architecture -->

## Key Patterns
<!-- Document architectural patterns used in this project -->

## Architectural Decisions
<!-- List key decisions and their rationale -->
```

---

## 11. Error Handling Strategy

### Error Types

Define a small hierarchy of domain errors:

- `ConfigError` — invalid config, missing required values
- `AuthError` — missing API keys or tokens
- `PipelineError` — agent failure after retries exhausted (includes agent name, attempt count, original error)
- `GitHubAPIError` — GitHub API failures (wraps Octokit errors with context)
- `ClaudeAPIError` — Claude API failures (wraps SDK errors with context)
- `URLParseError` — invalid GitHub URL format

Each error type should have a user-friendly message and, in verbose mode, include the full error chain.

### Secret Redaction

Add a `redactSecrets(text: string): string` utility in `src/utils/redact.ts` that strips common secret patterns (API keys, tokens, Authorization headers) from log output and error messages. Use this in the logger's verbose output and in error stack traces to prevent accidental secret leakage.

### Top-Level Error Handler

In the CLI entry point, wrap command execution in a try/catch that:
1. Catches known error types and prints formatted, actionable messages
2. Catches unknown errors and prints the full stack trace
3. Sets appropriate exit codes (1 for errors)

---

## 12. Implementation Order

Build in dependency order, each step producing a testable increment:

1. **Project setup** — package.json, tsconfig, vitest config, directory structure
2. **Shared types & Zod schemas** — common.ts, agents/types.ts, agents/schemas.ts
3. **Logger utility** — logger.ts (needed by everything else)
4. **Config schema & loader** — schema.ts, loader.ts
5. **URL parser** — url-parser.ts
6. **Error types** — define the error hierarchy
7. **Claude API client** — claude.ts
8. **GitHub API client** — github.ts
9. **Pipeline types & runner** — types.ts, runner.ts
10. **Stub agents** — placeholder agents for testing
11. **CLI entry point & commands** — index.ts, review-pr.ts, review-repo.ts, init.ts
12. **End-to-end integration** — wire everything together, test full flow with stubs
