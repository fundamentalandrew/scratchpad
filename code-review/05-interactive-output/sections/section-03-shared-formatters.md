# Section 03: Shared Formatters

## Overview

This section implements the shared markdown helper functions used by both the PR comment formatter and the markdown file formatter. These are small, pure utility functions that produce consistent markdown strings. They live in `05-interactive-output/src/formatters/shared.ts` with tests in `05-interactive-output/tests/formatters/shared.test.ts`.

## Dependencies

- **section-01-setup** must be completed first (provides `types.ts` with `UserDecision`, `AnnotatedRecommendation`, `DecisionAction` types, plus project scaffolding with `package.json`, `tsconfig.json`, `vitest.config.ts`)
- No external runtime dependencies beyond TypeScript

## Types Used (defined in section-01-setup)

These types are imported from `../types.ts` (created in section-01):

```typescript
type DecisionAction = "accept" | "reject" | "annotate";

interface UserDecision {
  action: DecisionAction;
  note?: string;
}

interface AnnotatedRecommendation {
  recommendation: Recommendation;
  decision: UserDecision;
}
```

The `Recommendation` and `IgnoreGroup` types come from the upstream pipeline (01-core-infrastructure) and have these shapes:

```typescript
interface Recommendation {
  file: string;
  line?: number;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  message: string;
  suggestion?: string;
  humanCheckNeeded?: string;
  estimatedReviewTime?: "5" | "15" | "30" | "60";
  score?: number;
}

interface IgnoreGroup {
  label: string;
  count: number;
  description: string;
}

interface ReviewOutput {
  recommendations: Recommendation[];
  coreDecision: string;
  focusAreas: string[];
  safeToIgnore: IgnoreGroup[];
  summary: string;
}
```

## File to Create

**`/home/andrew/code/scratchpad/code-review/05-interactive-output/src/formatters/shared.ts`**

## Tests First

**File:** `/home/andrew/code/scratchpad/code-review/05-interactive-output/tests/formatters/shared.test.ts`

The test file should cover four exported functions. All tests are pure function tests with no mocking required.

### Test: formatRecommendationBlock

```typescript
import { describe, it, expect } from "vitest";
import {
  formatRecommendationBlock,
  formatSafeToIgnoreSection,
  formatSummaryHeader,
  sanitizeForGitHub,
} from "../../src/formatters/shared";

describe("formatRecommendationBlock", () => {
  it("formats recommendation with all fields present", () => {
    // Provide an AnnotatedRecommendation with all optional fields:
    // file, line, severity, score, category, message, humanCheckNeeded, suggestion
    // decision: { action: "accept" }
    // Assert output contains: file path, severity, score, message, humanCheckNeeded text, suggestion text
  });

  it("formats recommendation with minimal fields only", () => {
    // Provide recommendation with only required fields: file, severity, category, message
    // No line, score, humanCheckNeeded, suggestion
    // decision: { action: "accept" }
    // Assert output contains file, severity, category, message
    // Assert output does NOT contain humanCheckNeeded or suggestion sections
  });

  it("includes user note with pencil emoji prefix when decision is annotate", () => {
    // decision: { action: "annotate", note: "Check this carefully" }
    // Assert output contains "📝" and "Check this carefully"
  });

  it("omits note section when decision is accept with no note", () => {
    // decision: { action: "accept" }
    // Assert output does NOT contain "📝"
  });
});
```

### Test: formatSafeToIgnoreSection

```typescript
describe("formatSafeToIgnoreSection", () => {
  it("formats multiple ignore groups with labels and counts", () => {
    // Provide 2-3 IgnoreGroup objects
    // Assert output contains each label, count, and description
  });

  it("returns empty string for empty groups array", () => {
    // Assert formatSafeToIgnoreSection([]) === ""
  });
});
```

### Test: formatSummaryHeader

```typescript
describe("formatSummaryHeader", () => {
  it("includes total files reviewed count, approved count, core decision", () => {
    // Provide a ReviewOutput with coreDecision, focusAreas, etc.
    // approvedCount: 3, totalFilesReviewed: 15
    // Assert output contains "3", "15", and the core decision text
  });

  it("uses totalFilesReviewed parameter not hardcoded value", () => {
    // Call with totalFilesReviewed: 42
    // Assert "42" appears in output
  });
});
```

