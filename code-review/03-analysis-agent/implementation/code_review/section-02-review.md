# Code Review: Section 02 - Pattern Filter

1. **Missing barrel re-exports.** `filterChangedFiles`, `ANALYSIS_IGNORE_PATTERNS`, and `PatternFilterResult` not re-exported from `index.ts`. Plan explicitly requires this.

2. **Duplicate type: `FilterResult` vs `PatternFilterResult`.** `types.ts` already has `FilterResult` with `{ passed, ignored }`. `PatternFilterResult` is `FilterResult + ignoredScores`. Potential confusion.

3. **Import of `PRFile` from local `./types.js` instead of `@core`.** Functionally equivalent but indirect.

4. **Test gap: `__snapshots__` directory not independently verified.** Test file `src/__snapshots__/app.snap` also matches `**/*.snap`.

5. **Test gap: `*.graphql` pattern not tested.**

6. **Deduplication test is weak.** Can't distinguish dedup from non-dedup since picomatch handles duplicate patterns fine.

7. **No barrel file update in diff.** Confirms re-export was missed.
