# Code Review Interview: Section 05 - Claude API Client

## Triage Summary

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | ClaudeAPIError missing `cause` on JSON parse | Medium | Auto-fix |
| 2 | Unsafe `Record<string, unknown>` cast | Low | Let go |
| 3 | Missing JSON parse failure test | Medium | Auto-fix |
| 4 | Weak verbose logging test | Low | Let go |
| 5 | `redactSecrets` on safe data | Medium | Let go |
| 6 | Unguarded `toJSONSchema()` | Low | Let go |
| 7 | `mockResolvedValue` vs `mockResolvedValueOnce` | Low | Auto-fix |

## Auto-fixes Applied

### Fix 1: Pass `cause` on JSON parse failure
- Updated `ClaudeAPIError` constructor to accept optional `ErrorOptions`
- Updated catch block in `claude.ts` to forward the original `SyntaxError` as `cause`

### Fix 3: Added JSON parse failure test
- New test verifies malformed JSON throws `ClaudeAPIError` with `retryable: true` and preserves the original `SyntaxError` as `cause`

### Fix 7: `mockResolvedValue` → `mockResolvedValueOnce` in refusal test
- Prevents mock state leaking between tests

## Items Let Go

- #2: Unsafe cast is contained and intentional (conditional `system` omission)
- #4: Testing `redactSecrets` integration would require mocking internals
- #5: Not logging payloads is the correct security choice
- #6: Defensive wrapping of `toJSONSchema()` is over-engineering for internal use
