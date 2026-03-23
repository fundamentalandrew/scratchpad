# Usage Guide: Interactive Output Module (05-interactive-output)

## Quick Start

The module provides an interactive terminal-based review flow that lets users triage AI code review recommendations, then publish results as GitHub PR comments or markdown files.

### Using the Output Agent (Primary API)

```typescript
import { createOutputAgent } from "interactive-output";
import type { OutputAgentDependencies } from "interactive-output";

const agent = createOutputAgent({
  logger,
  githubClient,
  config: {
    markdown: true,
    markdownPath: "./code-review-report.md",
    githubComment: true,
  },
  contextOutput, // from the context-gathering pipeline stage
});

// In your pipeline:
const result = await agent.run(reviewOutput);
// Returns the original ReviewOutput unchanged (side-effect only agent)
```

The agent orchestrates the full flow:
1. Presents an interactive terminal review of each recommendation
2. User accepts, rejects, or annotates each item
3. User chooses output destination (PR comment or markdown file)
4. Formats and publishes the approved recommendations

### Using Individual Components

Each layer can be used independently:

```typescript
// Interactive review only
import { runInteractiveReview } from "interactive-output";
const result = await runInteractiveReview(reviewOutput, contextOutput, logger);
// Returns { approved, destination } or null if cancelled

// Format only
import { formatPRComment, formatMarkdownFile } from "interactive-output";
const prBody = formatPRComment(reviewOutput, approved, totalFiles);
const mdContent = formatMarkdownFile(reviewOutput, approved, totalFiles, {
  timestamp: new Date().toISOString(),
  reviewMode: "pr",
  prUrl: "https://github.com/org/repo/pull/42",
});

// Publish only
import { publishPRComment, publishMarkdownFile } from "interactive-output";
await publishPRComment(githubClient, "owner", "repo", 42, body, logger);
await publishMarkdownFile(content, "./report.md", logger);
```

## Example Output

### Interactive Terminal Flow

```
═══ Code Review Summary ═══
PR: Fix auth flow
Files: 12
Recommendations: 5
Safe to ignore: 3 files

───────────────────────────────────────
Reviewing 1/5 recommendations
src/auth.ts:42
[CRITICAL] (9/10) | security
SQL injection risk in user query
⚠ Human check: Verify parameterized queries
Suggestion: Use prepared statements

? Action: (Use arrow keys)
❯ Accept
  Reject
  Add note
```

### PR Comment Output

Posts a markdown comment on the PR with a `<!-- code-review-cli:report:v1 -->` marker for idempotent updates (creates on first run, updates on re-run).

### Markdown File Output

Writes a file with YAML frontmatter:

```markdown
---
timestamp: "2026-03-23T16:00:00.000Z"
reviewMode: "pr"
prUrl: "https://github.com/org/repo/pull/42"
---

# Code Review Report
...
```

## API Reference

### Types

| Type | Description |
|------|-------------|
| `OutputConfig` | `{ markdown: boolean, markdownPath: string, githubComment: boolean }` |
| `OutputAgentDependencies` | `{ logger, githubClient, config, contextOutput }` |
| `AnnotatedRecommendation` | `{ recommendation: Recommendation, decision: UserDecision }` |
| `UserDecision` | `{ action: "accept" \| "reject" } \| { action: "annotate", note: string }` |
| `OutputDestination` | `"pr-comment" \| "markdown-file" \| "cancel"` |

### Functions

| Function | Signature |
|----------|-----------|
| `createOutputAgent` | `(deps: OutputAgentDependencies) => Agent<ReviewOutput, ReviewOutput>` |
| `runInteractiveReview` | `(reviewOutput, contextOutput, logger) => Promise<{ approved, destination } \| null>` |
| `formatPRComment` | `(reviewOutput, approved, totalFiles) => string` |
| `formatMarkdownFile` | `(reviewOutput, approved, totalFiles, metadata) => string` |
| `publishPRComment` | `(githubClient, owner, repo, prNumber, body, logger) => Promise<void>` |
| `publishMarkdownFile` | `(content, filePath, logger) => Promise<void>` |

### Constants

| Constant | Value |
|----------|-------|
| `PR_COMMENT_MARKER` | `<!-- code-review-cli:report:v1 -->` |
