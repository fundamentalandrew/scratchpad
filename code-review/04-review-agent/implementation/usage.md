# Usage Guide

## Quick Start

```typescript
import { createReviewAgent } from "./04-review-agent/src/index.js";
import type { ClaudeClient } from "@core/clients/claude.js";
import type { CodeReviewConfig } from "@core/config/schema.js";

// 1. Set up dependencies
const claude: ClaudeClient = { query: yourClaudeQueryFn };
const config: CodeReviewConfig = {
  ignorePatterns: ["node_modules/**"],
  criticalThreshold: 8,
  domainRulesPath: "./DOMAIN_RULES.md",
  architecturePath: "./ARCHITECTURE.md",
  model: "claude-sonnet-4-5-20250514",
  maxRetries: 3,
  output: { console: true, markdown: false, markdownPath: "", githubComment: false },
};

// 2. Create the review agent
const reviewAgent = createReviewAgent({ claude, config });

// 3. Run with AnalysisOutput (from the analysis agent)
const reviewOutput = await reviewAgent.run(analysisOutput);
```

## Pipeline Integration

The review agent is designed to run after the analysis agent in the pipeline:

```
ContextOutput → [Analysis Agent] → AnalysisOutput → [Review Agent] → ReviewOutput
```

The analysis agent now populates `contextPassthrough` on its output, giving the review agent access to PR metadata, domain rules, and architecture context.

## Public API

### `createReviewAgent(deps)`

Factory function that creates the review agent.

```typescript
createReviewAgent(deps: {
  claude: ClaudeClient;
  logger?: Logger;
  config: CodeReviewConfig;
}): Agent<AnalysisOutput, ReviewOutput>
```

### Prompt Builders

```typescript
buildPRSystemPrompt(context: ReviewContext): string
buildRepoSystemPrompt(context: ReviewContext): string
buildUserPrompt(highRiskFiles: FileScore[], context: ReviewContext, summary: AnalysisSummary): string
```

### Schemas

- `LLMReviewResponseSchema` — Validates raw LLM response
- `ReviewOutputSchema` — Validates final review output
- `AnalysisOutputSchema` — Validates analysis input (includes optional `contextPassthrough`)

## Example Output

```json
{
  "recommendations": [
    {
      "path": "src/auth.ts",
      "severity": "critical",
      "title": "SQL injection vulnerability",
      "description": "User input is interpolated directly into SQL query",
      "humanCheckNeeded": true,
      "estimatedReviewTime": 15,
      "score": 9
    }
  ],
  "safeToIgnore": [
    {
      "name": "Lock files",
      "reason": "Auto-generated dependency files",
      "files": ["package-lock.json", "yarn.lock"]
    }
  ],
  "summary": "PR changes 12 files. 2 critical issues in auth module require human review.",
  "focusAreas": ["Authentication changes", "Database query construction"]
}
```

## Key Behaviors

- **Risk threshold**: Files with score >= 4 get detailed LLM review; lower-scored files are grouped into "safe to ignore" categories
- **Mode-aware prompts**: PR mode includes PR metadata; repo mode focuses on codebase-wide patterns
- **Idempotent**: Running twice with same input produces same output
- **Context passthrough**: Analysis agent copies its full input into `contextPassthrough`, so the review agent always has access to PR metadata and domain context
