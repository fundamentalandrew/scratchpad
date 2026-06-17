I have enough context now. Let me produce the section content.

# Section 07: Output Agent

## Overview

This section implements the output agent -- the orchestration layer that wires together the interactive review flow (section 05), formatters (sections 03/04), and publishers (section 06) into a single pipeline agent. The agent factory `createOutputAgent` returns an `Agent<ReviewOutput, ReviewOutput>` that runs the full interactive-review-to-publish flow.

**Files to create:**
- `/home/andrew/code/scratchpad/code-review/05-interactive-output/src/output-agent.ts`
- `/home/andrew/code/scratchpad/code-review/05-interactive-output/tests/output-agent.test.ts`

**Files to modify:**
- `/home/andrew/code/scratchpad/code-review/05-interactive-output/src/index.ts` (add `createOutputAgent` to public exports)

## Dependencies

This section depends on:
- **Section 01 (Setup):** Types `UserDecision`, `AnnotatedRecommendation`, `OutputDestination`, `OutputConfig` from `types.ts`; project scaffolding
- **Section 04 (Output Formatters):** `formatPRComment` from `formatters/pr-comment.ts`, `formatMarkdownFile` from `formatters/markdown-file.ts`
- **Section 05 (Interactive):** `runInteractiveReview` from `interactive.ts`
- **Section 06 (Publishers):** `publishPRComment` from `publishers/github.ts`, `publishMarkdownFile` from `publishers/file.ts`
- **01-core-infrastructure:** `Agent` type from `@core/pipeline/types.js`, `Logger` from `@core/utils/logger.js`, `GitHubClient` from `@core/clients/github.js`, `ContextOutput` and `ReviewOutput` from `@core/agents/schemas.js`

## Tests First

**File:** `/home/andrew/code/scratchpad/code-review/05-interactive-output/tests/output-agent.test.ts`

Mock all external dependencies (interactive, formatters, publishers). The test file should use `vi.mock()` to mock:
- `../src/interactive.js` (the `runInteractiveReview` function)
- `../src/formatters/pr-comment.js` (the `formatPRComment` function)
- `../src/formatters/markdown-file.js` (the `formatMarkdownFile` function)
- `../src/publishers/github.js` (the `publishPRComment` function)
- `../src/publishers/file.js` (the `publishMarkdownFile` function)

### Test Cases

1. **Calls `runInteractiveReview` with correct args** -- Verify the agent passes the `ReviewOutput` input, the `contextOutput` from dependencies, and the `logger` to `runInteractiveReview`.

2. **On null result (cancelled), returns input unchanged without publishing** -- When `runInteractiveReview` returns `null`, the agent should return the original `ReviewOutput` and none of the formatters or publishers should be called.

3. **On "pr-comment" destination, formats with `formatPRComment` and publishes via GitHub publisher** -- When interactive returns `{ approved, destination: "pr-comment" }`, the agent calls `formatPRComment` with the review output, approved list, and total files count, then calls `publishPRComment` with the GitHub client, PR metadata (owner, repo, prNumber), formatted body, and logger.

4. **On "markdown-file" destination, formats with `formatMarkdownFile` and publishes via file publisher** -- When interactive returns `{ approved, destination: "markdown-file" }`, the agent calls `formatMarkdownFile` with appropriate metadata (timestamp, prUrl if present, reviewMode), then calls `publishMarkdownFile` with the content, configured file path, and logger.

5. **On "cancel" destination, returns input unchanged** -- When interactive returns `{ approved, destination: "cancel" }`, no formatters or publishers are called, and the original input is returned.

6. **Passes only approved recommendations to formatters** -- The `approved` array from `runInteractiveReview` (which already contains only accepted/annotated items) is what gets passed to the formatter, not the full recommendation list.

7. **Agent has name "output" and idempotent false** -- Verify the agent object returned by `createOutputAgent` has `name === "output"` and `idempotent === false`.

### Test Structure Sketch

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOutputAgent } from "../src/output-agent.js";

// vi.mock() calls for all dependencies

