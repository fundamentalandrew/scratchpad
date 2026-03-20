# Code Review Interview: Section 06 - Tech Stack Detector

## Triage Summary

| # | Finding | Severity | Decision |
|---|---------|----------|----------|
| 1 | Wrong file paths | High | Let go — same pattern as section 05, already approved |
| 2 | Language before parse | Medium | Let go — plan explicitly allows it |
| 3 | Missing nestjs key | Medium | Auto-fixed |
| 4 | Missing pyproject.toml parser | Low-Medium | Let go — plan says optional |
| 5 | requirements.txt regex | Medium | Auto-fixed |
| 6 | No tests for other manifests | Low | Let go — plan says optional |
| 7 | Meaningless assertion | Low | Auto-fixed |
| 8 | No deduplication test | Low | Let go — internal Set guarantees it |
| 9 | Missing framework tests | Low | Let go — adequate coverage for spec |

## Auto-Fixes Applied

### #3: Added `nestjs` to FRAMEWORK_MAP
Added plain `nestjs` alongside `@nestjs/core` mapping.

### #5: Fixed requirements.txt version parsing
Replaced fragile regex with proper operator stripping. `==2.0.0` now correctly yields `2.0.0`. Also handles extras syntax like `package[extra]>=1.0`.

### #7: Removed meaningless assertion
Removed `expect(() => result).not.toThrow()` which was a no-op since result was already awaited.

## Items Let Go
- #1: File path deviation — established pattern, already approved
- #2: Language before parse — plan allows it explicitly
- #4, #6: Optional manifest parsers/tests — plan says best-effort
- #8: Deduplication — guaranteed by Set usage, no test needed
- #9: Additional framework tests — adequate coverage
