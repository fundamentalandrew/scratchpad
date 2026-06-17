# Code Review: Section 09 - Integration Tests

Several significant gaps and issues found when reconciling the implementation against the plan.

1. CLI PARSING TESTS DO NOT TEST THE ACTUAL CLI (HIGH). The plan explicitly says to test CLI command parsing by invoking the real Commander program from src/index.ts. The implementation creates a brand-new throwaway Commander instance with hand-wired commands instead of importing and testing the actual program. This validates nothing about the real CLI wiring -- if someone breaks src/index.ts, these tests will still pass. The plan states: 'Programmatically invoke Commander program.parseAsync()' referring to the actual program, and 'Mock the actual command handler to capture parsed arguments.' The test should import the real program (or its factory) and mock the action handlers.

2. END-TO-END COMMAND HANDLER TESTS ARE SHALLOW (HIGH). The plan requires mocking GitHub client methods (getPR, getPRFiles, getPRDiff) and Claude client to return fixture data, then asserting the pipeline produces valid ReviewOutput. The implementation simply calls reviewPR/reviewRepo and asserts the promise resolves to undefined. It never inspects the pipeline result, never validates the output against Zod schemas, and never verifies fixture data flows through. The test just checks the function does not throw -- that is a smoke test, not an end-to-end integration test. The plan explicitly says: 'Assert pipeline completes and produces valid ReviewOutput.'

3. MISSING FIXTURE DATA AND FIXTURE VALIDATION TEST (MEDIUM-HIGH). The plan requires creating minimal but schema-valid fixture objects for PR metadata, file lists, diffs, repo trees, and Claude responses, and explicitly requires 'a preliminary test that validates each fixture against its schema to catch fixture drift early.' No such fixtures or fixture-validation test exist in the implementation. The tests rely entirely on the stub agents' hardcoded return values instead of creating separate fixture constants as specified.

4. MISSING review-repo MODE ASSERTION (MEDIUM). The plan says: 'Assert pipeline completes with mode "repo"' for the review-repo end-to-end test. The implementation only checks the promise resolves to undefined with no mode assertion.

5. ENV VAR TEST DOES NOT VERIFY VALUES FLOW TO CLIENTS (MEDIUM). The plan says: 'Use these to construct (mocked) clients, verifying the env values arrived.' The implementation only checks config.apiKey and config.githubToken are set, but never verifies those values are passed to client constructors. This misses half the point of the test.

6. VERBOSE LOGGING TEST DOES NOT CAPTURE stderr (LOW-MEDIUM). The plan says to use both process.stdout.write and process.stderr.write spies. The implementation only spies on stdout. If the logger writes errors or warnings to stderr, those are not captured or asserted.

7. NON-VERBOSE TEST ASSERTS INFO LOGS STILL APPEAR ON STDOUT (POTENTIAL FALSE POSITIVE). The test asserts 'Running StubContextAgent...' appears even in non-verbose mode. This assumes the pipeline runner uses logger.info which writes to stdout. If the logger implementation changes to only output verbose lines to stdout, this test will break for the wrong reason.

8. RETRY TEST HAS SLOW EXPONENTIAL BACKOFF (LOW-MEDIUM). The retry test uses maxRetries: 2 with the real pipeline runner which has exponential backoff (1000ms * 2^attempt). This means the test waits at least 1 second for the backoff delay. Integration tests should either mock timers or use vi.useFakeTimers() to avoid slow tests.

9. NO TEST FOR 'init' COMMAND (LOW). The plan lists three CLI commands (review-pr, review-repo, init), but there is no CLI parsing test for the init command.

10. DYNAMIC IMPORT OF COMMAND MODULES MAY CACHE STALE MOCKS (MEDIUM). Dynamic import() for the command modules may return cached module instances. Since vi.mock for github client is set at the top level, and vi.resetAllMocks() is called in beforeEach, the mocked return values may not apply correctly if the module was already imported and cached.
