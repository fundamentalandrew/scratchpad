# Implementation Plan: 05-Interactive-Output Module

## 1. Overview

This module is the final stage of a multi-agent code review CLI pipeline. It receives structured review results from the upstream review agent (section 04) and:

1. Presents recommendations interactively in the terminal for user curation
2. Publishes approved recommendations as either a GitHub PR comment or a markdown file

The pipeline architecture is: Context Agent → Analysis Agent → Review Agent → **Output Agent (this module)**.

### Key Design Decisions

- **One-at-a-time review** with accept/reject/annotate per recommendation, plus back navigation
- **Single output destination** per run (PR comment OR markdown file, not both)
- **Update-or-create pattern** for GitHub comments to avoid spam on re-runs
- **No CI/non-interactive support** for MVP — interactive terminal only
- **Silent exit** when no recommendations are accepted (no empty reports)
- **Extend core GitHubClient** with `createOrUpdatePRComment()` rather than local implementation

---

## 2. Input Data Contracts

The module receives `ReviewOutput` from the pipeline:

```typescript
interface ReviewOutput {
  recommendations: Recommendation[];
  coreDecision: string;
  focusAreas: string[];
  safeToIgnore: IgnoreGroup[];
  summary: string;
}
```

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
```

```typescript
interface IgnoreGroup {
  label: string;
  count: number;
  description: string;
}
```

`ContextOutput` is available via pipeline context passthrough and provides PR metadata (number, title, owner, repo), review mode ("pr" | "repo"), and repository info.

The output config from the pipeline determines defaults:

```typescript
output: {
  markdown: boolean;       // default: false
  markdownPath: string;    // default: "./code-review-report.md"
  githubComment: boolean;  // default: false
}
```

---

## 3. Module Structure

```
05-interactive-output/
  src/
    index.ts                    # Public exports: createOutputAgent, types
    output-agent.ts             # Agent factory, orchestration logic
    interactive.ts              # Terminal prompt flow (review loop, final confirmation)
    types.ts                    # Module-specific types
    formatters/
      shared.ts                 # Markdown helper functions (headers, tables, badges)
      pr-comment.ts             # Builds PR comment body string
      markdown-file.ts          # Builds markdown file content string
    publishers/
      github.ts                 # Posts/updates PR comment via GitHubClient
      file.ts                   # Writes markdown file to disk
  tests/
    interactive.test.ts
    formatters/
      shared.test.ts
      pr-comment.test.ts
      markdown-file.test.ts
    publishers/
      github.test.ts
      file.test.ts
    output-agent.test.ts
  package.json
  tsconfig.json
  vitest.config.ts
```

---

## 4. Module-Specific Types

### UserDecision

Each recommendation gets a user decision during the interactive review:

```typescript
type DecisionAction = "accept" | "reject" | "annotate";

