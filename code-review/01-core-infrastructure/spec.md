# 01 — Core Infrastructure

## Goal

Build the foundational CLI framework, agent orchestration engine, configuration system, and shared TypeScript types that all other splits depend on.

## Context

This is the first split of an AI Code Review Agent ("Macro-Reviewer") — a TypeScript CLI tool that uses a multi-agent architecture with Claude API to distill large PRs or entire repos down to the critical files requiring human attention. See `BRIEF.md` and `deep_project_interview.md` in the project root for full context.

## Requirements

### CLI Entry Point

- Two commands:
  - `review-pr <github-pr-url>` — Review a specific pull request
  - `review-repo <github-repo-url>` — Full audit of an entire repository
- `init` command — Scaffolds starter `DOMAIN_RULES.md` and `ARCHITECTURE.md` files in the target repo
- Standard CLI flags: `--help`, `--version`, `--verbose`, `--config <path>`
- Configuration file support (e.g., `.codereview.json` or similar)

### Agent Orchestration Engine

- Sequential pipeline runner that executes agents in order: Context → Analysis → Review → Output
- Structured message passing: each agent produces typed JSON output consumed by the next
- Agent interface definition:
  ```
  interface Agent<TInput, TOutput> {
    name: string;
    run(input: TInput): Promise<TOutput>;
  }
  ```
- Error handling: if an agent fails, report clearly and halt (or degrade gracefully where possible)

### Shared Types & Contracts

- TypeScript interfaces for all agent input/output contracts:
  - `ContextOutput` — What Agent A produces (PR metadata, domain rules, repo info)
  - `AnalysisOutput` — What Agent B produces (scored file list, risk classifications)
  - `ReviewOutput` — What Agent C produces (recommendations, core decision summary)
- Shared types: `FileScore`, `Recommendation`, `RiskLevel`, `ReviewMode` (PR vs Repo)

### Configuration System

- Configurable ignore patterns (glob-based file filtering)
- Score threshold for "critical" classification (default: 8)
- Domain rules file paths
- Claude API key management (env var or config)
- Output preferences

### Shared API Clients

- **Claude API client:** Wrapper around Anthropic SDK for structured output (Zod schemas), used by agents 03 and 04
- **GitHub API client:** Wrapper for PR data fetching (used by 02) and comment posting (used by 05)

## Technical Decisions

- TypeScript with Node.js runtime
- Claude (Anthropic) as the sole LLM provider
- Zod for structured output validation
- Standalone repo (not npm package)

## Dependencies

- None (this is the foundation)

## What This Split Provides to Others

- CLI framework and command routing
- Agent orchestration pipeline
- All shared TypeScript types/interfaces
- Claude API client utility
- GitHub API client utility
- Configuration loading and validation
