Now I have all the context needed. Let me generate the section content.

# Section 07: Context Agent — PR Mode

## Overview

This section implements the `createContextAgent` factory function and the PR mode `run()` method. The Context Agent is the first agent in the pipeline. In PR mode, it orchestrates fetching PR metadata, changed files, diffs, referenced issues, review comments, and domain rules from GitHub, then assembles a validated `ContextOutput` object for downstream agents.

**File to create:** `/home/andrew/code/scratchpad/code-review/02-context-agent/src/context-agent.ts`
**Test file to create:** `/home/andrew/code/scratchpad/code-review/02-context-agent/src/context-agent.test.ts`

## Dependencies (from other sections, must be completed first)

- **Section 01 (Schema Extensions):** `ContextOutputSchema` must have `referencedIssues`, `comments`, `techStack` optional fields; `PRFileSchema` must have `previousPath`.
- **Section 02 (GitHub Client Extensions):** `GitHubClient` must have `getFileContent`, `getReviewComments`, `getReferencedIssues` methods. `getPR` must return `headSha` and `baseSha`.
- **Section 03 (File Filter):** `filterFiles()` function from `02-context-agent/src/file-filter.ts`.
- **Section 04 (Issue Parser):** `parseClosingReferences()` function from `02-context-agent/src/issue-parser.ts`.
- **Section 05 (Domain Rules Loader):** `loadDomainRules()` function from `02-context-agent/src/domain-rules.ts`.

## Key Types

The agent input is NOT a schema-level type; it is a local interface:

```typescript
interface ContextAgentInput {
  mode: "pr" | "repo";
  owner: string;
  repo: string;
  number?: number;         // Required if mode === "pr"
  config: CodeReviewConfig;
}
```

The factory signature:

```typescript
function createContextAgent(options: {
  github: GitHubClient;
  logger?: Logger;
}): Agent<ContextAgentInput, ContextOutput>
```

The returned agent has:
- `name`: `"ContextAgent"`
- `idempotent`: `true`

The `Agent` interface is imported from `01-core-infrastructure/src/pipeline/types.ts`: `Agent<TInput, TOutput>` with a `run(input: TInput): Promise<TOutput>` method.

## Tests (Write First)

Create `/home/andrew/code/scratchpad/code-review/02-context-agent/src/context-agent.test.ts`.

All tests mock the `GitHubClient` instance and the utility modules (`filterFiles`, `parseClosingReferences`, `loadDomainRules`). The tests for PR mode are:

```typescript
// Test: produces valid ContextOutput for a standard PR (passes schema validation)
//   - Mock getPR to return metadata with headSha and baseSha
//   - Mock getPRFiles, getPRDiff, getReferencedIssues, getReviewComments
//   - Mock loadDomainRules, filterFiles, parseClosingReferences
//   - Verify result passes ContextOutputSchema.safeParse() with success: true

// Test: calls getPR first, then parallelizes remaining calls
//   - Track call order via mock implementation side effects
//   - Verify getPR resolves before getPRFiles, getPRDiff, getReviewComments, etc. begin

// Test: passes baseSha as ref to domain rules loader
//   - Verify loadDomainRules is called with ref equal to the baseSha from getPR

// Test: applies ignorePatterns to filter PR files
//   - Verify filterFiles is called with the PR files and config.ignorePatterns
//   - Verify the output uses the filtered result, not the raw getPRFiles result

// Test: includes previousPath for renamed files
//   - Mock getPRFiles to return a file with previous_filename
//   - Verify the output file object includes previousPath

// Test: parses PR description for referenced issues and fetches them
//   - Mock parseClosingReferences to return [{number: 42}]
//   - Verify getReferencedIssues is called with [42]
//   - Verify output.referencedIssues contains the fetched issue

// Test: fetches review comments
//   - Mock getReviewComments to return comment objects
//   - Verify output.comments matches

// Test: sets referencedIssues to empty array when no refs in description
//   - Mock parseClosingReferences to return []
//   - Verify output.referencedIssues is []

// Test: sets comments to empty array when no review comments exist
//   - Mock getReviewComments to return []
//   - Verify output.comments is []

// Test: loads domain rules and architecture doc
//   - Mock loadDomainRules to return { domainRules: "rules content", architectureDoc: "arch content" }
//   - Verify output.domainRules and output.architectureDoc match

// Test: throws when mode is "pr" but number is undefined
//   - Call run() with mode "pr" and no number
//   - Expect a descriptive error

// Test: throws when owner or repo is empty
//   - Call run() with empty owner or repo string
//   - Expect a descriptive error

// Test: propagates GitHubAPIError from getPR (fail fast)
//   - Mock getPR to throw GitHubAPIError
//   - Expect the error to propagate without being caught
```

### Mock Setup Pattern

Each test should create a mock `GitHubClient` with vi.fn() for each method. A helper function to build a "happy path" mock is recommended to reduce boilerplate:

