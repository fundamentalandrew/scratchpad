# Section 05 Diff

Note: The test file was already committed as part of section-04 (commit dbd9bed).
The file `tests/unit/review-agent.test.ts` contains 23 passing tests covering:
- Agent properties (name, idempotent)
- Empty/low-score file handling
- Score injection from analysis data
- Severity derivation
- LLM field mapping
- safeToIgnore grouping (category, directory, splitting, sorting)
- PR vs repo mode prompt selection
- Missing contextPassthrough handling
- Passthrough fields (coreDecision, focusAreas, summary)
- Schema conformance
- Claude client called with correct schema
