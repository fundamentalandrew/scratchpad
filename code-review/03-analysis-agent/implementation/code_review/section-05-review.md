# Code Review: Section 05 - Prompt Builder

The implementation is largely faithful to the plan but has one notable field naming mismatch and several weaker concerns.

**Field naming mismatch between plan and implementation (Medium severity)**

The plan (lines 117-121) defines `LowRiskSummary` with fields `classification` (string) and `score` (number). The actual type in `types.ts` (lines 44-48) uses `changeType` and `suggestedScore` instead. The implementation in `prompt-builder.ts` (line 92) correctly uses `s.changeType` and `s.suggestedScore` to match the actual type, and the tests (line 223) also use the actual field names. So the code is internally consistent, but it deviates from the plan's specified interface. This is acceptable only if the plan was superseded by the types defined in section 01. However, it means the plan document is now misleading -- anyone reading the plan would expect `classification` and `score` fields.

**Weak test assertions for the scoring rubric (Low severity)**

Test case 1 (lines 131-138) checks for the rubric by asserting the prompt contains '1', '10', and a regex `/1.*3/s`. These assertions are trivially satisfiable by almost any string containing numbers. The plan says to assert 'references to the 1-10 scale' and 'representative tier descriptions'. The test should assert on actual rubric text like 'Low risk' or 'Critical risk' or 'CSS changes' to have meaningful coverage. As written, this test would pass even if the rubric were completely removed, as long as the PR title happened to contain a '1' and a '10'.

**No test for architecture doc omission when null (Low severity)**

The plan specifies testing that domain rules are omitted when null (test case 3, which is implemented). There is a parallel requirement for architecture context (test case 4 tests inclusion), but there is no explicit test verifying the architecture section is omitted when `architectureDoc` is null. The `domainRules: null` omission test (line 148) exists but the analogous architecture omission test does not.

**No test for empty tech stack (Low severity)**

The implementation (lines 46-48) conditionally omits the tech stack section when `techLines` is empty (all arrays empty and no dependencies). No test exercises this edge case. If `languages`, `frameworks`, and `dependencies` are all empty, the section is silently dropped. This is reasonable behavior but untested.

**Tech stack section silently dropped when all fields empty (Design concern)**

Lines 46-48 of `prompt-builder.ts`: if `languages`, `frameworks`, and `dependencies` are all empty, no Tech Stack section is emitted at all. The plan (line 102) says to 'Format context.techStack as a readable block' unconditionally. Whether this omission matters depends on downstream expectations, but it is a deviation.

**Output format does not request JSON fencing (Low severity)**

The output format section (lines 56-62) asks the LLM to 'Return a JSON object' but does not instruct it to wrap the response in a JSON code fence or otherwise delimit it. Depending on how section 07's LLM scorer parses the response, this could lead to parsing failures if the LLM includes preamble text before the JSON. The plan does not explicitly require fencing, but it is a practical gap worth noting for the scorer integration.

Overall the implementation is clean, pure, and well-structured. The primary concern is the weak rubric assertion in test case 1 which provides almost no regression protection.
