# Code Review: Section 07 - Agent Orchestration Pipeline

## Critical Bug: Off-by-one in retry logic causes an extra retry attempt

In `runner.ts`, the retry loop is `for (let attempt = 0; attempt < maxRetries; attempt++)`. This means with `maxRetries: 3`, the agent runs up to 3 times total (attempts 0, 1, 2). However, the plan states: 'Retry up to maxRetries times with exponential backoff' -- meaning the initial attempt plus up to maxRetries retries, for a total of maxRetries + 1 attempts. The current implementation conflates maxRetries with max total attempts. The test passes only because it was written to match the implementation rather than the spec. This is a semantic disagreement with the plan.

## Bug: Unnecessary backoff delay after the last failed attempt

After catching an error, the condition `if (attempt < maxRetries)` is always true inside the loop since `attempt` ranges from 0 to `maxRetries - 1`. This means even on the very last attempt before exhaustion, the runner will sleep before falling through to the `if (!success)` check and throwing. This wastes time. The guard should be `if (attempt < maxRetries - 1)` to avoid sleeping after the final failed attempt.

## Missing: StageResult.error field is never populated on failure

The plan specifies that `StageResult` should have `error?: Error` present on failure. The `StageResult` interface in `types.ts` correctly includes the `error` field, but `runner.ts` never pushes a failed `StageResult` onto the `stages` array -- it throws a `PipelineError` immediately instead. This means the `stages` array only ever contains successful results.

## Missing: Logger verbose vs info mismatch

The runner calls `logger?.info(...)` for stage logging. The stub agents use `logger?.verbose(...)`. Consider whether pipeline-level stage logging should also be `verbose` to avoid noisy output in production.

## Design Concern: Non-idempotent agent failure path

When a non-idempotent agent fails, the throw happens inside the retry loop's catch block. This works correctly but the code structure is fragile.

## Test Gap: No test verifies the default maxRetries value of 3

Every retry test explicitly passes a `maxRetries` option. No test exercises the default.

## Test Gap: No test verifies logger.info is called during pipeline execution

The runner's own logging is untested.

## Minor: Stub agent data -- README.md scored as 'critical' risk

README.md is given a score of 9 and risk level 'critical' which is contrived and could mislead.
