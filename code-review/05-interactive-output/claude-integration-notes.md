# Integration Notes: OpenAI Review Feedback

## Suggestions Integrated

### 1. Fix marker duplication (§6.2 vs §9.1)
**Feedback:** Both formatter and `createOrUpdatePRComment` add the marker, causing double markers.
**Action:** Formatter owns marker insertion. `createOrUpdatePRComment()` receives marker separately for search but does NOT prepend it to body. This is a single-source-of-truth fix.

### 2. Paginate PR comments
**Feedback:** `listComments()` defaults to 30 per page; marker comment may be missed.
**Action:** Use `octokit.paginate` or set `per_page: 100` and paginate until marker found (or exhausted). Add this to §9.1.

### 3. Clarify `output.console` config
**Feedback:** `output.console` is defined but never used in the flow.
**Action:** Remove `console` from output config. MVP is interactive-only; there's no non-interactive path. Removing unused config prevents confusion.

### 4. Handle prompt cancellation (Ctrl+C)
**Feedback:** `@inquirer/prompts` throws on user abort; unhandled = stack trace.
**Action:** Wrap prompt calls to catch abort errors and return `null` cleanly from `runInteractiveReview`. Add to §5.3.

### 5. Specify "edit note" behavior on back navigation
**Feedback:** When user navigates back to an annotated recommendation and selects "Add note" again, behavior is undefined.
**Action:** Overwrite the existing note. Add this to §5.3 back navigation section.

### 6. Rename `totalPRFiles` to `totalFilesReviewed`
**Feedback:** In repo mode, "totalPRFiles" is misleading.
**Action:** Rename parameter across formatters to `totalFilesReviewed`. Source is total files from context (PR file count in PR mode, analyzed file count in repo mode).

### 7. Add comment size limit handling
**Feedback:** GitHub comment max is ~65k chars. Large reviews could exceed this.
**Action:** Add truncation logic in `publishPRComment`: if body exceeds 60k chars, truncate recommendations to fit and append a "full report saved to file" note. Add to §7.1.

### 8. Sanitize @mentions in GitHub output
**Feedback:** LLM-generated content may contain `@org/team` mentions, causing notification spam.
**Action:** Add a `sanitizeForGitHub(text: string)` helper in `formatters/shared.ts` that neutralizes `@` mentions (prefix with zero-width space). Apply to recommendation messages and suggestions before formatting PR comments.

### 9. More specific marker string
**Feedback:** Generic marker could match other tools' comments.
**Action:** Change marker to `<!-- code-review-cli:report:v1 -->` for specificity.

### 10. Add abort/cancellation test
**Feedback:** Interactive tests should cover prompt abort path.
**Action:** Add test case mocking prompt abort error → `runInteractiveReview` returns `null`.

## Suggestions NOT Integrated

### Config precedence for multiple destinations
**Reason:** Plan already specifies single destination per run with interactive selection. Config flags (`markdown`, `githubComment`) control which options appear in the prompt, not both running simultaneously. This is clear enough as-is.

### Annotate rename to `accept_with_note`
**Reason:** "annotate" is a well-understood action in the context of code review. The plan already specifies that annotated items count as accepted. Renaming adds no clarity and would make the action menu wordier.

### Markdown path safety (refuse paths outside repo)
**Reason:** Over-engineering for MVP. The user explicitly provides the path; restricting it adds friction without meaningful security benefit in a CLI tool.

### Overwrite prompt for existing markdown file
**Reason:** CLI tools conventionally overwrite output files. Adding a prompt would complicate the non-interactive future path. Users can change the path via config.

### Race condition handling for concurrent runs
**Reason:** Edge case for MVP. The update-or-create pattern already handles the common re-run case. True concurrent runs are unlikely for a CLI tool.

### Terminal ANSI escape sanitization
**Reason:** Content comes from our own agents, not arbitrary user input. The agents produce structured JSON. ANSI injection from LLM output is a theoretical concern that doesn't apply to our pipeline's data flow.

### `ContextOutput` field restatement
**Reason:** ContextOutput is defined in 01-core-infrastructure and imported. Restating fields here would create drift. The plan references the type by name, which is sufficient.

### Persist decisions for retry
**Reason:** Over-engineering for MVP. Re-running the interactive review is fast enough. Adding temp file persistence adds complexity without proportional benefit.
