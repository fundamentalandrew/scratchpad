# Core Infrastructure — Complete Specification

## Overview

Build the foundational layer of the AI Code Review Agent ("Macro-Reviewer"): a TypeScript CLI tool that uses a multi-agent architecture with the Claude API to distill large PRs or entire repos down to the critical files requiring human attention.

This split (01) provides the CLI framework, agent orchestration engine, configuration system, shared TypeScript types, and API client wrappers that all subsequent splits depend on.

---

## 1. CLI Entry Point

### Commands

| Command | Signature | Description |
|---|---|---|
| `review-pr` | `review-pr <github-pr-url>` | Review a specific pull request |
| `review-repo` | `review-repo <github-repo-url>` | Full audit of an entire repository |
| `init` | `init` | Scaffold starter `DOMAIN_RULES.md` and `ARCHITECTURE.md` in CWD |

### Input Parsing

- `review-pr` accepts **only standard GitHub PR URLs**: `https://github.com/{owner}/{repo}/pull/{number}`
- Parse owner, repo, and PR number from the URL using regex
- Reject malformed URLs with a clear error message
- `review-repo` accepts GitHub repo URLs: `https://github.com/{owner}/{repo}`

### Global Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--help` | boolean | — | Show help text |
| `--version` | boolean | — | Show version from package.json |
| `--verbose` | boolean | false | Enable verbose logging |
| `--config <path>` | string | auto-discover | Override config file path |

### Framework

Use **Commander.js** — zero dependencies, minimal overhead, sufficient subcommand support for 3 commands. Types are bundled.

---

## 2. Configuration System

### File Format & Discovery

- Config file: `.codereview.json`
- **Discovery**: Walk up directory tree from CWD, like eslint/prettier. First `.codereview.json` found wins.
- `--config <path>` flag overrides auto-discovery
- All config values have sensible defaults; config file is optional

### Schema

```
{
  "ignorePatterns": string[],       // glob patterns for files to skip
  "criticalThreshold": number,       // score threshold for "critical" (default: 8)
  "domainRulesPath": string,         // path to DOMAIN_RULES.md (default: "./DOMAIN_RULES.md")
  "architecturePath": string,        // path to ARCHITECTURE.md (default: "./ARCHITECTURE.md")
  "apiKey": string,                  // Claude API key (prefer ANTHROPIC_API_KEY env var)
  "githubToken": string,             // GitHub token (prefer GITHUB_TOKEN env var or gh CLI)
  "output": {
    "console": boolean,              // terminal output (default: true)
    "markdown": boolean,             // write .md report (default: false)
    "markdownPath": string,          // report file path (default: "./code-review-report.md")
    "githubComment": boolean         // post as PR comment (default: false)
  }
}
```

### Environment Variables

| Variable | Purpose | Priority |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API authentication | Higher than config file |
| `GITHUB_TOKEN` | GitHub API authentication | Higher than config file |

If `GITHUB_TOKEN` is not set and `gh` CLI is installed, attempt `gh auth token` to obtain a token.

### Validation

Use Zod to validate the loaded config at startup. Provide clear error messages for invalid values. Merge: defaults ← config file ← env vars ← CLI flags.

---

## 3. Agent Orchestration Engine

### Pipeline Architecture

Fixed 4-stage sequential pipeline (not configurable):

```
Context Agent → Analysis Agent → Review Agent → Output Agent
```

Each agent consumes the typed output of the previous agent.

### Agent Interface

```typescript
interface Agent<TInput, TOutput> {
  name: string;
  run(input: TInput): Promise<TOutput>;
}
```

### Pipeline Runner

The pipeline runner:
1. Accepts a `ReviewMode` (PR or Repo) and initial input
2. Executes agents sequentially, passing output → input
3. On failure: retries the failed agent up to 3 times with exponential backoff (1s, 2s, 4s)
4. After max retries: halts with a clear error message identifying which agent failed and why
5. Logs timing for each stage (always in verbose mode, summary in normal mode)

### Error Handling

- **API errors** (rate limits, network): Retry with backoff
- **Malformed output** (Zod validation failure): Retry (LLM may produce valid output on next attempt)
- **After max retries**: Halt. Print which agent failed, the error, and any partial context that might help debugging
- No partial/degraded results — the pipeline either completes fully or fails clearly

---

## 4. Shared Types & Contracts

### Review Mode

```typescript
type ReviewMode = "pr" | "repo";
```

### Risk Levels

```typescript
type RiskLevel = "critical" | "high" | "medium" | "low";
```

### Core Types

```typescript
interface FileScore {
  path: string;
  score: number;          // 0-10
  riskLevel: RiskLevel;
  reasons: string[];      // why this file scored high
}

interface Recommendation {
  file: string;
  line?: number;
  severity: RiskLevel;
  category: string;       // e.g., "security", "performance", "logic"
  message: string;
  suggestion?: string;    // optional suggested fix
}
```

### Agent Contract Types

