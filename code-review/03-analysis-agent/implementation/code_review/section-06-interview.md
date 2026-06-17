# Code Review Interview: Section 06 - Batch Builder

## Design Decision: Low-Risk Summaries Not Stored on Batch (#4)

The reviewer flagged that summaries aren't stored on the `FileBatch` object for downstream retrieval. However, looking at the actual API surface:

- `buildBatchPrompt(batch, lowRiskSummaries?)` in prompt-builder already takes summaries as a separate parameter
- The orchestrator (section 08) owns the summaries and passes them to the prompt builder directly
- The batch builder's role is token accounting — it adds summary tokens to the smallest batch's estimate so the budget math is correct
- Storing summaries on `FileBatch` would require changing the type definition from section 01, adding coupling between batch-builder and prompt-builder

**Decision:** Keep current approach. The batch builder handles token estimation; the orchestrator handles data routing. This is a cleaner separation of concerns than what the plan suggested.

## Let Go (No Action)

- **#1, #2 Type mismatches with plan:** Code follows actual types from section 01. Plan doc will be updated.
- **#3 Missing warning log:** Minor operability concern. Not adding for a pure computational module.
- **#5, #6 Missing edge case tests:** Low value tests for a well-covered module.
- **#7 Batch ordering:** Reasonable default (large batches first).
- **#8 Sort by full path:** Simpler than directory-based sort, produces equivalent grouping in practice.
