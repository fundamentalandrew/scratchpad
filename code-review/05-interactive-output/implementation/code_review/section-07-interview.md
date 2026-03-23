# Code Review Interview: Section 07 - Output Agent

## Triage Summary

| # | Finding | Disposition |
|---|---------|-------------|
| 1 | Non-null assertion on `pr!.number` | **Ask user** → Add guard |
| 2 | Untestable `new Date()` | Let go (over-engineering) |
| 3 | No error propagation tests | Let go (low value) |
| 4 | Missing pr-comment in non-PR test | Let go (covered by guard) |
| 5 | Hardcoded GitHub URL | Let go (no GHE support) |
| 6 | Silent return 0 | Let go (can't happen per schema) |
| 7 | Test helper types | Let go (types match schema) |
| 8 | Unused import concern | Let go (not actually unused) |

## Interview

### Q1: Non-null assertion on `deps.contextOutput.pr!.number`

**Decision:** Add defensive guard (recommended option).

Applied: Added runtime check `if (!deps.contextOutput.pr)` that throws `"Cannot publish PR comment without PR context"` before accessing pr fields.

## Auto-fixes

None needed beyond the interview fix above.
