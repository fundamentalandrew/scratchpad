# Code Review Interview: Section 03 - Prompt Builder

## Triage Summary

### Auto-fixed
- **#5 Missing architectureDoc null test:** Added test `omits architecture doc section when null`
- **#6 Missing techStack omission test:** Added test `omits tech stack section when undefined`
- **#8 Weak 50-file limit test:** Changed `toBeLessThanOrEqual(50)` to `toBe(50)`
- **#9 Missing referenced issues test:** Added test `includes referenced issues when present`
- **#10 Missing additions/deletions test:** Added test `includes file additions and deletions from PR files`

### Let go
- **#1 Null vs undefined on domainRules/architectureDoc:** `!== null` is correct per schema (`z.string().nullable()`). Empty string is an unlikely edge case.
- **#2 Inconsistent checks:** Reflects actual schema difference (optional vs nullable). Correct.
- **#3 Repo mode for buildUserPrompt:** Out of scope for this section.
- **#4 Test import paths:** Using local re-exports is the project convention from section-02.
- **#7 makeFileScores skips medium:** Test helper riskLevel values are adequate for prompt content testing.
- **#11 Indirect truncation test:** Sufficient for its purpose.
