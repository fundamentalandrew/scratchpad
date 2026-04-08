# SSDLC Architect Plugin — TODO

## High Priority (functional gaps)

- [x] 1. **Hooks (`hooks/hooks.json`)** — SessionStart hook + `scripts/hooks/capture-session-id.py`
- [x] 2. **Task tracking in SKILL.md** — Rewritten with 8 numbered steps, TodoWrite tasks with dependencies, and context-pinning tasks (C1-C3)
- [x] 3. **Reference files (`skills/ssdlc-plan/references/`)** — Extracted from SKILL.md:
  - [x] 3a. `references/socratic-protocol.md` — Domain sequencing, Physical Gate, question quality
  - [x] 3b. `references/stride-template.md` — STRIDE threat model + OWASP ASVS checklist
  - [x] 3c. `references/output-template.md` — Final brief template (Phase 6)
  - [x] 3d. `references/recon-protocol.md` — Codebase search patterns for Phase 2
- [x] 4. **Output template file** — Standalone template at `references/output-template.md`, loaded by SKILL.md Step 7

## Medium Priority (robustness)

- [x] 5. **`config.json`** — Physical Gate limit, adversarial model/toggle, recon toggle, output paths
- [x] 6. **State persistence to disk** — SKILL.md writes to `ssdlc-working/` at each phase boundary:
  - `original-brief.md` (input)
  - `intent-extraction.md` (Phase 1)
  - `recon-report.md` (Phase 2)
  - `interrogation-log.md` (Phase 3)
  - `draft-brief.md` (Phase 4)
  - `adversarial-findings.md` (Phase 5)
- [x] 7. **Resume capability** — Step 1 checks for existing `ssdlc-working/` artifacts, determines last completed phase, offers resume or fresh start

## Low Priority (polish)

- [ ] 8. **`pyproject.toml`** — Add for future hook scripts (deferred — hook script uses stdlib only)
- [x] 9. **Sample brief (`examples/sample-brief.md`)** — CSV export scenario with embedded Product bias
- [x] 10. **`CLAUDE.md`** — Plugin development and contribution notes

## Testing & Evaluation

- [x] 11. **Smoke test (`scripts/smoke-test.sh`)** — Validates plugin structure, file presence, frontmatter, JSON validity, cross-references (44/44 checks passing)
- [x] 12. **Brief validator (`scripts/validate-brief.py`)** — Structural validation of completed briefs: required sections, STRIDE coverage, API contracts, placeholder detection
- [x] 13. **Evaluator agent (`agents/brief-evaluator.md`)** — Opus-powered quality scoring across 6 dimensions (business alignment, threat rigor, API completeness, decision traceability, implementation clarity, edge case coverage)
- [x] 14. **Eval skill (`skills/ssdlc-eval/SKILL.md`)** — `/ssdlc-eval` command combining structural validation + AI quality review into a scored report
