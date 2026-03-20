# Section 03 Code Review Interview

## User Decision

### #1 — partialConfigSchema strictness (HIGH)
**Decision:** Fix (option A) — add `.strict()` explicitly to `partialConfigSchema`
**Applied:** Yes — `configSchema.partial().strict()` in schema.ts

## Auto-fixes Applied

### #3 — Export `discoverConfigFile`
Changed from private to exported function in loader.ts.

### #4 — Add CLI flags override test
Added test verifying cliFlags beats both env vars and file values.

### #5 — Add output deep merge test
Added test verifying partial output config preserves other output defaults.

### #6 — Strengthen error assertions
Updated malformed JSON test to check message contains "Invalid JSON".
Updated missing file test to check message contains the file path.

### Bonus — Add unknown keys rejection test through loadConfig
Added test verifying typos in .codereview.json (e.g. `igorePatterns`) are caught.

## Let Go

- #2: Future-proofing concern, not a current bug
- #7: Empty string env vars — correct behavior, low risk
- #8: Partial schema + output defaults — works correctly via spread order
- #9: Barrel export — not required by plan
