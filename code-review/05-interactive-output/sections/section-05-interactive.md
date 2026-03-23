Now I have all the context needed. Let me write the section content.

# Section 05: Interactive Terminal Flow

## Overview

This section implements the interactive terminal review flow in `05-interactive-output/src/interactive.ts`. The flow presents code review recommendations one at a time in the terminal, lets the user accept, reject, or annotate each one, displays safe-to-ignore items, and prompts for a final output destination. It uses `@inquirer/prompts` for all interactive prompts.

**Depends on:** section-01-setup (types: `UserDecision`, `AnnotatedRecommendation`, `OutputDestination`, `DecisionAction`; also `ReviewOutput`, `ContextOutput`, `Logger` from core)

**Blocks:** section-07-output-agent (which calls `runInteractiveReview`)

---

## File to Create

**`/home/andrew/code/scratchpad/code-review/05-interactive-output/src/interactive.ts`**

---

## Types Used (from section-01-setup types.ts)

These types are defined in section-01-setup and imported here. They are repeated for reference only -- do not redefine them:

```typescript
type DecisionAction = "accept" | "reject" | "annotate";

interface UserDecision {
  action: DecisionAction;
  note?: string; // Only present when action is "annotate"
}

interface AnnotatedRecommendation {
  recommendation: Recommendation;
  decision: UserDecision;
}

type OutputDestination = "pr-comment" | "markdown-file" | "cancel";
```

---

## Function Signature

```typescript
export async function runInteractiveReview(
  reviewOutput: ReviewOutput,
  contextOutput: ContextOutput,
  logger: Logger
): Promise<{
  approved: AnnotatedRecommendation[];
  destination: OutputDestination;
} | null>
```

Returns `null` when the user cancels (Ctrl+C / ESC) or when zero recommendations are accepted.

---

## Implementation Details

### Prompt Cancellation Handling

All calls to `select()` and `input()` from `@inquirer/prompts` must be wrapped in a try/catch. When the user presses Ctrl+C or ESC, `@inquirer/prompts` throws an error. Detect this by checking if the error name is `"ExitPromptError"` (the standard abort error from `@inquirer/prompts`). On cancellation, return `null` cleanly without logging a stack trace.

### Review Summary Header (5.2)

Before the review loop, print a formatted summary to the terminal using the `logger`:

- PR title and total file count (from `contextOutput.pr.files.length` in PR mode, or analyzed file count in repo mode)
- Number of recommendations and safe-to-ignore count (sum of all `safeToIgnore[].count`)
- Core decision text
- Focus areas as a bullet list

Use `chalk` for coloring: green for safe counts, yellow/red for recommendation counts based on severity distribution. Import chalk as a dependency (it should already be available from core or add as peer dependency).

### Recommendation Review Loop (5.3)

**Sorting:** Sort recommendations by severity descending using a severity rank map: `{ critical: 0, high: 1, medium: 2, low: 3 }`. Within the same severity, sort by `score` descending (higher score first). Recommendations without a score sort after those with scores.

**State management:** Create an array `decisions: (UserDecision | null)[]` initialized to all `null` values, one per recommendation. Maintain a `currentIndex` number starting at 0.

**Loop:** Use a `while (currentIndex < sortedRecommendations.length)` loop:

1. Log progress: `"Reviewing {currentIndex + 1}/{total} recommendations"`
2. Print recommendation details: file path, severity badge, score (if present), category, message, humanCheckNeeded (if present), suggestion (if present)
3. If `decisions[currentIndex]` is not null (user navigated back), display the current decision before the prompt (e.g., "Current: Accept" or "Current: Reject" or "Current: Note: {text}")
4. Build choices array for `select()`:
   - `{ name: "Accept", value: "accept" }`
   - `{ name: "Reject", value: "reject" }`
   - `{ name: "Add note", value: "annotate" }`
   - `{ name: "Back", value: "back" }` -- only include this choice when `currentIndex > 0`
5. Handle the selection:
   - `"accept"`: set `decisions[currentIndex] = { action: "accept" }`, increment `currentIndex`
   - `"reject"`: set `decisions[currentIndex] = { action: "reject" }`, increment `currentIndex`
   - `"annotate"`: call `input({ message: "Enter note:" })` to get note text, set `decisions[currentIndex] = { action: "annotate", note }`, increment `currentIndex`
   - `"back"`: decrement `currentIndex` (the existing decision at that index is preserved and shown on re-display)

**Zero recommendations:** If `reviewOutput.recommendations` is empty, skip the review loop entirely.

**Back to annotated item:** When navigating back to a previously annotated recommendation and selecting "Add note" again, the new note overwrites the previous one (simply reassign the decision).

### Safe-to-Ignore Display (5.4)

After the review loop completes, display the safe-to-ignore groups using the logger:

- Header: `"Safely Ignore / Skim ({totalCount} Files)"` where totalCount is the sum of all group counts
- Each group: `"{label} ({count} files) -- {description}"`
- If `safeToIgnore` is empty, skip this section entirely
- This is informational only; no user interaction required

