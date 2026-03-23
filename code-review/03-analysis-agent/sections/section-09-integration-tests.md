Now I have all the context needed. Let me produce the section content.

# Section 09: Integration Tests

## Overview

This section adds end-to-end integration tests for the analysis agent in `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/integration/analysis-agent.test.ts`. These tests exercise the full pipeline -- from `ContextOutput` input through pattern filtering, AST classification, LLM scoring (mocked), and output assembly -- verifying that the agent produces correct `AnalysisOutput` conforming to the Zod schema.

The tests use a **mocked `ClaudeClient`** but real deterministic layer components (pattern filter, AST analyzer, AST classifier). This validates the orchestration wiring end-to-end without requiring actual API calls.

## Dependencies

- **Section 08 (Agent Orchestration):** The `createAnalysisAgent` factory function and full pipeline implementation must be complete before these tests can pass.
- **Sections 02-07:** All deterministic and scoring layer modules must be implemented.
- **Section 01 (Foundation):** Project scaffolding, types, and configuration must be in place.

## File to Create

`/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/integration/analysis-agent.test.ts`

## Core Types for Reference

The tests work with these types from core infrastructure (`01-core-infrastructure/src/agents/schemas.ts`):

- **`ContextOutput`** -- Input to the analysis agent. Contains `mode`, `repository`, `pr` (with `files` array of `PRFile`), `domainRules`, `architectureDoc`, `techStack`.
- **`AnalysisOutput`** -- Output from the agent. Contains `scoredFiles` (array of `FileScore`), `criticalFiles` (subset), and `summary` (with `totalFiles`, `criticalCount`, `highCount`, `categories`).
- **`FileScore`** -- `{ path: string, score: number (0-10), riskLevel: "critical"|"high"|"medium"|"low", reasons: string[] }`.
- **`PRFile`** -- `{ path: string, status: string, additions: number, deletions: number, patch?: string | null, previousPath?: string }`.

The `AnalysisOutputSchema` Zod schema is used to validate all test outputs.

The `Agent<TInput, TOutput>` interface from `01-core-infrastructure/src/pipeline/types.ts` defines `{ name: string, idempotent: boolean, run(input: TInput): Promise<TOutput> }`.

The `ClaudeClient` from `01-core-infrastructure/src/clients/claude.ts` has a `query<T>({ messages, schema, systemPrompt?, maxTokens? }): Promise<{ data: T, usage: { inputTokens, outputTokens } }>` method.

The `CodeReviewConfig` from `01-core-infrastructure/src/config/schema.ts` includes `ignorePatterns`, `criticalThreshold` (default 8), `model`, `maxRetries`, and other fields.

## Test Setup

The test file needs:

1. A helper to build valid `ContextOutput` objects with configurable PR files.
2. A mock `ClaudeClient` whose `query()` method returns pre-defined `LLMScoringResponse` data. The mock should track call count and arguments for assertion.
3. A minimal `CodeReviewConfig` (use `configSchema.parse({})` for defaults).

The mock `ClaudeClient` should be created with `vi.fn()` on the `query` method. Each test configures the mock's return value based on which files are expected to reach LLM scoring.

### Helper: `buildContextOutput`

A factory function that creates a valid `ContextOutput` for PR mode. Accepts an array of `PRFile` objects and optional overrides for `domainRules`, `architectureDoc`, `techStack`, PR title, and PR description.

### Helper: `buildMockClaudeClient`

Returns an object matching the `ClaudeClient` interface with a mocked `query` method. The mock returns `{ data: { scores: [...] }, usage: { inputTokens: 100, outputTokens: 50 } }`. The caller passes the desired `scores` array and the mock returns it for every call (or use `mockResolvedValueOnce` for per-call control).

## Tests

### Test Group: Full Pipeline -- Output Schema Conformance

**Test: full pipeline produces AnalysisOutput conforming to AnalysisOutputSchema when given valid ContextOutput**

- Create a `ContextOutput` with 3-5 files: one lock file (will be filtered), one `.ts` file with simple content (will be AST-classified), and one `.py` file (will reach LLM).
- Mock the Claude client to return a score for the `.py` file.
- Call `agent.run(input)`.
- Validate the result against `AnalysisOutputSchema.parse()` -- it should not throw.
- Verify `scoredFiles` length equals total file count.

