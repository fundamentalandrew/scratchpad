# Code Review Interview: Section 01 - Schema Extensions

## Triage Summary

| # | Finding | Disposition | Rationale |
|---|---------|------------|-----------|
| 1 | Missing negative test for TechStackSchema | Auto-fix | Adds consistency with other schema tests |
| 2 | No type-rejection tests | Let go | Testing Zod internals adds noise without value |
| 3 | createdAt no datetime validation | Let go | Plan specifies z.string(); GitHub API returns ISO |
| 4 | state unconstrained | Let go | Intentional per plan |
| 5 | previousPath only with renamed | Let go | Over-engineering for this stage |
| 6 | JSON Schema generation test not updated | Auto-fix | Plan explicitly calls this out |
| 7 | stubs.test.ts verification | Let go | Confirmed by npm test passing |
| 8 | Hardcoded 2024 dates | Let go | Fixtures, not meaningful |

## Auto-fixes Applied

### Fix 1: Add TechStackSchema rejection test
Added test that rejects object missing required fields.

### Fix 6: Add new schemas to JSON Schema generation test
Added ReferencedIssueSchema, ReviewCommentSchema, TechStackSchema, PRFileSchema to the test array.
