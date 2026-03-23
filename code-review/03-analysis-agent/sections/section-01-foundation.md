Now I have all the context needed. Let me produce the section content.

# Section 01: Foundation -- Project Scaffolding and Type Definitions

## Overview

This section sets up the project scaffolding for the Analysis Agent (`03-analysis-agent`): `package.json` with tree-sitter dependencies, `tsconfig.json`, `vitest.config.ts`, the directory structure, internal type definitions for both the deterministic and scoring layers, and the barrel export file (`index.ts`).

This section has no dependencies on other analysis-agent sections. All subsequent sections (02 through 09) depend on this one.

## Directory Structure

Create the following directory tree under `/home/andrew/code/scratchpad/code-review/03-analysis-agent/`:

```
03-analysis-agent/
  src/
    analysis-agent.ts         # (stub -- implemented in section-08)
    deterministic/
      pattern-filter.ts       # (stub -- implemented in section-02)
      ast-analyzer.ts         # (stub -- implemented in section-03)
      ast-classifier.ts       # (stub -- implemented in section-04)
      subtree-hash.ts         # (stub -- implemented in section-04)
      types.ts                # Internal types for deterministic layer
    scoring/
      llm-scorer.ts           # (stub -- implemented in section-07)
      prompt-builder.ts       # (stub -- implemented in section-05)
      batch-builder.ts        # (stub -- implemented in section-06)
      types.ts                # Internal types for scoring layer
    index.ts                  # Public barrel exports
  tests/
    unit/                     # (empty -- populated by later sections)
    integration/              # (empty -- populated by later sections)
  package.json
  tsconfig.json
  vitest.config.ts
```

## Files to Create

### `/home/andrew/code/scratchpad/code-review/03-analysis-agent/package.json`

Follow the pattern established by `02-context-agent/package.json`. Key differences:

- `"name": "analysis-agent"`
- Dependencies must include:
  - `zod` (^4.3.6) -- schema validation, consistent with the rest of the project
  - `tree-sitter` -- native AST parser for deterministic layer
  - `tree-sitter-typescript` -- TypeScript/TSX grammar
  - `tree-sitter-javascript` -- JavaScript grammar
  - `picomatch` (^4.0.3) -- glob matching for pattern filter (same version as core)
- Dev dependencies:
  - `@types/node` (^25.5.0)
  - `@types/picomatch` (^4.0.2)
  - `typescript` (^5.9.3)
  - `vitest` (^4.1.0)
- Scripts: `build`, `test`, `test:watch` (same as context-agent)
- `"type": "module"` -- ESM, consistent with the project

Note: Use the latest stable versions of tree-sitter packages available on npm. The native tree-sitter bindings require node-gyp, but the project already has native deps so this is acceptable.

### `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tsconfig.json`

Identical to `02-context-agent/tsconfig.json`:

- `target`: ES2022
- `module`: Node16
- `moduleResolution`: Node16
- `strict`: true
- `outDir`: ./dist
- `rootDir`: ./src
- `declaration`: true
- `esModuleInterop`: true
- `skipLibCheck`: true
- `paths`: `@core/*` mapped to `../01-core-infrastructure/src/*`
- `include`: `["src"]`
- `exclude`: `["node_modules", "dist"]`

### `/home/andrew/code/scratchpad/code-review/03-analysis-agent/vitest.config.ts`

Follow the `02-context-agent/vitest.config.ts` pattern. Key adjustments:

