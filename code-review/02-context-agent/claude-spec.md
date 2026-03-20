# Complete Specification: 02-Context Agent (Agent A)

## Overview

Build Agent A — the context-fetching agent that gathers all information needed for code review: PR metadata, repository structure, linked issues, domain rules, and review comments. This agent is the first step in a multi-agent pipeline that takes a GitHub PR URL or repo URL and produces a structured `ContextOutput` object for downstream agents.

## Architecture Context

The Context Agent operates within a sequential multi-agent pipeline:
```
input → Agent A (ContextOutput) → Agent B (AnalysisOutput) → Agent C (ReviewOutput) → Agent D
```

It implements the `Agent<ContextAgentInput, ContextOutput>` interface defined in `01-core-infrastructure`, using the factory function pattern: `createContextAgent(logger?: Logger)`.

## Two Operating Modes

### PR Review Mode

Given a GitHub PR URL (parsed by existing URL parser), fetch:

1. **PR metadata** via `GitHubClient.getPR()`: title, description, author, base/head branches
2. **Changed files** via `GitHubClient.getPRFiles()`: file list with patches, additions, deletions
   - Apply `config.ignorePatterns` to filter out noise files (node_modules, dist, lock files, etc.)
   - Handle pagination automatically (Octokit handles this)
3. **Full diff** via `GitHubClient.getPRDiff()`: unified diff for the entire PR
4. **Linked issues** via GitHub timeline/events API: only officially linked closing references
5. **Review comments** via GitHub API: inline code review comments only (not issue comments)
6. **Domain rules**: fetch from repo via GitHub Contents API (see Domain Rules Loading below)

### Full Repo Review Mode

Given a GitHub repo URL:

1. **File tree** via `GitHubClient.getRepoTree()`: complete file listing
   - Apply `config.ignorePatterns` to filter
2. **Tech stack detection**: parse config files fetched via GitHub Contents API:
   - `package.json` → Node.js deps, frameworks
   - `go.mod` → Go modules
   - `requirements.txt` / `pyproject.toml` → Python deps
   - `Cargo.toml` → Rust crates
   - Other common manifest files
3. **Domain rules**: API-first approach; only clone if Contents API can't fetch the files
4. **Key file identification**: entry points, config files, manifests (derived from file tree and tech stack)

## Domain Rules Loading

**Strategy:** Config paths first, then fallback search.

1. Check `config.domainRulesPath` and `config.architecturePath` (configured values)
2. If not found, search common locations:
   - `DOMAIN_RULES.md` (repo root)
   - `ARCHITECTURE.md` (repo root)
   - `.github/ARCHITECTURE.md`
   - `docs/architecture.md`
3. Fetch file contents via GitHub Contents API (base64 decode)
4. If no files found, set fields to `null` — downstream agents handle absence gracefully

## Schema Extension

Extend `ContextOutputSchema` in `01-core-infrastructure` with new optional fields:

```typescript
// New optional fields to add:
linkedIssues?: Array<{
  number: number;
  title: string;
  state: string;
  body?: string;
}>;
comments?: Array<{
  author: string;
  body: string;
  path?: string;      // File path for inline comments
  line?: number;       // Line number for inline comments
  createdAt: string;
}>;
techStack?: {
  languages: string[];
  frameworks: string[];
  dependencies: Record<string, string>;  // name → version
};
```

## API Integration

**Use GitHubClient directly** — no wrapper/adapter layer. All GitHub API interaction goes through the existing client in `clients/github.ts`.

**New methods needed on GitHubClient:**
- `getLinkedIssues(owner, repo, prNumber)` → fetch from timeline events API
- `getReviewComments(owner, repo, prNumber)` → fetch inline review comments
- `getFileContent(owner, repo, path, ref?)` → fetch individual file content (for domain rules)

These extend the existing client, following the same patterns (throttling, retry, error handling).

## File Filtering

Apply `config.ignorePatterns` using `picomatch` (already a dependency) to filter files early:
- In PR mode: filter the files array from getPRFiles()
- In repo mode: filter the file tree from getRepoTree()
- This reduces data volume for downstream agents

## Error Handling

**Fail fast.** Any API failure throws and lets the pipeline's retry logic (exponential backoff) handle it. No partial results, no agent-level retry.

Use existing error types:
- `GitHubAPIError` for API call failures
- `AuthError` if GitHub token is missing/invalid
- Let pipeline runner's retry logic handle transient failures

## Performance

**No hard timeout.** GitHub API rate limits are the natural constraint. The pipeline runner already has retry/timeout logic. Large repos may take 30+ seconds and that's acceptable.

## Dependencies

From `01-core-infrastructure`:
- `Agent` interface and `ContextOutput` type/schema
- `GitHubClient` (to be extended with new methods)
- `Logger` interface
- `CodeReviewConfig` type
- Error types (`GitHubAPIError`, `AuthError`)
- `picomatch` for glob matching

No new external dependencies needed. `simple-git` is available if cloning becomes necessary, but the API-first approach minimizes its need.

## Testing Strategy

- Mock `GitHubClient` methods using `vi.mock()` (existing pattern)
- Test both PR and repo modes
- Test domain rules loading with various file path scenarios
- Test ignorePatterns filtering
- Test schema validation (output must pass `ContextOutputSchema.safeParse()`)
- Test error cases: auth failure, API errors, missing domain rules
- Use nock for any direct HTTP testing if needed
