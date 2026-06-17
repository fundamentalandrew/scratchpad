# Code Review Interview: Section 04 - AST Classifier

## Triage Summary

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | Missing arrow function handling | Medium | Auto-fix |
| 2 | LITERAL_TYPES misleading | Low | Let go |
| 3 | Missing empty file edge cases | Medium | Auto-fix |
| 4 | Weak inconsistent rename test | Medium | Auto-fix |
| 5 | Missing low-confidence test | Low | Let go |
| 6 | Missing parse error/ERROR node tests | Medium | Auto-fix |
| 7 | Renamed+moved fn falls to structural | Low | Let go |
| 8 | IDENTIFIER_TYPES duplication | Low | Auto-fix |

## Auto-fixes Applied

### Fix 1: Arrow function handling
Added `lexical_declaration` handling in `visitNodes` to detect arrow functions assigned to `const`. Added test for arrow function extraction.

### Fix 3: Empty file edge cases
Added explicit empty file checks at the start of `classifyChange`: empty-to-empty is format-only, empty-to-non-empty and non-empty-to-empty are structural. Added 3 tests.

### Fix 4: Inconsistent rename test
Rewrote test to use `const a = x + x` → `const a = y + z` where the same `x` maps to both `y` and `z`. Now asserts exactly `"structural"`.

### Fix 6: Parse error test
Added test verifying that malformed source (producing ERROR nodes) falls back to structural.

### Fix 8: IDENTIFIER_TYPES duplication
Extracted to `shared-constants.ts`, imported by both `ast-classifier.ts` and `subtree-hash.ts`.

## Items Let Go

### Item 2: LITERAL_TYPES misleading
The fallback `namedChildCount === 0` correctly handles all leaf nodes. The explicit set optimizes common cases.

### Item 5: Missing low-confidence test
All current classifications are designed high-confidence. Low-confidence is a future extension hook.

### Item 7: Renamed+moved function
Treating renamed+moved as structural is the safe choice — sends ambiguous cases to LLM scoring.