- The `@core` alias resolves to `../01-core-infrastructure/src`
- Test include pattern should cover both `src/**/*.test.ts` and `tests/**/*.test.ts` since this project uses a `tests/` directory structure

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@core": path.resolve(__dirname, "../01-core-infrastructure/src"),
    },
  },
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
```

### `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/deterministic/types.ts`

Internal types for the deterministic layer. These types are used by pattern-filter, ast-analyzer, ast-classifier, and subtree-hash modules.

Define the following types:

- **`ClassificationResult`** -- Returned by the AST classifier after comparing before/after trees.
  - `changeType`: `"format-only" | "rename-only" | "moved-function" | "structural"`
  - `confidence`: `number` (0 to 1)
  - `details`: `string` (human-readable explanation)

- **`FunctionInfo`** -- Metadata about a function extracted for subtree hashing.
  - `name`: `string`
  - `hash`: `string`
  - `startLine`: `number`
  - `endLine`: `number`

- **`FilterResult`** -- Return type of the pattern filter.
  - `passed`: `PRFile[]` (files that passed through filtering)
  - `ignored`: `PRFile[]` (files that matched ignore patterns)

Where `PRFile` is the type from core schemas. Import it via `@core/agents/schemas.js` (which exports `PRFileSchema` and the inferred `z.infer` type). Note: core does not currently export a `PRFile` type alias, so either infer it from `PRFileSchema` using `z.infer<typeof PRFileSchema>` or define a compatible local type. Check what core exports and use the most appropriate approach.

The `PRFileSchema` from core defines:
```typescript
{
  path: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null | undefined;  // nullable and optional
  previousPath?: string;
}
```

Note: The `PRFileSchema` in core does **not** include `beforeContent` or `afterContent` fields. The plan references these fields for AST analysis. For now, define a local extended type `AnalysisFile` that extends the PR file with optional content fields:

- **`AnalysisFile`** -- Extended file type for analysis pipeline.
  - All fields from `PRFile`
  - `beforeContent?: string` -- full file content before the change
  - `afterContent?: string` -- full file content after the change

This type will be used internally by the analysis agent. The orchestration layer (section-08) will be responsible for populating these fields from available sources.

### `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/scoring/types.ts`

Internal types for the LLM scoring layer:

- **`ScoringContext`** -- Context passed to prompt builder for system prompt construction.
  - `domainRules`: `string | null`
  - `architectureDoc`: `string | null`
  - `techStack`: `TechStack` (from core: `{ languages: string[], frameworks: string[], dependencies: Record<string, string> }`)
  - `prTitle`: `string`
  - `prDescription`: `string`

- **`ScoringFile`** -- A file prepared for LLM scoring (after passing through deterministic filters).
  - `path`: `string`
  - `diff`: `string` (the patch/diff content)
  - `status`: `string` (added, modified, deleted, renamed)
  - `metadata?`: `string` (additional context like file size, binary indicator)

- **`FileBatch`** -- A group of files batched for a single LLM API call.
  - `files`: `ScoringFile[]`
  - `estimatedTokens`: `number`
  - `isLargeFile`: `boolean` (true if this is a dedicated single-file batch)

- **`LLMScoringResult`** -- Score result for a single file from the LLM.
  - `file`: `string`
  - `score`: `number` (1-10 from LLM)
  - `reason`: `string`
  - `changeType`: `string` (one of: `"logic-change"`, `"api-contract"`, `"schema-change"`, `"config-change"`, `"test-change"`, `"ui-change"`, `"security-change"`, `"other"`)

- **`LowRiskSummary`** -- Summary of a file pre-classified by the deterministic layer, sent to LLM for validation.
  - `path`: `string`
  - `changeType`: `string` (from ClassificationResult)
  - `suggestedScore`: `number`

### `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/index.ts`

Barrel export file. For now, export the type definitions from both layers plus a placeholder for the main factory function. The actual function implementations will be added by later sections.

Export:
- All types from `./deterministic/types.js`
- All types from `./scoring/types.js`
- Re-export `createAnalysisAgent` from `./analysis-agent.js` (this will be a stub initially)

### `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/analysis-agent.ts`

Stub file. Export a `createAnalysisAgent` factory function with the correct signature but a placeholder implementation that throws `"Not implemented"`. This allows other sections to import the type without depending on the full implementation.

Signature:

```typescript
import type { Agent } from "@core/pipeline/types.js";
import type { ContextOutput, AnalysisOutput } from "@core/agents/schemas.js";
import type { ClaudeClient } from "@core/clients/claude.js";
import type { Logger } from "@core/utils/logger.js";
import type { CodeReviewConfig } from "@core/config/schema.js";

