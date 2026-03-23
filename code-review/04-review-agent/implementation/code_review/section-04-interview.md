# Code Review Interview: Section 04 - Review Agent

## Triage Summary

### Auto-fixed
- **#1 Category-based grouping missing**: Implemented category-based grouping in `groupLowRiskFiles`. Files with reasons matching category keys are grouped by category label first, remaining files by directory.
- **#3 Score field undefined**: Changed `scoreMap.get(rec.file)` to default to `0` when file not found.
- **#4 Missing category grouping test**: Added test `safeToIgnore grouped by category when matching`.
- **#5 Missing >20 file split test**: Added test `splits directory groups exceeding 20 files by next path segment`.

### Let go
- **#2 No error handling**: Pipeline responsibility, not agent-level. Plan doesn't require it.
- **#6 Exported helpers**: Keeping exported for direct unit testing.
- **#7 Brittle mode tests**: Prompt builders are tested in section-03. Substring checks are adequate here.
- **#8 estimatedReviewTime typing**: Correctly matches schema definition.
- **#9 Minimal logging**: Out of scope for this section.
- **#10 Unused config**: Threshold matches plan spec. Config passed for future extensibility.
