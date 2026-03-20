# Research Findings for 02-Context Agent

## Part 1: Codebase Analysis

### Project Structure

The project is a monorepo with 5 major sections:

```
/code-review/
├── 01-core-infrastructure/      # CLI framework, agent orchestration, types
├── 02-context-agent/            # PR/repo metadata fetching (Agent A)
├── 03-analysis-agent/           # AST analysis + scoring (Agent B)
├── 04-review-agent/             # Principal Engineer synthesis (Agent C)
├── 05-interactive-output/       # Terminal UI + GitHub posting
├── BRIEF.md                     # High-level design rationale
├── project-manifest.md          # Dependency graph and execution order
└── deep_project_interview.md    # Design decisions and platform choices
```

**Core Concept:** A "Macro-Reviewer" CLI tool that distills large PRs (100+ files) down to the 5-10 critical files requiring human review. Uses a multi-agent architecture with Claude API, Tree-sitter AST analysis, and structured JSON message passing.

### Execution Model

Sequential Multi-Agent Pipeline:
- **Agent A (Context Agent):** Fetches PR metadata, repo structure, domain rules
- **Agent B (Analysis Agent):** Performs deterministic noise reduction (AST) + LLM-based impact scoring
- **Agent C (Review Agent):** Synthesizes recommendations and identifies core architectural decisions
- **Agent D (Output Agent):** Interactive terminal UI and GitHub posting

Data flows through structured JSON contracts:
```
input → Agent A (ContextOutput) → Agent B (AnalysisOutput) → Agent C (ReviewOutput) → Agent D
```

### Core Infrastructure (01-core-infrastructure)

**Directory Structure:**
```
src/
├── agents/              # Agent contracts and stubs
├── clients/             # GitHub and Claude API clients
├── commands/            # CLI command handlers (review-pr, review-repo, init)
├── config/              # Configuration schema and loading
├── pipeline/            # Agent orchestration engine
├── types/               # Shared TypeScript types
└── utils/               # Logging, error handling, URL parsing
```

#### Agent Interface (`agents/types.ts`)
```typescript
interface Agent<TInput, TOutput> {
  name: string;
  idempotent: boolean;
  run(input: TInput): Promise<TOutput>;
}
```

#### Output Schemas (`agents/schemas.ts`)
Zod schemas define three core output contracts:
- **ContextOutput:** PR/repo metadata, files, domain rules
- **AnalysisOutput:** Scored files, critical/high/low risk categories, summaries
- **ReviewOutput:** Recommendations, core decisions, focus areas

#### GitHub API Client (`clients/github.ts`)
Wraps Octokit with throttling and retry plugins:
- `getPR(owner, repo, number)` → PR title, description, author, branches
- `getPRFiles(owner, repo, number)` → List of changed files with patches
- `getPRDiff(owner, repo, number)` → Full unified diff
- `getRepoTree(owner, repo, branch?)` → File listing with truncation warning
- `postPRComment(owner, repo, number, body)` → Post comment to PR
- Token resolution from env vars, gh CLI, or config file

#### Claude API Client (`clients/claude.ts`)
- Uses `@anthropic-ai/sdk` with structured output (JSON Schema)
- Zod integration for validation and schema generation
- Token tracking across calls
- Default model: `claude-sonnet-4-5-20250514`

#### Configuration System (`config/schema.ts`, `config/loader.ts`)
```typescript
{
  ignorePatterns: string[]           // Default: node_modules/**, dist/**, *.lock, etc.
  criticalThreshold: number          // 0-10, default 8
  domainRulesPath: string            // Default: ./DOMAIN_RULES.md
  architecturePath: string           // Default: ./ARCHITECTURE.md
  apiKey: string?                    // Anthropic API key
  githubToken: string?               // GitHub token
  model: string                      // Default: claude-sonnet-4-5-20250514
  maxRetries: number                 // Default: 3
  output: { console, markdown, markdownPath, githubComment }
}
```
Priority: defaults < file config < env vars < CLI flags. Config file: `.codereview.json` searched up from git root.

#### Pipeline Runner (`pipeline/runner.ts`)
- Executes agents in order, output → next input
- Retry logic with exponential backoff (1s, 2s, 4s...)
- Records stage results with timing and attempt counts

#### Type System (`types/common.ts`)
```typescript
type RiskLevel = "critical" | "high" | "medium" | "low";
interface FileScore { path: string; score: number; riskLevel: RiskLevel; reasons: string[]; }
interface Recommendation { file: string; line?: number; severity: RiskLevel; category: string; message: string; suggestion?: string; }
```

#### Error Types (`utils/errors.ts`)
- `ConfigError`, `AuthError`, `PipelineError`, `GitHubAPIError`, `ClaudeAPIError`, `URLParseError`
- Custom classes with `Object.setPrototypeOf()` for proper instanceof checks
- AuthError includes remediation guidance

#### Utilities
- **Logger** (`utils/logger.ts`): info/verbose/error/warn/success methods
- **URL Parser** (`utils/url-parser.ts`): Parses `github.com/owner/repo/pull/123` and `github.com/owner/repo`
- **Redact** (`utils/redact.ts`): Redacts secrets from logs

#### Agent Stubs (`agents/stubs.ts`)
Test doubles returning synthetic valid output: `StubContextAgent`, `StubAnalysisAgent`, `StubReviewAgent`, `StubOutputAgent`

### Input/Output Contracts for Context Agent

