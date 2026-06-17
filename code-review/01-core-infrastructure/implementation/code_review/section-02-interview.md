# Code Review Interview: Section 02 - Shared Types & Zod Schemas

## Triage

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | Duplicate type definitions in types.ts vs schemas.ts | High | Auto-fix: re-export from schemas.ts |
| 2 | AuthError no remediation text | Medium | Auto-fix: append remediation in constructor |
| 3 | JSON Schema test Zod v4 only | Low | Let go (we're on Zod 4.3.6) |
| 4 | Weak ContextOutput refinement test | Medium | Auto-fix: add repo-mode test case |
| 5 | ReviewMode schema inlined | Medium | Auto-fix: export ReviewModeSchema |
| 6 | PRSchema/RepositorySchema not exported | Low | Let go (YAGNI) |
| 7 | GitHubAPIError bare-bones | Medium | Asked user → keep simple for now |
| 8 | No negative tests for Analysis/Review | Low | Let go |
| 9 | PipelineError cause pattern | Low | Auto-fix: use idiomatic super(msg, { cause }) |

## Interview Items

### GitHubAPIError wrapping
- **Decision:** Keep simple. Will flesh out when building GitHub client in section-06.

## Auto-fixes Applied

1. **types.ts** — Replaced manual interfaces with re-exports from schemas.ts (single source of truth)
2. **AuthError** — Constructor now appends remediation steps to message
3. **schemas.test.ts** — Added repo-mode refinement rejection test
4. **schemas.ts** — Extracted ReviewModeSchema, used in ContextOutputSchema
5. **errors.ts** — PipelineError uses idiomatic `super(msg, { cause })` pattern
6. **errors.test.ts** — AuthError test now verifies remediation text
