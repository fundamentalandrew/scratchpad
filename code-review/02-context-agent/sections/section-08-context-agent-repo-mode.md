Now I have all the context needed. Let me write the section.

# Section 08: Context Agent Repo Mode

## Overview

This section implements the **repo mode** `run()` method within the context agent created by the `createContextAgent` factory. When `input.mode === "repo"`, the agent fetches the repository file tree, detects the tech stack, loads domain rules, and assembles a `ContextOutput` with `repoFiles` and `techStack` fields.

The `createContextAgent` factory itself and the `Agent` interface wiring are established in **section-07** (PR mode). This section adds the repo-mode branch to the same `run()` method.

## Dependencies

This section depends on the following completed sections:

- **Section 01 (Schema Extensions):** `ContextOutputSchema` with optional `repoFiles`, `techStack`, `referencedIssues`, `comments` fields; `TechStackSchema`
- **Section 02 (GitHub Client Extensions):** `getFileContent(owner, repo, path, ref?)` method on `GitHubClient`
- **Section 03 (File Filter):** `filterFiles(files, patterns, getPath)` utility function
- **Section 05 (Domain Rules Loader):** `loadDomainRules(options)` function
- **Section 06 (Tech Stack Detector):** `detectTechStack(options)` function
- **Section 07 (Context Agent PR Mode):** The `createContextAgent` factory function and the `ContextAgentInput` type

## Key Design Points

- Repo mode does NOT populate `pr`, `referencedIssues`, or `comments` fields. It populates `repoFiles` and `techStack`.
- The file tree is fetched via `github.getRepoTree(owner, repo)` and filtered through `filterFiles()` using `config.ignorePatterns`.
- Tech stack detection and domain rules loading can run in parallel since they are independent.
- The `defaultBranch` for the `repository` field can be inferred from the config or set to a sensible default (e.g., fetch repo metadata, or use `"main"` as a default if no branch info is available from the tree call).
- Input validation: `owner` and `repo` must be non-empty strings. Unlike PR mode, `number` is not required.
- Truncated tree warnings from `getRepoTree` should be logged but execution continues with partial results.

## Files to Create or Modify

- `/home/andrew/code/scratchpad/code-review/02-context-agent/src/context-agent.ts` -- Add repo mode branch to the `run()` method inside `createContextAgent`
- `/home/andrew/code/scratchpad/code-review/02-context-agent/src/context-agent.test.ts` -- Add repo mode tests

## Tests (Write First)

All tests go in `/home/andrew/code/scratchpad/code-review/02-context-agent/src/context-agent.test.ts`, alongside any PR mode tests from section 07. Use Vitest. Mock the `GitHubClient` and all utility modules.

```typescript
// --- Context Agent — Repo Mode ---

// Test: produces valid ContextOutput for a repo (passes schema validation)
//   - Mock getRepoTree to return a list of file paths
//   - Mock getFileContent for manifest files (e.g., package.json)
//   - Mock loadDomainRules to return { domainRules: "some rules", architectureDoc: null }
//   - Mock detectTechStack to return { languages: ["TypeScript"], frameworks: ["React"], dependencies: { react: "^18.0.0" } }
//   - Verify output passes ContextOutputSchema.safeParse() successfully
//   - Verify output.mode === "repo"

// Test: fetches file tree and applies ignorePatterns
//   - Mock getRepoTree to return paths including "node_modules/foo.js", "src/index.ts", "dist/bundle.js"
//   - Provide config.ignorePatterns as ["node_modules/**", "dist/**"]
//   - Verify output.repoFiles only contains { path: "src/index.ts" }

// Test: detects tech stack from manifest files
//   - Mock getRepoTree to return paths including "package.json" and "src/app.ts"
//   - Verify detectTechStack is called with the file paths from the tree
//   - Verify output.techStack matches what detectTechStack returned

// Test: loads domain rules and architecture doc
//   - Mock loadDomainRules to return { domainRules: "rules content", architectureDoc: "arch content" }
//   - Verify output.domainRules === "rules content"
//   - Verify output.architectureDoc === "arch content"

// Test: sets repoFiles array from filtered tree
//   - Mock getRepoTree to return ["src/a.ts", "src/b.ts", "README.md"]
//   - No ignore patterns match
//   - Verify output.repoFiles has 3 entries, each with correct path

// Test: does not include pr field in output
//   - Run repo mode
//   - Verify output.pr is undefined

// Test: throws when owner or repo is empty
//   - Call run() with owner: "" — expect thrown error with descriptive message
//   - Call run() with repo: "" — expect thrown error with descriptive message

// Test: propagates GitHubAPIError from getRepoTree (fail fast)
//   - Mock getRepoTree to throw GitHubAPIError
//   - Verify the error propagates without being caught

// Test: handles truncated tree (warning logged, continues)
//   - This is handled inside getRepoTree itself (it logs a warning)
//   - Verify agent still produces valid output when getRepoTree returns partial results
```

