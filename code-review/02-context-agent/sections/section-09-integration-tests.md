Now I have all the context needed. Let me generate the section content.

# Section 09: Integration Tests

## Overview

This section covers end-to-end integration tests for the Context Agent. These tests verify that the fully assembled PR mode and repo mode pipelines produce valid `ContextOutput` objects that pass Zod schema validation, including edge cases with missing optional data. A pipeline integration test confirms that Context Agent output can be fed directly into the `StubAnalysisAgent` without error.

**Dependencies:** Sections 01-08 must be complete before implementing this section. Specifically:
- Section 01 (schema extensions) provides the extended `ContextOutputSchema` with `referencedIssues`, `comments`, and `techStack`
- Section 02 (GitHub client extensions) provides `getFileContent`, `getReviewComments`, `getReferencedIssues`, and the extended `getPR` (with `headSha`/`baseSha`)
- Section 07 (context agent PR mode) provides `createContextAgent` and its PR mode `run()` method
- Section 08 (context agent repo mode) provides the repo mode `run()` method

## File to Create

`/home/andrew/code/scratchpad/code-review/02-context-agent/src/integration.test.ts`

This is a single test file containing all integration tests for the context agent.

## Test Specifications

The following five tests must be implemented using Vitest. All tests use a fully mocked `GitHubClient` -- no real network calls are made. The mock should be constructed as a plain object satisfying the `GitHubClient` interface (using `vi.fn()` for each method) rather than instantiating the real class.

### Test 1: Full PR mode flow -- output passes ContextOutputSchema.safeParse()

Create a mocked `GitHubClient` where:
- `getPR` returns a complete PR object including `headSha` and `baseSha`
- `getPRFiles` returns 2-3 files with various statuses (modified, added, renamed with `previous_filename`)
- `getPRDiff` returns a minimal diff string
- `getReferencedIssues` returns one issue object `{ number, title, state, body }`
- `getReviewComments` returns one comment object `{ id, author, body, path, line, createdAt }`
- `getFileContent` returns domain rules content for the expected fallback paths (or the config path)

Call `createContextAgent({ github: mockClient, logger })` and invoke `run()` with `mode: "pr"`, valid `owner`, `repo`, `number`, and a config object (use `defaultConfig` or a minimal config with `ignorePatterns: []`).

Assert that `ContextOutputSchema.safeParse(result)` returns `{ success: true }`. Additionally assert that the output contains `referencedIssues` as a non-empty array, `comments` as a non-empty array, and `pr.files` includes the expected file count.

### Test 2: Full repo mode flow -- output passes ContextOutputSchema.safeParse()

Create a mocked `GitHubClient` where:
- `getRepoTree` returns a list of file paths including at least one manifest file (`package.json`)
- `getFileContent` returns valid JSON for `package.json` (with `dependencies` containing e.g. `"react": "^18.0.0"`) and domain rules / architecture doc content for the appropriate paths
- Other manifest lookups return `null`

Call `createContextAgent` and invoke `run()` with `mode: "repo"`, valid `owner`, `repo`, and config with `ignorePatterns: []`.

Assert that `ContextOutputSchema.safeParse(result)` returns `{ success: true }`. Assert the output contains `repoFiles` as a non-empty array, `techStack` with `languages` including `"TypeScript"` or `"JavaScript"`, and `domainRules` is non-null.

### Test 3: PR mode with no domain rules, no linked issues, no comments -- still valid output

Create a mocked `GitHubClient` where:
- `getPR` returns a PR with an empty description (no closing references)
- `getPRFiles` returns one file
- `getPRDiff` returns a diff string
- `getReferencedIssues` returns an empty array (or is not called since no refs are parsed)
- `getReviewComments` returns an empty array
- `getFileContent` returns `null` for all domain rules / architecture doc paths (none found)

Assert that `ContextOutputSchema.safeParse(result)` returns `{ success: true }`. Assert `referencedIssues` is an empty array (or undefined), `comments` is an empty array (or undefined), and `domainRules` is `null`.

