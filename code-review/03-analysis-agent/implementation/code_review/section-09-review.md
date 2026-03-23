# Code Review: Section 09 - Integration Tests

Several issues found, ranging from specification deviations to weak assertions that undermine the purpose of integration testing.

**HIGH SEVERITY: defaultConfig helper bypasses configSchema.parse({}), hardcodes wrong defaults**

The plan explicitly states (line 44, line 194-196) to use `configSchema.parse({})` for defaults. The implementation manually constructs a config object with `ignorePatterns: []` (empty array), which completely contradicts the real default of `DEFAULT_IGNORE_PATTERNS`. This means:

1. The "default analysis ignore patterns applied" test is fundamentally broken -- it passes `ignorePatterns: []` yet expects `package-lock.json` to be filtered. If this test passes, it means the agent has hardcoded ignore logic independent of config, which is either a coincidence or the test is validating the wrong thing.

2. The `output` field is hardcoded with `console: false` instead of the schema default `console: true`.

3. The plan says "agent works with minimal config (all optional fields absent)" using `configSchema.parse({})`. The implementation uses the manually constructed `defaultConfig()` instead, which has explicit values for every field -- this is not "minimal" at all.

**MEDIUM SEVERITY: Merge precedence test is gutted**

The plan specifies a concrete test: a `.ts` file AST-classified as format-only (score 1), also returned by LLM with score 6, and the final score should be 6. The implementation abandons this assertion entirely with a comment saying "The actual merge behavior depends on whether the file reaches both layers" and weakens the assertion to `expect(result.scoredFiles[0].score).toBeGreaterThanOrEqual(0)` -- which passes for literally any valid score.

**MEDIUM SEVERITY: No verification that ignored file paths are excluded from LLM calls**

The plan says: "Verify the Claude client query was never called with these file paths." The "ignored files appear with score 0" test never inspects `mockClaude.query` call arguments.

**MEDIUM SEVERITY: Missing score 0 boundary in risk level test**

The plan specifies testing score 0 as a boundary value. The implementation tests scores 1-10 but omits score 0. The `h.py` file has score 1, not 0.

**LOW SEVERITY: `as any` type casting throughout**

Every call to `createAnalysisAgent` uses `claude: mockClaude as any`. A proper approach would be `as ClaudeClient`.

**LOW SEVERITY: Idempotency test does not deep-compare scoredFiles content**

Two runs could return different scores for the same files and still pass this test.

**LOW SEVERITY: No beforeEach reset of mocks**

The `beforeEach` import is never used.
