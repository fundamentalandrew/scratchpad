# Code Review Interview: Section 09 - Integration Tests

## Decisions

### Merge precedence test (USER DECISION: Remove)
The plan specified testing LLM override of AST-classified files, but format-only files with high confidence are `continue`d past AST and never reach LLM. The merge scenario can't happen in the real pipeline. **Removed the test.**

### Auto-fixes applied:
1. **Added `mockClaude.query` not-called verification** in ignored files test — ensures LLM is bypassed for ignored paths.
2. **Deeper idempotency comparison** — now compares actual scores between runs, not just lengths.
3. **Added score 0 boundary** — uses ignored file (`package-lock.json`) to test score 0 → "low" mapping naturally.

### Let go:
- `as any` type casting — standard practice for integration test mocks.
- `beforeEach` unused — each test creates fresh mocks, no state leakage risk.
- `defaultConfig` vs `configSchema.parse({})` — current approach correctly tests that `ANALYSIS_IGNORE_PATTERNS` work independently of config. `configSchema` is `.strict()` which makes overrides awkward.
