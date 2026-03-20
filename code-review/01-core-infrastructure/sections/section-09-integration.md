

# Section 09: Integration Tests

## Overview

This section implements end-to-end integration tests that verify all pieces of the core infrastructure work together correctly. This includes: full pipeline execution with stub agents, CLI command parsing, and config loading flowing into pipeline execution. No new production code is created in this section — it is purely about wiring validation.

**Dependencies**: All previous sections (01-08) must be complete before this section can be implemented.

---

## Background Context

The system is a TypeScript CLI tool (ESM, Node >= 20, Vitest) with three commands (`review-pr`, `review-repo`, `init`) that orchestrate a multi-agent pipeline via Claude API and GitHub API. The core pieces are:

- **Config system** (`src/config/loader.ts`): discovers `.codereview.json`, merges defaults/file/env/CLI flags, validates with Zod
- **Pipeline runner** (`src/pipeline/runner.ts`): runs agents sequentially, retries idempotent agents, returns `PipelineResult` with timing metadata
- **Stub agents** (`src/agents/stubs.ts`): placeholder agents returning valid typed output matching contract schemas
- **CLI entry point** (`src/index.ts`): Commander.js program with global `--verbose` and `--config` flags
- **Commands** (`src/commands/review-pr.ts`, `review-repo.ts`, `init.ts`): parse URL, load config, validate credentials, construct pipeline, execute
- **Clients** (`src/clients/claude.ts`, `src/clients/github.ts`): wrapped with DI logger, mocked in tests
- **Shared types/schemas** (`src/agents/schemas.ts`, `src/types/common.ts`): Zod schemas for all agent contracts

---

## Tests

All integration tests go in a dedicated integration test file. These tests verify cross-module wiring, not individual unit behavior (which is covered by sections 02-08).

### Full Pipeline Integration Tests (`src/integration.test.ts`)

```
# Test: Full pipeline with all stub agents runs end-to-end and returns valid PipelineResult
  - Create all stub agents (Context, Analysis, Review, Output stubs)
  - Run pipeline via runPipeline()
  - Assert PipelineResult contains final output, all stage results, and timing metadata
  - Assert final output passes the last stage's Zod schema validation

# Test: Pipeline stage outputs chain correctly through all 4 stub stages
  - Run full stub pipeline
  - Verify each StageResult is populated with success status
  - Verify per-stage duration is recorded (> 0ms)

# Test: Config loading integrates with pipeline execution flow
  - Create a temp directory with a valid .codereview.json
  - Load config via loadConfig() from that directory
  - Verify loaded config merges correctly with defaults
  - Use config values (e.g., maxRetries, model) to configure a stub pipeline run
  - Assert pipeline completes successfully with config-driven settings

# Test: CLI parses review-pr command with valid URL and global flags
  - Programmatically invoke Commander program.parseAsync() with
    ['review-pr', 'https://github.com/owner/repo/pull/42', '--verbose']
  - Mock the actual command handler to capture parsed arguments
  - Assert the handler receives the correct URL and verbose=true

# Test: CLI parses review-repo command with valid URL
  - Programmatically invoke Commander program.parseAsync() with
    ['review-repo', 'https://github.com/owner/repo']
  - Mock the actual command handler to capture parsed arguments
  - Assert the handler receives the correct URL

# Test: End-to-end review-pr flow with mocked clients completes successfully
  - Mock GitHub client methods (getPR, getPRFiles, getPRDiff) to return fixture data
  - Mock Claude client to return valid structured responses matching schemas
  - Load config with ANTHROPIC_API_KEY and GITHUB_TOKEN set via env
  - Execute the review-pr command handler programmatically
  - Assert pipeline completes and produces valid ReviewOutput

# Test: End-to-end review-repo flow with mocked clients completes successfully
  - Mock GitHub client (getRepoTree returns file list)
  - Mock Claude client to return valid structured responses
  - Execute the review-repo command handler programmatically
  - Assert pipeline completes with mode "repo"

# Test: Config env var override flows through to pipeline execution
  - Set ANTHROPIC_API_KEY and GITHUB_TOKEN env vars
  - Load config (no file)
  - Assert config.apiKey and config.githubToken are populated from env
  - Use these to construct (mocked) clients, verifying the env values arrived

# Test: Error propagation from pipeline failure surfaces as user-friendly CLI error
  - Create a stub agent that throws an error after retries exhausted
  - Run pipeline and catch the PipelineError
  - Assert error contains agent name, attempt count, and original error message
  - Assert error is an instance of PipelineError

# Test: Verbose mode logger output appears during pipeline execution
  - Create logger with verbose=true
  - Run pipeline with stub agents, passing the logger
  - Capture stdout/stderr
  - Assert verbose log lines appear (e.g., "Running [agent name]...")
```

