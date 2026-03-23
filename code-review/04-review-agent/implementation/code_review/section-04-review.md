# Code Review: Section 04 - Review Agent

## HIGH SEVERITY

1. **Category-based grouping missing in `groupLowRiskFiles`**: The `categories` parameter is accepted but never used. Only groups by directory path.
2. **No error handling around Claude API call**: If `deps.claude.query()` throws, entire agent crashes.
3. **`score` field on recommendations can be `undefined`**: When LLM returns file path not in scoredFiles, score is undefined.

## MEDIUM SEVERITY

4. **No test for category-based grouping**: Missing test for plan's Step 3.1.
5. **No test for >20 file split behavior**: Code implements it but no test coverage.
6. **`deriveSeverity` and `groupLowRiskFiles` exported as public**: Plan defines them as module-private helpers.
7. **PR/repo mode tests assert on prompt content**: Brittle substring checks instead of mocking prompt builders.
8. **`estimatedReviewTime` typed as string literal**: Matches schema definition correctly.

## LOW SEVERITY

9. **Logging is minimal**: No usage/timing logging beyond missing-context warning.
10. **`config` parameter accepted but never used**: Threshold of 4 is hardcoded.
