# Code Review Interview: Section 03 - File Filter Module

## Finding 1: Missing export from index.ts
**Action:** Auto-fix (not needed)
**Resolution:** The project imports utils directly by path (e.g., `../utils/file-filter.js`), not through barrel exports. No index.ts re-export needed — consistent with existing conventions.

## Finding 2: Missing nested matchBase test
**Action:** Auto-fix (applied)
**Resolution:** Added `deep/nested/package.lock` to the matchBase test to verify `*.lock` matches nested paths.

## Finding 3: Pattern splitting heuristic undocumented
**Action:** Asked user — user said "Add a comment"
**Resolution:** Added JSDoc comment explaining the bare-glob vs path-glob split and the picomatch matchBase limitation.

## Finding 4: No input validation
**Action:** Let go
**Rationale:** Internal utility function; callers control inputs via typed config.

## Finding 5: Performance note
**Action:** Let go
**Rationale:** Informational only; not relevant for current usage patterns.
