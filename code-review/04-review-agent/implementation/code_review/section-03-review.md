# Code Review: Section 03 - Prompt Builder

The implementation is largely faithful to the plan, but there are several issues worth flagging:

1. **Null vs undefined confusion on domainRules/architectureDoc checks:** The checks use `!== null`, but if the field is the string `""` (empty string), it will still be included in the prompt. Technically plan-compliant but fragile.

2. **techStack and architectureDoc checks are inconsistent:** `techStack` uses truthy check because it is `optional()`, while `domainRules`/`architectureDoc` use `!== null` because they are `nullable()`. Correct given the schema difference.

3. **buildUserPrompt does not handle repo mode gracefully:** When `context.pr` is undefined (repo mode), the function silently skips PR metadata. Undocumented and untested.

4. **Test imports from local re-export path:** Test imports types from `../../src/types.js` while source imports from `@core/agents/schemas.js`. Works but creates fragile coupling.

5. **Missing test for architectureDoc omission when null:** domainRules null behavior is tested but architectureDoc null behavior is not.

6. **Missing test for techStack omission:** No test verifying Tech Stack section is omitted when `techStack` is undefined.

7. **makeFileScores helper skips 'medium' riskLevel:** The riskLevel mapping uses `>= 8 ? 'critical' : >= 4 ? 'high' : 'low'`, skipping 'medium'.

8. **50-file limit test is weak:** Uses `toBeLessThanOrEqual(50)` rather than `toBe(50)`.

9. **No test for referenced issues:** The referenced issues code path is never exercised.

10. **No test for file additions/deletions output:** The code that outputs additions/deletions from PR files is completely untested.

11. **Description truncation test is indirect:** Does not verify the actual truncated length is exactly 2000 characters.
