No previous sections have been written yet. Now I have all the context needed to write section 06.

# Section 06: Publishers

## Overview

This section implements two publisher modules for the 05-interactive-output package:

1. **GitHub Publisher** (`src/publishers/github.ts`) -- posts or updates a PR comment via the GitHubClient from 01-core-infrastructure
2. **File Publisher** (`src/publishers/file.ts`) -- writes a markdown report file to disk

These publishers are the final step in the output pipeline: they take a fully formatted string (produced by the formatters from section 04) and deliver it to the chosen destination.

## Dependencies

- **section-01-setup**: Project scaffolding, `package.json`, `tsconfig.json`, `vitest.config.ts`, and module-specific types (`AnnotatedRecommendation`, `OutputDestination`, etc.) must exist
- **section-02-core-github**: The `GitHubClient` must have the `createOrUpdatePRComment()` method available. This section calls that method but does not implement it.

## File Paths

Source files to create:
- `/home/andrew/code/scratchpad/code-review/05-interactive-output/src/publishers/github.ts`
- `/home/andrew/code/scratchpad/code-review/05-interactive-output/src/publishers/file.ts`

Test files to create:
- `/home/andrew/code/scratchpad/code-review/05-interactive-output/tests/publishers/github.test.ts`
- `/home/andrew/code/scratchpad/code-review/05-interactive-output/tests/publishers/file.test.ts`

---

## Tests

Tests should be written first. The testing framework is Vitest.

### 7.1 GitHub Publisher Tests

**File:** `tests/publishers/github.test.ts`

Mock `GitHubClient` using `vi.fn()` or a manual mock object. The mock should provide a `createOrUpdatePRComment` method that returns `{ commentId: number; updated: boolean }`.

Test cases:

- **Calls `createOrUpdatePRComment()` with correct arguments**: Invoke `publishPRComment` with known owner, repo, prNumber, body, and logger. Assert the mock was called with matching owner, repo, prNumber, body, and the marker string `"<!-- code-review-cli:report:v1 -->"`.

- **Logs success message on successful post**: After a successful call, verify `logger.info` (or equivalent) was called with a message indicating success.

- **Logs success message indicating "updated" vs "created"**: When `createOrUpdatePRComment` returns `{ updated: true }`, the log message should contain "updated". When it returns `{ updated: false }`, the log message should contain "created".

- **Throws on GitHub API failure**: When `createOrUpdatePRComment` rejects, `publishPRComment` should propagate the error (throw).

- **Truncates body when exceeding 60k chars, appending truncation notice**: Provide a body string longer than 60,000 characters. Assert the string passed to `createOrUpdatePRComment` is at most 60,000 characters and ends with a truncation notice containing the text about GitHub comment size limits and suggesting markdown output.

- **Truncation removes lowest-severity recommendations first**: When truncation is needed, the publisher should remove recommendation blocks starting from the lowest severity. This means the body must be parsed or the publisher must accept structured data to perform intelligent truncation. See implementation notes below for the approach.

### 7.2 File Publisher Tests

**File:** `tests/publishers/file.test.ts`

Mock `fs.writeFile` and `fs.mkdir` from `node:fs/promises` using `vi.mock("node:fs/promises")`.

Test cases:

- **Writes content to specified file path with utf8 encoding**: Call `publishMarkdownFile` with content and a file path. Assert `fs.writeFile` was called with the path, content, and `"utf8"` encoding.

- **Creates parent directories recursively when they don't exist**: Assert `fs.mkdir` was called with the parent directory of the file path and `{ recursive: true }`.

- **Logs output path on success**: After a successful write, verify the logger was called with a message containing the output file path.

- **Throws on write failure**: When `fs.writeFile` rejects, `publishMarkdownFile` should propagate the error.

---

## Implementation

### GitHub Publisher (`src/publishers/github.ts`)

#### Function Signature

```typescript
async function publishPRComment(
  githubClient: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
  logger: Logger
): Promise<void>
```

#### Behavior

1. **Size limit check**: Before posting, check if `body.length > 60000`. If exceeded:
   - Truncate the body by removing content from the bottom of the recommendations section. The truncation strategy removes the lowest-severity recommendation blocks first (they appear last because recommendations are sorted severity-descending by the formatter).
   - Append a truncation notice: `"\n\n> ⚠️ Report truncated due to GitHub comment size limits. Run with markdown output for the full report."`
   - Re-check after truncation; repeat removal loop if still over the limit.
   - The simplest approach: split the body on recommendation block delimiters (e.g., `### ` headers or `---` separators within the recommendations section), remove blocks from the end, and rejoin.

2. **Post the comment**: Call `githubClient.createOrUpdatePRComment(owner, repo, prNumber, body, marker)` where `marker` is the constant `"<!-- code-review-cli:report:v1 -->"`.

3. **Log the result**: Inspect the returned `{ commentId, updated }` object. Log an info message like `"PR comment created (ID: {commentId})"` or `"PR comment updated (ID: {commentId})"` depending on the `updated` boolean.

4. **Error handling**: If `createOrUpdatePRComment` throws, log the error and re-throw. The caller (output agent) handles the error.

#### Constants

Define and export the marker constant for reuse:

```typescript
export const PR_COMMENT_MARKER = "<!-- code-review-cli:report:v1 -->";
```

Also define the size limit:

```typescript
const GITHUB_COMMENT_SIZE_LIMIT = 60_000;
```

The `GitHubClient` type and `Logger` type are imported from `01-core-infrastructure`. The exact import path depends on the tsconfig path alias set up in section 01 (expected: `@core/clients/github` or similar).

### File Publisher (`src/publishers/file.ts`)

#### Function Signature

```typescript
async function publishMarkdownFile(
  content: string,
  filePath: string,
  logger: Logger
): Promise<void>
```

#### Behavior

1. **Ensure parent directory exists**: Use `fs.mkdir(path.dirname(filePath), { recursive: true })` from `node:fs/promises` and `node:path`. The `recursive: true` flag means this is a no-op if the directory already exists.

2. **Write the file**: Use `fs.writeFile(filePath, content, "utf8")`.

3. **Log success**: Log an info message like `"Report written to {filePath}"` via the logger.

4. **Error handling**: If either `mkdir` or `writeFile` throws, let the error propagate. The caller handles it.

#### Imports

```typescript
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
```

---

## Export Requirements

Both publishers should be exported from their respective files as named exports. They will be consumed by the output agent (section 07). The `PR_COMMENT_MARKER` constant should also be exported since the formatter (section 04) needs it for embedding the marker in the comment body.

Ensure these are re-exported from `src/index.ts` (set up in section 01) so the output agent can import them from the package root.

---

## Implementation Notes

**Files created:**
- `05-interactive-output/src/publishers/github.ts` - GitHub PR comment publisher with severity-aware truncation
- `05-interactive-output/src/publishers/file.ts` - Markdown file publisher
- `05-interactive-output/tests/publishers/github.test.ts` - 7 tests
- `05-interactive-output/tests/publishers/file.test.ts` - 4 tests

**Also modified:**
- `05-interactive-output/src/index.ts` - Added re-exports for publishers, interactive review, and PR_COMMENT_MARKER

**Deviations from plan:**
- Truncation uses structured block parsing (splits on `**filepath**\n**Severity:**` pattern) to remove lowest-severity blocks first, with simple truncation as fallback (code review finding - user chose severity-aware approach)
- Added error logging via `logger.error` before re-throwing in `publishPRComment` (code review finding)
- Test for "truncation removes lowest-severity first" uses realistic formatted markdown blocks matching the shared formatter output