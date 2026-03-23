Now I have all the context needed. This section covers plan sections 6.2 (PR Comment Formatter) and 6.3 (Markdown File Formatter).

# Section 04: Output Formatters

## Overview

This section implements two output formatters that transform approved, annotated recommendations into publishable content strings:

1. **PR Comment Formatter** (`src/formatters/pr-comment.ts`) -- builds a GitHub PR comment body with a hidden marker, summary header, core decision, recommendations, and safe-to-ignore sections.
2. **Markdown File Formatter** (`src/formatters/markdown-file.ts`) -- builds a standalone markdown file with YAML frontmatter metadata prepended to the same body content.

Both formatters consume the shared helpers from section 03 (`src/formatters/shared.ts`) and operate as pure functions (no side effects, no I/O).

## Dependencies

- **section-01-setup**: Types (`AnnotatedRecommendation`, `UserDecision`, `ReviewOutput`, `IgnoreGroup`, `Recommendation`) must be defined in `src/types.ts`.
- **section-03-shared-formatters**: The shared helper functions (`formatRecommendationBlock`, `formatSafeToIgnoreSection`, `formatSummaryHeader`, `sanitizeForGitHub`) in `src/formatters/shared.ts` must be implemented.

## Input Data Contracts

The formatters receive these data structures (defined in section 01):

```typescript
interface ReviewOutput {
  recommendations: Recommendation[];
  coreDecision: string;
  focusAreas: string[];
  safeToIgnore: IgnoreGroup[];
  summary: string;
}

interface AnnotatedRecommendation {
  recommendation: Recommendation;
  decision: UserDecision;
}

interface IgnoreGroup {
  label: string;
  count: number;
  description: string;
}
```

## Files to Create

- `05-interactive-output/src/formatters/pr-comment.ts`
- `05-interactive-output/src/formatters/markdown-file.ts`
- `05-interactive-output/tests/formatters/pr-comment.test.ts`
- `05-interactive-output/tests/formatters/markdown-file.test.ts`

---

## Tests

Tests go first. All test files use Vitest.

### PR Comment Formatter Tests

**File:** `05-interactive-output/tests/formatters/pr-comment.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { formatPRComment } from "../../src/formatters/pr-comment";

// Helper factory for test data -- build minimal ReviewOutput and AnnotatedRecommendation fixtures

describe("formatPRComment", () => {
  it("output starts with hidden marker <!-- code-review-cli:report:v1 -->");
  it("includes summary header, core decision, recommendations, safe-to-ignore sections");
  it("uses <details> blocks when more than 5 safe-to-ignore groups");
  it("does not use <details> when 5 or fewer groups");
  it("approved recommendations appear in severity order");
  it("annotated recommendations include user notes");
});
```

**Test details:**

- **Marker test**: Call `formatPRComment` with minimal valid input. Assert the returned string starts with exactly `<!-- code-review-cli:report:v1 -->`.
- **Section presence test**: Call with a ReviewOutput containing a coreDecision, one approved recommendation, and one safe-to-ignore group. Assert the output contains substrings for each section header (the emoji headers from the shared helpers).
- **Details blocks (>5 groups)**: Provide a ReviewOutput with 6 safe-to-ignore groups. Assert output contains `<details>` and `</details>` tags.
- **No details blocks (<=5 groups)**: Provide a ReviewOutput with 3 safe-to-ignore groups. Assert output does NOT contain `<details>`.
- **Severity ordering**: Provide 3 approved recommendations with severities "low", "critical", "medium". Assert that in the output, the critical recommendation text appears before medium, which appears before low.
- **User notes**: Provide an annotated recommendation (decision action "annotate" with a note). Assert the output contains the note text.

### Markdown File Formatter Tests

**File:** `05-interactive-output/tests/formatters/markdown-file.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { formatMarkdownFile } from "../../src/formatters/markdown-file";

describe("formatMarkdownFile", () => {
  it("starts with YAML frontmatter containing timestamp, reviewMode");
  it("includes prUrl in frontmatter when provided (PR mode)");
  it("omits prUrl from frontmatter when not provided (repo mode)");
  it("body content matches PR comment format (same sections)");
});
```

**Test details:**

- **Frontmatter with required fields**: Call with metadata `{ timestamp: "2026-01-15T10:00:00Z", reviewMode: "pr" }`. Assert output starts with `---\n` and contains `timestamp:` and `reviewMode:` lines within the frontmatter block (between first and second `---`).
- **Frontmatter with prUrl**: Call with metadata including `prUrl: "https://github.com/owner/repo/pull/42"`. Assert the frontmatter contains `prUrl:` with the URL.
- **Frontmatter without prUrl**: Call with metadata where `prUrl` is undefined. Assert the frontmatter does NOT contain `prUrl:`.
- **Body content**: Call with the same ReviewOutput and approved recommendations used in the PR comment tests. Assert the content after frontmatter contains the same section headers (core decision, recommendations, safe-to-ignore).

