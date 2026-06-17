# Section 03 Code Review

## High Severity

### 1. `partialConfigSchema` strictness may be lost after `.partial()`
The `configSchema.partial()` may not preserve `.strict()`. File validation uses the partial schema, so unknown keys in `.codereview.json` might pass file validation and only fail at final merge — producing confusing errors.

### 2. `output` deep merge — future-proofing concern (not a current bug)
If future env vars mapped to output sub-fields, they'd be lost. Currently only apiKey/githubToken are mapped, so this is fine today.

## Medium Severity

### 3. `discoverConfigFile` is not exported
Plan says extract for testability, but the function is private.

### 4. Missing test: CLI flags override all other sources
No test coverage for the `cliFlags` parameter at all.

### 5. Missing test: deep merge of the `output` sub-object
No test verifying partial output config preserves other output defaults.

### 6. Error message assertions too weak
Malformed JSON and missing file tests only check `toThrow(ConfigError)` but don't verify message content.

## Low Severity

### 7. Empty string env vars treated as falsy — correct but untested
### 8. Partial schema + output defaults interaction is subtle and untested
### 9. No barrel export / index.ts for config module
