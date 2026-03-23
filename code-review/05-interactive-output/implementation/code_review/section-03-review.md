# Code Review: Section 03 - Shared Formatters

The implementation is largely faithful to the plan, but there are several issues worth calling out:

1. **sanitizeForGitHub does not sanitize formatter outputs (medium severity):** The plan explicitly states in the 'Downstream Consumers' section that 'sanitizeForGitHub is specifically called on LLM-generated content (recommendation messages, suggestions) before inclusion in PR comment output.' However, formatRecommendationBlock emits r.message, r.humanCheckNeeded, and r.suggestion raw without passing them through sanitizeForGitHub. While sanitization may be the caller's responsibility, the plan's phrasing is ambiguous and the current architecture means every downstream consumer must remember to sanitize individually. A missed call anywhere creates a GitHub notification side-channel. Consider sanitizing within formatRecommendationBlock itself as defense-in-depth.

2. **Missing test for annotate action with empty/undefined note (low-medium severity):** The implementation checks `decision.action === 'annotate' && 'note' in decision && decision.note`. The test suite never exercises the edge case where action is 'annotate' but note is undefined or an empty string. This compound guard silently swallows empty notes -- is that intentional? There is no test confirming this behavior.

3. **sanitizeForGitHub regex has a subtle flaw with consecutive mentions (medium severity):** The regex `/(^|\s)@(\w)/g` will NOT match an '@' that appears immediately after certain markdown characters like '(' or '>' or at the start of a new line within a multi-line string after non-whitespace. For example, '(@orgname)' would NOT be sanitized because '(' is not \s. An attacker-controlled recommendation message could use parenthetical mentions to trigger GitHub notifications. The plan's suggested regex has this same limitation, but a production implementation should be more robust.

4. **No test for formatSummaryHeader with empty focusAreas (minor):** The implementation conditionally renders focus areas only when the array is non-empty, but the only test that exercises empty focusAreas does not assert that the 'Focus Areas' heading is absent.

5. **No test for formatSummaryHeader total recommendations count:** The implementation outputs the total recommendations count via `reviewOutput.recommendations.length`, but no test asserts this value appears correctly in the output.

6. **Import path concern:** shared.ts imports from '@core/agents/schemas.js' which is an external module path alias. If the path alias is misconfigured or the upstream module restructures, this breaks silently at build time.
