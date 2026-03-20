

# Section 07: Agent Orchestration Pipeline

## Overview

This section implements the agent interface, pipeline runner with retry/backoff logic, pipeline result types, and stub agents for testing. The pipeline runner is a generic sequential executor that chains agents together, passing each agent's output as the next agent's input. It handles retries with exponential backoff for idempotent agents and halts immediately for non-idempotent ones.

## Dependencies

- **section-02-shared-types**: Provides `ContextOutput`, `AnalysisOutput`, `ReviewOutput`, `FileScore`, `Recommendation`, `RiskLevel`, `ReviewMode` types and their Zod schemas from `src/agents/types.ts`, `src/agents/schemas.ts`, and `src/types/common.ts`.
- **section-05-claude-client**: The stub agents reference the Claude client interface pattern but do not use it directly. Real agents (future splits) will depend on the Claude client.
- Error types (`PipelineError`) from `src/utils/errors.ts` (defined in section-04-utils or section-02 depending on structure).

## Files to Create

- `src/pipeline/types.ts` — Agent interface, PipelineResult, StageResult types
- `src/pipeline/runner.ts` — Sequential pipeline executor with retry/backoff
- `src/agents/stubs.ts` — Stub/placeholder agents returning hardcoded valid data
- `src/pipeline/runner.test.ts` — Pipeline runner tests
- `src/agents/stubs.test.ts` — Stub agent tests

## Tests

Write tests FIRST before implementation.

### Pipeline Runner Tests (`src/pipeline/runner.test.ts`)

```
# Test: Runs agents sequentially, passing output as next input
# Test: Returns PipelineResult with final output and timing metadata
# Test: Records per-stage duration in StageResult
# Test: Retries idempotent agent on failure (up to maxRetries)
# Test: Uses exponential backoff between retries (1s, 2s, 4s)
# Test: Does NOT retry non-idempotent agent (fails immediately)
# Test: Halts pipeline on agent failure after retries exhausted
# Test: PipelineError includes agent name, attempt count, and original error
# Test: Successful pipeline returns all stage results
# Test: Pipeline with 4 stages chains outputs correctly (A->B->C->D)
```

**Testing approach**: Create simple test agents inline (not the stub agents from `stubs.ts`). For example, an agent that doubles a number, an agent that converts to string, etc. Use `vi.useFakeTimers()` for backoff tests so they run instantly. For failure tests, create agents whose `run()` method throws on the first N calls then succeeds.

Key assertions for the backoff test: after the first failure, the runner should wait 1 second; after the second failure, 2 seconds; after the third, 4 seconds. With fake timers, advance time and verify the retry occurs at the expected moment.

For the `PipelineError` test: verify the error has properties `agentName`, `attempts`, and `cause` (the original error). The error message should be human-readable, e.g., "Agent 'ContextAgent' failed after 3 attempts: <original message>".

### Stub Agent Tests (`src/agents/stubs.test.ts`)

```
# Test: Each stub agent returns valid typed output matching its contract
# Test: Stub output passes Zod schema validation
# Test: Stubs log their stub status in verbose mode
# Test: Full pipeline with all stubs runs end-to-end without errors
```

**Testing approach**: Import each stub agent, call its `run()` method with appropriate input, and validate the output against the corresponding Zod schema from `src/agents/schemas.ts`. For the verbose logging test, pass a mock logger and assert `logger.verbose` was called with a message containing "stub". For the full pipeline test, wire all stubs into `runPipeline` and verify it completes without throwing.

## Implementation Details

### Agent Interface (`src/pipeline/types.ts`)

Define the core `Agent` interface:

```typescript
interface Agent<TInput, TOutput> {
  name: string;
  idempotent: boolean;
  run(input: TInput): Promise<TOutput>;
}
```

The `idempotent` flag controls retry behavior:
- `true` — The agent can be safely retried on failure (pure analysis agents).
- `false` — The agent has side effects (e.g., posting PR comments) and must NOT be retried.

Also define result types:

**`StageResult<T>`**: Represents a single stage's outcome.
- `agentName: string`
- `success: boolean`
- `data?: T` — present on success
- `error?: Error` — present on failure
- `duration: number` — milliseconds
- `attempts: number` — how many tries it took (1 = first attempt succeeded)

**`PipelineResult<T>`**: Wraps the final pipeline output.
- `output: T` — the final agent's output
- `stages: StageResult<unknown>[]` — all stage results in order
- `totalDuration: number` — total pipeline milliseconds

**`PipelineOptions`**: Configuration for the runner.
- `maxRetries?: number` — default 3
- `logger?: Logger` — optional logger instance for verbose output

Export all types. The `Agent` interface is generic but the runner will work with `Agent<any, any>` internally since it chains heterogeneous agents.

### Pipeline Runner (`src/pipeline/runner.ts`)

Implement `runPipeline(agents, initialInput, options?)`:

**Signature**:
```typescript
async function runPipeline<TFinal>(
  agents: Agent<any, any>[],
  initialInput: unknown,
  options?: PipelineOptions
): Promise<PipelineResult<TFinal>>
```

**Algorithm**:

