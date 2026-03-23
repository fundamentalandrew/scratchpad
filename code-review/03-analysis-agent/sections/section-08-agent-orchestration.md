Now I have all the context. Let me produce the section content.

# Section 08: Agent Orchestration

## Overview

This section implements the main `analysis-agent.ts` factory function and output assembly logic at `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/analysis-agent.ts`. This is the central orchestration module that wires together all previous sections into a complete pipeline: file triage, pattern filtering, AST classification, batch building, LLM scoring, and result merging.

The `createAnalysisAgent` function returns an `Agent<ContextOutput, AnalysisOutput>` that follows the established agent factory pattern from core infrastructure. It replaces the stub created in section 01.

## Dependencies

This section depends on all prior analysis-agent sections:

- **Section 01 (Foundation):** Project scaffolding, type definitions (`AnalysisFile`, `ClassificationResult`, `FilterResult`, `ScoringContext`, `ScoringFile`, `FileBatch`, `LLMScoringResult`, `LowRiskSummary`), and the stub `analysis-agent.ts` file that this section replaces.
- **Section 02 (Pattern Filter):** `filterChangedFiles()` from `src/deterministic/pattern-filter.ts`. Returns `{ passed: PRFile[], ignored: PRFile[] }`.
- **Section 04 (AST Classifier):** `classifyChange()` from `src/deterministic/ast-classifier.ts`. Returns `ClassificationResult` with `changeType`, `confidence`, and `details`.
- **Section 03 (AST Analyzer):** `parseFile()` and `isSupportedLanguage()` from `src/deterministic/ast-analyzer.ts`.
- **Section 05 (Prompt Builder):** `buildSystemPrompt()` and `buildBatchPrompt()` from `src/scoring/prompt-builder.ts`.
- **Section 06 (Batch Builder):** `buildBatches()` from `src/scoring/batch-builder.ts`.
- **Section 07 (LLM Scorer):** `scoreFiles()` from `src/scoring/llm-scorer.ts`.

From **core infrastructure** (`01-core-infrastructure`):

| Import | Source |
|--------|--------|
| `Agent<TInput, TOutput>` | `@core/pipeline/types.js` |
| `ContextOutput`, `AnalysisOutput`, `FileScore` | `@core/agents/schemas.js` |
| `ClaudeClient` | `@core/clients/claude.js` |
| `CodeReviewConfig` | `@core/config/schema.js` |
| `Logger` | `@core/utils/logger.js` |

## File to Modify

`/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/analysis-agent.ts`

This file already exists as a stub (from section 01) with the correct signature. Replace the stub implementation with the full orchestration logic.

## Tests

Tests for this section live at `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/analysis-agent-orchestration.test.ts`. These are unit tests focused on the orchestration logic itself. Integration tests covering the full pipeline with real deterministic layer are in section 09.

The tests should mock all internal modules (pattern-filter, ast-analyzer, ast-classifier, batch-builder, prompt-builder, llm-scorer) so orchestration logic can be tested in isolation.

```typescript
/**
 * Tests for analysis-agent.ts orchestration logic.
 *
 * All internal modules are mocked. These tests verify the wiring,
 * data flow, and output assembly -- not the behavior of individual modules.
 */

// --- Orchestration Flow ---

// Test: full pipeline produces AnalysisOutput conforming to AnalysisOutputSchema
//   given valid ContextOutput with PR files
// Test: agent.name is "analysis" and agent.idempotent is true
// Test: agent handles ContextOutput with zero files (empty PR)
//   -- returns empty scoredFiles, zero counts, no LLM calls
// Test: agent handles ContextOutput with only ignored files
//   -- no LLM calls made, all files in output with score 0
// Test: agent handles mixed file types (added, deleted, binary, normal)
//   -- each triaged correctly based on content availability
// Test: added files (no beforeContent) skip AST classification, reach LLM scoring
// Test: deleted files (no afterContent) skip AST classification, reach LLM scoring
// Test: binary files (patch === null) get conservative score or metadata-only LLM call
// Test: agent is idempotent -- running twice with same input produces same output structure

// --- Risk Level Mapping ---

// Test: score 8-10 maps to riskLevel "critical"
// Test: score 5-7 maps to riskLevel "high"
// Test: score 3-4 maps to riskLevel "medium"
// Test: score 0-2 maps to riskLevel "low"

// --- Merge/Override Precedence ---

// Test: LLM override of pre-classified file uses the higher of the two scores
// Test: pre-classified file not mentioned by LLM keeps deterministic score
// Test: ignored files (score 0) always included in scoredFiles with riskLevel "low"
// Test: AST-classified files included with deterministic scores when LLM does not override

// --- Critical Files ---

// Test: criticalFiles subset contains only files with score >= criticalThreshold
// Test: criticalThreshold defaults to 8 from config
// Test: custom criticalThreshold from config is respected

// --- Summary Statistics ---

// Test: totalFiles counts all files including ignored
// Test: criticalCount matches files with riskLevel "critical"
// Test: highCount matches files with riskLevel "high"
// Test: categories map aggregates changeType counts across all scored files

// --- Output Schema Conformance ---

// Test: output passes AnalysisOutputSchema.parse() without error

// --- Configuration ---

// Test: default analysis ignore patterns applied when no overrides configured
// Test: agent works with minimal config (all optional fields absent)
```

