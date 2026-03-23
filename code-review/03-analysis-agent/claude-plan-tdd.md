# TDD Plan: Analysis Agent (Agent B)

Testing framework: Vitest (consistent with project). Tests colocated in `tests/unit/` and `tests/integration/`. Path alias `@core` → `../01-core-infrastructure/src`. Mock all external dependencies (ClaudeClient, Tree-sitter parsers).

---

## 4. Agent Entry Point

### `analysis-agent.test.ts` (integration)

**Orchestration flow tests:**
- Test: full pipeline produces AnalysisOutput conforming to AnalysisOutputSchema when given valid ContextOutput
- Test: ignored files (matching glob patterns) appear in output with score 0 and riskLevel "low"
- Test: AST-classified files appear with score 1-2 and appropriate changeType
- Test: files that pass both filters reach LLM scoring and return LLM-assigned scores
- Test: agent handles ContextOutput with zero files (empty PR) — returns empty scoredFiles, zero counts
- Test: agent handles ContextOutput with only ignored files — no LLM calls made
- Test: agent handles mixed file types (added, deleted, binary, normal) — each triaged correctly
- Test: added files (no beforeContent) skip AST, reach LLM scoring
- Test: deleted files (no afterContent) skip AST, reach LLM scoring
- Test: binary files (patch === null) get conservative score or metadata-only LLM call
- Test: agent is idempotent — running twice with same input produces same output structure

## 5. Deterministic Layer

### 5a. `pattern-filter.test.ts`

- Test: files matching default analysis patterns are filtered (package-lock.json, *.generated.*, *.snap, etc.)
- Test: files matching core ignore patterns are filtered
- Test: files not matching any pattern pass through
- Test: pattern merging — analysis patterns combine with core patterns, no duplicates
- Test: empty file list returns empty passed and ignored arrays
- Test: ignored files produce FileScore entries with score 0, riskLevel "low", correct reason string
- Test: glob patterns handle nested paths correctly (prisma/migrations/001_init/migration.sql)

### 5b. `ast-analyzer.test.ts`

- Test: parseFile returns a valid Tree for TypeScript source
- Test: parseFile returns a valid Tree for JavaScript source
- Test: isSupportedLanguage returns true for .ts, .tsx, .js, .jsx, .mjs, .cjs
- Test: isSupportedLanguage returns false for .py, .go, .css, .json, .md
- Test: parseFile handles empty source string without throwing
- Test: parseFile handles syntactically invalid source (returns tree with error nodes)
- Test: parser initialization is lazy — no grammar loaded until first parse call

### 5c. `ast-classifier.test.ts`

- Test: format-only — identical AST structure with only whitespace changes → changeType "format-only", high confidence
- Test: format-only — added/removed comments with identical code → changeType "format-only"
- Test: rename-only — single variable renamed consistently throughout → changeType "rename-only", high confidence
- Test: rename-only — multiple variables renamed with consistent mappings → "rename-only"
- Test: rename-only rejected — inconsistent rename mapping (same old name maps to different new names) → "structural"
- Test: moved-function — function moved to different position, body unchanged → "moved-function"
- Test: structural — actual logic change (different operator, added condition) → "structural"
- Test: structural — new function added → "structural"
- Test: structural — function body changed → "structural"
- Test: confidence threshold — format-only with high confidence (≥0.9) auto-classifies as low-risk
- Test: confidence threshold — low confidence classification (< 0.9) falls through to LLM

### 5d. `subtree-hash.test.ts`

- Test: identical function bodies produce identical hashes
- Test: renamed function (different name, same body) produces identical hash
- Test: different function bodies produce different hashes
- Test: literal value changes produce different hashes (return 0 vs return 1)
- Test: extractFunctionHashes finds all top-level function declarations
- Test: extractFunctionHashes finds method declarations in classes
- Test: extractFunctionHashes includes name, hash, and line range for each function
- Test: hash is stable — same input always produces same hash

## 6. LLM Scoring Layer

### 6a. `prompt-builder.test.ts`

- Test: buildSystemPrompt includes scoring rubric with 1-10 scale and tier examples
- Test: buildSystemPrompt includes domain rules when provided
- Test: buildSystemPrompt omits domain rules section when domainRules is null
- Test: buildSystemPrompt includes architecture context when provided
- Test: buildSystemPrompt includes tech stack information
- Test: buildSystemPrompt includes PR title and description
- Test: buildSystemPrompt includes data safety instructions (untrusted content warning)
- Test: buildSystemPrompt includes constrained changeType enum in output format
- Test: buildBatchPrompt includes diff content for each file in batch
- Test: buildBatchPrompt includes low-risk summary section when classified files provided
- Test: buildBatchPrompt formats file paths and diffs clearly

### 6b. `batch-builder.test.ts`

- Test: single small file produces one batch
- Test: multiple small files fit in one batch
- Test: files exceeding batch budget split across multiple batches
- Test: large file (>50% budget) gets dedicated isLargeFile batch
- Test: files sorted by directory path within batches (related files together)
- Test: token estimation uses character/4 heuristic
- Test: output reserve (4000 tokens) subtracted from available budget
- Test: system prompt tokens subtracted from available budget
- Test: empty file list returns empty batch array
- Test: low-risk summaries appended to smallest batch

### 6c. `llm-scorer.test.ts`

- Test: scoreFiles calls ClaudeClient.query() for each batch with correct Zod schema
- Test: scoreFiles returns LLMScoringResult array with file, score, reason, changeType
- Test: response schema enforces score 1-10
- Test: response schema enforces changeType enum values
- Test: regular batches processed sequentially (verify call order)
- Test: large file batches can be processed in parallel
- Test: failed batch call propagates error (agent-level retry handles it)
- Test: system prompt passed from ScoringContext to each API call

## 7. Output Assembly

### Tests in `analysis-agent.test.ts` (integration)

- Test: ignored files (score 0) included in scoredFiles with riskLevel "low"
- Test: AST-classified files included with deterministic scores
- Test: LLM-scored files included with LLM-assigned scores and risk levels
- Test: risk level mapping correct — 8-10 critical, 5-7 high, 3-4 medium, 0-2 low
- Test: merge precedence — LLM override of pre-classified file uses higher score
- Test: merge precedence — pre-classified file not mentioned by LLM keeps deterministic score
- Test: criticalFiles subset contains only files with score ≥ criticalThreshold
- Test: summary statistics — totalFiles counts all files including ignored
- Test: summary statistics — criticalCount and highCount match filtered subsets
- Test: summary statistics — categories map aggregates changeType counts
- Test: output conforms to AnalysisOutputSchema (Zod validation)

## 8. Configuration

### Tests in `analysis-agent.test.ts`

- Test: default analysis ignore patterns applied when no overrides configured
- Test: criticalThreshold from config used for critical file cutoff
- Test: agent works with minimal config (all optional fields absent)
