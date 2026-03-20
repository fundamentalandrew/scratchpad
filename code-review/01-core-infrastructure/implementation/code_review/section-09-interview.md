# Code Review Interview: Section 09 - Integration Tests

## Interview Decisions

### #1 CLI Parsing Tests (HIGH) — USER DECISION: Export program for testing
Refactor src/index.ts to separate program definition from execution, so integration tests can import and test the real Commander program.

### #2 E2E Command Handler Tests (HIGH) — USER DECISION: Keep as smoke tests
The stub pipeline tests already validate schema correctness. The E2E tests confirm wiring doesn't throw.

## Auto-fixes

### #3 Missing Fixture Validation Test (MEDIUM-HIGH) — AUTO-FIX
Add a describe block with tests that validate stub agent outputs against their Zod schemas. Already partially done in the pipeline stubs test, but adding explicit fixture validation.

### #6 Verbose Test Missing stderr Spy (LOW-MEDIUM) — AUTO-FIX
Add process.stderr.write spy alongside stdout spy in verbose logging tests.

### #8 Retry Test Slow Due to Backoff (LOW-MEDIUM) — AUTO-FIX
Add vi.useFakeTimers() to the error propagation describe block to avoid real delays from exponential backoff.

## Let Go

### #4 review-repo mode assertion — Stubs don't propagate mode; not meaningful at this level.
### #5 env var to client constructor verification — Would require deep mocking; config loading already verified.
### #7 non-verbose info log assumption — logger.info writes to stdout, this is the correct contract.
### #9 no init command test — init is trivially simple, already unit tested.
### #10 dynamic import caching — Vitest handles vi.mock hoisting correctly.