## Implementation Details

### Repo Mode Branch in `run()`

Inside the `run()` method of the agent returned by `createContextAgent`, add a branch for `input.mode === "repo"`. The logic is:

1. **Validate input** -- `owner` and `repo` must be non-empty. If either is empty, throw a descriptive error.

2. **Fetch file tree** -- Call `github.getRepoTree(owner, repo)`. This returns an array of file path strings. The `getRepoTree` method already handles truncation warnings internally.

3. **Filter files** -- Apply `filterFiles()` to the path list using `config.ignorePatterns`. Since `getRepoTree` returns plain strings, convert them to `{ path: string }` objects either before or after filtering. The `getPath` accessor for filtering on strings would be `(p) => p` if filtering raw strings, or `(f) => f.path` if filtering objects.

4. **Parallel fetch: tech stack and domain rules** -- These two operations are independent. Use `Promise.all()`:
   - `detectTechStack({ github, owner, repo, filePaths: filteredPaths, logger })`
   - `loadDomainRules({ github, owner, repo, config, logger })`

5. **Assemble output** -- Build the `ContextOutput` object:

```typescript
{
  mode: "repo",
  repository: {
    owner,
    repo,
    defaultBranch: /* from repo metadata or a reasonable default */,
  },
  repoFiles: filteredFiles.map(p => ({ path: p })),
  domainRules: domainRulesResult.domainRules,
  architectureDoc: domainRulesResult.architectureDoc,
  techStack,
}
```

Note: The `pr`, `referencedIssues`, and `comments` fields are omitted (they are optional in the schema).

### Default Branch

The `repository.defaultBranch` field is required by the schema. In repo mode, there is no PR to infer it from. Options:

- Add a lightweight `getRepo` method to `GitHubClient` that calls `octokit.rest.repos.get()` and returns `default_branch`. This is the most correct approach.
- Alternatively, accept a `branch` parameter in the input or default to `"main"`.

The recommended approach is to use the existing `getRepoTree` call's branch parameter or add `defaultBranch` to the input. If the implementer wants maximum correctness, a small `getRepo` method can be added, but this is not strictly required for this section -- using `"main"` as a default or accepting it as input are both acceptable.

### Error Handling

- `getRepoTree` failures (network, 404) throw `GitHubAPIError` and propagate up (fail fast).
- `detectTechStack` failures for individual manifests are handled internally (logged and skipped). If the overall call fails, it propagates.
- `loadDomainRules` returns nulls when files are not found; only non-404 errors propagate.
- Input validation errors throw immediately with descriptive messages before any API calls.

### Example Assembly Pattern

The repo mode is simpler than PR mode because there are fewer data sources. The overall pattern mirrors PR mode's structure but with fewer parallel calls:

```typescript
// Pseudocode structure
if (input.mode === "repo") {
  validateInput(input); // owner, repo non-empty

  const filePaths = await github.getRepoTree(owner, repo);
  const filtered = filterFiles(filePaths, config.ignorePatterns, (p) => p);

  const [techStack, { domainRules, architectureDoc }] = await Promise.all([
    detectTechStack({ github, owner, repo, filePaths: filtered, logger }),
    loadDomainRules({ github, owner, repo, config, logger }),
  ]);

  return {
    mode: "repo",
    repository: { owner, repo, defaultBranch: "main" },
    repoFiles: filtered.map((p) => ({ path: p })),
    domainRules,
    architectureDoc,
    techStack,
  };
}
```