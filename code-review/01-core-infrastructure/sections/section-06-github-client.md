

# Section 06: GitHub API Client

## Overview

This section implements the GitHub API client wrapper at `src/clients/github.ts`. It wraps Octokit with throttling and retry plugins, provides authentication resolution (environment variable, `gh` CLI fallback, config fallback), and exposes typed methods for fetching PR metadata, files, diffs, repo trees, and posting comments.

## Dependencies

- **section-01-project-setup**: Project structure, dependencies installed (`@octokit/rest`, `@octokit/plugin-throttling`, `@octokit/plugin-retry`)
- **section-02-shared-types**: Error types (`AuthError`, `GitHubAPIError`) from `src/utils/errors.ts`; agent contract types for PR file shapes
- **section-04-utils**: `Logger` from `src/utils/logger.ts` for verbose logging

## Files to Create/Modify

- **Create**: `src/clients/github.ts` — GitHub API client class
- **Create**: `src/clients/github.test.ts` — Tests for the client

## Tests

Write tests in `src/clients/github.test.ts`. Mock Octokit entirely — no real API calls.

### Token Resolution Tests

```
# Test: resolveGitHubToken returns GITHUB_TOKEN env var when set
# Test: resolveGitHubToken falls back to gh auth token when env var missing
# Test: resolveGitHubToken falls back to config when gh not installed
# Test: resolveGitHubToken throws AuthError when no token found
# Test: resolveGitHubToken warns when token found in config file
```

For the `gh auth token` fallback test, mock `child_process.execSync`. When testing the "gh not installed" path, have the mock throw an error (simulating the command not being found). When testing the success path, have it return a trimmed token string.

For the "warns when token found in config" test, verify that the injected logger's `warn` method is called with a message about tokens in config files being a security risk.

### API Method Tests

```
# Test: getPR returns typed PR metadata object
# Test: getPRFiles paginates and returns all files
# Test: getPRFiles preserves null patch field (doesn't crash)
# Test: getPRDiff returns unified diff string
# Test: getRepoTree returns array of file paths
# Test: getRepoTree warns on truncated response
# Test: postPRComment posts body to correct PR
```

For `getPRFiles` pagination, mock `octokit.paginate()` to return a multi-page result array and verify all items are included in the output.

For `getPRDiff`, mock `octokit.rest.pulls.get()` with `mediaType: { format: "diff" }` and verify the raw diff string is returned.

For `getRepoTree` truncation, mock the Git Trees API response with `truncated: true` and verify that `logger.warn` is called with a message about incomplete results.

## Implementation Details

### Authentication Resolution

Implement `resolveGitHubToken` as an exported function (not a class method) so it can be tested independently.

**Signature:**
```typescript
export function resolveGitHubToken(config: { githubToken?: string }, logger: Logger): string
```

**Resolution order:**
1. `process.env.GITHUB_TOKEN` — if set, return immediately
2. `gh auth token` via `child_process.execSync` — wrap in try/catch. Use `{ stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 }` to suppress stderr and avoid hanging. Trim whitespace from output. If the command fails (gh not installed, not authenticated), fall through silently.
3. `config.githubToken` — if present, log a warning via `logger.warn()` that storing tokens in config files is a security risk. Return the token.
4. If none found, throw `AuthError` with the message: `"No GitHub authentication found. Set GITHUB_TOKEN env var, install gh CLI, or add githubToken to .codereview.json"`

### Octokit Setup

Create a composed Octokit class using the throttling and retry plugins:

```typescript
import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";

const ThrottledOctokit = Octokit.plugin(throttling, retry);
```

Configure the throttle `onRateLimit` and `onSecondaryRateLimit` handlers to:
- Log the rate limit event via the logger
- Return `true` to auto-retry (up to 2 times — check `options.request.retryCount < 2`)

### GitHubClient Class

**Constructor** accepts:
- `token: string` — the resolved auth token
- `logger: Logger` — for verbose logging

Creates a `ThrottledOctokit` instance with the token and throttle configuration.

### Methods

**`getPR(owner: string, repo: string, number: number)`**

Calls `octokit.rest.pulls.get({ owner, repo, pull_number: number })`. Returns a clean typed object:
```typescript
{
  title: string;
  description: string | null;
  author: string;
  state: string;
  baseBranch: string;
  headBranch: string;
}
```

Map from the Octokit response: `data.title`, `data.body`, `data.user.login`, `data.state`, `data.base.ref`, `data.head.ref`.

**`getPRFiles(owner: string, repo: string, number: number)`**

Uses `octokit.paginate(octokit.rest.pulls.listFiles, { owner, repo, pull_number: number, per_page: 100 })` to get all files across pages. Returns array of:
```typescript
{
  path: string;       // from filename
  status: string;     // added, removed, modified, renamed, etc.
  additions: number;
  deletions: number;
  patch?: string | null;  // may be null for binary files or truncated diffs
}
```

The `patch` field must be preserved as-is (including `null` or `undefined`) — do not default it to an empty string.

**`getPRDiff(owner: string, repo: string, number: number)`**

Fetches the full unified diff as a raw string:
```typescript
const response = await this.octokit.rest.pulls.get({
  owner, repo, pull_number: number,
  mediaType: { format: "diff" }
});
return response.data as unknown as string;
```

The `as unknown as string` cast is necessary because Octokit types the response as the JSON PR object, but the `format: "diff"` media type causes it to return a raw string.

**`postPRComment(owner: string, repo: string, number: number, body: string)`**

Calls `octokit.rest.issues.createComment({ owner, repo, issue_number: number, body })`. Note: PR comments use the Issues API endpoint (`issue_number`, not `pull_number`).

**`getRepoTree(owner: string, repo: string, branch?: string)`**

Fetches the full recursive tree:
```typescript
const response = await this.octokit.rest.git.getTree({
  owner, repo,
  tree_sha: branch ?? "HEAD",
  recursive: "true"   // note: string "true", not boolean
});
```

Filter the tree to only items with `type === "blob"` (files, not directories). Map to an array of file path strings (`item.path`).

Check `response.data.truncated` — if `true`, log a warning: `"Repository tree is truncated (${paths.length} files returned). Results may be incomplete for large repositories."` This is important because the Git Trees API has a limit on the number of items it returns in a single recursive call.

### Error Handling

Wrap all Octokit calls in try/catch. On error, throw `GitHubAPIError` with:
- The original error message
- The method name and parameters for context
- The original error attached for stack trace preservation

### Verbose Logging

Each method should log the API call in verbose mode before making the request:
```
logger.verbose(`GitHub API: getPR(${owner}/${repo}#${number})`)
```

This aids debugging without cluttering normal output.

## Testing Strategy Notes

- Mock Octokit at the module level using `vi.mock("@octokit/rest")` or by injecting a mock Octokit instance
- For `resolveGitHubToken`, mock `child_process.execSync` using `vi.mock("child_process")`
- Temporarily set/restore `process.env.GITHUB_TOKEN` in tests using `beforeEach`/`afterEach` cleanup
- Create a mock logger with `vi.fn()` for each method (`info`, `verbose`, `warn`, `error`) to assert logging behavior
- The throttling and retry plugins do not need to be tested — they are third-party code. Focus tests on the client's own logic: mapping responses, handling edge cases, and token resolution