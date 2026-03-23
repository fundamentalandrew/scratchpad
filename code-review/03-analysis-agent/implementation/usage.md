# Usage Guide

## Quick Start

```typescript
import { createAnalysisAgent } from "./03-analysis-agent/src/index.js";

const agent = createAnalysisAgent({
  claude: claudeClient, // ClaudeClient instance from @core/clients/claude
  config: {
    ignorePatterns: ["node_modules/**", "dist/**"],
    criticalThreshold: 8,
    model: "claude-sonnet-4-5-20250514",
    maxRetries: 3,
    // ... other CodeReviewConfig fields
  },
});

const result = await agent.run(contextOutput);
// result: AnalysisOutput { scoredFiles, criticalFiles, summary }
```

## Pipeline Overview

The analysis agent processes PR files through a multi-stage pipeline:

1. **Pattern Filter** — Filters out ignored files (lock files, generated code, snapshots, SVGs, translations) using glob patterns. Ignored files get score 0.
2. **AST Classification** — For supported languages (TypeScript, JavaScript), parses before/after content with tree-sitter and classifies changes as format-only (score 1), rename-only (score 1), moved-function (score 2), or structural (passed to LLM).
3. **Batch Builder** — Groups remaining files into token-aware batches for LLM scoring.
4. **LLM Scorer** — Sends batches to Claude for risk scoring (1-10 scale) with structured output.
5. **Output Assembly** — Merges all results, maps risk levels, identifies critical files, computes summary statistics.

## Input: ContextOutput

```typescript
{
  mode: "pr",
  repository: { owner: "org", repo: "name", defaultBranch: "main" },
  pr: {
    number: 42,
    title: "PR title",
    description: "PR description",
    author: "user",
    baseBranch: "main",
    headBranch: "feature/x",
    files: [
      {
        path: "src/index.ts",
        status: "modified",
        additions: 10,
        deletions: 5,
        patch: "@@ -1,5 +1,10 @@...",
        // Optional: for AST classification
        beforeContent: "...",
        afterContent: "...",
      }
    ],
    diff: "full diff text",
  },
  domainRules: "Optional domain-specific review rules",
  architectureDoc: "Optional architecture documentation",
  techStack: { languages: ["TypeScript"], frameworks: ["React"], dependencies: {} },
}
```

## Output: AnalysisOutput

```typescript
{
  scoredFiles: [
    { path: "src/index.ts", score: 7, riskLevel: "high", reasons: ["Complex logic change"] },
    { path: "package-lock.json", score: 0, riskLevel: "low", reasons: ["Filtered by ignore pattern"] },
  ],
  criticalFiles: [
    // Subset of scoredFiles where score >= criticalThreshold (default 8)
  ],
  summary: {
    totalFiles: 10,
    criticalCount: 2,
    highCount: 3,
    categories: { "logic-change": 5, "ignored": 3, "format-only": 2 },
  },
}
```

## Risk Level Mapping

| Score | Risk Level |
|-------|-----------|
| 8-10  | critical  |
| 5-7   | high      |
| 3-4   | medium    |
| 0-2   | low       |

## Running Tests

```bash
cd 03-analysis-agent
npx vitest run                                    # All 128 tests
npx vitest run tests/unit/                        # Unit tests only
npx vitest run tests/integration/                 # Integration tests only
```

## API Reference

### `createAnalysisAgent(deps)`

Factory function that returns an `Agent<ContextOutput, AnalysisOutput>`.

**Parameters:**
- `deps.claude` — `ClaudeClient` instance for LLM scoring
- `deps.config` — `CodeReviewConfig` with ignore patterns, thresholds, model settings
- `deps.logger` — Optional `Logger` for debug output

**Returns:** `{ name: "analysis", idempotent: true, run(input) }`

### Key Modules

| Module | Export | Purpose |
|--------|--------|---------|
| `deterministic/pattern-filter` | `filterChangedFiles`, `ANALYSIS_IGNORE_PATTERNS` | Glob-based file filtering |
| `deterministic/ast-analyzer` | `parseFile`, `isSupportedLanguage`, `detectLanguage` | Tree-sitter parsing |
| `deterministic/ast-classifier` | `classifyChange` | AST diff classification |
| `scoring/batch-builder` | `buildBatches`, `estimateTokens` | Token-aware batching |
| `scoring/prompt-builder` | `buildSystemPrompt`, `buildBatchPrompt` | Claude prompt construction |
| `scoring/llm-scorer` | `scoreFiles` | Claude API scoring orchestration |
