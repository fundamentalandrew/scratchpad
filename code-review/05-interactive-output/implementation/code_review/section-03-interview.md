# Code Review Interview: Section 03 - Shared Formatters

## Finding 1: sanitizeForGitHub not called inside formatRecommendationBlock
- **Decision:** Caller responsibility (user chose)
- **Rationale:** Keep formatters pure and composable. Section-04 will sanitize when building PR comments.
- **Action:** No change

## Finding 2: Missing test for annotate with empty note
- **Decision:** Let go
- **Rationale:** TypeScript type system enforces `note: string` on annotate actions, so the edge case can't occur in practice.
- **Action:** No change

## Finding 3: Regex doesn't catch parenthetical mentions
- **Decision:** Keep plan's regex (user chose)
- **Rationale:** Matches the spec. Parenthetical mentions are unlikely in LLM output.
- **Action:** No change

## Finding 4: No test for empty focusAreas heading absence
- **Decision:** Auto-fix
- **Action:** Add assertion that "Focus Areas" heading is absent when focusAreas is empty

## Finding 5: No test for total recommendations count
- **Decision:** Auto-fix
- **Action:** Add assertion for recommendations count in output

## Finding 6: Import path concern
- **Decision:** Let go
- **Rationale:** Established pattern from section-01 setup.
- **Action:** No change