describe("createOutputAgent", () => {
  // Setup: create mock logger, mock githubClient, mock config, mock contextOutput
  // Create agent via createOutputAgent(deps)
  // Build a sample ReviewOutput input

  it("returns agent with correct name and idempotent flag", () => { /* ... */ });

  describe("run()", () => {
    it("calls runInteractiveReview with reviewOutput, contextOutput, logger", async () => { /* ... */ });
    it("returns input unchanged when interactive returns null", async () => { /* ... */ });
    it("formats and publishes PR comment on pr-comment destination", async () => { /* ... */ });
    it("formats and publishes markdown file on markdown-file destination", async () => { /* ... */ });
    it("returns input unchanged on cancel destination", async () => { /* ... */ });
    it("passes only approved recommendations to formatters", async () => { /* ... */ });
  });
});
```

## Implementation Details

### Agent Factory (`output-agent.ts`)

**Function:** `createOutputAgent`

**Signature:**
```typescript
function createOutputAgent(deps: OutputAgentDependencies): Agent<ReviewOutput, ReviewOutput>
```

**Dependencies interface:**
```typescript
interface OutputAgentDependencies {
  logger: Logger;
  githubClient: GitHubClient;
  config: OutputConfig;
  contextOutput: ContextOutput;
}
```

Where `OutputConfig` is:
```typescript
interface OutputConfig {
  markdown: boolean;
  markdownPath: string;
  githubComment: boolean;
}
```

The factory returns an object conforming to the `Agent<ReviewOutput, ReviewOutput>` interface with:
- `name: "output"`
- `idempotent: false` (this agent has side effects: terminal prompts, file writes, API calls)
- `run(input: ReviewOutput): Promise<ReviewOutput>` -- the orchestration method

### Agent Run Logic

The `run()` method implements this flow:

1. **Call interactive review.** Invoke `runInteractiveReview(input, deps.contextOutput, deps.logger)`. This handles all terminal prompts and returns either `{ approved, destination }` or `null`.

2. **Handle null (cancellation).** If the result is `null`, return the input `ReviewOutput` unchanged. No formatting or publishing occurs. This covers both explicit cancellation and the zero-approvals case.

3. **Handle "cancel" destination.** If `destination === "cancel"`, log a message and return input unchanged.

4. **Handle "pr-comment" destination.** 
   - Compute `totalFilesReviewed` from `deps.contextOutput` (e.g., the total number of files in the PR or repo context).
   - Call `formatPRComment(input, result.approved, totalFilesReviewed)` to produce the comment body string.
   - Extract PR metadata from `deps.contextOutput`: `owner`, `repo`, `prNumber`.
   - Call `publishPRComment(deps.githubClient, owner, repo, prNumber, body, deps.logger)`.

5. **Handle "markdown-file" destination.**
   - Build metadata object: `{ timestamp: new Date().toISOString(), prUrl: <from contextOutput if PR mode>, reviewMode: <from contextOutput> }`.
   - Call `formatMarkdownFile(input, result.approved, totalFilesReviewed, metadata)` to produce the file content.
   - Call `publishMarkdownFile(content, deps.config.markdownPath, deps.logger)`.

6. **Return.** Always return the original `ReviewOutput` input unchanged. The output agent is a passthrough in the pipeline -- its value is the side effects (publishing), not data transformation.

### Error Handling

- If the GitHub publisher throws (API failure), the error propagates up. The pipeline's `PipelineError` wrapping handles it. The user can re-run and choose markdown file as fallback.
- If the file publisher throws (write failure), same propagation behavior.
- The interactive flow handles its own Ctrl+C gracefully by returning `null`.

### Extracting `totalFilesReviewed` from Context

The `ContextOutput` from the pipeline passthrough contains information about the files reviewed. The total files count should be extracted from the context -- typically from `contextOutput.files.length` or a similar property depending on the `ContextOutput` schema in `@core/agents/schemas.js`. Check the actual schema to determine the correct field path.

### Public Exports Update

Add to `/home/andrew/code/scratchpad/code-review/05-interactive-output/src/index.ts`:

```typescript
export { createOutputAgent } from "./output-agent.js";
```

This is the primary public API of the module. The `createOutputAgent` factory is what the pipeline runner uses to instantiate this stage.

### Pattern Reference

Follow the same agent factory pattern established in `04-review-agent/src/review-agent.ts`:
- The factory takes a `deps` object with injected dependencies
- Returns an object literal with `name`, `idempotent`, and `async run()` 
- The `run()` method receives typed input and returns typed output
- Context passthrough is accessed from `deps.contextOutput` (injected at construction time, unlike the review agent which reads it from `input.contextPassthrough`)

## Implementation Notes

**Files created:**
- `src/output-agent.ts` - Agent factory with `createOutputAgent`
- `tests/output-agent.test.ts` - 8 tests covering all destinations and edge cases

**Files modified:**
- `src/index.ts` - Added `createOutputAgent` to public exports

**Deviations from plan:**
- Added defensive runtime guard (`if (!deps.contextOutput.pr)`) before accessing PR fields in the pr-comment branch, replacing the non-null assertion `pr!.number`. This was flagged during code review as a crash risk if the interactive layer ever returns "pr-comment" without PR context.
- Added a test for `totalFilesReviewed` in repo mode using markdown-file destination (not in original plan).
- Helper functions `getTotalFilesReviewed` and `buildPrUrl` extracted as module-private utilities for clarity.

**Test count:** 8 tests, all passing.