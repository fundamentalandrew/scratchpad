# Section 05 Code Review

## Findings

1. **SEVERITY DERIVATION TEST INCOMPLETE**: Plan requires testing scores 4, 5, 7, 8, 10 through agent.run(). Current test only checks score 9 via run(). Standalone deriveSeverity tests cover boundaries but not the full pipeline wiring.

2. **MISSING DYNAMIC buildMockLLMResponse(files)**: Plan specifies a helper that generates recommendations for each file. Current makeLLMResponse() is hardcoded to single file. Multi-file scenarios silently produce mismatched results.

3. **EXPORTED INTERNALS**: groupLowRiskFiles and deriveSeverity tested directly rather than through agent.run(). Plan spirit is to test through public interface. However, these are exported functions so this is acceptable as additional coverage.

4. **MISSING safeToIgnore ASSERTION on missing-context**: Test at line 218-226 doesn't assert safeToIgnore is empty.

5. **NO MULTI-FILE INTEGRATION TEST**: No test provides multiple high-risk files at different scores through agent.run().

6. **WEAK safeToIgnore ASSERTION**: Test at line 135-141 only checks length > 0, doesn't verify labels/descriptions.

7. **CATEGORY-THEN-DIRECTORY ORDERING**: No test verifies category groups appear before directory groups in the array.

8. **deriveSeverity "low" path**: Tests cover score < 4 returning "low" which is a dead code path in production. Minor.

9. **NO ERROR/REJECTION TEST**: No test for claude.query() throwing. Not in plan but would be good to have.
