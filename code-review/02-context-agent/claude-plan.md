# Implementation Plan: 02-Context Agent (Agent A)

## 1. Overview

### What We're Building

The Context Agent is the first agent in a multi-agent code review pipeline. It takes a GitHub PR URL or repo URL and produces a structured `ContextOutput` JSON object containing all the information downstream agents need: PR metadata, changed files, repository structure, referenced issues, review comments, domain rules, and tech stack information.

### Why This Architecture

The pipeline follows a sequential data-flow model:
```
CLI Input → Context Agent (ContextOutput) → Analysis Agent → Review Agent → Output Agent
```

The Context Agent is a pure data gatherer — it makes no judgments about code quality. It fetches, filters, and structures context so downstream agents can focus on analysis and synthesis. This separation keeps each agent focused and independently testable.

### Key Design Decisions

1. **Use GitHubClient directly** — no wrapper layer. The existing client in `01-core-infrastructure/src/clients/github.ts` already handles throttling, retry, and pagination.
2. **API-first for file content** — use GitHub Contents API rather than cloning repos. Only fall back to `git clone --depth 1` if the Contents API can't deliver what's needed.
3. **Filter early** — apply `config.ignorePatterns` in the Context Agent to reduce data volume before downstream agents see it.
4. **Fail fast** — any API failure throws immediately. The pipeline runner handles retries with exponential backoff.
5. **Extend the core schema** — add optional fields (`referencedIssues`, `comments`, `techStack`) to `ContextOutputSchema` in `01-core-infrastructure`.
6. **Ref-consistent fetching** — capture `head.sha` / `base.sha` from the PR and use as `ref` for all subsequent content API calls to avoid race conditions from mid-run PR changes.
7. **Sensitive content safeguards** — deny-list sensitive file patterns (`.env`, `.pem`, `.key`, etc.) from content fetching to prevent accidental secret exposure.

---

## 2. Schema Extensions (01-core-infrastructure)

Before implementing the agent, extend `ContextOutputSchema` in `01-core-infrastructure/src/agents/schemas.ts`.

### New Schemas to Add

**ReferencedIssueSchema:**
- `number` (number)
- `title` (string)
- `state` (string) — "open" or "closed"
- `body` (string, optional)
- `owner` (string, optional) — for cross-repo references
- `repo` (string, optional) — for cross-repo references

**ReviewCommentSchema:**
- `id` (number) — unique comment ID for deduplication and linking
- `author` (string)
- `body` (string)
- `path` (string, optional) — file path for inline comments
- `line` (number, optional) — line number for inline comments
- `createdAt` (string) — ISO timestamp

**TechStackSchema:**
- `languages` (string array)
- `frameworks` (string array)
- `dependencies` (record of string to string) — package name → version (raw strings, no semver assumption)

### Modify PRFileSchema

Add one new optional field to the existing `PRFileSchema`:
- `previousPath` (string, optional) — previous file path for renamed files, enabling downstream agents to reason about file moves

### Modify ContextOutputSchema

Add three new optional fields to the existing `.object({...})` call:
- `referencedIssues`: array of `ReferencedIssueSchema`, optional
- `comments`: array of `ReviewCommentSchema`, optional
- `techStack`: `TechStackSchema`, optional

The existing refinement (`pr` or `repoFiles` must be present) remains unchanged.

### Update StubContextAgent

In `agents/stubs.ts`, optionally add the new fields to the stub output so integration tests can cover them. Adding empty arrays / a minimal techStack object keeps backward compatibility.

---

## 3. GitHubClient Extensions (01-core-infrastructure)

Add three new methods to the `GitHubClient` class in `clients/github.ts`.

### getReferencedIssues(owner, repo, issueNumbers, crossRepoRefs?)

**Purpose:** Fetch issue details for referenced issues parsed from the PR description.

**API:** For same-repo issues: `octokit.rest.issues.get({ owner, repo, issue_number })`. For cross-repo refs: use the owner/repo from the reference.

**Return type:** Array of `{ number, title, state, body?, owner?, repo? }`