### Test: sanitizeForGitHub

```typescript
describe("sanitizeForGitHub", () => {
  it("neutralizes @mentions by inserting zero-width space", () => {
    // Input: "Contact @orgname for help"
    // Assert output contains "@\u200borgname" (zero-width space after @)
  });

  it("handles multiple @mentions in same string", () => {
    // Input: "@alice and @bob should review"
    // Assert both are neutralized
  });

  it("leaves non-mention @ symbols alone (email addresses)", () => {
    // Input: "user@example.com"
    // Assert output is unchanged: "user@example.com"
    // The heuristic: only neutralize @ followed by a word character at word boundary
    // (i.e., @ preceded by whitespace or start-of-string)
  });

  it("returns unchanged string when no @mentions present", () => {
    // Input: "No mentions here"
    // Assert output === input
  });
});
```

## Implementation Details

### formatRecommendationBlock

**Signature:** `formatRecommendationBlock(rec: AnnotatedRecommendation): string`

Produces a markdown block for a single recommendation. Use template literals to build the string. The output structure should be:

- A heading or bold line with the file path and optional line number (e.g., `**path/to/file.ts:42**`)
- Severity displayed as a badge-like text (e.g., `**Severity:** critical`)
- Score if present (e.g., `**Score:** 8/10`)
- Category (e.g., `**Category:** security`)
- The recommendation message text
- If `humanCheckNeeded` is present, a callout or blockquote with that text
- If `suggestion` is present, a section with the suggestion
- If the decision action is `"annotate"` and a note exists, append a line with `📝` prefix and the note text
- Blank line at end for markdown spacing

### formatSafeToIgnoreSection

**Signature:** `formatSafeToIgnoreSection(groups: IgnoreGroup[]): string`

Returns empty string if `groups` is empty. Otherwise produces:

- A header line: `## ✅ Safe to Ignore`
- Each group formatted as: `- **{label}** ({count} files) — {description}`
- Trailing newline

### formatSummaryHeader

**Signature:** `formatSummaryHeader(reviewOutput: ReviewOutput, approvedCount: number, totalFilesReviewed: number): string`

Produces the top summary block:

- Main heading: `## 🧠 Strategic PR Review Guide`
- Stats line showing files reviewed, approved recommendations count, total recommendations
- Core decision text under a `### 🎯 Core Decision` subheading
- Focus areas as a bullet list under a `### Focus Areas` subheading

### sanitizeForGitHub

**Signature:** `sanitizeForGitHub(text: string): string`

Inserts a zero-width space (`\u200b`) after `@` to prevent GitHub from interpreting `@username` as a mention notification. The key requirement is to only neutralize `@` symbols that look like mentions (preceded by whitespace or at start of string, followed by a word character), not `@` in email addresses.

A reasonable regex approach: replace `(^|\s)@(\w)` with `$1@\u200b$2`. This preserves `user@example.com` while neutralizing `@orgname` and `@alice`.

## Downstream Consumers

These functions are consumed by:
- **section-04-output-formatters**: `formatPRComment()` and `formatMarkdownFile()` both call all four helpers
- `sanitizeForGitHub` is specifically called on LLM-generated content (recommendation messages, suggestions) before inclusion in PR comment output

## Implementation Notes

### Files Created
- `05-interactive-output/src/formatters/shared.ts` — all four exported functions
- `05-interactive-output/tests/formatters/shared.test.ts` — 12 tests covering all functions

### Design Decisions (from code review)
- **Sanitization is caller responsibility:** `formatRecommendationBlock` does NOT call `sanitizeForGitHub` internally. Section-04 callers are responsible for sanitizing LLM-generated content before passing to PR comment output. This keeps formatters pure and composable.
- **Regex scope:** The `sanitizeForGitHub` regex uses `(^|\s)@(\w)` as specified in the plan. Parenthetical mentions like `(@orgname)` are not caught, which is an accepted tradeoff — unlikely in LLM output and broadening risks email false positives.

### Test Coverage
- 12 tests, all passing
- Covers: all fields present/minimal, annotate notes, empty groups, empty focusAreas (asserts heading absent), total recommendations count, @mention sanitization, email preservation