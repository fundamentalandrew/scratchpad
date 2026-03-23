Now I have all the context needed. Let me produce the section content.

# Section 06: Batch Builder

## Overview

This section implements the token-aware file batching system in `batch-builder.ts` within the scoring layer. The batch builder groups files destined for LLM scoring into batches that fit within Claude's context window token limits. It handles large files by isolating them into dedicated batches, sorts files by directory to keep related changes together, and appends low-risk AST-classified summaries to the smallest batch for LLM validation.

## Dependencies

- **section-01-foundation**: Provides the project scaffolding, `package.json`, `tsconfig.json`, `vitest.config.ts`, directory structure, and the scoring layer internal types file at `src/scoring/types.ts`.

The batch builder has no dependency on tree-sitter, Claude client, or any external service. It is a pure computational module.

## File Paths

- **Implementation**: `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/scoring/batch-builder.ts`
- **Tests**: `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/batch-builder.test.ts`
- **Types** (from section-01): `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/scoring/types.ts`

## Types

The batch builder operates on these types, which should be defined in `src/scoring/types.ts` by section-01-foundation. If not yet present, the implementer should add them there.

```typescript
// Actual types as defined in section 01's types.ts:
interface ScoringFile {
  path: string;
  diff: string;
  status: FileStatus;     // "added" | "modified" | "deleted" | "renamed" (top-level)
  metadata?: string;      // optional string metadata
}

interface FileBatch {
  files: ScoringFile[];
  estimatedTokens: number;
  isLargeFile: boolean;
}

interface LowRiskSummary {
  path: string;
  changeType: ClassificationResult["changeType"];
  suggestedScore: number;  // was "score" in original plan
}
```

**Note:** The original plan had `ScoringFile.metadata` as an object with `status`/`additions`/`deletions`, but the actual type from section 01 has `status` as a top-level field and `metadata` as an optional string. Similarly, `LowRiskSummary` uses `suggestedScore` instead of `score`.

**Design deviation:** The plan suggested storing low-risk summaries on the `FileBatch` object. The implementation only accounts for summary tokens in the budget math. The orchestrator (section 08) passes summaries directly to the prompt-builder, keeping batch-builder focused on token estimation.

## Tests First

Create `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/batch-builder.test.ts` with the following test stubs:

```typescript
import { describe, it, expect } from "vitest";
import { buildBatches, estimateTokens } from "../../src/scoring/batch-builder.js";

describe("batch-builder", () => {
  // Helper: create a ScoringFile with a diff of approximately N tokens
  // (N * 4 characters, since heuristic is chars/4)

  describe("estimateTokens", () => {
    it("uses character/4 heuristic", () => {
      // 400 characters -> 100 tokens
    });
  });

  describe("buildBatches", () => {
    it("returns empty batch array for empty file list", () => {
      // buildBatches([], 1000, 200000) -> []
    });

    it("places a single small file in one batch", () => {
      // One file well under budget -> single batch with isLargeFile false
    });

    it("groups multiple small files into one batch", () => {
      // Several files that fit within budget -> single batch
    });

    it("splits files across multiple batches when exceeding budget", () => {
      // Files whose combined tokens exceed per-batch budget -> multiple batches
    });

    it("creates dedicated isLargeFile batch for file exceeding 50% of budget", () => {
      // File with tokens > 50% of per-batch budget -> its own batch with isLargeFile true
    });

    it("sorts files by directory path within batches", () => {
      // Files from different directories -> sorted by path, related files adjacent
    });

    it("subtracts output reserve (4000 tokens) from available budget", () => {
      // Verify effective budget = maxContextTokens * 0.75 - systemPromptTokens - 4000
    });

    it("subtracts system prompt tokens from available budget", () => {
      // Large systemPromptTokens value reduces batch capacity
    });

    it("appends low-risk summaries to the smallest batch", () => {
      // When lowRiskSummaries provided, they attach to batch with fewest tokens
    });

    it("handles case where all files are large", () => {
      // Every file exceeds 50% budget -> each gets dedicated batch
    });
  });
});
```

