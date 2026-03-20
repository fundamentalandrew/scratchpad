Now I have all the context needed. Let me generate the section content.

# Section 02: GitHub Client Extensions

## Overview

This section adds three new methods to the `GitHubClient` class in `01-core-infrastructure/src/clients/github.ts` and extends the existing `getPR` method. These methods enable the Context Agent to fetch file content, review comments, and referenced issue details from the GitHub API.

**Depends on:** section-01-schema-extensions (schemas must exist, but the client methods themselves only return plain objects that conform to those schemas)

**Blocks:** sections 05, 06, 07, 08 (domain rules loader, tech stack detector, and both agent modes use these methods)

## File to Modify

`/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/clients/github.ts`

## Tests (Write First)

Add these tests to `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/clients/github.test.ts`. The existing test file already has mock infrastructure set up for Octokit. You need to add new mock functions and extend the mock Octokit class.

### New Mocks Required

Add these hoisted mocks alongside the existing ones at the top of the test file:

- `mockIssuesGet` — for `octokit.rest.issues.get`
- `mockPullsListReviewComments` — for `octokit.rest.pulls.listReviewComments`
- `mockReposGetContent` — for `octokit.rest.repos.getContent`

Update the `MockOctokit` class in the existing `vi.mock("@octokit/rest", ...)` block to wire these into `rest.issues.get`, `rest.pulls.listReviewComments`, and `rest.repos.getContent`.

### Test Descriptions

```typescript
// --- getFileContent ---

// Test: fetches and base64-decodes file content
//   Mock mockReposGetContent to return { data: { type: "file", content: Buffer.from("hello").toString("base64"), encoding: "base64" } }
//   Expect result to equal "hello"

// Test: returns null for 404 (file not found)
//   Mock mockReposGetContent to reject with an error that has status: 404
//   Expect result to be null (no throw)

// Test: returns null when response is array (directory listing)
//   Mock mockReposGetContent to return { data: [{ path: "subdir/file.ts" }] }
//   Expect result to be null

// Test: returns null for symlink/submodule type responses
//   Mock mockReposGetContent to return { data: { type: "symlink", ... } }
//   Expect result to be null

// Test: returns null and logs warning for sensitive file paths (.env, .pem, .key)
//   Call getFileContent with path ".env"
//   Expect result to be null without any API call (mockReposGetContent not called)
//   Expect logger.warn to have been called with a string containing "sensitive"
//   Repeat for paths: "certs/server.pem", "keys/id_rsa", "secrets.json", "app.key", ".credentials"

// Test: passes ref parameter when provided
//   Call getFileContent with ref "abc123"
//   Verify mockReposGetContent was called with { owner, repo, path, ref: "abc123" }

// Test: throws GitHubAPIError for non-404 errors (500, network)
//   Mock mockReposGetContent to reject with an error that has status: 500
//   Expect the call to throw GitHubAPIError

// --- getReviewComments ---

// Test: fetches and maps review comments (id, author, body, path, line, createdAt)
//   Mock mockPaginate to return array of raw GitHub comment objects with user.login, body, path, original_line, created_at
//   Verify returned objects have correct field mapping

// Test: paginates correctly (mock multi-page response)
//   Verify mockPaginate is called with octokit.rest.pulls.listReviewComments and per_page: 100

// Test: handles comments without path/line (non-inline comments)
//   Mock comment with path: undefined, line: undefined
//   Verify returned object has path and line as undefined

// Test: returns empty array on 403 (insufficient permissions)
//   Mock mockPaginate to reject with error having status: 403
//   Expect result to be empty array, logger.warn called

// Test: returns empty array when no comments exist
//   Mock mockPaginate to return []
//   Expect result to be []

// --- getReferencedIssues ---

// Test: fetches same-repo issues by number, returns { number, title, state, body }
//   Mock mockIssuesGet to return issue data for numbers [1, 2]
//   Verify returned array has correct objects

// Test: fetches cross-repo issues using provided owner/repo
//   Pass crossRepoRefs: [{ owner: "other", repo: "lib", number: 5 }]
//   Verify mockIssuesGet called with { owner: "other", repo: "lib", issue_number: 5 }

// Test: skips issues that return 404 (logs warning, returns remaining)
//   Mock mockIssuesGet to resolve for issue 1, reject with status 404 for issue 2
//   Expect result to contain only issue 1, logger.warn called

// Test: skips issues that return 403 (logs warning, returns remaining)
//   Same pattern as 404 but with status 403

// Test: returns empty array when given empty issue list
//   Pass empty issueNumbers and no crossRepoRefs
//   Expect []

// --- getPR (extended) ---

// Test: returns headSha and baseSha alongside existing fields
//   Mock mockPullsGet with data containing head.sha and base.sha
//   Verify result includes headSha and baseSha
//   Verify existing fields (title, description, author, state, baseBranch, headBranch) still present
```

## Implementation Details

### 1. Sensitive File Deny-List (module-level constant)