## Factory Function Signature

The factory function replaces the stub. The signature remains the same:

```typescript
export function createAnalysisAgent(deps: {
  claude: ClaudeClient;
  logger?: Logger;
  config: CodeReviewConfig;
}): Agent<ContextOutput, AnalysisOutput>
```

Returns an agent object with:
- `name`: `"analysis"`
- `idempotent`: `true`
- `run(input: ContextOutput): Promise<AnalysisOutput>` -- orchestrates the full pipeline

## Orchestration Flow

The `run()` method executes these steps in sequence:

### Step 1: Extract File List

Pull the file list from `input.pr.files` (the `PRFile[]` from `ContextOutput`). If `input.pr` is undefined (repo mode), return an empty `AnalysisOutput` immediately since the analysis agent operates in PR mode only.

### Step 2: Triage Files by Availability

Convert each `PRFile` to an `AnalysisFile` (the extended type from section 01 that includes optional `beforeContent` and `afterContent` fields). Categorize each file:

- **Full content available** (`beforeContent` and `afterContent` both present): eligible for AST analysis
- **Added files** (status `"added"`, no `beforeContent`): skip AST, send to LLM with patch/diff
- **Deleted files** (status `"removed"` or `"deleted"`, no `afterContent`): skip AST, send to LLM
- **Binary files** (`patch === null` and no parseable content): assign conservative default or send metadata-only to LLM
- **Truncated patches** (patch present but content fields missing): skip AST, send to LLM

Note: The current `PRFileSchema` from core does not include `beforeContent`/`afterContent`. The triage step should check for these fields if present on the input (the context agent may populate them), but gracefully degrade when they are absent -- in that case, no file gets AST analysis and all non-ignored files go to LLM scoring.

### Step 3: Pattern Filter

Call `filterChangedFiles(files, corePatterns, analysisPatterns)` from `src/deterministic/pattern-filter.ts`.

- `corePatterns`: from `deps.config.ignorePatterns`
- `analysisPatterns`: the hardcoded analysis-specific defaults (lock files, generated code, snapshots, SVGs, translations, GraphQL, Prisma migrations)

This produces `{ passed, ignored }`. The `ignored` files become `FileScore` entries immediately:
- `score`: 0
- `riskLevel`: `"low"`
- `reasons`: `["Filtered by ignore pattern"]`

### Step 4: AST Classification

For each file in `passed` that:
1. Has `isSupportedLanguage(file.path)` returning `true` (TS/JS files only)
2. Has both `beforeContent` and `afterContent` available

Parse before/after with `parseFile()`, then call `classifyChange(beforeTree, afterTree)`.

- If `confidence >= 0.9` and `changeType` is not `"structural"`: auto-classify as low-risk. Create a `FileScore` with `score: 1` (format-only, rename-only) or `score: 2` (moved-function), `riskLevel: "low"`, and `reasons` from the classification details. Also create a `LowRiskSummary` entry for LLM validation.
- If `confidence < 0.9` or `changeType === "structural"`: file goes to LLM scoring.
- If Tree-sitter throws a parse error: log a warning, include the file in the LLM scoring batch instead.

This produces three lists:
- `classifiedFiles`: `FileScore[]` -- deterministically scored files
- `lowRiskSummaries`: `LowRiskSummary[]` -- summaries to include in LLM batch for validation
- `unclassifiedFiles`: `AnalysisFile[]` -- files that need LLM scoring

### Step 5: Build Batches

Convert `unclassifiedFiles` to `ScoringFile[]` (extracting `path`, `diff` from patch, `status`, and optional `metadata`). Then call `buildBatches()` from `src/scoring/batch-builder.ts`.

Build the system prompt token count by calling `buildSystemPrompt()` and estimating tokens (character count / 4).

