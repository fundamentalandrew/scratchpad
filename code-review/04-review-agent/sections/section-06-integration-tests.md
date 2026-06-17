# Section 06: Integration Tests

## Status: IMPLEMENTED

## Overview

Integration tests for the review agent at `tests/integration/review-agent.test.ts`. Tests exercise the full pipeline with real prompt construction and mocked `ClaudeClient`, validating `ReviewOutput` schema conformance.

## Deviations from Plan

- Used `defaultConfig` from `@core/config/schema.js` instead of a local helper (simpler, uses actual runtime config)
- Code review added severity assertions to full pipeline test, coreDecision assertions to empty/all-ignored tests
- 9 tests total, all passing

## Dependencies

- **Section 01 (Schema Updates):** Extended `RecommendationSchema` (with `humanCheckNeeded`, `estimatedReviewTime`, `score`), `IgnoreGroupSchema`, extended `ReviewOutputSchema` (with `safeToIgnore`, `summary`), and `contextPassthrough` on `AnalysisOutputSchema` must all be in place.
- **Section 02 (Foundation):** Project scaffolding (`package.json`, `tsconfig.json`, `vitest.config.ts`) must exist.
- **Section 03 (Prompt Builder):** `buildPRSystemPrompt`, `buildRepoSystemPrompt`, and `buildUserPrompt` must be implemented since integration tests exercise real prompt construction.
- **Section 04 (Review Agent):** `createReviewAgent` factory function and its `run()` method must be implemented.
- **Section 05 (Unit Tests):** Unit tests should pass before integration tests are written, ensuring the individual components are correct.

## Background Context

The review agent is the third agent in the pipeline. It receives `AnalysisOutput` (which carries `contextPassthrough` containing the original `ContextOutput`), and produces a `ReviewOutput`. The agent:

1. Splits scored files into high-score (4+) for recommendations and low-score (<4) for safe-to-ignore groups.
2. Groups low-score files deterministically by category then top-level directory.
3. Builds prompts using real prompt builders (PR or repo mode).
4. Calls the Claude API (mocked in tests) with `LLMReviewResponseSchema`.
5. Maps the LLM response to `ReviewOutput`, injecting `score` from analysis data and deriving `severity` deterministically (8-10 critical, 5-7 high, 4 medium).

Integration tests differ from unit tests in that they use **real prompt construction** rather than mocking prompt builders. Only the `ClaudeClient` is mocked.

## Test File

**File:** `/home/andrew/code/scratchpad/code-review/04-review-agent/tests/integration/review-agent.test.ts`

## Tests to Implement

The following test stubs define the integration test suite. Each test exercises the full pipeline from `createReviewAgent` through `agent.run()` with real prompt building and a mocked Claude response.

```
# Test: full pipeline with mixed scores produces valid ReviewOutput
# Test: high-score files (4+) appear as recommendations with humanCheckNeeded
# Test: low-score files appear in safeToIgnore with correct counts
# Test: coreDecision is a non-empty string
# Test: focusAreas is non-empty array
# Test: output conforms to ReviewOutputSchema (Zod parse)
# Test: idempotency - same input produces same output structure
# Test: empty PR (no files) returns empty output
# Test: all-ignored files (score 0) appear only in safeToIgnore
```

## Test Structure and Helpers

Follow the same conventions as the analysis agent integration tests at `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/integration/analysis-agent.test.ts`.

### Helper: `buildAnalysisInput`

Build a realistic `AnalysisOutput` (with `contextPassthrough`) to serve as input to the review agent. This helper should construct the full input shape including:

- `scoredFiles`: an array of `FileScore` objects with `path`, `score`, `riskLevel`, `reasons`
- `criticalFiles`: subset of scored files above critical threshold
- `summary`: with `totalFiles`, `criticalCount`, `highCount`, `categories`
- `contextPassthrough`: a full `ContextOutput` object including `mode`, `repository`, `pr` (with files, title, description, etc.), `domainRules`, `architectureDoc`

