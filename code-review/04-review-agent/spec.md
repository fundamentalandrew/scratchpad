# 04 — Review Agent (Agent C)

## Goal

Build Agent C — the Principal Engineer agent that synthesizes context and analysis into actionable, high-level review recommendations.

## Context

This agent acts as the "brain" of the system. It receives the full context (what the PR/repo is about) and the scored analysis (which files matter), then produces the strategic review that a human developer reads. Its job is not to find bugs — it's to tell the human where to look and what decisions to question. See `BRIEF.md` and `deep_project_interview.md` in the project root for full context.

## Requirements

### Core Decision Identification

- Analyze the PR/repo changes holistically to identify the single most important architectural or business decision being made
- Express this as a clear, one-sentence summary (e.g., "This PR shifts payment retry logic from cron to event-driven webhooks")
- For repo review mode: identify the core architectural patterns and potential concerns

### Recommendation Generation

For each critical/important file (score 4+), generate:
- **File path** — Which file to review
- **Why review** — What this file does in the context of the change
- **Human check needed** — The specific question the reviewer should answer (not "check for bugs" but "ensure the DB transaction wraps the API call to prevent double-charging")
- **Score** — The 1-10 impact score from Agent B
- **Estimated review time** — Rough estimate (e.g., "5 min", "15 min")

### Safe-to-Ignore Summary

- Group low-risk/ignored files into categories with counts and brief explanations
- E.g., "tests/* (30 files) — Standard mock updates", "src/components/ui/* (45 files) — CSS class changes"

### Review Modes

- **PR mode:** Focus recommendations on the delta (what changed)
- **Repo mode:** Focus on architecture assessment, code quality issues, security concerns, and domain logic patterns across the entire codebase

### Output Contract

- Produce typed `ReviewOutput` JSON:
  - `coreDecision: string` — The main architectural/business decision
  - `recommendations: Recommendation[]` — Ordered list of files needing review
  - `safeToIgnore: IgnoreGroup[]` — Categorized low-risk files
  - `summary: string` — Overall review summary paragraph

## Technical Decisions

- Claude API with structured output (Zod) for recommendation generation
- System prompt includes domain rules and the scoring rubric context
- Temperature tuned for analytical reasoning (lower temperature)

## Dependencies

- **01-core-infrastructure:** Agent interface, shared types (`ReviewOutput`, `Recommendation`), Claude API client
- **02-context-agent:** `ContextOutput` (PR intent, domain rules)
- **03-analysis-agent:** `AnalysisOutput` (scored file list)

## What This Split Provides to Others

- `ReviewOutput` with structured recommendations
- Consumed by 05-interactive-output for presentation and publishing
