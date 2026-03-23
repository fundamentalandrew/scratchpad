Now I have all the information needed. Here is the section content.

# Section 07: LLM Scorer

## Overview

This section implements the Claude API scoring orchestration module at `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/scoring/llm-scorer.ts`. The LLM scorer takes file batches (produced by the batch builder from section 06) and a scoring context (with system prompt produced by the prompt builder from section 05), sends them to the Claude API via `ClaudeClient.query()`, and returns validated scoring results.

The scorer processes regular batches sequentially to avoid rate limiting, while large-file batches (marked with `isLargeFile: true`) can be processed in parallel. Each API response is validated against a Zod schema that enforces score range 1-10 and a constrained `changeType` enum.

## Dependencies

- **Section 05 (Prompt Builder):** Provides `buildSystemPrompt()` and `buildBatchPrompt()` functions, plus the `ScoringContext` type.
- **Section 06 (Batch Builder):** Provides `FileBatch` and `ScoringFile` types.
- **Section 01 (Foundation):** Provides internal scoring layer types in `src/scoring/types.ts`.
- **Core Infrastructure (`01-core-infrastructure`):**
  - `ClaudeClient` from `src/clients/claude.ts` -- the `query()` method accepts `{ messages, schema, systemPrompt?, maxTokens? }` and returns `{ data: T, usage }`.
  - `Logger` from `src/utils/logger.ts`.

## File to Create

`/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/scoring/llm-scorer.ts`

## Types

The following types are used by the LLM scorer. They should be defined in (or exported from) `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/scoring/types.ts`:

```typescript
/** Result from a single file's LLM scoring */
type LLMScoringResult = {
  file: string;
  score: number;       // 1-10 (LLM never assigns 0; that is deterministic-layer only)
  reason: string;
  changeType: string;  // one of the LLM changeType enum values
};
```

The following types are expected from sections 05 and 06:

- `ScoringContext` -- contains `domainRules`, `architectureDoc`, `techStack`, `prTitle`, `prDescription`
- `FileBatch` -- contains `files: ScoringFile[]`, `estimatedTokens: number`, `isLargeFile: boolean`

## Zod Response Schema

The LLM scorer defines a Zod schema for structured output validation. This schema is passed to `ClaudeClient.query()` to enforce the response format:

```typescript
import { z } from "zod";

const LLMScoringResponseSchema = z.object({
  scores: z.array(z.object({
    file: z.string(),
    score: z.number().min(1).max(10),
    reason: z.string(),
    changeType: z.enum([
      "logic-change", "api-contract", "schema-change",
      "config-change", "test-change", "ui-change",
      "security-change", "other"
    ]),
  })),
});
```

