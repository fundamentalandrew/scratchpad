Now I have everything I need. Here is the section content:

# Section 07: Analysis Agent Context Passthrough

## Overview

This section updates the existing analysis agent in `03-analysis-agent` to populate the `contextPassthrough` field on its output. The `contextPassthrough` field was added to `AnalysisOutputSchema` in section-01 of the review agent plan. The analysis agent must copy its input (`ContextOutput`) into this field so the downstream review agent can access PR metadata, domain rules, and architecture context.

This section also adds tests to the analysis agent to verify:
1. The `contextPassthrough` field is populated with the input `ContextOutput`.
2. All existing analysis agent tests continue to pass (backward compatibility).

## Dependencies

- **section-01-schema-updates** must be completed first. That section adds the optional `contextPassthrough` field to `AnalysisOutputSchema` in `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/schemas.ts`.

## Files to Modify

1. `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/analysis-agent.ts` -- Add `contextPassthrough: input` to the returned `AnalysisOutput` object.
2. `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/analysis-agent-orchestration.test.ts` -- Add a test verifying `contextPassthrough` is present.
3. `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/integration/analysis-agent.test.ts` -- Add a test verifying `contextPassthrough` is present in integration scenarios.

## Tests

Write these tests first, then make them pass by modifying the analysis agent.

### Unit Test Addition (analysis-agent-orchestration.test.ts)

Add a new test to the existing `describe("analysis-agent orchestration")` block in `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/analysis-agent-orchestration.test.ts`:

```
# Test: analysis agent output includes contextPassthrough with the input ContextOutput
```

This test should:
- Create a standard input using the existing `makeInput` helper.
- Set up mocks so at least one file passes through the pipeline (use the same mock patterns already in the file).
- Run the agent and assert that `result.contextPassthrough` equals the input object.
- Also verify the result still conforms to `AnalysisOutputSchema` (the inline schema in this test file will need updating to include the optional `contextPassthrough` field, or the test should import the schema from `@core/agents/schemas.js`).

Additionally, verify backward compatibility:

```
# Test: existing analysis agent tests still pass (backward compat)
```

This is implicit -- all existing tests in the file must continue to pass without modification. The `contextPassthrough` field is optional on the schema, so existing tests that do not check for it will not break. However, the inline `AnalysisOutputSchema` at the top of the unit test file does NOT include `contextPassthrough`. The Zod `.parse()` call on line 495 uses this inline schema. Since Zod's `.parse()` strips unknown keys by default, the existing test on line 484-496 will still pass even with the extra field. No changes to existing tests are needed.

### Integration Test Addition (analysis-agent.test.ts)

Add a new `describe` block or test to `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/integration/analysis-agent.test.ts`:

```
# Test: analysis agent output includes contextPassthrough matching input ContextOutput
```

This test should:
- Use `buildContextOutput` to create an input with at least one file that reaches LLM scoring.
- Run the agent.
- Assert that `result.contextPassthrough` is defined.
- Assert that `result.contextPassthrough.mode` equals the input mode.
- Assert that `result.contextPassthrough.pr.title` equals the input PR title.
- Verify the full output still conforms to `AnalysisOutputSchema` (imported from `@core/agents/schemas.js` -- this import already exists in the integration test file). This will work because section-01 adds `contextPassthrough` as optional to the schema.

### Empty PR Edge Case

```
# Test: contextPassthrough is set even when PR has zero files (empty output path)
```

The `emptyOutput()` helper function in `analysis-agent.ts` currently returns a hardcoded object without `contextPassthrough`. The implementation must be updated so that even when the agent returns early (no PR, or zero files), it still sets `contextPassthrough` to the input. This ensures the review agent always has access to context data regardless of how many files were analyzed.

## Implementation Details

### Change to analysis-agent.ts

The change is minimal. In `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/analysis-agent.ts`:

1. The `emptyOutput()` helper function (line 24) needs to accept the input and include `contextPassthrough`. Change its signature to accept the input parameter and spread `contextPassthrough: input` into its return value.

2. The two early-return sites that call `emptyOutput()` (lines 43 and 48) must pass the `input` argument.

3. The final return statement (lines 195-204) must add `contextPassthrough: input` to the returned object.

Specifically, the return object at line 195 currently returns:
```typescript
return {
  scoredFiles,
  criticalFiles,
  summary: { ... },
};
```

It should become:
```typescript
return {
  scoredFiles,
  criticalFiles,
  summary: { ... },
  contextPassthrough: input,
};
```

And the `emptyOutput` function should become:
```typescript
function emptyOutput(input?: ContextOutput): AnalysisOutput {
  return {
    scoredFiles: [],
    criticalFiles: [],
    summary: { totalFiles: 0, criticalCount: 0, highCount: 0, categories: {} },
    ...(input ? { contextPassthrough: input } : {}),
  };
}
```

The early returns then pass input:
- Line 43: `return emptyOutput(input);`
- Line 48: `return emptyOutput(input);`

### Type Consideration

The `AnalysisOutput` type is inferred from `AnalysisOutputSchema`. After section-01 adds the optional `contextPassthrough` field to that schema, the `AnalysisOutput` type will automatically include `contextPassthrough?: ContextOutput`. No additional type changes are needed in the analysis agent.

### Backward Compatibility

- The `contextPassthrough` field is optional on `AnalysisOutputSchema`, so all existing consumers that do not read this field are unaffected.
- Existing tests use `AnalysisOutputSchema.parse(result)` which will accept the extra field (Zod's default behavior with `.object()` is to strip unknown keys during parse, but since the field is now part of the schema, it will be validated and passed through).
- The analysis agent's `Agent<ContextOutput, AnalysisOutput>` type signature does not change.

## Verification

After implementation, run the following to verify:

1. All existing analysis agent tests pass: `cd /home/andrew/code/scratchpad/code-review/03-analysis-agent && npx vitest run`
2. The new contextPassthrough tests pass.
3. Core infrastructure tests still pass: `cd /home/andrew/code/scratchpad/code-review/01-core-infrastructure && npx vitest run`

## Implementation Notes

### Actual Changes Made

**Files modified (as planned):**
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/analysis-agent.ts` — `emptyOutput()` now accepts optional `ContextOutput` param; both early returns and the final return include `contextPassthrough`.
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/analysis-agent-orchestration.test.ts` — Added 2 new tests (contextPassthrough with files, contextPassthrough with empty PR). Updated existing repo-mode test to verify contextPassthrough.
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/integration/analysis-agent.test.ts` — Added 2 new tests (contextPassthrough with files, contextPassthrough with empty PR).

### Deviations from Plan

- **Inline schema replaced with canonical import:** The plan suggested either updating the inline `AnalysisOutputSchema` in the unit test or importing from `@core/agents/schemas.js`. Code review identified the inline schema as stale, so we replaced it with the canonical import to avoid future divergence.
- **Schema validation added to all new tests:** Code review identified that the plan's requirement for schema conformance validation was missing from some tests. Added `AnalysisOutputSchema.parse(result)` checks.
- **Repo mode test updated:** Code review identified that the existing repo-mode early-return path also needed a `contextPassthrough` assertion. Added to existing test.

### Test Count

- 132 total tests in 03-analysis-agent (all passing)
- 4 new tests added (2 unit, 2 integration)
- 1 existing test updated (repo mode)