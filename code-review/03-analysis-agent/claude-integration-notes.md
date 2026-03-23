# Integration Notes: External Review Feedback

## Suggestions Integrated

### 1. Explicit handling for added/deleted/binary files (§4 orchestration)
**Why:** The plan assumes all files have before+after content for AST comparison. Added files have no "before", deleted files have no "after", and binary files can't be parsed at all.
**Action:** Add explicit handling in orchestration flow — skip AST for added/deleted/binary; send metadata + diff (if available) to LLM, or score conservatively.

### 2. Full file content requirement for AST layer (§5b)
**Why:** Unified diff patches from GitHub are often truncated and don't contain full context. Reconstructing before/after from patches alone is unreliable without the base file content.
**Action:** Clarify that AST analysis requires full before/after content from ContextOutput. If not available, gracefully fall back to LLM-only scoring for that file. Remove implication that patch-only reconstruction is reliable.

### 3. Format-only detection refinement (§5c)
**Why:** Tree-sitter ASTs don't include whitespace tokens; comparing "leaf text" for whitespace differences is misleading. The real signal is AST structural identity.
**Action:** Redefine format-only as "AST structure identical AND all identifier/literal/operator tokens identical." If ASTs match structurally, that's format-only regardless of whitespace.

### 4. Score range consistency — allow 0 (§6c, §7)
**Why:** Ignored files score 0 but the Zod schema enforces min(1). Downstream code could break on this inconsistency.
**Action:** Allow score 0 in FileScoreSchema for ignored/filtered files. LLM schema stays 1-10 since the LLM never scores ignored files.

### 5. Prompt injection guardrails (§6a)
**Why:** PR descriptions and diffs can contain adversarial instructions that manipulate scoring.
**Action:** Add explicit system prompt instructions to treat all PR content as untrusted data, never follow instructions found in diffs/descriptions, and only follow the scoring rubric.

### 6. Change type vocabulary for LLM (§6c)
**Why:** Deterministic layer uses a controlled enum but LLM returns freeform strings, making category aggregation noisy.
**Action:** Constrain LLM changeType to an enum: `"logic-change" | "api-contract" | "schema-change" | "config-change" | "test-change" | "ui-change" | "security-change" | "other"`. Add to Zod schema as z.enum().

### 7. Merge/override precedence rules (§7)
**Why:** The plan says AST classifications can be "overridden by LLM validation" but doesn't define when or how.
**Action:** Define explicit precedence: If LLM returns a score for a pre-classified file, use the higher of the two scores. If LLM doesn't mention a pre-classified file, keep the deterministic classification.

### 8. Handle patch-truncated and binary files explicitly
**Why:** GitHub truncates patches for large files and returns null patches for binary files. These need explicit handling rather than silent failure.
**Action:** Detect `patch === null` or truncated patches. Binary/truncated files skip AST, go to LLM with metadata-only context, or get a conservative default score.

## Suggestions NOT Integrated

### 1. Secret scanning/redaction pre-pass
**Why not:** Out of scope for the analysis agent. This is a valid concern but belongs in the Context Agent or as a separate pipeline step. The analysis agent's job is scoring, not security scanning.

### 2. Concurrency control with p-limit for batch scoring
**Why not:** The plan already specifies sequential batch processing to avoid rate limiting, with parallelization only for isolated large-file batches. Adding concurrency control adds complexity for marginal benefit in v1. Can be added later if batch counts are consistently high.

### 3. Model-specific tokenizer instead of char/4 heuristic
**Why not:** The heuristic is used only for batching decisions, not billing. Over-estimation just means slightly smaller batches, which is safe. A tokenizer dependency adds complexity for minimal practical benefit.

### 4. Top-N curation / quota-based distribution
**Why not:** The spec uses threshold-based scoring (8-10 = critical, etc.), not quotas. The "8-12 critical files" target is an expected outcome of good scoring, not a hard constraint to enforce. Forcing distribution would be artificial.

### 5. TypeScript language service integration for rename detection
**Why not:** Significantly increases complexity and dependencies. Tree-sitter heuristic rename detection with confidence scores is sufficient for v1. Low-confidence cases already fall through to LLM scoring.

### 6. Subtree hash collision mitigation (include called identifiers)
**Why not:** The plan already uses confidence thresholds (≥0.9) for auto-classification. Low-confidence moves go to LLM. Adding selective identifier inclusion to hashing adds complexity for edge cases that the confidence mechanism already handles.

### 7. Path traversal / glob abuse protection
**Why not:** File paths come from GitHub API via the Context Agent, not from untrusted user input. The GitHub API normalizes paths. Adding path sanitization here would be defense-in-depth for a threat that doesn't exist in this architecture.

### 8. Strict ContextOutput contract definition
**Why not:** This is already defined in core infrastructure (split 01). The analysis agent documents what it needs and falls back gracefully. Changing the ContextOutput contract is out of scope for this split.
