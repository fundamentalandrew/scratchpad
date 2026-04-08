# Transcript Protocol

All questions asked and answers received MUST be recorded in `./ssdlc-working/interrogation-log.md`. This transcript serves as the audit trail for every decision in the final brief and as recovery state if the session crashes.

## File Structure

The interrogation log uses this structure:

```markdown
# SSDLC Interrogation Transcript

**Feature:** [feature name from brief]
**Started:** [date]
**Status:** [in-progress | complete]

---

## Phase 1: Intent Extraction

### Turn 1
**Phase:** 1 — Intent Extraction
**Domain:** N/A
**Asked:**
> [What you presented or asked the user after intent extraction]

**Answered:**
> [User's response — acknowledgment, corrections, additional context]

**Decisions locked:**
- [Any decisions confirmed in this exchange, or "None"]

---

## Phase 2: Contextual Reconnaissance

### Turn 1
**Phase:** 2 — Recon
**Domain:** N/A
**Asked:**
> [Recon report presented, plus any clarifying questions]

**Answered:**
> [User's response — corrections to recon findings, additional context]

**Decisions locked:**
- [e.g., "Confirmed: Auth0 JWT is the only auth mechanism"]

---

## Phase 3: Socratic Interrogation

### Turn 1
**Phase:** 3 — Socratic Interrogation
**Domain:** System Boundaries
**Asked:**
> [Your 1-2 questions, verbatim]

**Answered:**
> [User's answer, verbatim]

**Decisions locked:**
- [Decisions derived from this exchange]

**Follow-up needed:**
- [Any unresolved threads from this answer, or "None"]

### Turn 2
[repeat structure, incrementing turn number]

---

## Phase 4: STRIDE & Contracts Review

### Turn 1
**Phase:** 4 — Forcing Functions
**Domain:** Threat Model Review
**Asked:**
> [Questions about the draft STRIDE model or API contracts]

**Answered:**
> [User's feedback, corrections, approvals]

**Decisions locked:**
- [Adjustments to threat model or contracts]

---

## Phase 5: Adversarial Triage

### Turn 1
**Phase:** 5 — Adversarial Review
**Domain:** Security Triage
**Asked:**
> [Fatal flaw or finding presented, with your question about how to handle it]

**Answered:**
> [User's triage decision]

**Decisions locked:**
- [How the finding was resolved]

---

## Transcript Complete
**Completed:** [date]
**Total turns:** [count]
**Decisions logged:** [count]
```

## Recording Rules

1. **Record EVERY exchange** where you ask the user something and they respond. This includes:
   - Phase 1: Presenting intent extraction results and getting acknowledgment
   - Phase 2: Presenting recon report and getting corrections
   - Phase 3: Every Socratic question turn (the bulk of the transcript)
   - Phase 4: Draft review feedback
   - Phase 5: Each adversarial triage decision
2. **Quote verbatim.** Do not summarize or paraphrase. Record your exact questions and the user's exact answers.
3. **Log decisions immediately.** After each exchange, extract any decisions that were locked in. These feed directly into ADRs in the final brief.
4. **Track follow-ups.** If an answer raises new questions, note them under "Follow-up needed" so they aren't lost.
5. **Update the status header.** Set status to `in-progress` at creation, `complete` when Phase 5 triage is done.
6. **Append, never overwrite.** Always append new turns. Never rewrite previous entries.
7. **Write after every turn.** Do not batch — write to disk after each user response so the transcript survives crashes.

## How Decisions Flow to the Final Brief

Each "Decisions locked" entry maps to one of:
- An **ADR** in Section 2 (architectural choices with rationale)
- A **STRIDE mitigation** in Section 3 (security decisions)
- An **API contract detail** in Section 5 (error handling, auth, rate limits)
- An **Open Question** in Section 7 (explicitly deferred items)

When generating the final brief in Phase 6, read the full transcript and ensure every logged decision appears in the appropriate section. If a decision is missing from the brief, that's a bug.