interface UserDecision {
  action: DecisionAction;
  note?: string;          // Only present when action is "annotate"
}
```

### AnnotatedRecommendation

A recommendation paired with the user's decision, used as input to formatters:

```typescript
interface AnnotatedRecommendation {
  recommendation: Recommendation;
  decision: UserDecision;
}
```

### OutputDestination

```typescript
type OutputDestination = "pr-comment" | "markdown-file" | "cancel";
```

---

## 5. Interactive Terminal Flow

### 5.1 Dependencies

Add `@inquirer/prompts` as a dependency. This is the modern, tree-shakeable, TypeScript-first rewrite of inquirer. Use `select()` for per-item actions and final destination choice, `input()` for note text entry.

### 5.2 Review Summary Header

Before entering the recommendation loop, display a formatted summary using the logger:
- PR title and total file count (from ContextOutput)
- Number of recommendations and safe-to-ignore count
- Core decision text
- Focus areas as a bullet list

Use chalk for color: green for safe counts, yellow/red for recommendation counts based on severity distribution.

### 5.3 Recommendation Review Loop

**Sorting:** Sort recommendations by severity descending (critical > high > medium > low), then by score descending within the same severity.

**State management:** Maintain an array of `UserDecision | null` (one per recommendation, initially all null). Track a `currentIndex` pointer.

**Per-recommendation display:** For each recommendation at `currentIndex`:
1. Print progress: `"Reviewing {currentIndex + 1}/{total} recommendations"` using logger
2. Print recommendation details: file path, severity badge, score, category, message, humanCheckNeeded (if present), suggestion (if present)
3. Present action choices via `select()`:
   - "Accept" → set decision to `{ action: "accept" }`, advance index
   - "Reject" → set decision to `{ action: "reject" }`, advance index
   - "Add note" → prompt with `input()` for note text, set decision to `{ action: "annotate", note }`, advance index
   - "Back" → decrement index (no-op if already at 0)

**Loop termination:** When `currentIndex >= recommendations.length`, exit loop.

**Back navigation:** When user selects "Back", decrement `currentIndex` and re-display the previous recommendation with its current decision shown (e.g., "Current: Accept" or "Current: Reject" or "Current: Note: {text}" printed before the select menu). The "Back" option should not appear for the first recommendation (index 0). If the user navigates back to an annotated recommendation and selects "Add note" again, the new note overwrites the previous one.

**Prompt cancellation:** Wrap all `@inquirer/prompts` calls to catch abort/cancel errors (Ctrl+C, ESC). On cancellation, `runInteractiveReview` returns `null` cleanly without stack traces.

### 5.4 Safe-to-Ignore Display

After the review loop, display safe-to-ignore groups:
- Header: "✅ Safely Ignore / Skim ({totalCount} Files)"
- Each group: `"{label} ({count} files) — {description}"`
- Informational only, no user action required

### 5.5 Final Confirmation

Count accepted recommendations (decisions with action "accept" or "annotate").

**If zero accepted:** Print "No recommendations to post." via logger and return — no output destination prompt.

**If some accepted:** Present single-select via `select()`:
- "Post as PR comment" — only shown if context mode is "pr" and PR metadata is available
- "Save as markdown file"
- "Cancel"

### 5.6 Function Signature

```typescript
async function runInteractiveReview(
  reviewOutput: ReviewOutput,
  contextOutput: ContextOutput,
  logger: Logger
): Promise<{
  approved: AnnotatedRecommendation[];
  destination: OutputDestination;
} | null>
```

Returns `null` if user cancels or no recommendations accepted. The `interactive.ts` file exports this function.

---

## 6. Formatters

### 6.1 Shared Markdown Helpers (`formatters/shared.ts`)

Small utility functions for consistent markdown generation across both output formats:

- `formatRecommendationBlock(rec: AnnotatedRecommendation): string` — formats a single recommendation as a markdown block with file path, severity, score, message, humanCheckNeeded, and user note (if present, prefixed with 📝)
- `formatSafeToIgnoreSection(groups: IgnoreGroup[]): string` — formats the safe-to-ignore section
- `formatSummaryHeader(reviewOutput: ReviewOutput, approvedCount: number, totalFilesReviewed: number): string` — formats the top summary section with emoji headers
- `sanitizeForGitHub(text: string): string` — neutralizes `@` mentions by inserting a zero-width space after `@` to prevent notification spam. Applied to LLM-generated content (recommendation messages, suggestions) before inclusion in PR comments.

These helpers use template literals, not a library. They produce markdown strings that render identically on GitHub and in standalone `.md` files.

### 6.2 PR Comment Formatter (`formatters/pr-comment.ts`)

```typescript
function formatPRComment(
  reviewOutput: ReviewOutput,
  approved: AnnotatedRecommendation[],
  totalFilesReviewed: number
): string
```

Builds the full PR comment body:
1. Hidden marker: `<!-- code-review-cli:report:v1 -->` (specific to this tool to avoid matching other bots' comments)
2. Summary header (🧠 Strategic PR Review Guide)
3. Core decision section (🎯)
4. Approved recommendations section (🛑 Top N Files Requiring Human Verification)
5. Safe-to-ignore section (✅)

Uses `<details>` blocks if there are more than 5 safe-to-ignore groups to keep the comment compact.

### 6.3 Markdown File Formatter (`formatters/markdown-file.ts`)

```typescript
function formatMarkdownFile(
  reviewOutput: ReviewOutput,
  approved: AnnotatedRecommendation[],
  totalFilesReviewed: number,
  metadata: { timestamp: string; prUrl?: string; reviewMode: string }
): string
```

Same content as PR comment, but prepended with YAML frontmatter metadata block containing timestamp, PR URL (if PR mode), and review mode.

---

## 7. Publishers

### 7.1 GitHub Publisher (`publishers/github.ts`)

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

Calls `githubClient.createOrUpdatePRComment()` (the new method added to core). Logs success/failure via logger. On failure, logs error and throws so the agent can handle it.

**Size limit handling:** Before posting, check if `body.length > 60000`. If exceeded, truncate the recommendations list (remove lowest-severity items from the bottom) and append a note: `"\n\n> ⚠️ Report truncated due to GitHub comment size limits. Run with markdown output for the full report."` Re-check size after truncation; repeat if still over limit.

### 7.2 File Publisher (`publishers/file.ts`)

```typescript
async function publishMarkdownFile(
  content: string,
  filePath: string,
  logger: Logger
): Promise<void>
```

Writes content to the specified file path using `fs.writeFile`. Creates parent directories if needed (`fs.mkdir` with `recursive: true`). Logs the output path on success.

---

## 8. Output Agent

### 8.1 Agent Factory

```typescript
function createOutputAgent(deps: OutputAgentDependencies): Agent<ReviewOutput, ReviewOutput>
```

Dependencies:
```typescript
interface OutputAgentDependencies {
  logger: Logger;
  githubClient: GitHubClient;
  config: OutputConfig;
  contextOutput: ContextOutput;
}
```

Returns an agent with `name: "output"`, `idempotent: false`.

### 8.2 Agent Run Logic

The `run()` method orchestrates the full flow:

1. Call `runInteractiveReview()` to get approved recommendations and destination
2. If result is null (cancelled or no approvals), return input unchanged
3. Based on destination:
   - `"pr-comment"`: format with `formatPRComment()`, publish with `publishPRComment()`
   - `"markdown-file"`: format with `formatMarkdownFile()`, publish with `publishMarkdownFile()`
   - `"cancel"`: log and return
4. Return the original `ReviewOutput` unchanged (passthrough for pipeline)

### 8.3 Error Handling

If GitHub API fails during PR comment posting:
- Log the error
- Throw a descriptive error (pipeline's PipelineError wrapping will handle it)
- The user can re-run and choose markdown file as fallback

---

## 9. Changes to 01-core-infrastructure

### 9.1 New Method on GitHubClient

Add `createOrUpdatePRComment()` to `01-core-infrastructure/src/clients/github.ts`:

```typescript
async createOrUpdatePRComment(
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
  marker: string
): Promise<{ commentId: number; updated: boolean }>
```

**Logic:**
1. Search for existing comment containing `marker` by paginating through all PR comments (`per_page: 100`, using `octokit.paginate` or manual page loop until found or exhausted)
2. If found: update with `octokit.rest.issues.updateComment()`, return `{ commentId, updated: true }`
3. If not found: create with `octokit.rest.issues.createComment()`, return `{ commentId, updated: false }`

Note: The `body` parameter already includes the marker (inserted by the formatter). This method does NOT prepend the marker — it only uses the `marker` parameter for searching existing comments.

This method is generic (takes any marker string) so it can be reused by other tools that post bot comments.

### 9.2 Exports

Export the new method's return type and ensure `GitHubClient` type exports are up to date.

---

## 10. Configuration and Build

### 10.1 package.json

Dependencies:
- `@inquirer/prompts` — interactive terminal prompts

Dev dependencies (matching other modules):
- `vitest`, `typescript`

Scripts: `build`, `test`, `test:watch` matching convention from other modules.

### 10.2 tsconfig.json

Extend pattern from other modules:
- ES2022 target
- Node16 module resolution
- Path alias `@core/*` pointing to `../01-core-infrastructure/src/*`
- Strict mode enabled

### 10.3 vitest.config.ts

Standard vitest config with Node environment, matching other modules.

---

## 11. Testing Strategy

### Unit Tests

- **formatters/shared.test.ts:** Test each helper function with various recommendation shapes (with/without notes, different severities, missing optional fields)
- **formatters/pr-comment.test.ts:** Test full PR comment output, verify marker is present, verify `<details>` blocks appear when groups > 5
- **formatters/markdown-file.test.ts:** Test frontmatter generation, verify metadata fields
- **publishers/github.test.ts:** Mock GitHubClient, verify `createOrUpdatePRComment()` is called with correct args
- **publishers/file.test.ts:** Mock `fs.writeFile`, verify content and path
- **interactive.test.ts:** Mock `@inquirer/prompts` functions, test the review loop logic (accept, reject, annotate, back navigation, zero-recommendations edge case, prompt abort/cancellation returning null)

### Integration Tests

- **output-agent.test.ts:** Mock all external deps (GitHubClient, fs, prompts), test the full orchestration flow from ReviewOutput input to output publishing

### Core Infrastructure Tests

- Test `createOrUpdatePRComment()` with mocked Octokit: test create (no existing comment), test update (existing comment found), test with multiple comments (only marker-matching one updated), test pagination (marker comment on page 2+), test no double-marker prepend
