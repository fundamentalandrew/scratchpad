# Analysis Agent (Agent B) — Complete Specification

## Overview

Build Agent B — the analysis agent that receives `ContextOutput` from the context agent (PR mode only) and produces `AnalysisOutput` with scored, classified files. It combines deterministic noise reduction (glob filtering + Tree-sitter AST analysis) with LLM-based semantic impact scoring via the Claude API.

## Architecture Position

```
02-context-agent → [ContextOutput] → 03-analysis-agent → [AnalysisOutput] → 04-review-agent
```

The analysis agent sits between context gathering and review synthesis. It reduces hundreds of changed files down to the critical few by:
1. Filtering noise via configurable glob patterns
2. Classifying changes via AST analysis (format-only, rename-only, moved functions)
3. Scoring remaining files via Claude API on a 1-10 domain impact scale

## Input Contract

**`ContextOutput` (from context agent, PR mode only):**
- `mode`: "pr"
- `repository`: `{ owner, repo, defaultBranch }`
- `pr`: `{ number, title, description, author, baseBranch, headBranch, files[], diff }`
- `domainRules`: `string | null`
- `architectureDoc`: `string | null`
- `techStack`: `{ languages[], frameworks[], dependencies{} }`
- `referencedIssues`: issue details array
- `comments`: review comment array

Key fields consumed: `pr.files` (file list with patches), `pr.diff` (unified diff), `domainRules`, `architectureDoc`, `techStack`.

## Output Contract

**`AnalysisOutput` (already defined in core schemas):**
- `scoredFiles`: `FileScore[]` — all files with scores
- `criticalFiles`: `FileScore[]` — subset with score >= criticalThreshold
- `summary`: `{ totalFiles, criticalCount, highCount, categories{} }`

**`FileScore`:**
- `path`: string
- `score`: number (0-10)
- `riskLevel`: "critical" | "high" | "medium" | "low"
- `reasons`: string[]

## Layer 1: Deterministic Noise Reduction

### 1a. Glob Pattern Filtering

Filter files matching configurable ignore patterns before any analysis. Uses the existing `filterFiles()` utility from core infrastructure.

**Additional default patterns for analysis agent** (beyond core defaults):
- `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- `*.generated.*`, `*.gen.*`
- `*.graphql` (GraphQL schemas)
- `prisma/migrations/**`
- `**/locales/**`, `**/translations/**`, `**/i18n/**`
- `**/*.svg`
- `**/__snapshots__/**`, `**/*.snap`

These are merged with core `ignorePatterns` from config. User can override via `.codereview.json`.

**Filtered files** get score 0, riskLevel "low", reason "Filtered by ignore pattern", changeType "ignored".

### 1b. Tree-sitter AST Analysis

For files that pass glob filtering and are in supported languages (TypeScript/JavaScript):

**Native bindings:** Use `tree-sitter` npm package with `tree-sitter-typescript` and `tree-sitter-javascript` grammars.

**Classification categories (medium depth):**

1. **Format-only:** Parse before/after versions. Compare AST node types and structure, ignoring leaf text content and whitespace. If AST structures are identical → format-only change.

2. **Rename-only:** AST structures are identical except identifier node text values differ. All identifiers of the renamed symbol change consistently across the file.

3. **Moved functions:** Use subtree hashing (hash node type + child structure, ignore leaf text) to detect function/method bodies that appear in a different location but are structurally identical.

**Classification output:** Files classified as format-only, rename-only, or moved get auto-scored 1-2.

**Unsupported languages:** Files not in TS/JS skip AST analysis entirely and go directly to LLM scoring.

### 1c. Low-Risk File LLM Validation

AST-classified low-risk files are NOT completely excluded from LLM scoring. Instead, they're sent as one-line summaries for validation:
- "src/utils/helpers.ts — format-only change (whitespace/indentation)"
- "src/api/client.ts — rename: `fetchData` → `getData`, no logic change"
- "src/lib/parser.ts — function `parseInput` moved from line 45 to line 120, body unchanged"

This allows the LLM to flag false positives without consuming full diff tokens.

## Layer 2: LLM-Based Semantic Scoring

### Prompt Strategy

For files that pass the deterministic filter (not ignored, not auto-classified as low-risk):

**System prompt includes:**
- Scoring rubric (1-10 scale)
- Domain rules from `ContextOutput.domainRules` (when available)
- Architecture doc from `ContextOutput.architectureDoc` (when available)
- Tech stack context
- PR title and description for intent context

**When no domain rules exist:** Fall back to generic scoring rubric without domain-specific context.

**Scoring rubric:**
- 1-3: UI tweaks, CSS changes, simple CRUD boilerplate, test mock updates, config formatting
- 4-7: State management changes, API contract modifications, complex UI logic, middleware changes
- 8-10: Core business rule changes, DB schema alterations, security/auth logic, payment processing, architectural pattern deviations

### Structured Output

Use Zod schemas via the existing `ClaudeClient.query()` method to enforce structured JSON output. Define a scoring response schema:

```
LLMScoringResponse = {
  scores: Array<{
    file: string
    score: number (1-10)
    reason: string
    changeType: string
  }>
}
```

### Batching Strategy

**Equal batching:** Split files into batches of roughly equal token budget.

**Token estimation:** Use simple character heuristic (~4 chars per token) for pre-send estimation.

**Batch formation:**
1. Estimate token count for each file's diff
2. Group files into batches targeting ~70-80% of context window
3. Keep files in the same directory together when possible
4. Each batch gets the same system prompt and scoring rubric

**Large files (separate API calls):** Files whose diff exceeds a threshold (e.g., >50% of a single batch budget) get their own dedicated Claude API call with full context window.

**Low-risk summaries:** Include as a separate section in one of the batches — they're compact enough to fit alongside regular file diffs.

### Token Tracking

Track token usage via `ClaudeClient.getTokenUsage()` across all scoring calls. Report in `AnalysisOutput.summary`.

## Agent Interface

Follow the established factory pattern:

```
createAnalysisAgent({
  claude: ClaudeClient
  logger?: Logger
  config: CodeReviewConfig
}): Agent<ContextOutput, AnalysisOutput>
```

- `name`: "analysis"
- `idempotent`: true (safe to retry)
- `run(input: ContextOutput)`: Execute the full analysis pipeline

## Error Handling

- Tree-sitter parse failures for individual files: log warning, send file to LLM scoring instead
- Claude API failures: propagate up (pipeline runner handles retry via idempotent flag)
- Empty file list after filtering: return empty AnalysisOutput with zero scores
- No supported language files: skip AST layer entirely, send all to LLM

## Dependencies

- **01-core-infrastructure:** Agent interface, `AnalysisOutputSchema`, `FileScoreSchema`, `ClaudeClient`, `filterFiles`, config types, Logger
- **02-context-agent:** `ContextOutput` type (input)
- **New dependencies:** `tree-sitter`, `tree-sitter-typescript`, `tree-sitter-javascript`