**Input:**
```typescript
{
  mode: "pr" | "repo";
  owner: string;
  repo: string;
  number?: number;        // Only for PR mode
  githubToken: string;
  apiKey: string;
  config: CodeReviewConfig;
}
```

**Output (ContextOutput):**
```typescript
{
  mode: "pr" | "repo";
  repository: { owner: string; repo: string; defaultBranch: string; };
  pr?: {
    number: number; title: string; description: string; author: string;
    baseBranch: string; headBranch: string;
    files: Array<{ path: string; status: string; additions: number; deletions: number; patch?: string; }>;
    diff: string;
  };
  repoFiles?: Array<{ path: string; }>;
  domainRules: string | null;
  architectureDoc: string | null;
}
```

### Dependencies (package.json)

**Runtime:**
- `@octokit/rest@^22.0.1`, `@octokit/plugin-throttling@^11.0.3`, `@octokit/plugin-retry@^8.1.0`
- `@anthropic-ai/sdk@^0.80.0`
- `zod@^4.3.6`, `commander@^14.0.3`, `picomatch@^4.0.3`, `chalk@^5.6.2`

**Dev:**
- `vitest@^4.1.0`, `tsx@^4.21.0`, `typescript@^5.9.3`

### Testing Setup

**Framework:** Vitest (configured in `vitest.config.ts`)
- Tests match `src/**/*.test.ts`, Node environment
- Mock strategy using `vi.mock()` for external dependencies
- Run with `npm test` or `npm run test:watch`
- Existing tests: config loading, URL parsing, error handling, GitHub/Claude clients (mocked), pipeline runner, integration (stub agents + schema validation)

### Code Conventions

- Strict TypeScript, ES2022 target, Node16 module resolution, ESM imports (`.js` extensions)
- Named exports, Zod for runtime validation
- Agent factory function pattern: `createXxxAgent(logger?: Logger): Agent<TInput, TOutput>`
- Agents set `idempotent: true` (false only for side-effect agents)

---

## Part 2: Web Research — Best Practices

### GitHub REST API with Octokit

**Authentication:** PAT via `GITHUB_TOKEN` env var is appropriate for CLI tools. Always set custom `userAgent`.

**Pagination patterns:**
- Collect-all: `octokit.paginate(endpoint, params, mapFn)` — good for moderate datasets
- Iterator: `octokit.paginate.iterator()` — best for large datasets (streaming)
- Early termination via `done()` callback
- Always set `per_page: 100`

**Rate limiting:** The `octokit` package bundles throttling and retry plugins. Handle both primary and secondary rate limits. Retry at most once on rate limit.

**TypeScript config:** Use `"moduleResolution": "node16"` and `"module": "node16"`.

Sources: [Octokit.js](https://github.com/octokit/octokit.js/), [GitHub REST API Docs](https://docs.github.com/en/rest/guides/scripting-with-the-rest-api-and-javascript)

### Git Shallow Clone Patterns

**Library choice:** Use **simple-git** for Node.js server apps (wraps native git, faster). Use isomorphic-git only for browser compatibility.

**Pattern:**
```typescript
import { simpleGit } from 'simple-git';
await git.clone(repoUrl, tmpDir, { '--depth': 1, '--single-branch': true });
```

**Best practices:**
- Always use `--single-branch` alongside `--depth 1`
- Use temp directories (`mkdtemp`) and clean up in `finally` blocks
- Set timeouts for large repositories
- Shallow clone is ideal for code review: only need current file state, not history

**Critical limitations:** `git log`/`git blame` return incomplete results; subsequent fetches may download nearly complete history. Use only when repo will be read and immediately deleted.

Sources: [GitHub Blog on Shallow/Partial Clone](https://github.blog/open-source/git/get-up-to-speed-with-partial-clone-and-shallow-clone/), [simple-git](https://github.com/steveukx/git-js)

### Multi-Agent Context Gathering Patterns

**Sequential pipeline** is most relevant for this project — agents in fixed sequence, each transforming input for the next stage.

**Key principles:**
- Each agent writes output to a unique key in shared state
- Use structured JSON schemas as contracts between agents
- Pass only necessary information — not full conversation history
- Start simple; add parallelism only when needed
- Set maximum iterations and timeouts to prevent stuck agents
- Log every agent interaction with timestamps and correlation IDs

Sources: [Google ADK Multi-Agent Patterns](https://developers.googleblog.com/developers-guide-to-multi-agent-patterns-in-adk/)

### TypeScript API Client Testing Patterns

**Nock vs MSW:** Both work for Node.js. Nock is simpler for pure API client testing with built-in fixture recording. MSW is better for cross-environment or GraphQL.

**Nock best practices:**
- `nock.disableNetConnect()` in beforeEach to catch accidental real calls
- `nock.cleanAll()` in afterEach
- Use `scope.done()` to verify all expected calls were made
- Test pagination by chaining multiple interceptors with Link headers

**Fixture recording with nockBack:**
- Record real responses, replay in CI
- Modes: `record` (create), `update` (refresh), `lockdown` (CI)
- Scrub sensitive data before committing fixtures

**Test strategy:**
- Unit tests: Mock HTTP layer (nock), test pagination/error handling/retry
- Integration tests: nockBack recorded fixtures or stub agents + schema validation
- Always test: auth failure, rate limiting (429), network errors (ECONNRESET), paginated responses, empty results

Sources: [Nock](https://github.com/nock/nock), [MSW](https://github.com/mswjs/msw)