### Test 4: Repo mode with no manifests, no domain rules -- still valid output with empty techStack

Create a mocked `GitHubClient` where:
- `getRepoTree` returns file paths that contain no recognized manifest files (e.g., only `.txt` and `.md` files)
- `getFileContent` returns `null` for all domain rules and architecture doc paths

Assert that `ContextOutputSchema.safeParse(result)` returns `{ success: true }`. Assert `techStack` has empty `languages`, empty `frameworks`, and empty `dependencies` (or `techStack` is undefined if that is the schema-valid representation). Assert `domainRules` and `architectureDoc` are both `null`.

### Test 5: Pipeline integration -- ContextAgent output feeds into StubAnalysisAgent without error

Import `runPipeline` from `01-core-infrastructure/src/pipeline/runner.js` and `createStubAnalysisAgent` from `01-core-infrastructure/src/agents/stubs.js`.

Create a context agent with a fully mocked `GitHubClient` (same as test 1 or test 2). Build a two-agent pipeline: `[contextAgent, stubAnalysisAgent]`. Call `runPipeline(agents, input)`.

Assert that the pipeline completes without throwing. Assert that `result.stages` has length 2, both with `success: true`. Assert the final `result.output` passes `AnalysisOutputSchema.safeParse()`.

## Implementation Guidance

### Mock GitHubClient Construction

Build the mock as a plain object with `vi.fn()` methods. This avoids needing to instantiate the real `GitHubClient` (which requires an Octokit instance and token). Example structure:

```typescript
const mockGitHub = {
  getPR: vi.fn(),
  getPRFiles: vi.fn(),
  getPRDiff: vi.fn(),
  getRepoTree: vi.fn(),
  getFileContent: vi.fn(),
  getReferencedIssues: vi.fn(),
  getReviewComments: vi.fn(),
  postPRComment: vi.fn(),
};
```

Configure return values with `mockGitHub.getPR.mockResolvedValue(...)` etc. for each test case.

### Config Object

Use a minimal config object or import `defaultConfig` from `01-core-infrastructure/src/config/schema.js`. Override `ignorePatterns` to `[]` in most tests so filtering does not interfere with assertions. The config type is `CodeReviewConfig` from `01-core-infrastructure/src/config/schema.js`.

### Logger

Create a silent logger or use `createLogger({ verbose: false })` from `01-core-infrastructure/src/utils/logger.js`. The logger is optional but passing one avoids potential null-reference issues if the agent calls `logger?.info(...)`.

### ContextAgentInput Shape

The input to `run()` follows this interface (defined in section 07):

```typescript
interface ContextAgentInput {
  mode: "pr" | "repo";
  owner: string;
  repo: string;
  number?: number;       // required when mode === "pr"
  config: CodeReviewConfig;
}
```

### Import Paths

- `createContextAgent` from `./context-agent.js` (relative within `02-context-agent/src/`)
- `ContextOutputSchema`, `AnalysisOutputSchema` from the `01-core-infrastructure` package (either via package name if configured, or relative path like `../../01-core-infrastructure/src/agents/schemas.js`)
- `runPipeline` from `../../01-core-infrastructure/src/pipeline/runner.js`
- `createStubAnalysisAgent` from `../../01-core-infrastructure/src/agents/stubs.js`
- `defaultConfig` from `../../01-core-infrastructure/src/config/schema.js`
- `createLogger` from `../../01-core-infrastructure/src/utils/logger.js`

Adjust the import paths based on the actual project setup (e.g., if `01-core-infrastructure` is published as an npm package or uses TypeScript path aliases).

### Test Organization

Wrap all five tests in a single `describe("Integration: Context Agent")` block. Each test should be independent and set up its own mock data. Use `beforeEach` for shared setup (logger creation, resetting mocks) if helpful, but avoid shared mutable state between tests.