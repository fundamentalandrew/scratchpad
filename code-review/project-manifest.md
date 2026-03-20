<!-- SPLIT_MANIFEST
01-core-infrastructure
02-context-agent
03-analysis-agent
04-review-agent
05-interactive-output
END_MANIFEST -->

# Project Manifest: AI Code Review Agent

## Overview

A TypeScript CLI tool that acts as a "Macro-Reviewer" — an AI-powered principal engineer that distills large PRs (or entire repos) down to the critical files and decisions requiring human attention. Uses a multi-agent architecture with Claude API, Tree-sitter AST analysis, and interactive terminal UX.

## Split Structure

### 01-core-infrastructure (Foundation)
**Purpose:** CLI framework, agent orchestration engine, configuration system, and shared types.

- CLI entry point with two modes: `review-pr <url>` and `review-repo <url>`
- Agent orchestration: sequential pipeline with structured JSON message passing between agents
- Configuration system: thresholds, ignore patterns, domain rules paths
- Shared TypeScript types/interfaces for agent input/output contracts
- Domain rules scaffolding command (`init` to generate starter DOMAIN_RULES.md / ARCHITECTURE.md)

**Dependencies:** None (foundational)

### 02-context-agent (Agent A)
**Purpose:** Fetches and structures all context needed for review — PR metadata, repo structure, domain rules.

- GitHub API integration: fetch PR description, diff, linked issues, labels
- Repo cloning/checkout for full-repo review mode
- Domain rules file discovery and loading (DOMAIN_RULES.md, ARCHITECTURE.md)
- Outputs structured JSON context object for downstream agents

**Dependencies:** 01-core-infrastructure (types, config)

### 03-analysis-agent (Agent B)
**Purpose:** Deterministic noise reduction via AST analysis + LLM-based semantic impact scoring.

- Tree-sitter integration for TypeScript/JavaScript (extensible to other languages)
- AST-based change classification: format-only, renames, moved functions, extracted methods, refactors
- File-pattern-based ignore rules (lock files, generated code, assets)
- Claude API integration for semantic impact scoring (1-10 per file)
- Outputs scored file list with risk classifications

**Dependencies:** 01-core-infrastructure (types, config), 02-context-agent (context output as input)

### 04-review-agent (Agent C)
**Purpose:** Principal Engineer agent that synthesizes context + analysis into actionable review recommendations.

- Consumes context (Agent A output) and scored analysis (Agent B output)
- Claude API integration for high-level architectural reasoning
- Generates structured recommendations: file, why-review, human-check-needed, score
- Identifies the core architectural decision/change in the PR
- Categorizes remaining files as safe-to-ignore with reasons

**Dependencies:** 01-core-infrastructure (types), 02-context-agent (output), 03-analysis-agent (output)

### 05-interactive-output (Output UX)
**Purpose:** Terminal interactive confirmation and output generation (PR comments or markdown).

- Interactive terminal UI: present recommendations, user accepts/rejects each
- GitHub PR comment posting (approved recommendations only)
- Markdown file generation with structured review output
- Formatting: the strategic review summary format from the brief

**Dependencies:** 01-core-infrastructure (types, config), 04-review-agent (recommendations output)

## Dependency Graph

```
01-core-infrastructure
    ├── 02-context-agent
    │       └── 03-analysis-agent
    │               └── 04-review-agent
    │                       └── 05-interactive-output
```

## Execution Order

**Sequential chain** — each split builds on the previous:

1. `01-core-infrastructure` — Must be first (all others depend on it)
2. `02-context-agent` — Needs core types and config
3. `03-analysis-agent` — Needs context agent output contract
4. `04-review-agent` — Needs both context and analysis outputs
5. `05-interactive-output` — Needs review recommendations

**Parallel opportunities:** Splits 02 and 03 could be partially parallelized if the typed JSON contracts from 01 are defined first (Agent B's deterministic AST analysis doesn't need Agent A's output — only the LLM scoring step does). However, for /deep-plan purposes, sequential execution is cleaner.

## Cross-Cutting Concerns

- **Claude API client:** Shared across agents 03 and 04. Should be defined in 01 as a utility.
- **GitHub API client:** Used by 02 (fetch PR data) and 05 (post comments). Should be defined in 01.
- **Error handling:** Agent failures should be graceful — if Agent B fails on AST parsing, fall back to pattern-based filtering.
- **Token management:** Large PRs can exceed context windows. Agents need chunking strategies.

## Next Steps

```
/deep-plan @01-core-infrastructure/spec.md
/deep-plan @02-context-agent/spec.md
/deep-plan @03-analysis-agent/spec.md
/deep-plan @04-review-agent/spec.md
/deep-plan @05-interactive-output/spec.md
```
