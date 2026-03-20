# 03 — Analysis Agent (Agent B)

## Goal

Build Agent B — the analysis agent that performs deterministic noise reduction via AST analysis and LLM-based semantic impact scoring to reduce hundreds of files down to the critical few.

## Context

This is the heaviest technical split. It combines traditional static analysis (Tree-sitter AST parsing) with LLM reasoning (Claude API) to score every changed file on a 1-10 domain impact scale. The deterministic layer filters noise before the LLM sees anything, saving tokens and improving focus. See `BRIEF.md` and `deep_project_interview.md` in the project root for full context.

## Requirements

### Deterministic Noise Reduction (Pre-LLM)

**File-pattern filtering:**
- Auto-ignore configurable glob patterns: `package-lock.json`, `*.generated.*`, GraphQL schemas, Prisma migrations, translation files, SVG assets, snapshot tests
- Default ignore list with user overrides via config

**Full AST analysis with Tree-sitter:**
- Parse before/after versions of changed files
- Detect and classify change types:
  - **Format-only:** Whitespace, indentation, line breaks — no semantic change
  - **Rename-only:** Variable/function renames with no logic change
  - **Moved functions:** Function moved to different file or location, body unchanged
  - **Extracted methods:** Code extracted into new function, original replaced with call
  - **Refactored patterns:** Structural changes that preserve behavior (e.g., loop → map)
- Auto-classify detected patterns as "Low Risk" (score 1-2)
- Start with TypeScript/JavaScript support, design for language extensibility

### LLM-Based Semantic Scoring

- For files that pass the deterministic filter, send to Claude API
- Prompt strategy: "Analyze these file changes against the context. Score the 'Domain Logic Impact' of each file from 1 to 10."
- Scoring rubric:
  - 1-3: UI tweaks, CSS, simple CRUD boilerplate, test mocks
  - 4-7: State management, API contract changes, complex UI logic
  - 8-10: Core business rule changes, DB schema alterations, security/auth, payment logic, architectural deviations
- Use Zod schemas to enforce structured JSON output from Claude
- Include domain rules from context in the scoring prompt
- Handle token limits: chunk files if total diff exceeds context window

### Output Contract

- Produce typed `AnalysisOutput` JSON:
  - Scored file list: `{ file: string, score: number, reason: string, changeType: string }`
  - Files grouped by risk: critical (8-10), important (4-7), low-risk (1-3), ignored (filtered)
  - Summary statistics: total files, files per category, tokens used

## Technical Decisions

- Tree-sitter via `tree-sitter` npm package with language-specific grammars
- Start with `tree-sitter-typescript` and `tree-sitter-javascript`
- Claude API with structured output (Zod) for scoring
- Chunking strategy for large PRs: group files by directory/module, score in batches

## Dependencies

- **01-core-infrastructure:** Agent interface, shared types (`AnalysisOutput`, `FileScore`), Claude API client, config (ignore patterns, thresholds)
- **02-context-agent:** `ContextOutput` as input (file list, diffs, domain rules)

## What This Split Provides to Others

- `AnalysisOutput` with scored, classified file list
- Consumed by 04-review-agent for final synthesis