Define a constant array of glob-like patterns for sensitive files at the module level (not inside the class). Use simple string matching (`.endsWith()`, `.includes()`, or a small set of regexes) rather than pulling in picomatch for this.

Deny-list patterns to match against:
- `.env` files: any path ending in `.env` or containing `.env.` (covers `.env.local`, `.env.production`, etc.)
- Private keys: `.pem`, `.key`, `id_rsa`, `id_ed25519`
- Credentials: `.credentials`, `credentials.json`
- Secrets: files named `secrets.*` (e.g., `secrets.json`, `secrets.yaml`)
- Certificates: `.p12`, `.pfx`

Implement as a helper function: `isSensitivePath(filePath: string): boolean`. Check the basename and extension of the path against the deny-list. This keeps the logic testable and the main method clean.

### 2. Extend `getPR` Return Type

Add `headSha: string` and `baseSha: string` to the return type of `getPR`. In the implementation, extract them from `data.head.sha` and `data.base.sha`. This is a backward-compatible addition (existing callers that destructure specific fields will not break).

Updated return type:
```typescript
Promise<{
  title: string;
  description: string | null;
  author: string;
  state: string;
  baseBranch: string;
  headBranch: string;
  headSha: string;
  baseSha: string;
}>
```

### 3. `getFileContent(owner, repo, path, ref?)`

**Signature:** `async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string | null>`

Steps:
1. Check `isSensitivePath(path)`. If true, log a warning and return `null`.
2. Call `this.octokit.rest.repos.getContent({ owner, repo, path, ...(ref ? { ref } : {}) })`.
3. If the response `data` is an array (directory listing), return `null`.
4. If `data.type` is not `"file"` (e.g., `"symlink"`, `"submodule"`), return `null`.
5. Decode: `Buffer.from(data.content, 'base64').toString('utf-8')`.
6. Return the decoded string.

**Error handling:**
- Catch errors with `status === 404` and return `null`.
- Rethrow all other errors wrapped in `GitHubAPIError`.

### 4. `getReviewComments(owner, repo, prNumber)`

**Signature:** `async getReviewComments(owner: string, repo: string, prNumber: number): Promise<Array<{ id: number; author: string; body: string; path?: string; line?: number; createdAt: string }>>`

Steps:
1. Call `this.octokit.paginate(this.octokit.rest.pulls.listReviewComments, { owner, repo, pull_number: prNumber, per_page: 100 })`.
2. Map each comment: `comment.id` to `id`, `comment.user.login` to `author`, `comment.body` to `body`, `comment.path` to `path` (may be undefined), `comment.original_line || comment.line` to `line`, `comment.created_at` to `createdAt`.
3. Return the mapped array.

**Error handling:**
- Catch errors with `status === 403`. Log a warning about insufficient permissions and return `[]`.
- Rethrow all other errors wrapped in `GitHubAPIError`.

### 5. `getReferencedIssues(owner, repo, issueNumbers, crossRepoRefs?)`

**Signature:**
```typescript
async getReferencedIssues(
  owner: string,
  repo: string,
  issueNumbers: number[],
  crossRepoRefs?: Array<{ owner: string; repo: string; number: number }>
): Promise<Array<{ number: number; title: string; state: string; body?: string; owner?: string; repo?: string }>>
```

Steps:
1. Build a list of fetch tasks: same-repo issues use the provided `owner`/`repo`, cross-repo refs use their own `owner`/`repo`.
2. For each task, call `this.octokit.rest.issues.get({ owner, repo, issue_number })`.
3. Use `Promise.allSettled()` to fetch all in parallel.
4. For fulfilled results, map to `{ number, title, state, body }` (plus `owner`/`repo` for cross-repo).
5. For rejected results with status 404 or 403, log a warning and skip.
6. For rejected results with other statuses, log a warning and skip (don't fail the entire agent for a missing issue).
7. Return the collected results array.

### 6. `getPRFiles` Extension

Extend the return type of `getPRFiles` to include `previousPath?: string` for renamed files. In the mapping function, add: `previousPath: f.previous_filename as string | undefined`. The GitHub API returns `previous_filename` for files with status `"renamed"`.

Updated return type element:
```typescript
{
  path: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string | null;
  previousPath?: string;
}
```

## Notes for Implementer

- The existing mock structure in `github.test.ts` uses `vi.hoisted()` for mock functions and a `MockOctokit` class. Extend this pattern rather than creating a new mock setup.
- The `mockPaginate` mock is already set up and shared between `getPRFiles` and the new `getReviewComments`. Both use `this.octokit.paginate()`. In tests, you can distinguish calls by checking which function reference was passed as the first argument, or simply test them in separate `describe` blocks where `mockPaginate` is reset between tests via `beforeEach`.
- Error objects from Octokit typically have a `status` property (e.g., `{ status: 404, message: "Not Found" }`). When mocking errors, create plain `Error` objects and attach a `status` property.
- The `getPR` extension is backward compatible. Existing tests for `getPR` need updating to include `head.sha` and `base.sha` in the mock data and to verify the new fields in the assertion.