**Error handling:** If an individual issue fetch fails (404 — issue doesn't exist, or 403 — insufficient permissions for cross-repo), log a warning and skip it. Don't fail the entire agent for a missing referenced issue.

### getReviewComments(owner, repo, prNumber)

**Purpose:** Fetch inline code review comments on a PR.

**API:** `octokit.paginate(octokit.rest.pulls.listReviewComments, { owner, repo, pull_number, per_page: 100 })`

**Return type:** Array of `{ id, author, body, path?, line?, createdAt }`

**Mapping:** `comment.id` → id, `comment.user.login` → author, `comment.body` → body, `comment.path` → path, `comment.original_line || comment.line` → line, `comment.created_at` → createdAt.

**Error handling:** If the endpoint returns 403 (insufficient permissions), log a warning and return an empty array. Document that the `repo` scope is needed for private repos.

### getFileContent(owner, repo, path, ref?)

**Purpose:** Fetch a single file's content from a repo via the Contents API.

**API:** `octokit.rest.repos.getContent({ owner, repo, path, ref })`. The response includes `content` (base64-encoded) and `encoding`. Decode with `Buffer.from(content, 'base64').toString('utf-8')`.

**Return type:** `string | null` — returns null if the file doesn't exist (404).

**Error handling:** Catch 404 and return null. Rethrow other errors as `GitHubAPIError`. If the response is an array (directory listing) or the type is `symlink`/`submodule`, return null rather than attempting to decode.

**Sensitive content safeguard:** Before fetching, check the path against a deny-list of sensitive file patterns (`.env`, `.pem`, `.key`, `secrets.*`, `id_rsa`, `.credentials`, etc.). If matched, log a warning and return null. This prevents accidental secret exposure through domain rules or tech stack detection.

---

## 4. Context Agent Implementation (02-context-agent)

### Directory Structure

```
02-context-agent/
├── src/
│   ├── context-agent.ts         # Main agent factory function
│   ├── domain-rules.ts          # Domain rules discovery and loading
│   ├── file-filter.ts           # IgnorePattern filtering using picomatch
│   ├── issue-parser.ts          # Parse closing references from PR description
│   ├── tech-stack.ts            # Tech stack detection from manifest files
│   ├── index.ts                 # Public exports
│   ├── context-agent.test.ts    # Unit tests for the agent
│   ├── domain-rules.test.ts     # Unit tests for domain rules loading
│   ├── file-filter.test.ts      # Unit tests for file filtering
│   ├── issue-parser.test.ts     # Unit tests for issue parsing
│   └── tech-stack.test.ts       # Unit tests for tech stack detection
├── spec.md                      # Original spec
├── claude-plan.md               # This file
└── ...                          # Other planning artifacts
```

### Agent Factory: createContextAgent

**Signature:** `createContextAgent(options: { github: GitHubClient; logger?: Logger }): Agent<ContextAgentInput, ContextOutput>`

**Input type (ContextAgentInput):**
```typescript
interface ContextAgentInput {
  mode: "pr" | "repo";
  owner: string;
  repo: string;
  number?: number;         // Required if mode === "pr"
  config: CodeReviewConfig;
}
```

This is NOT a schema change — it's the input the CLI commands pass to the agent. The `Agent` interface from `pipeline/types.ts` is generic: `Agent<TInput, TOutput>`.

**Agent properties:**
- `name`: `"ContextAgent"`
- `idempotent`: `true` (pure data fetching, safe to retry)

### run() Method — PR Mode

When `input.mode === "pr"`:

1. **Fetch PR metadata** — call `github.getPR(owner, repo, number)`. Map to the `pr` object's metadata fields. **Capture `head.sha` and `base.sha`** from the response for ref-consistent fetching in subsequent calls.
2. **Fetch changed files** — call `github.getPRFiles(owner, repo, number)`. Apply file filtering (see below). Map `filename` → `path`. Include `previous_filename` → `previousPath` for renamed files.
3. **Fetch full diff** — call `github.getPRDiff(owner, repo, number)`.
4. **Fetch referenced issues** — parse PR description for closing references (including cross-repo patterns like `owner/repo#N`), then fetch each via `github.getReferencedIssues()`. Set to empty array if none found.
5. **Fetch review comments** — call `github.getReviewComments(owner, repo, number)`. Set to empty array if none found.
6. **Load domain rules** — call the domain rules loader, using `base.sha` as the ref (domain rules represent the repo's policy baseline, not PR changes).
7. **Determine default branch** — the base branch from the PR metadata serves as a proxy; or fetch repo info if needed.
8. **Assemble ContextOutput** — combine all fetched data into the output object.

Step 1 must complete first (to capture SHAs). Steps 2-5 can then be parallelized with `Promise.all()`. Step 6 depends on having the base SHA.

### run() Method — Repo Mode

When `input.mode === "repo"`:

1. **Fetch file tree** — call `github.getRepoTree(owner, repo)`. Apply file filtering.
2. **Detect tech stack** — from the file tree, identify manifest files (package.json, go.mod, etc.). Fetch each via `github.getFileContent()` and parse.
3. **Load domain rules** — call the domain rules loader.
4. **Assemble ContextOutput** — combine into output with `repoFiles` array and `techStack`.

---

## 5. File Filtering Module

### Purpose

Filter file lists using `config.ignorePatterns` to remove noise (node_modules, dist, lock files, images, etc.) before passing to downstream agents.

### Implementation

**Function:** `filterFiles(files: T[], patterns: string[], getPath: (f: T) => string): T[]`

Uses `picomatch` (already a dependency) to compile the ignore patterns into a matcher. Returns files that do NOT match any pattern.

**Why a generic function:** In PR mode, files are `{ path, status, additions, ... }` objects. In repo mode, they're `{ path }` objects. The `getPath` accessor handles both.

### Called From

- PR mode: filter the `getPRFiles()` result before including in output
- Repo mode: filter the `getRepoTree()` result before including in output

---

## 6. Domain Rules Loader

### Purpose

Discover and load domain rules and architecture documentation from the repository.

### Strategy: Config First, Then Fallback Search

**Function:** `loadDomainRules(options: { github: GitHubClient; owner: string; repo: string; ref?: string; config: CodeReviewConfig; logger?: Logger }): Promise<{ domainRules: string | null; architectureDoc: string | null }>`

**Steps:**

1. Try `config.domainRulesPath` via `github.getFileContent()`. If found, use it.
2. If not found, search fallback paths in order:
   - `DOMAIN_RULES.md`
   - `.github/DOMAIN_RULES.md`
   - `docs/DOMAIN_RULES.md`
3. Same pattern for architecture doc: try `config.architecturePath` first, then fallback:
   - `ARCHITECTURE.md`
   - `.github/ARCHITECTURE.md`
   - `docs/architecture.md`
4. Return both as strings or null if not found anywhere.

**Error handling:** 404s return null (file not found is normal). Other API errors propagate up (fail fast).

---

## 7. Issue Parser

### Purpose

Extract closing reference issue numbers from a PR description body.

### Implementation

**Function:** `parseClosingReferences(body: string): Array<{ owner?: string; repo?: string; number: number }>`

Parse the PR description for GitHub closing keywords: `close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved` — followed by issue references.

**Supported patterns (case-insensitive):**
- `fixes #123` — same-repo reference
- `fixes: #123` — with colon
- `fixes (#123)` — with parentheses
- `fixes #1, #2, #3` — multiple issues after one keyword
- `fixes owner/repo#123` — cross-repo reference
- `fixes https://github.com/owner/repo/issues/123` — full URL reference

**Implementation:** Case-insensitive regex matching the keyword, optional punctuation (`:`/`(`), then one or more issue references separated by commas. Cross-repo references return `{ owner, repo, number }`. Same-repo references return `{ number }`.

Returns deduplicated array of references. The caller then fetches each issue via the GitHub API.

**Edge case:** Skip matches inside markdown code blocks (`` ` `` or ` ``` `) to avoid false positives from code snippets.

---

## 8. Tech Stack Detector

### Purpose

Detect the project's tech stack by parsing manifest/config files.

### Implementation

**Function:** `detectTechStack(options: { github: GitHubClient; owner: string; repo: string; ref?: string; filePaths: string[]; logger?: Logger }): Promise<TechStack>`

**Steps:**

1. From the file tree, identify known manifest files:
   - `package.json` → Node.js/JavaScript/TypeScript
   - `go.mod` → Go
   - `requirements.txt` / `pyproject.toml` / `setup.py` → Python
   - `Cargo.toml` → Rust
   - `pom.xml` / `build.gradle` → Java
   - `Gemfile` → Ruby
2. For each found manifest, fetch via `github.getFileContent()` and parse:
   - `package.json`: extract `dependencies` and `devDependencies` keys/versions. Detect frameworks from known packages (react, vue, express, next, etc.)
   - `go.mod`: extract module dependencies
   - `requirements.txt`: extract package names and versions
   - Other manifests: extract what's parseable
3. Derive `languages` from which manifests exist.
4. Derive `frameworks` from known dependency names.
5. Return `{ languages, frameworks, dependencies }`.

**Scope:** Keep this practical, not exhaustive. Focus on the manifests most commonly encountered. Unknown manifests are ignored.

---

## 9. Module Exports and Integration

### 02-context-agent/src/index.ts

Export: `createContextAgent`, `ContextAgentInput` type, and the utility functions for testing.

### Integration with CLI Commands

The CLI commands in `01-core-infrastructure/src/commands/shared.ts` already orchestrate agent creation and pipeline execution. The `createContextAgent` factory will be called there, receiving the `GitHubClient` instance and logger. The input object is assembled from the parsed URL and loaded config.

### Pipeline Integration

The pipeline runner in `01-core-infrastructure/src/pipeline/runner.ts` executes agents sequentially. The Context Agent's output passes through `ContextOutputSchema.safeParse()` for validation before being handed to the Analysis Agent.

---

## 10. Error Handling Strategy

### Principle: Fail Fast

All errors propagate up immediately. The pipeline runner handles retries with exponential backoff.

### Specific Error Scenarios

| Scenario | Error Type | Behavior |
|----------|-----------|----------|
| GitHub token missing | `AuthError` | Thrown before any API calls |
| PR not found (404) | `GitHubAPIError` | Thrown, pipeline retries |
| Rate limited (429) | Handled by Octokit throttling plugin | Automatic retry with backoff |
| Repo tree truncated | Warning logged | Continue with partial tree |
| Domain rules file 404 | Return `null` | Not an error — absence is normal |
| Manifest parse failure | Warning logged | Skip that manifest, continue detection |
| Network error | `GitHubAPIError` | Thrown, pipeline retries |
| Sensitive file path | Warning logged | Return null, skip content fetch |
| Contents API returns directory | Return null | Not a file — treat as absent |
| Review comments 403 | Warning logged | Return empty array, continue |
| Referenced issue 404/403 | Warning logged | Skip that issue, continue |

### Input Validation

Validate at the start of `run()`:
- If `mode === "pr"`, `number` must be defined
- `owner` and `repo` must be non-empty strings

Throw descriptive errors for invalid input rather than letting them cascade into confusing API errors.

### Required GitHub Token Scopes

Document in the agent's module-level JSDoc:
- `repo` scope needed for private repositories (PR data, contents, comments)
- `public_repo` sufficient for public repositories
- No additional scopes needed beyond what the existing GitHubClient requires

---

## 11. Implementation Order

This section defines the build sequence, designed so each piece can be tested before the next depends on it.

### Phase 1: Foundation (01-core-infrastructure changes)

1. **Schema extensions** — add new Zod schemas and optional fields to `ContextOutputSchema`
2. **GitHubClient new methods** — `getFileContent`, `getReviewComments`, `getReferencedIssues`. Also extend `getPR` to return `headSha` and `baseSha`.
3. **Update stubs** — add new optional fields to `StubContextAgent`
4. **Tests for new infrastructure** — schema validation, client method mocks

### Phase 2: Utility Modules (02-context-agent)

5. **File filter** — `filterFiles()` using picomatch
6. **Issue reference parser** — `parseClosingReferences()` with cross-repo support
7. **Domain rules loader** — `loadDomainRules()`
8. **Tech stack detector** — `detectTechStack()`
9. **Tests for each utility** — unit tests with mocked GitHub client

### Phase 3: Agent Assembly

10. **Context Agent factory** — `createContextAgent()` wiring everything together
11. **PR mode tests** — mock all dependencies, verify ContextOutput shape
12. **Repo mode tests** — mock all dependencies, verify ContextOutput shape
13. **Integration tests** — full agent execution with mocked GitHub client, validate against schema
