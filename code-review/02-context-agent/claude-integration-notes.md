# Integration Notes — External Review Feedback

## Source: OpenAI GPT-5.2 Review

---

## Suggestions INTEGRATED

### 1. Ref/SHA consistency
**Suggestion:** Capture `head.sha`/`base.sha` from getPR and pass as `ref` to all subsequent API calls.
**Why integrating:** Excellent point. Mid-run PR changes could cause inconsistent data. This is a real race condition.
**How:** Capture SHA from getPR response. Pass as `ref` to getFileContent for domain rules. Document which ref is used where.

### 2. Rename "linked issues" to "referenced issues"
**Suggestion:** Body parsing isn't "officially linked" — rename to "referenced issues" and support cross-repo references.
**Why integrating:** Accurate semantic distinction. Body parsing is heuristic, not the GitHub-official linking mechanism.
**How:** Rename field to `referencedIssues`. Expand issue parser to handle `owner/repo#N` and full URL patterns. Return `{ owner?, repo?, number }`.

### 3. getFileContent: handle directory responses and large files
**Suggestion:** Contents API can return directory listings; handle `Array.isArray()` and symlink/submodule types.
**Why integrating:** Real API gotcha that would cause runtime errors.
**How:** Check response type, return null for directories/symlinks/submodules.

### 4. Sensitive content safeguards
**Suggestion:** Hard-block sensitive paths (.env, .pem, .key) from content fetching.
**Why integrating:** Important security concern — domain rules loader and tech stack detector could accidentally pull secrets.
**How:** Add a deny list of sensitive file patterns checked before any getFileContent call. Logger already has redaction utilities.

### 5. Include comment IDs and rename metadata
**Suggestion:** Add `id` to ReviewCommentSchema; include `previousPath` for renamed files.
**Why integrating:** IDs enable deduplication and linking; rename metadata helps downstream agents reason about file moves.
**How:** Add `id` (number) to comment schema. Add `previousPath` (string, optional) to PRFileSchema.

### 6. Issue parser: expand patterns
**Suggestion:** Handle punctuation variants ("Fixes: #123", "Fixes (#123)"), multiple issues, and cross-repo refs.
**Why integrating:** Real PR descriptions are messy. The parser needs to handle common variants.
**How:** Expand regex patterns, add test fixtures for edge cases.

### 7. Document required GitHub token scopes
**Suggestion:** Document which scopes are needed and handle 403 with clear messages.
**Why integrating:** Important for user experience — unclear auth errors are frustrating.
**How:** Add scope documentation. Handle 403 in getReviewComments/getLinkedIssues gracefully (log warning, return empty).

---

## Suggestions NOT integrating

### 1. Payload size limits / truncation flags
**Why not:** Over-engineering for v1. The existing GitHubClient already handles pagination properly. Downstream agents (Analysis Agent) will handle large inputs by focusing on scored files. We can add limits in a future iteration if real-world usage shows it's needed.

### 2. Partial results + targeted retry (instead of fail fast)
**Why not:** The user explicitly chose "fail fast" in the interview. The pipeline runner's retry logic handles transient failures. Adding partial results would complicate the agent significantly for marginal benefit.

### 3. Concurrency limiting (p-limit)
**Why not:** Octokit's throttling plugin already handles this. Adding another concurrency layer would be redundant. The 5 parallel API calls in PR mode won't trigger rate limits.

### 4. In-memory caching per PR SHA
**Why not:** The agent runs once per pipeline execution. Caching adds complexity with no benefit in the single-run model. If retries are needed, the pipeline runner re-runs the whole agent.

### 5. Monorepo manifest handling
**Why not:** Root-only manifest detection is sufficient for v1. Monorepo support (scanning workspace packages) is a clear future enhancement but adds significant complexity now.

### 6. PR mode tech stack detection
**Why not:** Good observation but low priority. PR mode focuses on the diff and changed files. Tech stack context is most useful in full-repo review mode. Can be added later.

### 7. GitHub Enterprise compatibility
**Why not:** Out of scope for v1. The existing GitHubClient assumes github.com. Enterprise support would require changes throughout the stack, not just the Context Agent.

### 8. Schema validation performance concerns
**Why not:** Zod validation of the ContextOutput object is fast even for large objects. This is a theoretical concern that won't manifest in practice.

### 9. Binary file handling
**Why not:** GitHub API already omits patches for binary files. The `patch: string | null | undefined` type handles this. No special logic needed.

### 10. Repo tree truncation fallback strategy
**Why not:** The existing warning is sufficient for v1. Implementing a fallback (paginated traversal, shallow clone) is complex. Users with very large repos will see the warning and can adjust.
