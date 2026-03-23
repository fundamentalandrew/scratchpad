# Complete Specification: 05-Interactive-Output Module

## Overview

Build the final pipeline stage that presents AI-generated code review results interactively in the terminal, allows the user to curate recommendations (accept, reject, or annotate), and publishes the approved results as either a GitHub PR comment or a markdown file.

This module receives `ReviewOutput` from the review agent (04-review-agent) and implements the user-facing output layer of the code review CLI tool.

## Input Data

### ReviewOutput (from 04-review-agent)

```typescript
ReviewOutput {
  recommendations: Recommendation[];
  coreDecision: string;
  focusAreas: string[];
  safeToIgnore: IgnoreGroup[];
  summary: string;
}
```

### Recommendation

```typescript
{
  file: string;
  line?: number;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  message: string;
  suggestion?: string;
  humanCheckNeeded?: string;
  estimatedReviewTime?: "5" | "15" | "30" | "60";
  score?: number; // 0-10
}
```

### IgnoreGroup

```typescript
{
  label: string;
  count: number;
  description: string;
}
```

### ContextOutput (available via pipeline context passthrough)

Provides PR metadata (`pr.number`, `pr.title`, `repository.owner`, `repository.repo`), review mode (`"pr" | "repo"`), and other context needed for output formatting.

## Interactive Terminal Flow

### Step 1: Display Review Summary Header

Show a concise summary:
- Total files in PR and critical file count
- Core decision from AI
- Focus areas

### Step 2: Present Recommendations One-at-a-Time

For each recommendation (sorted by severity descending, then score descending):
- Display: file path, severity, score, message, humanCheckNeeded
- Show progress indicator: "Reviewing 3/12 recommendations"
- User selects one of:
  - **Accept** — include in output as-is
  - **Reject** — exclude from output
  - **Add note** — accept with user-provided annotation that appears in output alongside the recommendation
  - **Back** — go back to previous recommendation to change decision
- Navigation supports going back to change previous decisions

### Step 3: Safe-to-Ignore Summary

Display grouped safe-to-ignore files (informational, no action needed):
- Each group: label, count, description

### Step 4: Final Confirmation

If zero recommendations accepted: print message ("No recommendations to post.") and exit. Do not offer to post/save.

If recommendations accepted: prompt with single-select:
- **Post as PR comment** — post to GitHub (only available in PR mode)
- **Save as markdown file** — write to configured path
- **Cancel** — exit without output

## GitHub PR Comment Output

### Content Format

Single structured comment matching the brief's UX spec:
```
<!-- code-review-bot-report -->
🧠 Strategic PR Review Guide
This PR modifies {totalFiles} files.
You only need to deeply review these {criticalCount} files.

🎯 The Core Decision Made by AI:
{coreDecision}

🛑 Top N Files Requiring Human Verification:

**{file}** (score: {score}/10, severity: {severity})
Why review: {message}
Human check needed: {humanCheckNeeded}
📝 Reviewer note: {userNote}  ← only if user added a note

✅ Safely Ignore / Skim ({count} Files):
{groupLabel} ({count} files) — {description}
```

### Update-or-Create Pattern

Use hidden HTML comment marker (`<!-- code-review-bot-report -->`) to:
1. List existing PR comments
2. Find comment containing the marker
3. If found: update the existing comment
4. If not found: create a new comment

This prevents comment spam on re-runs.

**Implementation:** Extend `GitHubClient` in 01-core-infrastructure with a `createOrUpdatePRComment()` method that encapsulates this pattern.

### Only Approved Recommendations

Only user-accepted recommendations appear in the output. Rejected items are silently excluded.

## Markdown File Output

### Content

Same structured content as the PR comment, plus metadata header:
```markdown
---
timestamp: 2026-03-23T10:30:00Z
pr_url: https://github.com/owner/repo/pull/123
review_mode: pr
---

🧠 Strategic PR Review Guide
[... same content as PR comment ...]
```

### Configuration

- Default path: `./code-review-report.md` (from config `output.markdownPath`)
- Include minimal metadata: timestamp, PR URL, review mode

## Technical Decisions

### Dependencies

- **`@inquirer/prompts`** — modern async/await interactive prompts (tree-shakeable, first-class TypeScript)
  - `select()` for per-recommendation accept/reject/note actions
  - `input()` for note text entry
  - `select()` for final output destination choice
- **Existing:** chalk (colors), @octokit/rest (GitHub API), zod (validation)

### Architecture

- Implement as an Agent matching the pipeline interface: `Agent<ReviewOutput, ReviewOutput>`
- `name: "output"`, `idempotent: false`
- Factory function: `createOutputAgent(dependencies)`
- Dependencies injected: logger, githubClient, config, contextOutput

### Module Structure

```
05-interactive-output/
  src/
    index.ts              — exports createOutputAgent, types
    output-agent.ts       — agent factory and orchestration
    interactive.ts        — terminal prompt logic (recommendation review flow)
    formatters/
      markdown.ts         — shared markdown formatting helpers
      pr-comment.ts       — GitHub PR comment body builder
      markdown-file.ts    — markdown file content builder
    publishers/
      github.ts           — posts/updates PR comment via GitHubClient
      file.ts             — writes markdown file to disk
    types.ts              — module-specific types (UserDecision, AnnotatedRecommendation)
  tests/
    ...
  package.json
  tsconfig.json
  vitest.config.ts
```

### Changes to 01-core-infrastructure

Add `createOrUpdatePRComment(owner, repo, prNumber, body, marker)` to `GitHubClient`:
- Lists comments on the PR
- Finds existing comment by marker string
- Updates if found, creates if not
- Returns comment ID

## Edge Cases

- **Zero recommendations from review agent:** Display summary header and safe-to-ignore only, then exit with message
- **All recommendations rejected:** Print "No recommendations to post." and exit
- **GitHub API failure:** Log error, offer to save as markdown instead
- **PR mode not available:** Hide "Post as PR comment" option in final confirmation
- **User cancels mid-review:** Exit gracefully, no output posted
- **Back navigation at first item:** No-op or wrap around (stay at first)

## Non-Interactive Environments

Not needed for MVP. Only interactive terminal is supported. If `process.stdout.isTTY` is false, the module behavior is undefined for now — can be addressed in a future iteration.

## Output Formatting Conventions

- Emoji headers matching the brief: 🧠, 🎯, 🛑, ✅, 📝
- Score shown as `{score}/10`
- Severity as text label
- User notes prefixed with 📝
- `<details>` blocks in PR comments for collapsible sections if many safe-to-ignore groups
- Consistent format between PR comment and markdown file (minus the metadata header)