```typescript
function createMockGitHub() {
  return {
    getPR: vi.fn().mockResolvedValue({
      title: "Test PR",
      description: "Fixes #42",
      author: "testuser",
      state: "open",
      baseBranch: "main",
      headBranch: "feature/test",
      headSha: "abc123",
      baseSha: "def456",
    }),
    getPRFiles: vi.fn().mockResolvedValue([
      { path: "src/index.ts", status: "modified", additions: 5, deletions: 2, patch: "..." },
    ]),
    getPRDiff: vi.fn().mockResolvedValue("diff content"),
    getReviewComments: vi.fn().mockResolvedValue([]),
    getReferencedIssues: vi.fn().mockResolvedValue([]),
    getFileContent: vi.fn().mockResolvedValue(null),
    getRepoTree: vi.fn().mockResolvedValue([]),
  } as unknown as GitHubClient;
}
```

Also mock the imported utility modules at the top of the test file using `vi.mock()`:

```typescript
vi.mock("./file-filter.js", () => ({
  filterFiles: vi.fn((files: unknown[]) => files), // pass-through by default
}));
vi.mock("./issue-parser.js", () => ({
  parseClosingReferences: vi.fn(() => []),
}));
vi.mock("./domain-rules.js", () => ({
  loadDomainRules: vi.fn().mockResolvedValue({ domainRules: null, architectureDoc: null }),
}));
```

## Implementation Details

### Factory Function: `createContextAgent`

The factory accepts `{ github, logger }` and returns an `Agent<ContextAgentInput, ContextOutput>` object with `name`, `idempotent`, and `run()`.

### `run()` — PR Mode Logic

When `input.mode === "pr"`:

1. **Input validation:** If `number` is undefined, throw an error with message like `"PR number is required for pr mode"`. If `owner` or `repo` is empty, throw with a descriptive message.

2. **Fetch PR metadata (step 1, sequential):** Call `github.getPR(owner, repo, number)`. This must complete first because it provides `headSha` and `baseSha` used as `ref` parameters in subsequent calls. Map the response to PR metadata fields.

3. **Parallel fetch (steps 2-6 via `Promise.all`):**
   - `github.getPRFiles(owner, repo, number)` — then apply `filterFiles(files, config.ignorePatterns, f => f.path)`. Map `previous_filename` to `previousPath` for renamed files.
   - `github.getPRDiff(owner, repo, number)`
   - Parse PR description with `parseClosingReferences(prMeta.description)`, then fetch issues with `github.getReferencedIssues(owner, repo, sameRepoNumbers, crossRepoRefs)`. If no references found, use empty array.
   - `github.getReviewComments(owner, repo, number)`
   - `loadDomainRules({ github, owner, repo, ref: baseSha, config, logger })`

4. **Assemble `ContextOutput`:**

```typescript
{
  mode: "pr",
  repository: { owner, repo, defaultBranch: prMeta.baseBranch },
  pr: {
    number,
    title: prMeta.title,
    description: prMeta.description ?? "",
    author: prMeta.author,
    baseBranch: prMeta.baseBranch,
    headBranch: prMeta.headBranch,
    files: filteredFiles,
    diff: diff,
  },
  referencedIssues: issues,
  comments: comments,
  domainRules: domainResult.domainRules,
  architectureDoc: domainResult.architectureDoc,
}
```

The `defaultBranch` is set to `prMeta.baseBranch` as a practical proxy — the PR's base branch is typically `main`/`master`.

### Repo Mode Placeholder

This file should include the branching logic for `input.mode === "repo"` but the actual repo mode implementation is in Section 08. For now, the repo mode branch can throw `new Error("Repo mode not yet implemented")` or simply be left as a stub that Section 08 will fill in. Structure the `run()` method with a clear `if (input.mode === "pr") { ... } else { ... }` so Section 08 can implement the else branch.

### Error Handling

- All errors from `github.getPR()` propagate up immediately (fail fast).
- The `parseClosingReferences` function returns an empty array for null/empty descriptions, so no special null-checking needed.
- `getReferencedIssues` and `getReviewComments` handle their own error cases internally (returning empty arrays on 403, skipping 404 issues).
- Domain rules loader returns null values for missing files, which is expected.

### Module Export

Export `createContextAgent` and the `ContextAgentInput` type from `/home/andrew/code/scratchpad/code-review/02-context-agent/src/index.ts`. If this file does not exist yet, create it. It should re-export from `context-agent.ts` and from the utility modules.

## File Structure

After this section is implemented, the directory contains:

```
02-context-agent/
├── package.json                   # Project config with vitest
├── tsconfig.json                  # TypeScript config with @core path alias
├── vitest.config.ts               # Vitest config with @core alias resolution
├── src/
│   ├── context-agent.ts           # createContextAgent factory + PR mode run()
│   ├── context-agent.test.ts      # 15 tests for PR mode
│   └── index.ts                   # Public exports
```

### Implementation Notes

- **Import strategy:** Utility modules (filterFiles, parseClosingReferences, loadDomainRules) were implemented in `01-core-infrastructure/src/` by sections 03-05. This module imports them via `@core/*` path alias rather than local copies.
- **Path aliases:** `@core` maps to `../01-core-infrastructure/src` in both tsconfig.json (for TypeScript) and vitest.config.ts (for test resolution).
- **index.ts exports:** Only re-exports createContextAgent and ContextAgentInput from this package. Utility modules are consumed from `01-core-infrastructure` directly.
- **Code review auto-fix:** Added logger.error calls before validation error throws for observability.
- **15 tests passing:** Schema validation, call ordering, filtering, issue parsing, comments, domain rules, error propagation, and metadata.