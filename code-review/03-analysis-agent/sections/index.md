<!-- PROJECT_CONFIG
runtime: typescript-npm
test_command: npx vitest run
END_PROJECT_CONFIG -->

<!-- SECTION_MANIFEST
section-01-foundation
section-02-pattern-filter
section-03-ast-analyzer
section-04-ast-classifier
section-05-prompt-builder
section-06-batch-builder
section-07-llm-scorer
section-08-agent-orchestration
section-09-integration-tests
END_MANIFEST -->

# Implementation Sections Index

## Dependency Graph

| Section | Depends On | Blocks | Parallelizable |
|---------|------------|--------|----------------|
| section-01-foundation | - | all | Yes |
| section-02-pattern-filter | 01 | 08 | Yes |
| section-03-ast-analyzer | 01 | 04 | Yes |
| section-04-ast-classifier | 01, 03 | 08 | No |
| section-05-prompt-builder | 01 | 07 | Yes |
| section-06-batch-builder | 01 | 07 | Yes |
| section-07-llm-scorer | 05, 06 | 08 | No |
| section-08-agent-orchestration | 02, 04, 07 | 09 | No |
| section-09-integration-tests | 08 | - | No |

## Execution Order

1. section-01-foundation (no dependencies)
2. section-02-pattern-filter, section-03-ast-analyzer, section-05-prompt-builder, section-06-batch-builder (parallel after 01)
3. section-04-ast-classifier, section-07-llm-scorer (parallel after their deps)
4. section-08-agent-orchestration (after 02, 04, 07)
5. section-09-integration-tests (final)

## Section Summaries

### section-01-foundation
Project scaffolding: package.json with tree-sitter dependencies, tsconfig.json, vitest.config.ts, directory structure, and internal type definitions for both deterministic and scoring layers. Exports barrel file (index.ts).

### section-02-pattern-filter
Glob-based file filtering using configurable ignore patterns. Merges analysis-specific defaults (lock files, generated code, snapshots, SVGs, translations) with core infrastructure patterns. Returns split lists of passed/ignored files with FileScore entries for ignored files (score 0). Unit tests with pattern-filter.test.ts.

### section-03-ast-analyzer
Tree-sitter parser initialization and file parsing for TypeScript and JavaScript. Language detection by file extension, lazy grammar loading, and parseFile/isSupportedLanguage interfaces. Unit tests with ast-analyzer.test.ts.

### section-04-ast-classifier
AST change classification (format-only, rename-only, moved-function, structural) by comparing before/after syntax trees. Includes subtree hashing for move detection. Confidence scoring with 0.9 threshold for auto-classification. Unit tests for both ast-classifier.test.ts and subtree-hash.test.ts.

### section-05-prompt-builder
System prompt and batch prompt construction for Claude API scoring. Includes scoring rubric (1-10 scale), domain rules injection, architecture context, tech stack info, PR metadata, data safety instructions, and low-risk summary formatting. Unit tests with prompt-builder.test.ts.

### section-06-batch-builder
Token-aware file batching for LLM scoring. Groups files by directory, applies character/4 token heuristic, handles large files (>50% budget) as dedicated batches, reserves output tokens. Unit tests with batch-builder.test.ts.

### section-07-llm-scorer
Claude API scoring orchestration. Sequential batch processing with Zod-validated structured output. Handles regular and large-file batches, wires up ClaudeClient.query() calls with scoring schema enforcement. Unit tests with llm-scorer.test.ts.

### section-08-agent-orchestration
Main analysis-agent.ts factory function and output assembly. Implements the full pipeline: file triage → pattern filter → AST classify → batch → LLM score → merge results. Risk level mapping, merge/override precedence (LLM wins if higher), summary statistics, criticalFiles subset. Exports the createAnalysisAgent function.

### section-09-integration-tests
End-to-end integration tests in analysis-agent.test.ts. Tests full pipeline with mocked ClaudeClient and real deterministic layer. Covers empty PRs, all-ignored PRs, mixed file types (added/deleted/binary), idempotency, output schema conformance, and configuration defaults.
