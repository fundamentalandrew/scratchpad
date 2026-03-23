I now have all the context needed. Let me generate the section content.

# Section 04: Review Agent - Factory Function and Run Method Orchestration

## Overview

This section implements the core `createReviewAgent` factory function in `04-review-agent/src/review-agent.ts`. It depends on:

- **Section 01** (schema updates): Extended `RecommendationSchema`, `ReviewOutputSchema`, `IgnoreGroupSchema`, `contextPassthrough` on `AnalysisOutputSchema`
- **Section 02** (foundation): Project scaffolding, `types.ts` with `LLMReviewResponseSchema`, `index.ts` barrel exports
- **Section 03** (prompt builder): `buildPRSystemPrompt`, `buildRepoSystemPrompt`, `buildUserPrompt`

The review agent receives `AnalysisOutput` (with an optional `contextPassthrough` carrying the `ContextOutput`), and produces a `ReviewOutput` containing recommendations, safe-to-ignore groupings, focus areas, and a summary.

## File to Create

**`/home/andrew/code/scratchpad/code-review/04-review-agent/src/review-agent.ts`**

## Background: Key Types

The agent conforms to the `Agent<AnalysisOutput, ReviewOutput>` interface from `@core/pipeline/types.js`:

```typescript
interface Agent<TInput, TOutput> {
  name: string;
  idempotent: boolean;
  run(input: TInput): Promise<TOutput>;
}
```

The `ClaudeClient.query()` method signature:

```typescript
query<T>(options: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  schema: ZodSchema<T>;
  systemPrompt?: string;
  maxTokens?: number;
}): Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }>
```

After section 01 completes, `AnalysisOutput` will have an optional `contextPassthrough` field carrying the full `ContextOutput`. `ReviewOutput` will have `safeToIgnore: IgnoreGroup[]` and `summary: string` fields alongside the existing `recommendations`, `coreDecision`, and `focusAreas`.

