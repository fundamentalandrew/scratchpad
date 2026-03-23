Now I have all the context needed. Let me produce the section content.

# Section 05: Unit Tests for review-agent.ts

## Overview

This section adds unit tests for the review agent implementation at `/home/andrew/code/scratchpad/code-review/04-review-agent/tests/unit/review-agent.test.ts`. These tests mock the `ClaudeClient` and verify the orchestration logic: mode selection, severity mapping, safe-to-ignore grouping, schema conformance, and edge cases.

**Depends on:** section-04 (the `createReviewAgent` factory function and `run` method must exist)

## File to Create

**`/home/andrew/code/scratchpad/code-review/04-review-agent/tests/unit/review-agent.test.ts`**

## Background Context

### The Agent Under Test

`createReviewAgent` is a factory function in `/home/andrew/code/scratchpad/code-review/04-review-agent/src/review-agent.ts` that accepts `{ claude: ClaudeClient; logger?: Logger; config: CodeReviewConfig }` and returns an `Agent<AnalysisOutput, ReviewOutput>` with:

- `name: "review"`
- `idempotent: true`
- A `run(input: AnalysisOutput)` method that orchestrates the review

### Key Orchestration Logic to Test

The `run` method:

1. Reads `input.contextPassthrough` for PR metadata and context. If missing, returns minimal output.
2. Splits `scoredFiles` by threshold: files scoring 4+ become recommendation candidates; files below 4 become safe-to-ignore candidates.
3. Groups low-score files into `IgnoreGroup` entries deterministically (by category from `summary.categories`, then by top-level directory, sorted by count descending then label ascending).
4. Selects prompt builder based on `contextPassthrough.mode`: `"pr"` uses `buildPRSystemPrompt`, `"repo"` uses `buildRepoSystemPrompt`.
5. Calls `claude.query()` with `LLMReviewResponseSchema` and maps the response to `ReviewOutput`.
6. Injects `score` from analysis data (not LLM) and derives `severity` deterministically: 8-10 = critical, 5-7 = high, 4 = medium.
7. Attaches the computed `safeToIgnore` groups and returns the full `ReviewOutput`.

### Schema Definitions

The `AnalysisOutputSchema` (after section-01 changes) includes an optional `contextPassthrough` field carrying `ContextOutput`. The `ReviewOutputSchema` (after section-01 changes) includes `safeToIgnore: z.array(IgnoreGroupSchema)` and `summary: z.string()`.

The `LLMReviewResponseSchema` is defined in `/home/andrew/code/scratchpad/code-review/04-review-agent/src/types.ts`:

```typescript
LLMReviewResponseSchema = z.object({
  coreDecision: z.string(),
  recommendations: z.array(z.object({
    file: z.string(),
    category: z.string(),
    message: z.string(),
    suggestion: z.string().optional(),
    humanCheckNeeded: z.string(),
    estimatedReviewTime: z.enum(["5", "15", "30", "60"]),
  })),
  focusAreas: z.array(z.string()),
  summary: z.string(),
})
```

### Mock Pattern

Mock `ClaudeClient` using `vi.fn()`. The `query` method should return `{ data: <LLMReviewResponse>, usage: { inputTokens: 0, outputTokens: 0 } }`. Use `as any` for type assertions where needed.

### Config Shape

`CodeReviewConfig` is defined at `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/config/schema.ts`. For tests, use the default config: `configSchema.parse({})` or construct a minimal object.

### Import Paths

Tests should import using the `@core` alias (resolved by vitest config to `../01-core-infrastructure/src`):

- `@core/agents/schemas.js` for schema types (`AnalysisOutput`, `ReviewOutput`, `ReviewOutputSchema`, `ContextOutput`)
- `@core/config/schema.js` for `CodeReviewConfig`
- `@core/clients/claude.js` for `ClaudeClient`

The agent factory is imported from `../../src/review-agent.js`.

## Test Specifications

The test file must contain the following test cases, organized in `describe` blocks:

### describe("createReviewAgent")

**Test: agent.name is "review" and agent.idempotent is true**
Create the agent with a mocked ClaudeClient and verify the `name` and `idempotent` properties.

**Test: empty scoredFiles returns empty recommendations and safeToIgnore**
Provide an `AnalysisOutput` with `scoredFiles: []`, `criticalFiles: []`, empty summary, and a valid `contextPassthrough`. Expect the output to have empty `recommendations` and empty `safeToIgnore`.

