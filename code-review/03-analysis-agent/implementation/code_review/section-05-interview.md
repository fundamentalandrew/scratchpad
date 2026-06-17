# Code Review Interview: Section 05 - Prompt Builder

## Auto-fixes Applied

### Strengthened rubric test assertions
- **Finding:** Test case 1 used trivially satisfiable assertions (`contains "1"`, `contains "10"`)
- **Fix:** Replaced with assertions on actual tier text: `"1-3 (Low risk)"`, `"4-7 (Medium/High risk)"`, `"8-10 (Critical risk)"`, `"security/auth logic"`
- **Status:** Applied and tests pass

## Let Go (No Action)

### Field naming mismatch with plan
The plan says `classification`/`score` but actual types from section 01 use `changeType`/`suggestedScore`. Code correctly follows the actual types. Plan doc will be updated in Step 9.

### No test for architecture doc omission when null
The default test context already has `architectureDoc: null`, so omission is implicitly covered.

### No test for empty tech stack
Edge case for a pure string builder - not worth adding.

### Tech stack section dropped when all fields empty
Consistent with how domain rules and architecture context are conditionally included. Reasonable behavior.

### JSON fencing in output format
Section 07 will use Zod structured output via Claude API, so response parsing won't depend on fencing.