---

## Implementation Details

### File to Create

**`/Users/andrew/Code/scratchpad/code-review/src/integration.test.ts`**

This is the only file created in this section. It imports from all other modules to verify wiring.

### Key Implementation Notes

1. **Mocking strategy**: Use `vi.mock()` for the Claude and GitHub clients. The Anthropic SDK and Octokit should never be called in these tests. Stub agents from `src/agents/stubs.ts` (created in section 07/08) are used for pure pipeline tests; mocked real clients are used for full command-handler tests.

2. **Temp directories for config tests**: Use Node's `fs.mkdtempSync` to create isolated temp directories with `.codereview.json` files and `.git` directories (to simulate git roots). Clean up in `afterEach`.

3. **CLI parsing tests**: Commander.js supports programmatic parsing via `program.parseAsync(['node', 'script', ...args])`. To prevent the command from actually executing side effects, mock the command action handlers or intercept at the handler level.

4. **Environment variable tests**: Use `vi.stubEnv()` (Vitest built-in) to set/unset `ANTHROPIC_API_KEY` and `GITHUB_TOKEN` for individual tests. Restore in `afterEach` to avoid cross-test contamination.

5. **Capturing console output**: Use `vi.spyOn(process.stdout, 'write')` and `vi.spyOn(process.stderr, 'write')` to capture logger output for verbose mode assertions.

6. **Fixture data**: Create minimal but schema-valid fixture objects for PR metadata, file lists, diffs, and Claude responses. These should pass the Zod schemas defined in `src/agents/schemas.ts`. Define these as constants at the top of the test file.

### Imports Required

The test file imports from these modules (all created in previous sections):

- `src/pipeline/runner.ts` — `runPipeline`
- `src/pipeline/types.ts` — `Agent`, `PipelineResult`, `StageResult`
- `src/agents/stubs.ts` — stub agent factories
- `src/agents/schemas.ts` — Zod schemas for validation assertions
- `src/config/loader.ts` — `loadConfig`
- `src/config/schema.ts` — config schema and defaults
- `src/clients/claude.ts` — `ClaudeClient` (mocked)
- `src/clients/github.ts` — `GitHubClient`, `resolveGitHubToken` (mocked)
- `src/commands/review-pr.ts` — command handler (for e2e tests)
- `src/commands/review-repo.ts` — command handler (for e2e tests)
- `src/utils/logger.ts` — `createLogger`
- `src/utils/errors.ts` — `PipelineError` (for error propagation tests)

### Test Organization

Structure the test file with `describe` blocks:

```
describe("Integration: Full Pipeline with Stubs", () => { ... })
describe("Integration: Config + Pipeline Flow", () => { ... })
describe("Integration: CLI Command Parsing", () => { ... })
describe("Integration: End-to-End Command Handlers", () => { ... })
describe("Integration: Error Propagation", () => { ... })
describe("Integration: Verbose Logging", () => { ... })
```

### Fixture Data Shape

For the end-to-end command handler tests, fixture data should minimally include:

- **PR metadata**: `{ title: "Test PR", description: "...", author: "testuser", state: "open", baseBranch: "main", headBranch: "feature" }`
- **PR files**: `[{ path: "src/index.ts", status: "modified", additions: 10, deletions: 2, patch: "@@ -1,5 +1,7 @@..." }]`
- **PR diff**: A minimal unified diff string
- **Repo tree**: `[{ path: "src/index.ts" }, { path: "src/utils.ts" }]`
- **Claude response for AnalysisOutput**: Valid object with `scoredFiles`, `criticalFiles`, `summary`
- **Claude response for ReviewOutput**: Valid object with `recommendations`, `coreDecision`, `focusAreas`

All fixtures must pass their respective Zod schema validations — add a preliminary test that validates each fixture against its schema to catch fixture drift early.