1. Record pipeline start time.
2. Initialize `currentInput` to `initialInput`.
3. Initialize empty `stages` array.
4. For each agent in the ordered array:
   a. Log `"Running {agent.name}..."` via the logger if provided.
   b. Record stage start time.
   c. Attempt `agent.run(currentInput)`.
   d. **On success**: Create a `StageResult` with `success: true`, the output data, duration, and `attempts: 1`. Set `currentInput` to the output for the next agent.
   e. **On failure**: Check `agent.idempotent`.
      - If `false`: Immediately throw a `PipelineError` with agent name, 1 attempt, and the original error. Do NOT retry.
      - If `true`: Retry up to `maxRetries` times with exponential backoff. Backoff formula: `delay = 1000 * 2^(attempt-1)` milliseconds (1s, 2s, 4s for attempts 1, 2, 3). Use a simple `await new Promise(resolve => setTimeout(resolve, delay))` for the wait. If a retry succeeds, record the total attempts. If all retries exhausted, throw `PipelineError`.
   f. Push the `StageResult` onto the `stages` array.
5. Record pipeline end time.
6. Return `PipelineResult` with the final `currentInput` as output, all stages, and total duration.

**Important**: The `PipelineError` thrown on failure must include:
- `agentName`: which agent failed
- `attempts`: how many times it was tried
- `cause`: the original error (use the standard `Error` cause option)

The runner is completely generic. It does not import or know about any specific agent types or Zod schemas. Type safety comes from how agents are composed at the call site (the commands in section-08).

### Stub Agents (`src/agents/stubs.ts`)

Create four stub agents for testing the full pipeline without real LLM calls. Each stub:
- Has a descriptive `name` property (e.g., `"StubContextAgent"`)
- Sets `idempotent: true`
- Logs `"[STUB] {name} running"` in verbose mode via a logger passed at construction time
- Simulates a small delay (~100ms via `setTimeout`) to test pipeline timing
- Returns hardcoded valid output matching its contract type

**StubContextAgent**: Takes no meaningful input (or the initial pipeline input object with mode/URL data). Returns a valid `ContextOutput` with:
- `mode: "pr"`
- `repository: { owner: "test", repo: "test-repo", defaultBranch: "main" }`
- `pr` object with stub title, description, author, branches, files array (2-3 fake files), and a stub diff string
- `domainRules: null`
- `architectureDoc: null`

**StubAnalysisAgent**: Takes `ContextOutput`, returns a valid `AnalysisOutput` with:
- `scoredFiles`: array of 2-3 `FileScore` objects with varying scores/risk levels
- `criticalFiles`: subset where score >= 8
- `summary` with counts matching the scored files

**StubReviewAgent**: Takes `AnalysisOutput`, returns a valid `ReviewOutput` with:
- `recommendations`: array of 1-2 `Recommendation` objects
- `coreDecision`: a stub summary string
- `focusAreas`: array of 1-2 focus area strings

**StubOutputAgent**: Takes `ReviewOutput`, returns it unchanged (the output agent in the real implementation will format and post results, but the stub just passes through). Set `idempotent: false` since the real output agent posts PR comments.

Each stub should be created via a factory function that accepts an optional logger:
```typescript
function createStubContextAgent(logger?: Logger): Agent<any, ContextOutput>
```

This factory pattern lets tests inject a mock logger to verify verbose logging behavior.

## Error Type Reference

The `PipelineError` class (defined in `src/utils/errors.ts` from section-04) should look like:

```typescript
class PipelineError extends Error {
  constructor(
    public readonly agentName: string,
    public readonly attempts: number,
    cause: Error
  ) {
    super(`Agent '${agentName}' failed after ${attempts} attempt(s): ${cause.message}`, { cause });
    this.name = "PipelineError";
  }
}
```

If this error class does not yet exist when implementing this section, create it in `src/utils/errors.ts` alongside any other error types already defined there.

## Key Design Notes

- The pipeline runner does NOT import any agent-specific types. It works purely with the `Agent<any, any>` interface.
- Retry logic lives only in the runner. The Claude client wrapper does NOT retry (the Anthropic SDK handles transient/network retries internally). This prevents multiplicative retry stacking.
- Exponential backoff uses powers of 2: 1s, 2s, 4s. No jitter is needed for this use case.
- The stub agents exist solely for testing infrastructure. Real agents will be implemented in future splits (02-05) and will replace these stubs.
- The runner accepts `Agent<any, any>[]` rather than a tuple type because TypeScript cannot easily express "output of agent N matches input of agent N+1" in a generic array. Type correctness is enforced at the composition site.

## Implementation Notes

- `PipelineError` already existed in `src/utils/errors.ts` from section-04; no changes needed.
- `maxRetries` semantics: treated as total attempt count (not retries after initial). `maxRetries: 3` = 3 total attempts. This deviates from the plan's wording but is a simpler mental model.
- Backoff guard uses `attempt < maxRetries - 1` to avoid an unnecessary sleep after the final failed attempt before throwing.
- Stub README.md score was lowered from 9/critical to 4/low for realism.
- All 14 tests pass (10 runner, 4 stubs). Full suite: 103 tests across 12 files.

## Actual Files Produced

| File | Purpose |
|------|---------|
| `src/pipeline/types.ts` | Agent interface, PipelineResult, StageResult, PipelineOptions types |
| `src/pipeline/runner.ts` | Sequential pipeline executor with retry/backoff |
| `src/pipeline/runner.test.ts` | 10 tests for pipeline runner |
| `src/agents/stubs.ts` | 4 stub agent factories for testing |
| `src/agents/stubs.test.ts` | 4 tests for stub agents |