### Test Group: Ignored Files

**Test: ignored files (matching glob patterns) appear in output with score 0 and riskLevel "low"**

- Include `package-lock.json`, `src/types.generated.ts`, and `__snapshots__/test.snap` in the PR files.
- Verify each appears in `scoredFiles` with `score: 0` and `riskLevel: "low"`.
- Verify the Claude client `query` was never called with these file paths.

**Test: agent handles ContextOutput with only ignored files -- no LLM calls made**

- All files match ignore patterns (e.g., `package-lock.json`, `yarn.lock`, `foo.generated.ts`).
- Assert the Claude client `query` method was never called (`expect(mockQuery).not.toHaveBeenCalled()`).
- Assert `scoredFiles` has entries for all files, all with score 0.

### Test Group: AST Classification

**Test: AST-classified files appear with score 1-2 and appropriate changeType**

- Include a `.ts` file where `beforeContent` and `afterContent` differ only in whitespace/formatting (format-only change).
- The deterministic layer should classify it as format-only with a low score.
- Verify the file appears in `scoredFiles` with a low score (0-2) and riskLevel "low".

Note: This test requires that `PRFile` has `beforeContent` and `afterContent` fields available. If the orchestration layer extracts content differently, adjust accordingly. The key point is that files eligible for AST analysis (TS/JS with full before/after content) get classified without LLM calls.

### Test Group: LLM Scoring

**Test: files that pass both filters reach LLM scoring and return LLM-assigned scores**

- Include a `.py` file (not supported by AST analyzer) that does not match ignore patterns.
- Mock the Claude client to return `{ score: 7, reason: "Complex logic change", changeType: "logic-change" }` for that file.
- Verify the file appears in `scoredFiles` with score 7 and riskLevel "high".

### Test Group: Empty PR

**Test: agent handles ContextOutput with zero files (empty PR) -- returns empty scoredFiles, zero counts**

- Create a `ContextOutput` with `pr.files: []` and `pr.diff: ""`.
- Assert `scoredFiles` is an empty array.
- Assert `summary.totalFiles === 0`, `summary.criticalCount === 0`, `summary.highCount === 0`.
- Assert `criticalFiles` is an empty array.
- Assert the Claude client was not called.

### Test Group: Mixed File Types (Added, Deleted, Binary)

**Test: agent handles mixed file types -- each triaged correctly**

- Include:
  - An added file (`status: "added"`, no `beforeContent`) -- should skip AST, reach LLM.
  - A deleted file (`status: "removed"`, no `afterContent`) -- should skip AST, reach LLM.
  - A binary file (`patch: null`) -- should get a conservative score or metadata-only LLM call.
  - A normal modified `.ts` file with before/after content -- should go through AST classification.
- Mock the Claude client to return appropriate scores for files that reach it.
- Verify all files appear in `scoredFiles` with appropriate scores and risk levels.

**Test: added files (no beforeContent) skip AST, reach LLM scoring**

- Include a new `.ts` file with `status: "added"` and only `afterContent`.
- Mock Claude to return a score.
- Verify the file was included in an LLM batch (check mock call arguments).

**Test: deleted files (no afterContent) skip AST, reach LLM scoring**

- Include a `.ts` file with `status: "removed"` and only `beforeContent`.
- Mock Claude to return a score.
- Verify the file was included in an LLM batch.

**Test: binary files (patch === null) get conservative score or metadata-only LLM call**

- Include a file with `patch: null` (binary).
- Verify it appears in `scoredFiles`. The exact handling (conservative default score vs. metadata-only LLM call) depends on the orchestration implementation. Assert that the file is not silently dropped.

### Test Group: Idempotency

**Test: agent is idempotent -- running twice with same input produces same output structure**

- Run the agent twice with identical `ContextOutput` and the same mock Claude responses.
- Assert both results have the same `scoredFiles` length, same `summary` values, and the same set of file paths in `criticalFiles`.

### Test Group: Output Assembly and Risk Level Mapping

**Test: risk level mapping correct -- 8-10 critical, 5-7 high, 3-4 medium, 0-2 low**

