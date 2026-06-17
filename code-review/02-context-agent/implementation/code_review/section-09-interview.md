# Code Review Interview: Section 09 - Integration Tests

## Auto-fixes Applied

1. **Fix `previous_filename` → `previousPath` in mock** (HIGH): The mock was using the raw GitHub API field name instead of the normalized `previousPath` that `GitHubClient` returns. Fixed to match the client's return type.

2. **Add `architectureDoc` assertion to Test 1** (LOW): The mock returns content for `ARCHITECTURE.md`, so the test now verifies `architectureDoc` is non-null.

3. **Assert `getReferencedIssues` not called in Test 3** (MEDIUM): When the PR description is empty, `parseClosingReferences` returns `[]` and the agent short-circuits. Added assertion to verify this behavior.

4. **Validate stage 0 ContextOutput in Test 5** (MEDIUM): Added `ContextOutputSchema.safeParse()` check on the pipeline's first stage data to verify the context agent produced valid output before it was passed to the stub.

## Let Go

- Logger at module scope: `createLogger` is stateless, no risk.
- `vi.restoreAllMocks()` being a no-op: harmless defensive practice.
- Tight coupling to detector implementation details in Test 2: acceptable for integration tests.
- `as unknown as GitHubClient` casts: standard pattern used throughout the existing tests.
- No negative test for invalid mode: not required by the plan.