The `LLMReviewResponseSchema` (defined in section 02's `types.ts`) is the Zod schema for what the LLM returns -- it omits fields computed deterministically by the agent (`score`, `severity`, `line`, `safeToIgnore`).

## Factory Function Signature

```typescript
export function createReviewAgent(deps: {
  claude: ClaudeClient;
  logger?: Logger;
  config: CodeReviewConfig;
}): Agent<AnalysisOutput, ReviewOutput>
```

Properties on the returned agent:
- `name: "review"`
- `idempotent: true`

## Run Method Orchestration

The `run(input: AnalysisOutput)` method performs these steps in order:

### Step 1: Extract Inputs

Read `input.contextPassthrough` for context data (PR metadata, domain rules, architecture doc, tech stack, mode). Read `input.scoredFiles` and `input.summary` for analysis results.

If `contextPassthrough` is missing or undefined, log a warning and return a minimal `ReviewOutput` with empty recommendations, empty safeToIgnore, empty focusAreas, an empty summary, and a coreDecision indicating missing context.

### Step 2: Separate Files by Threshold

Split `input.scoredFiles` into two groups:
- **High-risk files**: score >= 4 -- candidates for LLM recommendations
- **Low-risk files**: score < 4 -- candidates for safe-to-ignore groups

### Step 3: Group Low-Risk Files into IgnoreGroups

This is deterministic (no LLM involvement). Build `IgnoreGroup[]` from the low-risk files:

1. First, group files that have a known change type from `input.summary.categories`. Files whose paths match categories like "ignored" or "format-only" get category-based group labels.
2. For remaining low-risk files, group by top-level directory (e.g., `tests/`, `src/components/`). If any directory group exceeds 20 files, split by the next path segment.
3. Sort groups by `count` descending, then `label` ascending (for stable, idempotent ordering).
4. Each `IgnoreGroup` has: `label` (string), `count` (number of files), `description` (generated from common characteristics of the group).

### Step 4: Select Prompt Builder by Mode

Read `context.mode` from the contextPassthrough:
- `"pr"` -- call `buildPRSystemPrompt(context)`
- `"repo"` -- call `buildRepoSystemPrompt(context)`

### Step 5: Build User Prompt

Call `buildUserPrompt(highRiskFiles, context, input.summary)` to construct the user message. This includes only files scoring 4+, PR metadata, and category distribution (built in section 03).

### Step 6: Call Claude API

Make a single API call:

```typescript
const response = await deps.claude.query({
  messages: [{ role: "user", content: userPrompt }],
  schema: LLMReviewResponseSchema,
  systemPrompt,
  maxTokens: 8192,
});
```

If `highRiskFiles` is empty, skip the Claude call entirely and produce an output with empty recommendations (the LLM has nothing to review).

### Step 7: Map LLM Response to ReviewOutput

Transform the LLM response (`response.data`) into `ReviewOutput`:

- For each recommendation from the LLM:
  - Look up the file's `score` from `input.scoredFiles` (use analysis data, not LLM)
  - Derive `severity` deterministically from score: 8-10 = `"critical"`, 5-7 = `"high"`, 4 = `"medium"` (do not trust LLM's severity)
  - Set `line` to `undefined` (the LLM does not produce line numbers)
  - Pass through `message`, `humanCheckNeeded`, `estimatedReviewTime`, `category`, `suggestion` from LLM response
- Attach the computed `safeToIgnore` groups from step 3
- Pass through `coreDecision`, `focusAreas`, `summary` from LLM response

### Step 8: Return ReviewOutput

Return the assembled, schema-conformant object.

## Helper: Severity Mapping

A small pure function for deterministic severity derivation:

```typescript
function deriveSeverity(score: number): "critical" | "high" | "medium" | "low"
```

- score 8-10: `"critical"`
- score 5-7: `"high"`
- score 4: `"medium"`
- score < 4: `"low"` (should not occur for recommendations, but handle defensively)

## Helper: groupLowRiskFiles

A pure function for deterministic ignore-group computation:

```typescript
function groupLowRiskFiles(
  files: FileScore[],
  categories: Record<string, number>,
): IgnoreGroup[]
```

This encapsulates the logic from step 3 and should be independently testable.

## Tests

Tests for this section live in `/home/andrew/code/scratchpad/code-review/04-review-agent/tests/unit/review-agent.test.ts`. All tests mock `ClaudeClient` using `vi.fn()`.

### Unit Test Stubs

```
# Test: agent.name is "review" and agent.idempotent is true
# Test: empty scoredFiles returns empty recommendations and safeToIgnore
# Test: all files below threshold (score < 4) produces only safeToIgnore, no recommendations
# Test: files scoring 4+ appear in recommendations with correct scores from analysis data
# Test: severity derived deterministically from score (8-10 critical, 5-7 high, 4 medium)
# Test: LLM response fields (message, humanCheckNeeded, estimatedReviewTime, category) mapped correctly
# Test: safeToIgnore groups computed from low-score files, not from LLM
# Test: safeToIgnore grouped by category then by top-level directory
# Test: safeToIgnore sorted by count descending, label ascending
# Test: PR mode uses buildPRSystemPrompt
# Test: repo mode uses buildRepoSystemPrompt
# Test: missing contextPassthrough returns minimal output with warning log
# Test: coreDecision from LLM passed through to output
# Test: focusAreas from LLM passed through to output
# Test: summary from LLM passed through to output
# Test: output conforms to ReviewOutputSchema.parse()
# Test: Claude client called with LLMReviewResponseSchema
```

### Test Setup Pattern

Each test should:

1. Create a mock `ClaudeClient` with `query` as a `vi.fn()` returning a canned `LLMReviewResponse`
2. Create a mock `config` using the default config from `@core/config/schema.js`
3. Build an `AnalysisOutput` input with `contextPassthrough` set to a valid `ContextOutput`
4. Call `createReviewAgent(deps).run(input)`
5. Assert on the returned `ReviewOutput`

Example mock Claude response structure (what `query` resolves to):

```typescript
{
  data: {
    coreDecision: "The migration adds a new payment provider...",
    recommendations: [{
      file: "src/payments.ts",
      category: "security",
      message: "Payment flow lacks idempotency key",
      suggestion: "Add idempotency key header",
      humanCheckNeeded: "Verify the payment flow cannot double-charge",
      estimatedReviewTime: "15",
    }],
    focusAreas: ["Payment security", "Error handling"],
    summary: "This PR introduces a new payment provider...",
  },
  usage: { inputTokens: 1000, outputTokens: 500 },
}
```

### Key Assertions

- When all files score below 4, the Claude API should NOT be called (no high-risk files to review). The output should have empty `recommendations` but populated `safeToIgnore`.
- When `contextPassthrough` is missing, return immediately with minimal output -- do not call Claude.
- The `score` on each recommendation must come from `input.scoredFiles`, not from the LLM response.
- The `severity` on each recommendation must be derived from `deriveSeverity(score)`, not from LLM.
- `safeToIgnore` must be computed before the Claude call and attached to the output regardless of LLM results.
- Verify the mock `claude.query` was called with `schema: LLMReviewResponseSchema` (not `ReviewOutputSchema`).
- The final output must pass `ReviewOutputSchema.parse()` without throwing.