Key constraints:
- Score is 1-10 (not 0-10). Score 0 is reserved for the deterministic layer's ignored/filtered files.
- `changeType` is a constrained enum of LLM-assigned categories (distinct from the AST classifier's `format-only`, `rename-only`, `moved-function`, `structural` types).

## Interface

```typescript
scoreFiles(
  batches: FileBatch[],
  context: ScoringContext,
  claude: ClaudeClient,
  logger?: Logger,
): Promise<LLMScoringResult[]>;
```

## Implementation Details

### Execution Flow

1. Build the system prompt once using `buildSystemPrompt(context)` from the prompt builder.
2. Separate batches into `regularBatches` (where `isLargeFile === false`) and `largeBatches` (where `isLargeFile === true`).
3. Process regular batches **sequentially** -- iterate and `await` each one. This avoids Claude API rate limits.
4. Process large-file batches **in parallel** using `Promise.all()` -- they are independent, isolated-context calls.
5. For each batch:
   - Build the user message using `buildBatchPrompt(batch)` from the prompt builder.
   - Call `claude.query()` with the system prompt, user message, `LLMScoringResponseSchema`, and appropriate `maxTokens` (default 4096 is fine).
   - Extract the `scores` array from the validated response.
6. Flatten all results into a single `LLMScoringResult[]` and return.

### Error Handling

- If a `claude.query()` call fails, the error propagates up. The agent-level retry mechanism (from the pipeline runner in core infrastructure, which respects `idempotent: true`) handles retries by re-running the entire agent.
- No per-batch retry logic within the scorer itself.
- If a batch returns fewer scores than files sent (the LLM missed a file), this is acceptable for v1 -- the orchestration layer in section 08 handles missing scores during merge.

### ClaudeClient.query() Call Shape

Each API call looks like:

```typescript
const response = await claude.query({
  messages: [{ role: "user", content: userPrompt }],
  schema: LLMScoringResponseSchema,
  systemPrompt: systemPrompt,
  maxTokens: 4096,
});
// response.data.scores is LLMScoringResult[]
```

The `ClaudeClient.query()` method (from `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/clients/claude.ts`) accepts a Zod schema and returns `{ data: T, usage: { inputTokens, outputTokens } }`. It handles JSON parsing and Zod validation internally, throwing `ClaudeAPIError` on failures.

## Tests

Test file: `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/llm-scorer.test.ts`

All tests mock `ClaudeClient` -- no real API calls. The mock should implement the `query()` method signature, returning canned responses that match `LLMScoringResponseSchema`.

### Test Stubs

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
// import scoreFiles, types, and schema from the scoring module

describe("llm-scorer", () => {
  // Setup: create a mock ClaudeClient with a vi.fn() for query()
  // Setup: create a sample ScoringContext
  // Setup: create helper to build FileBatch objects

  it("calls ClaudeClient.query() for each batch with correct Zod schema", async () => {
    // Given: 2 regular batches
    // When: scoreFiles is called
    // Then: claude.query() called exactly 2 times
    // And: each call includes LLMScoringResponseSchema as the schema argument
  });

  it("returns LLMScoringResult array with file, score, reason, changeType", async () => {
    // Given: 1 batch with 2 files, mock returns scores for both
    // When: scoreFiles is called
    // Then: result is array of 2 LLMScoringResult objects
    // And: each has file (string), score (number), reason (string), changeType (string)
  });

  it("response schema enforces score 1-10", async () => {
    // Validate LLMScoringResponseSchema directly:
    // - score: 0 should fail validation
    // - score: 11 should fail validation
    // - score: 5 should pass
  });

  it("response schema enforces changeType enum values", async () => {
    // Validate LLMScoringResponseSchema directly:
    // - changeType: "invalid-type" should fail
    // - changeType: "logic-change" should pass
    // - changeType: "api-contract" should pass
  });

  it("regular batches processed sequentially (verify call order)", async () => {
    // Given: 3 regular batches (isLargeFile: false)
    // When: scoreFiles is called
    // Then: mock.query calls happen in order (use timestamps or ordered side effects)
    // Specifically: call N starts only after call N-1 resolves
  });

  it("large file batches can be processed in parallel", async () => {
    // Given: 2 large-file batches (isLargeFile: true) + 0 regular batches
    // When: scoreFiles is called
    // Then: both calls initiated before either resolves (use timing or concurrency detection)
  });

  it("failed batch call propagates error", async () => {
    // Given: mock.query rejects with an error on second call
    // When: scoreFiles is called
    // Then: scoreFiles rejects with same error
  });

  it("system prompt passed from ScoringContext to each API call", async () => {
    // Given: a ScoringContext with specific domainRules
    // When: scoreFiles is called with 2 batches
    // Then: each claude.query() call includes the systemPrompt built from context
  });
});
```

### Mock Setup Guidance

The mock `ClaudeClient` should be structured as:

```typescript
const mockClaude = {
  query: vi.fn(),
} as unknown as ClaudeClient;
```

Configure the mock to return valid responses:

```typescript
mockClaude.query.mockResolvedValue({
  data: {
    scores: [
      { file: "src/index.ts", score: 5, reason: "Logic change in handler", changeType: "logic-change" },
    ],
  },
  usage: { inputTokens: 1000, outputTokens: 200 },
});
```

For sequential ordering tests, use `mockResolvedValueOnce` with different responses per call, or track call timestamps with delayed responses.

### Schema Validation Tests

The `LLMScoringResponseSchema` should be exported (or testable) so that schema constraint tests can call `.safeParse()` directly without going through the full `scoreFiles` flow. This validates the Zod schema independently of the API mocking.

## Integration Notes

- The LLM scorer is called by the orchestration layer (section 08) after batch building.
- The orchestration layer passes `ClaudeClient` instance, pre-built batches, and scoring context.
- Results from `scoreFiles()` are merged with deterministic layer results during output assembly (section 08). The merge logic (LLM score wins if higher than deterministic score) lives in the orchestration layer, not here.
- If no batches are provided (all files were handled by the deterministic layer), `scoreFiles` should return an empty array without making any API calls.