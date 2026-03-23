# Complete Specification: Review Agent (Agent C)

## Overview

Agent C is the "Principal Engineer" agent that synthesizes context (from Agent A) and scored analysis (from Agent B) into actionable, high-level review recommendations. It tells a human developer where to look and what decisions to question — it does not find bugs.

## Input Contract

**ReviewAgentInput** (combined type, new):
```
{
  context: ContextOutput   // From Agent A
  analysis: AnalysisOutput // From Agent B
}
```

This requires:
1. A new `ReviewAgentInput` type in 01-core-infrastructure
2. Updating the stub review agent to use this combined input
3. Updating the pipeline runner or how agents are wired (the pipeline passes output of agent N as input to N+1, so the analysis agent must pass through context, OR the pipeline must accumulate results)

### ContextOutput Fields Used
- `mode` (pr/repo) — determines prompt strategy
- `pr.title`, `pr.description` — PR intent
- `pr.files` — file list for cross-referencing
- `domainRules` — business constraints injected into prompt
- `architectureDoc` — system design patterns
- `referencedIssues` — linked ticket context
- `techStack` — language/framework context

### AnalysisOutput Fields Used
- `scoredFiles` — all scored files with risk levels and reasons
- `criticalFiles` — files above critical threshold
- `summary.categories` — change type distribution
- `summary.totalFiles`, `criticalCount`, `highCount` — counts

## Output Contract

**ReviewOutput** (extended schema in 01-core-infrastructure):

```
ReviewOutputSchema = z.object({
  coreDecision: z.string(),
  recommendations: z.array(RecommendationSchema),
  focusAreas: z.array(z.string()),
  safeToIgnore: z.array(IgnoreGroupSchema),  // NEW
  summary: z.string(),                        // NEW
})
```

**RecommendationSchema** (extended):
```
RecommendationSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  severity: RiskLevelSchema,
  category: z.string(),
  message: z.string(),
  suggestion: z.string().optional(),
  humanCheckNeeded: z.string(),         // NEW - specific review question
  estimatedReviewTime: z.string(),      // NEW - e.g., "5 min"
  score: z.number(),                    // NEW - 1-10 from analysis
})
```

**IgnoreGroupSchema** (new):
```
IgnoreGroupSchema = z.object({
  label: z.string(),      // e.g., "tests/*"
  count: z.number(),      // e.g., 30
  description: z.string() // e.g., "Standard mock updates"
})
```

## Core Requirements

### 1. Core Decision Identification
- Analyze changes holistically to identify the single most important architectural or business decision
- Express as clear one-sentence summary (e.g., "This PR shifts payment retry logic from cron to event-driven webhooks")
- PR mode: decision about the delta
- Repo mode: core architectural pattern or concern

### 2. Recommendation Generation
For files scoring 4+:
- File path, severity, category
- `message` — what this file does in context of the change
- `humanCheckNeeded` — specific question the reviewer should answer (not generic "check for bugs")
- `score` — impact score from Agent B
- `estimatedReviewTime` — rough estimate

### 3. Safe-to-Ignore Summary
Group low-risk/ignored files (score < 4) into categories:
- Label with glob-like pattern and count
- Brief description (just group counts, no detailed rationale)
- e.g., "tests/* (30 files) — Standard mock updates"

### 4. Review Modes
- **PR mode:** Separate system prompt focused on the delta
- **Repo mode:** Separate system prompt focused on architecture, quality, security, domain patterns
- Implementation: two prompt builders, selected by `context.mode`

### 5. Focus Areas
High-level areas deserving attention (e.g., "Error handling in payment flow", "New database migration patterns")

## Technical Decisions

### Claude API Usage
- Structured output with Zod schema (`ReviewOutputSchema`)
- System prompt includes domain rules, architecture context, scoring rubric context
- Temperature: 0.2-0.3 for analytical consistency
- Single API call (review agent receives pre-scored files, doesn't need batching)

### Error Handling
- Fail fast — let errors propagate
- Pipeline runner handles retries for idempotent agents
- Agent is idempotent (safe to retry)

### Architecture
- Factory function: `createReviewAgent(deps)` mirrors analysis agent pattern
- Dependencies: `{ claude: ClaudeClient, logger?: Logger, config: CodeReviewConfig }`
- Lean module structure: review-agent.ts, prompt-builder.ts, types.ts, index.ts

### Pipeline Integration Changes
- New `ReviewAgentInput` type
- Updated stub agent
- Pipeline must provide combined input (context + analysis) to review agent

## Dependencies
- 01-core-infrastructure: Agent interface, extended schemas, ClaudeClient, config
- Input from 02-context-agent (ContextOutput) and 03-analysis-agent (AnalysisOutput)
- Output consumed by 05-interactive-output