- Mock the Claude client to return files with scores at boundary values: 10, 8, 7, 5, 4, 3, 2, 0.
- Verify each file's `riskLevel` matches the expected mapping.

**Test: merge precedence -- LLM override of pre-classified file uses higher score**

- Include a `.ts` file that the AST layer classifies as format-only (score 1).
- Also include it in the LLM response with a higher score (e.g., score 6, indicating the LLM detected risk the AST missed).
- Verify the final score in `scoredFiles` is 6 (the higher value), not 1.

**Test: merge precedence -- pre-classified file not mentioned by LLM keeps deterministic score**

- Include a `.ts` file that the AST layer classifies as format-only (score 1).
- The LLM response does not mention this file.
- Verify the file keeps its deterministic score of 1 in `scoredFiles`.

**Test: criticalFiles subset contains only files with score >= criticalThreshold**

- Mock results so some files score 8+ and others score below 8.
- Verify `criticalFiles` contains exactly the files with score >= 8.
- Verify all files in `criticalFiles` also appear in `scoredFiles`.

**Test: summary statistics -- totalFiles counts all files including ignored**

- Include a mix of ignored, AST-classified, and LLM-scored files.
- Verify `summary.totalFiles` equals the total count of all input PR files.

**Test: summary statistics -- criticalCount and highCount match filtered subsets**

- Verify `summary.criticalCount` equals the number of files with riskLevel "critical".
- Verify `summary.highCount` equals the number of files with riskLevel "high".

**Test: summary statistics -- categories map aggregates changeType counts**

- Verify `summary.categories` is a record mapping each changeType string to the number of files with that type.

**Test: output conforms to AnalysisOutputSchema (Zod validation)**

- Run the agent with a realistic mix of files.
- Pass the result through `AnalysisOutputSchema.parse()` and assert it does not throw.

### Test Group: Configuration

**Test: default analysis ignore patterns applied when no overrides configured**

- Use `configSchema.parse({})` for config (all defaults).
- Include `package-lock.json` in the PR files.
- Verify it is filtered out (score 0).

**Test: criticalThreshold from config used for critical file cutoff**

- Set `criticalThreshold: 6` in the config.
- Mock a file with score 6.
- Verify it appears in `criticalFiles` (it would not with the default threshold of 8).

**Test: agent works with minimal config (all optional fields absent)**

- Use `configSchema.parse({})` with no overrides.
- Verify the agent runs without errors and produces valid output.

## Test File Structure

The test file should be organized with `describe` blocks mirroring the groups above:

```typescript
describe("Analysis Agent Integration", () => {
  // Setup: mock ClaudeClient, default config, helper factories

  describe("Output Schema Conformance", () => { /* ... */ });
  describe("Ignored Files", () => { /* ... */ });
  describe("AST Classification", () => { /* ... */ });
  describe("LLM Scoring", () => { /* ... */ });
  describe("Empty PR", () => { /* ... */ });
  describe("Mixed File Types", () => { /* ... */ });
  describe("Idempotency", () => { /* ... */ });
  describe("Output Assembly and Risk Levels", () => { /* ... */ });
  describe("Configuration", () => { /* ... */ });
});
```

Each test should:
1. Build a `ContextOutput` using the helper.
2. Configure the mock Claude client with expected return values.
3. Create the agent via `createAnalysisAgent({ claude: mockClaude, config })`.
4. Call `agent.run(contextOutput)`.
5. Assert on the returned `AnalysisOutput`.

## Implementation Notes

- The mock `ClaudeClient` does not need to be a full class instance. Use `vi.fn()` and type assertions to satisfy the interface. The only method called by the scoring layer is `query()`.
- For AST classification tests, the `beforeContent` and `afterContent` fields on `PRFile` may need to be added or the orchestration layer may fetch them separately. Check how section 08 handles content availability and match the test setup accordingly.
- Tree-sitter is a native binding. If tests run in CI without native modules, consider marking AST-dependent integration tests with a skip condition. However, for local development, these should run with real Tree-sitter parsing.
- All integration tests should be runnable with `npx vitest run tests/integration/analysis-agent.test.ts` from the `03-analysis-agent` directory.