**Test: all files below threshold (score < 4) produces only safeToIgnore, no recommendations**
Provide files all scoring below 4. The ClaudeClient should not be called (or called with an empty file list). Output should have empty `recommendations` and populated `safeToIgnore` groups.

**Test: files scoring 4+ appear in recommendations with correct scores from analysis data**
Provide a mix of files. Files at score 4+ should appear in `recommendations` with their `score` field matching the analysis data score, not any value from the LLM.

**Test: severity derived deterministically from score (8-10 critical, 5-7 high, 4 medium)**
Provide files at scores 4, 5, 7, 8, 10. Verify each recommendation's `severity` matches: 4 = medium, 5 = high, 7 = high, 8 = critical, 10 = critical.

**Test: LLM response fields (message, humanCheckNeeded, estimatedReviewTime, category) mapped correctly**
Mock the Claude response with specific values for these fields. Verify they appear on the corresponding recommendations in the output.

**Test: safeToIgnore groups computed from low-score files, not from LLM**
Provide low-score files across different directories. Verify `safeToIgnore` entries are generated deterministically from the file paths and categories, regardless of what the LLM returns.

**Test: safeToIgnore grouped by category then by top-level directory**
Provide files with known categories in `summary.categories` (e.g., "ignored", "format-only") and others without. Verify that category-based groups appear first, then directory-based groups for the remainder.

**Test: safeToIgnore sorted by count descending, label ascending**
Provide files that produce multiple groups with different counts. Verify the output ordering: highest count first; ties broken by label alphabetically ascending.

**Test: PR mode uses buildPRSystemPrompt**
Set `contextPassthrough.mode` to `"pr"`. Verify the system prompt passed to `claude.query()` contains the principal engineer role statement (spy on the `query` call and inspect the `systemPrompt` argument).

**Test: repo mode uses buildRepoSystemPrompt**
Set `contextPassthrough.mode` to `"repo"`. Verify the system prompt passed to `claude.query()` contains the architecture assessment role.

**Test: missing contextPassthrough returns minimal output with warning log**
Provide an `AnalysisOutput` without `contextPassthrough`. The agent should return a minimal `ReviewOutput` with empty recommendations, empty safeToIgnore, and a coreDecision indicating missing context. If a logger is provided, it should receive a warning.

**Test: coreDecision from LLM passed through to output**
Mock the LLM to return a specific `coreDecision` string. Verify it appears unchanged in the output.

**Test: focusAreas from LLM passed through to output**
Mock the LLM to return specific `focusAreas`. Verify they appear unchanged in the output.

**Test: summary from LLM passed through to output**
Mock the LLM to return a specific `summary` string. Verify it appears in the output's `summary` field.

**Test: output conforms to ReviewOutputSchema.parse()**
After running the agent, pass the output through `ReviewOutputSchema.parse()`. It should not throw.

**Test: Claude client called with LLMReviewResponseSchema**
Spy on `claude.query()` and verify the `schema` argument is `LLMReviewResponseSchema` (or an equivalent schema reference).

## Test Helper: Mock AnalysisOutput Builder

Create a helper function within the test file (or a local test utilities section) that builds a valid `AnalysisOutput` with `contextPassthrough`:

```typescript
function buildMockAnalysisInput(overrides?: Partial<...>): AnalysisOutput & { contextPassthrough: ContextOutput }
```

This helper should provide sensible defaults: a `contextPassthrough` with mode `"pr"`, a minimal PR object, and a few scored files at various score levels. Tests override specific fields as needed.

## Test Helper: Mock LLM Response

Create a helper that returns a valid `LLMReviewResponse`:

```typescript
function buildMockLLMResponse(files: string[]): { data: LLMReviewResponse; usage: {...} }
```

This generates a recommendation entry for each provided file path with plausible values for `message`, `humanCheckNeeded`, `estimatedReviewTime`, `category`.

## Implementation Notes

- All tests use vitest (`import { describe, it, expect, vi } from "vitest"`).
- The mock `ClaudeClient` is created as `{ query: vi.fn() } as any`.
- Tests should not import prompt-builder directly; they test the agent's behavior through the `run()` interface and by inspecting what was passed to `claude.query()`.
- The `ReviewOutputSchema` used for conformance checks is the extended version from section-01 (with `safeToIgnore` and `summary` fields).
- Keep test data minimal but sufficient to exercise the logic branch under test.