# 02 — Context Agent (Agent A)

## Goal

Build Agent A — the context-fetching agent that gathers all information needed for review: PR metadata, repository structure, linked issues, and domain rules.

## Context

This agent is the first step in the multi-agent pipeline. It takes a GitHub PR URL or repo URL and produces a structured context object that downstream agents use to understand what they're reviewing and why. See `BRIEF.md` and `deep_project_interview.md` in the project root for full context.

## Requirements

### PR Review Mode

- Given a GitHub PR URL, fetch:
  - PR title, description, author, labels
  - Full diff (list of changed files with patches)
  - Linked issues (from PR description or GitHub linked issues)
  - Base and head branch info
  - PR comments (existing review context)
- Handle large PRs: paginate file lists, handle API rate limits

### Full Repo Review Mode

- Given a GitHub repo URL:
  - Clone or shallow-clone the repository
  - Build a file tree / structure map
  - Identify key files: entry points, config files, package.json, etc.
  - Detect tech stack (languages, frameworks, dependencies)

### Domain Rules Loading

- Search for `DOMAIN_RULES.md` and `ARCHITECTURE.md` in the repo root
- Also check for common alternatives: `.github/ARCHITECTURE.md`, `docs/architecture.md`
- Parse and structure the content for injection into agent prompts
- If no domain rules found, note their absence (downstream agents should still work)

### Output Contract

- Produce a typed `ContextOutput` JSON object (types defined in 01-core-infrastructure)
- Must include: review mode, PR metadata (if PR mode), repo structure, domain rules, file list

## Technical Decisions

- Use GitHub REST API (via Octokit or similar) for PR data
- Use `git clone --depth 1` for repo mode
- Authentication via `GITHUB_TOKEN` env var or config

## Dependencies

- **01-core-infrastructure:** Agent interface, shared types (`ContextOutput`), GitHub API client, config system

## What This Split Provides to Others

- `ContextOutput` populated with all review context
- Consumed by 03-analysis-agent (needs file list and domain rules for scoring)
- Consumed by 04-review-agent (needs PR intent and domain rules for synthesis)
