# Code Review: Section 06 - Batch Builder

1. **TYPE MISMATCH WITH PLAN**: Plan says `score` but actual types use `suggestedScore`. Code is internally consistent with real types.

2. **TYPE MISMATCH WITH PLAN - ScoringFile**: Plan defines `metadata` object with `status`/`additions`/`deletions`, but actual type has `status` at top level. Implementation follows real types.

3. **MISSING WARNING LOG**: Plan says to log a warning when budget is very small. Implementation clamps with `Math.max(1, ...)` but never logs.

4. **LOW-RISK SUMMARIES NOT STORED ON BATCH**: Plan says summaries should be stored on the batch for prompt-builder to retrieve. Implementation only adds summary tokens to `estimatedTokens` but doesn't store summaries on the batch. This is a data flow gap.

5. **NO TEST FOR LOW-RISK SUMMARIES WITH ALL LARGE FILES**: Edge case handled in code but untested.

6. **NO TEST FOR EMPTY DIFF**: Plan calls this out but no test covers it.

7. **BATCH ORDERING**: Large batches come first. Not specified in plan, not tested.

8. **SORTING BY FULL PATH NOT DIRECTORY**: Plan says sort by directory; implementation sorts by full path.