export function createAnalysisAgent(deps: {
  claude: ClaudeClient;
  logger?: Logger;
  config: CodeReviewConfig;
}): Agent<ContextOutput, AnalysisOutput>
```

The stub should return an object with `name: "analysis"`, `idempotent: true`, and a `run()` that throws.

### Stub files for other modules

Create empty stub files (export nothing, or export stub functions that throw) for:
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/deterministic/pattern-filter.ts`
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/deterministic/ast-analyzer.ts`
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/deterministic/ast-classifier.ts`
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/deterministic/subtree-hash.ts`
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/scoring/llm-scorer.ts`
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/scoring/prompt-builder.ts`
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/scoring/batch-builder.ts`

These stubs ensure that `index.ts` can import and re-export without errors. Each stub will be replaced by its corresponding section.

## Tests

There are no dedicated unit tests for this section since it is purely scaffolding and type definitions. Validation that the foundation is correct:

1. `npx tsc --noEmit` should pass with no type errors
2. `npx vitest run` should execute with no failures (there are no test files yet, so it should exit cleanly)
3. Type imports from `@core/*` should resolve correctly through the path alias

A simple smoke test can be placed at `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/foundation.test.ts`:

```typescript
/**
 * Smoke test: verify that all type exports resolve and the stub factory
 * function exists with the expected shape.
 */
// - Import createAnalysisAgent from the barrel and verify it is a function
// - Import ClassificationResult, FunctionInfo, FilterResult, AnalysisFile from deterministic types
// - Import ScoringContext, ScoringFile, FileBatch, LLMScoringResult, LowRiskSummary from scoring types
// - Verify createAnalysisAgent returns an object with name "analysis" and idempotent true
// - Verify the returned agent's run() rejects (stub behavior)
```

## Key Dependencies from Core Infrastructure

The analysis agent imports these from `01-core-infrastructure` via the `@core` path alias:

| Import | Source File | What It Provides |
|--------|-------------|-----------------|
| `Agent<TInput, TOutput>` | `@core/pipeline/types.js` | Agent interface with `name`, `idempotent`, `run()` |
| `ContextOutput` | `@core/agents/schemas.js` | Input type (output of context agent) |
| `AnalysisOutput` | `@core/agents/schemas.js` | Output type for analysis agent |
| `AnalysisOutputSchema` | `@core/agents/schemas.js` | Zod schema for output validation |
| `FileScoreSchema` / `FileScore` | `@core/agents/schemas.js` | Per-file score type (score 0-10, riskLevel, reasons) |
| `PRFileSchema` | `@core/agents/schemas.js` | PR file metadata type |
| `TechStackSchema` / `TechStack` | `@core/agents/schemas.js` | Tech stack info type |
| `ClaudeClient` | `@core/clients/claude.js` | LLM API client |
| `CodeReviewConfig` | `@core/config/schema.js` | Configuration type |
| `Logger` | `@core/utils/logger.js` | Logging interface |
| `filterFiles()` | `@core/utils/file-filter.js` | Glob-based file filtering utility |

## Implementation Checklist

1. Create the directory structure (`src/deterministic/`, `src/scoring/`, `tests/unit/`, `tests/integration/`)
2. Create `package.json` with tree-sitter and other dependencies
3. Create `tsconfig.json` with `@core` path alias
4. Create `vitest.config.ts` with test include patterns for both `src/` and `tests/`
5. Create `src/deterministic/types.ts` with `ClassificationResult`, `FunctionInfo`, `FilterResult`, `AnalysisFile`
6. Create `src/scoring/types.ts` with `ScoringContext`, `ScoringFile`, `FileBatch`, `LLMScoringResult`, `LowRiskSummary`
7. Create stub files for all module placeholders (pattern-filter, ast-analyzer, ast-classifier, subtree-hash, llm-scorer, prompt-builder, batch-builder)
8. Create `src/analysis-agent.ts` stub with correct signature
9. Create `src/index.ts` barrel exports
10. Create `tests/unit/foundation.test.ts` smoke test
11. Run `npm install` to install dependencies
12. Run `npx tsc --noEmit` to verify type resolution
13. Run `npx vitest run` to verify test infrastructure works