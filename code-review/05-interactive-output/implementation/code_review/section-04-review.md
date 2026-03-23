# Code Review: Section 04 - Output Formatters

1. **MISSING RE-EXPORTS FROM index.ts (requirement violation):** The plan states both formatPRComment and formatMarkdownFile should be re-exported from src/index.ts. Currently only types are exported.

2. **buildReportBody IS EXPORTED BUT SHOULD NOT BE:** The plan describes it as a private/unexported helper. Currently exported from pr-comment.ts and imported by markdown-file.ts.

3. **ReviewOutput imported from @core instead of src/types.ts:** The plan says types should go through the local types module. Currently importing directly from @core/agents/schemas.js.

4. **DUPLICATE CORE DECISION RENDERING:** formatSummaryHeader already renders a Core Decision subsection, and buildReportBody renders another one. The core decision text appears twice.

5. **YAML FRONTMATTER VALUES ARE NOT QUOTED:** URLs with colons could break YAML parsers. Values should be quoted.

6. **SEVERITY ORDER MAP ALLOWS UNKNOWN SEVERITIES SILENTLY:** Falls back to 4 for unknown severities without warning.

7. **TEST COVERAGE GAP -- BODY CONTENT TEST FOR MARKDOWN FILE IS WEAK:** Tests with zero approved recommendations don't exercise the recommendations section.

8. **NO EDGE CASE TEST FOR EXACTLY 5 SAFE-TO-IGNORE GROUPS:** Boundary condition at exactly 5 not tested.
