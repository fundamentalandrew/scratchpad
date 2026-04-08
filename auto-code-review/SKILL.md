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

When this skill is invoked, execute the main orchestration script `review_pr.py` from this skill's installation directory. Pass the PR number as the first argument. The script's working directory MUST be the user's current repository (not this skill's directory).

```bash
python3 <SKILL_DIR>/review_pr.py <PR_NUMBER>
```

The script implements a strict 5-phase pipeline:

### Phase 1: Pre-Flight & Circuit Breaker
- Fetches PR metadata and diff via `gh` CLI
- Filters noise: lockfiles, minified assets, generated code, config files
- Applies circuit breaker: if diff > 800 lines or > 15 core files, prompts user for confirmation
- Loads the target repo's `ARCHITECTURE.md` (if present) as the governance source of truth

### Phase 2: Parallel Map-Reduce Analysis
- Spawns 3 subagents concurrently (System Architect, Performance Analyst, Maintainability Lead)
- Each subagent receives the filtered diff, architecture rules, and file context
- Each returns structured JSON with `findings` and `questions`
- Hard limit: MAX_RETRIES = 3 for any tool/query to prevent hallucination loops

### Phase 3: Deferred Multi-Choice Protocol
- Collects and deduplicates all subagent questions
- Presents batched questions to the user in multi-choice format
- User answers are fed back into the orchestrator's analysis

### Phase 4: Two-Stage Human-in-the-Loop Drafting
- Generates structured markdown report at `.claude/pr_review_draft.md`
- Embeds hidden `<!-- GH_META: file=... line=... -->` tags for GitHub mapping
- Pauses for the user to review/edit the draft in their IDE

### Phase 5: Automated GitHub Publishing
- User types `publish` to proceed
- Parses the edited draft, extracts surviving GH_META tags
- Posts inline threaded comments on the PR via `gh api`
- Cleans up the draft file

## Conflict Resolution Hierarchy

When subagents disagree, the orchestrator resolves using this strict priority:

1. `ARCHITECTURE.md` rules (local governance)
2. System maintainability
3. Micro-performance