```typescript
// Context Agent output (Agent A)
interface ContextOutput {
  mode: ReviewMode;
  repository: {
    owner: string;
    repo: string;
    defaultBranch: string;
  };
  pr?: {
    number: number;
    title: string;
    description: string;
    author: string;
    baseBranch: string;
    headBranch: string;
    files: PRFileInfo[];
    diff: string;
  };
  domainRules: string | null;       // contents of DOMAIN_RULES.md or null
  architectureDoc: string | null;   // contents of ARCHITECTURE.md or null
  files: FileInfo[];                // all files to review
}

// Analysis Agent output (Agent B)
interface AnalysisOutput {
  scoredFiles: FileScore[];
  criticalFiles: FileScore[];       // files above criticalThreshold
  summary: {
    totalFiles: number;
    criticalCount: number;
    highCount: number;
    categories: Record<string, number>;
  };
}

// Review Agent output (Agent C)
interface ReviewOutput {
  recommendations: Recommendation[];
  coreDecision: string;             // high-level summary of what needs attention
  focusAreas: string[];             // top areas requiring human review
}
```

All contract types will have corresponding Zod schemas for runtime validation at pipeline boundaries.

---

## 5. Claude API Client

### Wrapper Design

A thin wrapper around `@anthropic-ai/sdk` that provides:

1. **Structured output via `output_config.format`** — pass a Zod schema, get validated typed output
2. **Retry logic** — exponential backoff for rate limits and transient errors
3. **Token counting** — track usage per agent for cost awareness
4. **Consistent error handling** — wrap SDK errors in domain-specific error types

### Key Decisions

- **Batch only** — no streaming. Wait for complete response, then parse.
- **Model**: Default to `claude-sonnet-4-5-20250514` (configurable)
- **Structured output pattern**: Use `output_config.format` with JSON Schema generated from Zod schemas
- **Max tokens**: Set generously per agent to avoid truncated JSON

### Interface

```typescript
interface ClaudeClientOptions {
  apiKey: string;
  model?: string;
  maxRetries?: number;
}

interface ClaudeClient {
  query<T>(options: {
    messages: Message[];
    schema: ZodSchema<T>;
    systemPrompt?: string;
    maxTokens?: number;
  }): Promise<{ data: T; usage: TokenUsage }>;
}
```

---

## 6. GitHub API Client

### Wrapper Design

A wrapper around `@octokit/rest` with throttling and retry plugins.

### Authentication Resolution Order

1. `GITHUB_TOKEN` environment variable
2. `gh auth token` CLI command (if `gh` is installed)
3. Config file `githubToken` value
4. Error: "No GitHub authentication found"

### Capabilities

| Method | Purpose | Used By |
|---|---|---|
| `getPR(owner, repo, number)` | Fetch PR metadata | Context Agent |
| `getPRFiles(owner, repo, number)` | List changed files (paginated, per_page: 100) | Context Agent |
| `getPRDiff(owner, repo, number)` | Get unified diff string | Context Agent |
| `postPRComment(owner, repo, number, body)` | Post review comment | Output Agent |
| `getRepoFiles(owner, repo)` | List tracked files (`git ls-files` equivalent via tree API) | Context Agent |

### Rate Limiting

Use `@octokit/plugin-throttling` and `@octokit/plugin-retry`:
- Auto-retry on rate limit (up to 2 retries)
- Handle secondary rate limits
- Always use `per_page: 100` for pagination

---

## 7. `init` Command

Scaffolds two files in the current working directory:

- `DOMAIN_RULES.md` — starter template with sections for business rules, naming conventions, and domain-specific review criteria
- `ARCHITECTURE.md` — starter template with sections for system overview, key patterns, and architectural decisions

Skip files that already exist (don't overwrite). Print which files were created/skipped.

---

## 8. Project Structure

```
src/
  index.ts              # CLI entry point (Commander.js setup)
  config/
    schema.ts           # Zod config schema + defaults
    loader.ts           # Config file discovery + loading + merging
  pipeline/
    runner.ts           # Sequential pipeline executor with retry
    types.ts            # Agent interface, pipeline types
  agents/
    types.ts            # All agent contract types (ContextOutput, etc.)
    schemas.ts          # Zod schemas for all contracts
  clients/
    claude.ts           # Claude API wrapper
    github.ts           # GitHub API wrapper
  types/
    common.ts           # FileScore, Recommendation, RiskLevel, ReviewMode
  commands/
    review-pr.ts        # review-pr command handler
    review-repo.ts      # review-repo command handler
    init.ts             # init command handler
  utils/
    url-parser.ts       # GitHub URL parsing
    logger.ts           # Verbose-aware logging
```

---

## 9. Dependencies

| Package | Purpose |
|---|---|
| `commander` | CLI framework |
| `@anthropic-ai/sdk` | Claude API client |
| `@octokit/rest` | GitHub API client |
| `@octokit/plugin-throttling` | Rate limit handling |
| `@octokit/plugin-retry` | Retry on failure |
| `zod` | Schema validation |
| `chalk` | Terminal colors (for console output) |
| `typescript` | TypeScript compiler (dev) |
| `vitest` | Test framework (dev) |

---

## 10. Non-Functional Requirements

- **TypeScript strict mode** enabled
- **ESM modules** (not CommonJS)
- **Node.js >= 20** (for native fetch, stable ESM)
- **No streaming** — batch responses only
- **Error messages** should be actionable (tell user what to do next)
- **Verbose mode** logs: agent timing, token usage, API calls, config resolution