### Final Confirmation (5.5)

Count approved recommendations: those where the decision action is `"accept"` or `"annotate"`.

**If zero approved:** Log `"No recommendations to post."` and return `null`.

**If some approved:** Build the `AnnotatedRecommendation[]` array by pairing each sorted recommendation with its decision, filtering to only accepted/annotated ones. Then present a `select()` prompt:

- `{ name: "Post as PR comment", value: "pr-comment" }` -- only include when `contextOutput.mode === "pr"` and `contextOutput.pr` is present
- `{ name: "Save as markdown file", value: "markdown-file" }` -- always included
- `{ name: "Cancel", value: "cancel" }` -- always included

If the user selects `"cancel"`, return `null`.

Otherwise return `{ approved, destination }`.

---

## Tests

**File:** `/home/andrew/code/scratchpad/code-review/05-interactive-output/tests/interactive.test.ts`

Mock `@inquirer/prompts` using `vi.mock("@inquirer/prompts")`. The mock should make `select` and `input` return controlled values via `vi.fn()`.

Create test helper factories:

- `makeReviewOutput(overrides?)` -- returns a valid `ReviewOutput` with sensible defaults (2-3 recommendations of different severities, a core decision string, focus areas, safe-to-ignore groups)
- `makeContextOutput(overrides?)` -- returns a valid `ContextOutput` in PR mode with PR metadata
- `makeLogger()` -- returns a mock logger object with `vi.fn()` for `info`, `warn`, `error`, `verbose`, `success` (matching the actual `Logger` interface)

### Test Cases

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock("@inquirer/prompts") at top level

describe("runInteractiveReview", () => {
  describe("Review Summary Header", () => {
    it("displays PR title, file counts, recommendation count, core decision");
    it("displays focus areas as bullet list");
  });

  describe("Recommendation Review Loop", () => {
    it("presents recommendations sorted by severity (critical first), then by score");
    it("Accept sets decision and advances to next recommendation");
    it("Reject sets decision and advances to next recommendation");
    it("Add note prompts for text input, sets annotate decision with note, advances");
    it("Back returns to previous recommendation with current decision displayed");
    it("Back option not shown on first recommendation (index 0)");
    it("navigating back to annotated item and adding note again overwrites previous note");
    it("loop terminates when all recommendations have been reviewed");
    it("zero recommendations skips review loop entirely");
    it("prompt abort (Ctrl+C) returns null cleanly without throwing");
  });

  describe("Safe-to-Ignore Display", () => {
    it("displays ignore groups with labels, counts, and descriptions");
    it("handles empty ignore groups array");
  });

  describe("Final Confirmation", () => {
    it("counts accepted + annotated as approved, excludes rejected");
    it("zero approved recommendations prints message and returns null");
    it("shows Post as PR comment only when context mode is pr with PR metadata");
    it("Save as markdown file always shown");
    it("Cancel returns null");
  });

  describe("Return value", () => {
    it("returns { approved, destination } on successful flow");
    it("returns null on cancellation or zero approvals");
  });
});
```

### Key Testing Patterns

**Mocking `select()`:** The mock should return values sequentially. For a 3-recommendation review where the user accepts all, configure `select` to return `"accept"`, `"accept"`, `"accept"`, then `"pr-comment"` (for destination). Use `vi.fn()` with `.mockResolvedValueOnce()` chaining.

**Mocking `input()`:** For the "Add note" path, `input` returns the note text string. Configure with `.mockResolvedValueOnce("my review note")`.

**Testing back navigation:** Configure `select` to return `"accept"` (first item), `"back"` (goes back to first), `"reject"` (re-decide first item), then continue forward. Verify the final decisions array reflects the overwritten decision.

**Testing prompt abort:** Configure `select` to throw an error with `name: "ExitPromptError"`. Verify the function returns `null`.

**Testing sort order:** Provide recommendations with mixed severities and scores. Verify the logger output or the order of `select` calls corresponds to the expected sort order (critical before high before medium before low; higher scores first within same severity).

**Testing "Back" not shown for index 0:** Inspect the `choices` argument passed to the `select` mock on the first call. Verify it does not include a choice with value `"back"`. This requires checking `select.mock.calls[0][0].choices`.

**Testing PR comment option visibility:** When `contextOutput.mode` is `"repo"` (not PR mode), verify the final destination `select` call does not include a choice with value `"pr-comment"`. When mode is `"pr"`, verify it does include that choice.

---

## Implementation Notes

**Files created:**
- `05-interactive-output/src/interactive.ts` - Main interactive review flow
- `05-interactive-output/tests/interactive.test.ts` - 22 tests

**Deviations from plan:**
- Added visual separator (`───`) between recommendations in the review loop for terminal readability (code review finding)
- Used defensive null guard instead of non-null assertion on decisions array (code review finding)
- Added extra test "hides Post as PR comment when context mode is repo" not in original plan
- Logger mock uses `verbose`/`success` matching real `Logger` interface (plan incorrectly specified `debug`)