The helper should accept overrides for scores and context fields to support different test scenarios.

### Helper: `buildMockClaudeClient`

Create a mock `ClaudeClient` whose `query` method returns a response conforming to `LLMReviewResponseSchema`. The mock should return:

```typescript
{
  data: {
    coreDecision: "...",
    recommendations: [
      { file: "...", category: "...", message: "...", humanCheckNeeded: "...", estimatedReviewTime: "15" }
    ],
    focusAreas: ["..."],
    summary: "..."
  },
  usage: { inputTokens: 500, outputTokens: 200 }
}
```

The helper should accept parameters to customize which files appear in recommendations, so tests can assert correct mapping behavior.

### Helper: `defaultConfig`

Return a minimal `CodeReviewConfig` matching the pattern from the analysis agent tests. Include `model`, `maxRetries`, `ignorePatterns`, and `output` settings.

## Test Descriptions

### Full pipeline with mixed scores produces valid ReviewOutput

Create input with a mix of high-score files (score 4+) and low-score files (score < 4). Mock the Claude client to return recommendations for the high-score files. Call `createReviewAgent` with real dependencies (except Claude) and invoke `agent.run()`. Assert that the result contains both `recommendations` and `safeToIgnore` entries and is structurally valid.

### High-score files (4+) appear as recommendations with humanCheckNeeded

Provide input where some files score 4 or above. The mocked Claude response should include `humanCheckNeeded` strings for these files. Assert that each recommendation in the output has a non-empty `humanCheckNeeded` field, and that the `score` field matches the analysis data (not anything from the LLM).

### Low-score files appear in safeToIgnore with correct counts

Provide input with several files scoring below 4. Assert that these files are grouped into `safeToIgnore` entries. Verify that the `count` field on each ignore group matches the actual number of files grouped. Verify that no low-score file appears in `recommendations`.

### coreDecision is a non-empty string

After running the full pipeline, assert that `result.coreDecision` is a string with length > 0. This value comes directly from the LLM response and should be passed through.

### focusAreas is non-empty array

After running the full pipeline with at least one high-score file, assert that `result.focusAreas` is an array with at least one element. Values come from the LLM response.

### Output conforms to ReviewOutputSchema (Zod parse)

After running the full pipeline, call `ReviewOutputSchema.parse(result)` and assert it does not throw. This validates that all required fields are present and correctly typed, including the new `safeToIgnore` and `summary` fields.

### Idempotency - same input produces same output structure

Run the agent twice with identical input and the same mocked Claude response. Assert that both outputs have the same number of recommendations, the same `safeToIgnore` groups (sorted identically), and matching `coreDecision` and `focusAreas`. This validates the deterministic grouping logic produces stable ordering.

### Empty PR (no files) returns empty output

Provide input with empty `scoredFiles`, empty `criticalFiles`, and zero counts in summary. Assert that the result has empty `recommendations`, empty `safeToIgnore`, and a valid (possibly empty) `coreDecision`. The Claude client should still be called (or handled gracefully if not).

### All-ignored files (score 0) appear only in safeToIgnore

Provide input where all files have score 0 (e.g., lock files, generated files). Assert that `recommendations` is empty and all files appear in `safeToIgnore` groups. The Claude client mock should return an LLM response with empty recommendations.

## Implementation Notes

- Import `ReviewOutputSchema` from `@core/agents/schemas.js` for schema validation assertions.
- Import `createReviewAgent` from `../../src/review-agent.js`.
- The mock Claude client must be cast with `as any` to satisfy the type system (same pattern as analysis agent tests).
- The `contextPassthrough` field on the input is critical; tests for missing `contextPassthrough` belong in the unit test suite (section 05), not here.
- All `safeToIgnore` assertions should check deterministic ordering: sorted by count descending, then label ascending.
- Severity assertions: files with score 8-10 should have severity `"critical"`, 5-7 `"high"`, 4 `"medium"`. These are derived deterministically by the agent, not from the LLM.