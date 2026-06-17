---
name: review-pr
description: "Code review a pull request with principal-engineer-grade analysis. Use when user says 'review PR', 'review pull request', 'code review PR', or invokes /review-pr <PR_NUMBER>."
---

# Principal-Grade AI Code Review

## Trigger

`/review-pr <PR_NUMBER>`

## Description

A principal-engineer-grade code review pipeline that analyzes GitHub Pull Requests using parallel subagent teams. It focuses exclusively on macro-architecture, domain boundaries, abstraction leakage, and technical debt — never on syntax, formatting, naming, or basic CVEs (those belong in CI/CD).

## Installation

Team members add this skill to their Claude Code configuration by referencing this repository's path:

```json
{
  "skills": [
    "/path/to/auto-code-review"
  ]
}
```

## Prerequisites

- `gh` CLI authenticated and available on PATH
- `claude` CLI available on PATH (for subagent spawning)
- A GitHub PR number in the current repository

## Usage

From any git repository with a GitHub remote:

```
/review-pr 142
```

## Instructions

When this skill is invoked, execute the main orchestration script `review_pr.py` from the plugin root directory (two levels up from this SKILL.md). Pass the PR number as the first argument. The script's working directory MUST be the user's current repository (not this skill's directory).

```bash
python3 <SKILL_DIR>/../../review_pr.py <PR_NUMBER>
```

The script implements a strict 6-phase pipeline:

### Phase 1: Pre-Flight & Circuit Breaker
- Fetches PR metadata and diff via `gh` CLI
- Filters noise: lockfiles, minified assets, generated code, config files
- Applies circuit breaker: if diff > 800 lines or > 15 core files, prompts user for confirmation
- Loads the target repo's `ARCHITECTURE.md` (if present) as the governance source of truth

### Phase 2: Parallel Map-Reduce Analysis
- Auto-discovers reviewer identities by globbing `prompts/*.md` (each file is one identity)
- Each prompt may include YAML frontmatter (`name`, `description`, `max_turns`, `enabled`); without it the filename is title-cased into the agent name
- Spawns one subagent per identity concurrently (default identities: System Architect, Performance Analyst, Maintainability Lead)
- Each subagent receives the filtered diff, architecture rules, and file context
- Each returns structured JSON with `findings` and `questions`
- Hard limit: MAX_RETRIES = 3 for any tool/query to prevent hallucination loops
- **Adding a new perspective: drop a new `.md` file in `prompts/`. No Python changes needed.**

### Phase 3: Deferred Multi-Choice Protocol
- Collects and deduplicates all subagent questions
- Presents batched questions to the user in multi-choice format
- User answers are fed back into the orchestrator's analysis

### Phase 4: LLM Consolidation Pass
- Sends every raw finding from every agent to a dedicated Consolidator subagent
- Merges near-duplicates (same root issue flagged by multiple agents) into single findings with multi-agent attribution
- Picks the highest severity, the most specific file/line, and rewrites the analysis to integrate each agent's perspective
- Falls back to passthrough (no merging) if the consolidator subagent fails — pipeline keeps moving

### Phase 5: Two-Stage Human-in-the-Loop Drafting
- Generates structured markdown report at `.claude/pr_review_draft.md`
- Embeds hidden `<!-- GH_META: file=... line=... agents=... -->` tags for GitHub mapping
- Pauses for the user to review/edit the draft in their IDE

### Phase 6: Automated GitHub Publishing
- User types `publish` to proceed
- Parses the edited draft, extracts surviving GH_META tags
- Posts inline threaded comments on the PR via `gh api` (each comment lists every agent that flagged it)
- Cleans up the draft file

## Conflict Resolution Hierarchy

When subagents disagree, the orchestrator resolves using this strict priority:

1. `ARCHITECTURE.md` rules (local governance)
2. System maintainability
3. Micro-performance
