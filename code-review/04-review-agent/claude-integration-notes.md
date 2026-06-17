# Integration Notes: External Review Feedback

## What I'm Integrating

### 1. Resolve pipeline input ambiguity (Issue #1)
**Integrating.** The plan has conflicting sections (3.4 ReviewAgentInput vs 3.5 contextPassthrough). I'll go with contextPassthrough approach and remove section 3.4. This is simpler and doesn't require pipeline runner changes.

### 2. Make new Recommendation fields optional (Issue #6)
**Integrating.** Making `humanCheckNeeded`, `estimatedReviewTime`, and `score` optional on the base `RecommendationSchema` avoids breaking other producers. The review agent will always populate them, but stubs and fixtures won't need to.

### 3. Structured estimatedReviewTime (Issue #7)
**Partially integrating.** Use `z.enum(["5", "15", "30", "60"])` for minutes instead of free-form string. Good for consistency and aggregation.

### 4. Compute safeToIgnore deterministically (Issue #3, #8)
**Integrating.** Define explicit grouping rules: group by `summary.categories` change types for categorized files, then by top-level directory for the rest. Compute counts from actual grouped files, never accept from LLM.

### 5. Add prompt truncation limits (Issue #12)
**Integrating.** Add max chars for PR description (2000), max files in user prompt (50 highest-scored), truncate file reasons to first 2.

### 6. Severity mapping from score (Issue #17)
**Integrating.** Map severity deterministically from Agent B's score rather than letting LLM choose: 8-10 critical, 5-7 high, 4 medium. Don't include severity in LLM schema.

## What I'm NOT Integrating

### Issue #10, #11: Security/prompt injection hardening
**Not integrating.** The existing data safety warning in the prompt is sufficient for this stage. The review agent only produces structured JSON output — it doesn't execute code or access external systems. Redaction and length limits are overkill given the pipeline context (trusted internal data from Agents A and B).

### Issue #13: Idempotency semantics
**Not integrating.** `idempotent: true` in this codebase means "safe to retry" (no side effects), not "deterministic output." This is consistent with how 03-analysis-agent uses it. Tests check structural conformance, not exact content.

### Issue #14: Retry-on-parse-failure
**Not integrating.** The pipeline runner already retries idempotent agents. Adding agent-internal retry would duplicate that logic.

### Issue #15: Rename safeToIgnore
**Not integrating.** The name matches the spec and is clear enough. Adding disclaimers is unnecessary.

### Issue #18-20: Additional tests
**Not integrating.** Testing for 500 files, injection resistance, and schema compatibility are nice-to-haves but not needed for initial implementation. The test plan covers the critical paths.

### Issue #4: Recommendation cap
**Partially not integrating.** We already limit to files scoring 4+ and truncate to top 50 in the prompt. An explicit cap on recommendation count would add complexity without clear benefit — if 30 files score 4+, they all deserve attention.