---

## Implementation Details

### PR Comment Formatter

**File:** `05-interactive-output/src/formatters/pr-comment.ts`

```typescript
export function formatPRComment(
  reviewOutput: ReviewOutput,
  approved: AnnotatedRecommendation[],
  totalFilesReviewed: number
): string
```

**Behavior:**

1. Start the output with the hidden HTML comment marker: `<!-- code-review-cli:report:v1 -->`. This marker is used by the GitHub publisher (section 06) to find and update existing comments on re-runs. The formatter inserts it; the `createOrUpdatePRComment` method in core only searches for it.

2. Append the summary header using `formatSummaryHeader(reviewOutput, approved.length, totalFilesReviewed)`.

3. Append a core decision section with the header `## :dart: Core Decision` followed by `reviewOutput.coreDecision`.

4. Append the recommendations section with the header `## :stop_sign: Top N Files Requiring Human Verification` (where N is `approved.length`). Sort approved recommendations by severity descending (critical > high > medium > low), then by score descending within the same severity. For each approved recommendation, call `formatRecommendationBlock(rec)` and concatenate the results. Apply `sanitizeForGitHub()` to the entire recommendations section to neutralize `@` mentions.

5. Append the safe-to-ignore section. If `reviewOutput.safeToIgnore.length > 5`, wrap the output of `formatSafeToIgnoreSection(reviewOutput.safeToIgnore)` in `<details><summary>...</summary>...</details>` tags. Otherwise, include the section directly without collapsible wrapper.

6. Return the complete string.

**Severity sort order map:** `{ critical: 0, high: 1, medium: 2, low: 3 }`. Sort ascending by this map value, then descending by `recommendation.score ?? 0` as tiebreaker.

### Markdown File Formatter

**File:** `05-interactive-output/src/formatters/markdown-file.ts`

```typescript
export function formatMarkdownFile(
  reviewOutput: ReviewOutput,
  approved: AnnotatedRecommendation[],
  totalFilesReviewed: number,
  metadata: { timestamp: string; prUrl?: string; reviewMode: string }
): string
```

**Behavior:**

1. Build YAML frontmatter block. Start with `---\n`, add key-value lines for `timestamp`, `reviewMode`, and optionally `prUrl` (only if defined). Close with `---\n\n`.

2. Generate the body content. This should be identical to the PR comment content minus the hidden HTML marker. Reuse the same shared helpers: `formatSummaryHeader`, `formatRecommendationBlock`, `formatSafeToIgnoreSection`. Apply the same severity sorting to approved recommendations. Do NOT apply `sanitizeForGitHub` since this is a standalone file, not a GitHub comment.

3. Concatenate frontmatter + body and return.

**Implementation note:** To avoid duplicating the body-building logic between `formatPRComment` and `formatMarkdownFile`, consider extracting a private `buildReportBody(reviewOutput, approved, totalFilesReviewed, options?: { sanitize?: boolean })` helper within one of the files or as an unexported function. This is an implementation detail left to the implementer's judgment -- the key requirement is that both formatters produce the same section structure in the body.

---

## Exports

Both formatter functions should be exported from their respective files. They should also be re-exported from `src/index.ts` (set up in section 01) so consumers (the output agent in section 07) can import them.

## Implementation Notes

### Files Created
- `05-interactive-output/src/formatters/pr-comment.ts` — formatPRComment
- `05-interactive-output/src/formatters/markdown-file.ts` — formatMarkdownFile
- `05-interactive-output/tests/formatters/pr-comment.test.ts` — 7 tests
- `05-interactive-output/tests/formatters/markdown-file.test.ts` — 5 tests

### Design Decisions (from code review)
- **buildReportBody moved to shared.ts:** Rather than keeping it as a private helper in pr-comment.ts, it was moved to shared.ts as an exported utility. Both formatters import from shared.ts.
- **No duplicate core decision:** The plan's buildReportBody initially added a separate `## :dart: Core Decision` section, but formatSummaryHeader already renders this. The duplicate was removed.
- **YAML values quoted:** Frontmatter values are wrapped in double quotes for safe YAML parsing of URLs with colons.
- **Re-exports added to index.ts:** formatPRComment and formatMarkdownFile are re-exported from the package entry point.

### Test Coverage
- 12 tests total (7 PR comment + 5 markdown file)
- Covers: marker, section presence, details blocks (3, 5, 6 groups), severity ordering, user notes, frontmatter fields, body content with recommendations