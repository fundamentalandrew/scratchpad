I now have all the context needed. Let me generate the section content.

# Section 02: Core GitHub -- `createOrUpdatePRComment` Method

## Overview

This section adds a single new method, `createOrUpdatePRComment()`, to the existing `GitHubClient` class in `01-core-infrastructure`. This method implements an update-or-create pattern for PR comments using marker-based matching, enabling the output agent to post review comments without creating duplicates on re-runs.

**Depends on:** section-01-setup (project scaffolding must exist)
**Blocks:** section-06-publishers (which calls this method via `publishPRComment`)

---

## Background

The `GitHubClient` class lives at `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/clients/github.ts`. It already has methods like `getPR`, `getPRFiles`, `postPRComment`, `getFileContent`, etc. The class wraps a `ThrottledOctokit` instance (Octokit with throttling and retry plugins) and uses `GitHubAPIError` for error wrapping and a `Logger` for verbose output.

The existing `postPRComment` method always creates a new comment. The new `createOrUpdatePRComment` method must search for an existing comment containing a specific marker string and update it if found, or create a new one if not.

---

## Tests First

**File:** `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/tests/clients/github-comment.test.ts`

Create this test file alongside the existing source. Mock Octokit's `rest.issues.listComments`, `rest.issues.updateComment`, and `rest.issues.createComment` methods. The `octokit.paginate` helper is already used elsewhere in the class (see `getPRFiles`, `getReviewComments`) and should be mocked for the pagination tests.

Test cases to implement:

1. **Creates new comment when no existing comment has marker** -- Mock `paginate` to return an empty array of comments. Verify `createComment` is called with the correct `owner`, `repo`, `issue_number`, and `body`. Verify the return value is `{ commentId: <id from response>, updated: false }`.

2. **Updates existing comment when marker found in comment body** -- Mock `paginate` to return a list containing one comment whose `body` includes the marker string. Verify `updateComment` is called with that comment's `id` and the new `body`. Verify the return value is `{ commentId: <id>, updated: true }`.

3. **With multiple comments, only updates the one containing marker** -- Mock `paginate` to return three comments, only one of which contains the marker. Verify `updateComment` is called exactly once with the matching comment's ID.

4. **Paginates through comments to find marker (marker on page 2)** -- Since the method uses `octokit.paginate` (which handles pagination automatically), mock `paginate` to return a flat array where the matching comment would logically be beyond the first 100 entries. Verify the marker-bearing comment is found and updated.

5. **Does not prepend marker to body** -- The `body` parameter already contains the marker (inserted by the formatter). Verify that the body passed to `createComment` or `updateComment` is exactly the `body` argument, unchanged.

6. **Returns `{ commentId, updated: true }` on update** -- Covered by test 2; assert the exact shape.

7. **Returns `{ commentId, updated: false }` on create** -- Covered by test 1; assert the exact shape.

8. **Throws GitHubAPIError on API failure** -- Mock `paginate` or `createComment` to throw. Verify the error is wrapped in `GitHubAPIError`.

Test stubs should use `vi.fn()` to mock the Octokit methods. The `GitHubClient` constructor requires `{ token, logger }`, so create a mock logger with `vi.fn()` stubs for `verbose`, `warn`, `error`, and `info`.

---

## Implementation

### File to modify: `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/clients/github.ts`

Add the following method to the `GitHubClient` class, after the existing `postPRComment` method:

```typescript
async createOrUpdatePRComment(
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
  marker: string
): Promise<{ commentId: number; updated: boolean }>
```

**Method logic:**

1. Log verbose message: `GitHub API: createOrUpdatePRComment(${owner}/${repo}#${prNumber})`
2. Wrap all API calls in try/catch, throwing `GitHubAPIError` on failure (matching the pattern used by every other method in this class).
3. Paginate through all issue comments using `this.octokit.paginate(this.octokit.rest.issues.listComments, { owner, repo, issue_number: prNumber, per_page: 100 })`. This returns all comments in a single flattened array (Octokit's paginate handles the page iteration).
4. Search the returned comments for one whose `body` includes the `marker` string.
5. **If found:** Call `this.octokit.rest.issues.updateComment({ owner, repo, comment_id: existingComment.id, body })`. Return `{ commentId: existingComment.id, updated: true }`.
6. **If not found:** Call `this.octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body })`. Return `{ commentId: response.data.id, updated: false }`.

Key points:
- The `body` parameter is passed through as-is. The method does NOT prepend or modify the marker -- the caller (the PR comment formatter) is responsible for embedding the marker in the body.
- The `marker` parameter is only used for the `.includes()` search against existing comment bodies.
- Use `this.octokit.paginate` rather than manual page loops -- this matches the existing pattern in `getPRFiles` and `getReviewComments`.

### Return type export

The return type `{ commentId: number; updated: boolean }` is simple enough that it does not need a named interface export. If downstream consumers need it, they can use TypeScript's `Awaited<ReturnType<...>>` utility. No changes to `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/index.ts` are required for this section, since `GitHubClient` is already importable from the module and the new method is available on the class instance.

---

## Error Handling Pattern

Follow the exact error-wrapping pattern from other methods in the class:

```typescript
} catch (e) {
  throw new GitHubAPIError(
    `createOrUpdatePRComment(${owner}/${repo}#${prNumber}) failed: ${(e as Error).message}`,
    { cause: e as Error }
  );
}
```

The `GitHubAPIError` class is imported from `../utils/errors.js` and is already available in the file.

---

## Verification Checklist

- The new method appears on the `GitHubClient` class with the exact signature above
- All tests pass with `npm test` from `/home/andrew/code/scratchpad/code-review/01-core-infrastructure`
- The test file is at `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/tests/clients/github-comment.test.ts`
- No existing methods are modified
- The method uses `this.octokit.paginate` for comment listing (not manual page loops)
- The `body` is never modified by the method -- it is passed through exactly as received