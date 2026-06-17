# TDD Plan: 05-Interactive-Output Module

Testing framework: Vitest 4.1.0, matching existing module conventions.

---

## 2. Input Data Contracts

No tests needed — types are defined in 01-core-infrastructure and validated by Zod schemas there.

---

## 4. Module-Specific Types

No runtime tests needed — these are TypeScript interfaces. Type correctness is enforced at compile time.

---

## 5. Interactive Terminal Flow

**File:** `tests/interactive.test.ts`

Mock `@inquirer/prompts` (`select`, `input`) using `vi.mock()`.

### 5.2 Review Summary Header
- Test: displays PR title, file counts, recommendation count, core decision
- Test: displays focus areas as bullet list

### 5.3 Recommendation Review Loop
- Test: presents recommendations sorted by severity (critical first), then by score
- Test: "Accept" sets decision and advances to next recommendation
- Test: "Reject" sets decision and advances to next recommendation
- Test: "Add note" prompts for text input, sets annotate decision with note, advances
- Test: "Back" returns to previous recommendation with current decision displayed
- Test: "Back" option not shown on first recommendation (index 0)
- Test: navigating back to annotated item and adding note again overwrites previous note
- Test: loop terminates when all recommendations have been reviewed
- Test: zero recommendations skips review loop entirely
- Test: prompt abort (Ctrl+C) returns null cleanly without throwing

### 5.4 Safe-to-Ignore Display
- Test: displays ignore groups with labels, counts, and descriptions
- Test: handles empty ignore groups array

### 5.5 Final Confirmation
- Test: counts accepted + annotated as approved, excludes rejected
- Test: zero approved recommendations prints message and returns null
- Test: shows "Post as PR comment" only when context mode is "pr" with PR metadata
- Test: "Save as markdown file" always shown
- Test: "Cancel" returns null

### 5.6 Function Signature
- Test: returns `{ approved, destination }` on successful flow
- Test: returns null on cancellation or zero approvals

---

## 6. Formatters

### 6.1 Shared Markdown Helpers

**File:** `tests/formatters/shared.test.ts`

#### formatRecommendationBlock
- Test: formats recommendation with all fields present (file, severity, score, message, humanCheckNeeded, suggestion)
- Test: formats recommendation with minimal fields (file, severity, category, message only)
- Test: includes user note with 📝 prefix when decision is "annotate"
- Test: omits note section when decision is "accept" (no note)

#### formatSafeToIgnoreSection
- Test: formats multiple ignore groups with labels and counts
- Test: returns empty string for empty groups array

#### formatSummaryHeader
- Test: includes total files reviewed count, approved count, core decision
- Test: uses totalFilesReviewed parameter (not hardcoded)

#### sanitizeForGitHub
- Test: neutralizes @mentions by inserting zero-width space (`@org` → `@\u200borg`)
- Test: handles multiple @mentions in same string
- Test: leaves non-mention @ symbols alone (email addresses)
- Test: returns unchanged string when no @mentions present

### 6.2 PR Comment Formatter

**File:** `tests/formatters/pr-comment.test.ts`

- Test: output starts with hidden marker `<!-- code-review-cli:report:v1 -->`
- Test: includes summary header, core decision, recommendations, safe-to-ignore sections
- Test: uses `<details>` blocks when more than 5 safe-to-ignore groups
- Test: does not use `<details>` when 5 or fewer groups
- Test: approved recommendations appear in severity order
- Test: annotated recommendations include user notes

### 6.3 Markdown File Formatter

**File:** `tests/formatters/markdown-file.test.ts`

- Test: starts with YAML frontmatter containing timestamp, reviewMode
- Test: includes prUrl in frontmatter when provided (PR mode)
- Test: omits prUrl from frontmatter when not provided (repo mode)
- Test: body content matches PR comment format (same sections)

---

## 7. Publishers

### 7.1 GitHub Publisher

**File:** `tests/publishers/github.test.ts`

Mock `GitHubClient`.

- Test: calls `createOrUpdatePRComment()` with correct owner, repo, prNumber, body, marker
- Test: logs success message on successful post
- Test: logs success message indicating "updated" vs "created"
- Test: throws on GitHub API failure
- Test: truncates body when exceeding 60k chars, appending truncation notice
- Test: truncation removes lowest-severity recommendations first

### 7.2 File Publisher

**File:** `tests/publishers/file.test.ts`

Mock `fs.writeFile` and `fs.mkdir`.

- Test: writes content to specified file path with utf8 encoding
- Test: creates parent directories recursively when they don't exist
- Test: logs output path on success
- Test: throws on write failure

---

## 8. Output Agent

**File:** `tests/output-agent.test.ts`

Mock all external deps (interactive, formatters, publishers).

- Test: calls runInteractiveReview with correct args
- Test: on null result (cancelled), returns input unchanged without publishing
- Test: on "pr-comment" destination, formats with formatPRComment and publishes via github publisher
- Test: on "markdown-file" destination, formats with formatMarkdownFile and publishes via file publisher
- Test: on "cancel" destination, returns input unchanged
- Test: passes only approved recommendations to formatters
- Test: agent has name "output" and idempotent false

---

## 9. Changes to 01-core-infrastructure

### 9.1 createOrUpdatePRComment

**File:** `01-core-infrastructure/tests/clients/github.test.ts` (or alongside existing GitHubClient tests)

Mock Octokit.

- Test: creates new comment when no existing comment has marker
- Test: updates existing comment when marker found in comment body
- Test: with multiple comments, only updates the one containing marker
- Test: paginates through comments to find marker (marker on page 2)
- Test: does not prepend marker to body (body already contains it)
- Test: returns `{ commentId, updated: true }` on update
- Test: returns `{ commentId, updated: false }` on create