Pass `lowRiskSummaries` to the batch builder so they are appended to the smallest batch.

### Step 6: LLM Score

Call `scoreFiles(batches, scoringContext, deps.claude)` from `src/scoring/llm-scorer.ts`.

The `ScoringContext` is assembled from the input:
- `domainRules`: `input.domainRules`
- `architectureDoc`: `input.architectureDoc`
- `techStack`: `input.techStack ?? { languages: [], frameworks: [], dependencies: {} }`
- `prTitle`: `input.pr.title`
- `prDescription`: `input.pr.description`

### Step 7: Assemble Output

Merge results from all three sources into a single `AnalysisOutput`.

## Output Assembly Logic

### Risk Level Mapping

```typescript
function mapRiskLevel(score: number): RiskLevel {
  if (score >= 8) return "critical";
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}
```

This function is applied to all LLM-scored files. Deterministic scores (0 for ignored, 1-2 for AST-classified) always map to `"low"`.

### Merge Precedence

Low-risk summaries are sent to the LLM for validation. When merging:

1. Start with a map of `path -> FileScore` from deterministic results (ignored files + AST-classified files).
2. For each `LLMScoringResult`:
   - If the file already has a deterministic score, use the **higher** of the two scores. This lets the LLM override false positive low-risk classifications.
   - If the file has no deterministic score, create a new `FileScore` from the LLM result.
3. For deterministic files **not** mentioned in LLM results, keep the deterministic score unchanged.

When creating a `FileScore` from an `LLMScoringResult`:
- `path`: from `file`
- `score`: the LLM score (or the higher of LLM/deterministic)
- `riskLevel`: from `mapRiskLevel(score)`
- `reasons`: `[reason]` from LLM, plus the deterministic reason if overridden

### Critical Files

Filter `scoredFiles` where `score >= deps.config.criticalThreshold` (default 8).

### Summary Statistics

```typescript
{
  totalFiles: scoredFiles.length,  // includes ignored files
  criticalCount: scoredFiles.filter(f => f.riskLevel === "critical").length,
  highCount: scoredFiles.filter(f => f.riskLevel === "high").length,
  categories: /* aggregate changeType counts */
}
```

The `categories` map counts each `changeType` across all files. For ignored files, use `"ignored"` as the category. For AST-classified files, use the classification changeType (e.g., `"format-only"`). For LLM-scored files, use the LLM-assigned changeType.

### Final Output Shape

The returned `AnalysisOutput` conforms to `AnalysisOutputSchema` from core:

```typescript
{
  scoredFiles: FileScore[],      // all files (ignored + classified + LLM-scored)
  criticalFiles: FileScore[],    // subset with score >= criticalThreshold
  summary: {
    totalFiles: number,
    criticalCount: number,
    highCount: number,
    categories: Record<string, number>,
  },
}
```

## Internal Helper: Change Type for Categories

The orchestration layer needs to track the `changeType` string for each file to build the `categories` summary. Since `FileScore` from core does not have a `changeType` field, use an internal map (`Map<string, string>`) keyed by file path during assembly, then aggregate into the categories count before returning.

## Error Handling

- If `input.pr` is undefined: return an empty `AnalysisOutput` (zero files, zero counts, empty categories).
- If Tree-sitter parsing fails for a file: log warning via `deps.logger`, skip AST classification, send to LLM.
- If LLM scoring fails (batch call throws): let the error propagate. The pipeline runner handles retries since the agent is marked `idempotent: true`.
- If no files need LLM scoring (all ignored or AST-classified): skip batch building and LLM scoring entirely, assemble output from deterministic results only.

## Barrel Export Update

Update `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/index.ts` to ensure `createAnalysisAgent` is exported from the real implementation (not the stub). The barrel file from section 01 already re-exports from `./analysis-agent.js`, so no change should be needed unless the export name changed.

## Implementation Checklist

1. Write tests at `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/analysis-agent-orchestration.test.ts` with mocked dependencies
2. Implement the `mapRiskLevel()` helper function
3. Implement the file triage logic (categorizing files by content availability)
4. Implement the merge/override logic for combining deterministic and LLM scores
5. Implement the summary statistics assembly (totalFiles, criticalCount, highCount, categories)
6. Implement the full `run()` method wiring steps 1-7 together
7. Replace the stub `createAnalysisAgent` in `src/analysis-agent.ts` with the real implementation
8. Verify output conforms to `AnalysisOutputSchema` by calling `.parse()` in tests
9. Run `npx vitest run` to confirm all tests pass