## Implementation Details

### Function: `estimateTokens`

```typescript
export function estimateTokens(text: string): number;
```

Returns `Math.ceil(text.length / 4)`. This is the simple character-count heuristic used throughout the batching logic. Exported so other modules (like prompt-builder or llm-scorer) can use the same estimation.

### Function: `buildBatches`

```typescript
export function buildBatches(
  files: ScoringFile[],
  systemPromptTokens: number,
  maxContextTokens?: number,
  lowRiskSummaries?: LowRiskSummary[]
): FileBatch[];
```

**Parameters:**
- `files` -- the list of files that need LLM scoring (already filtered and not auto-classified)
- `systemPromptTokens` -- token count of the system prompt (estimated via `estimateTokens`)
- `maxContextTokens` -- defaults to `200_000` (Claude's context window)
- `lowRiskSummaries` -- optional list of AST-classified file summaries to append to one batch for LLM validation

**Constants:**
- `OUTPUT_RESERVE = 4000` -- tokens reserved for the structured JSON response
- `LARGE_FILE_THRESHOLD = 0.5` -- fraction of per-batch budget above which a file gets its own batch
- `CONTEXT_UTILIZATION = 0.75` -- only use 75% of max context to leave safety margin

**Algorithm:**

1. Compute per-batch token budget:
   ```
   budget = (maxContextTokens * CONTEXT_UTILIZATION) - systemPromptTokens - OUTPUT_RESERVE
   ```

2. Sort files by directory path (use `path.dirname()` or split on `/` and sort lexicographically). This keeps related files together in the same batch.

3. Estimate tokens for each file using `estimateTokens(file.diff)`.

4. Separate large files: any file whose estimated tokens exceed `budget * LARGE_FILE_THRESHOLD` goes into its own dedicated `FileBatch` with `isLargeFile: true`.

5. Greedily pack remaining files into batches:
   - Maintain a current batch and running token count
   - For each file, if adding it would exceed `budget`, finalize the current batch and start a new one
   - Add the file to the current batch, increment running token count
   - After all files processed, finalize the last batch (if non-empty)

6. If `lowRiskSummaries` is provided and non-empty, format them as compact text (one line per file, e.g., `"- path -- changeType (score: N)"`) and estimate their token cost. Find the batch with the lowest `estimatedTokens` among non-large-file batches and add the summary text tokens to that batch's estimate. The summaries themselves are stored on the batch (the caller -- prompt-builder -- will format them into the actual prompt text). If no non-large-file batches exist (all files were large), create a new batch solely for the summaries with `isLargeFile: false` and an empty `files` array.

7. Set `estimatedTokens` on each batch to the sum of token estimates for its files (plus summary tokens if applicable).

8. Return the array of `FileBatch` objects. Return an empty array if the input `files` array is empty and there are no low-risk summaries.

### Edge Cases

- **Empty input**: Return `[]`.
- **All large files**: Every file gets its own batch. Low-risk summaries (if any) go into a dedicated small batch.
- **Budget is very small** (e.g., system prompt nearly fills context): Each file gets its own batch. Log a warning if this happens, but do not throw.
- **File with empty diff**: Treat as 0 tokens. Still include in a batch (the LLM can score based on metadata like file path and status).

### Why These Defaults

- **200,000 max context tokens**: Claude's context window. This is a safe default; the caller can override if using a model variant with different limits.
- **75% utilization**: Leaves headroom. Token estimation is approximate (chars/4 is a rough heuristic), so using only 75% of context prevents accidental overflow.
- **4,000 output reserve**: The structured response schema produces a JSON array of scored files. For a batch of ~15 files, this comfortably fits within 4,000 tokens.
- **50% large file threshold**: A file consuming more than half the batch budget would crowd out other files. Isolating it ensures it gets full context attention and other files are not compressed.