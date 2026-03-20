# 05 — Interactive Output

## Goal

Build the interactive terminal UX for reviewing recommendations and the output publishers (GitHub PR comments, markdown file).

## Context

This is the final stage of the pipeline. The user runs the CLI, agents do their work, and then this module presents the results interactively. The user confirms which recommendations to keep, then chooses to either post them as PR comments or save as a markdown file. See `BRIEF.md` and `deep_project_interview.md` in the project root for full context.

## Requirements

### Interactive Terminal Confirmation

- Display the review summary header (core decision, file counts)
- Present each recommendation one at a time:
  - Show file path, score, why-review, human-check-needed
  - User accepts or rejects (interactive checkbox/toggle)
- Show safe-to-ignore summary (informational, no action needed)
- Final confirmation: "Post N recommendations? [PR comment / Markdown file / Cancel]"

### GitHub PR Comment Output

- Post a single structured comment to the PR (not 50 inline comments)
- Format matches the brief's UX spec:
  - Header with PR file count and critical file count
  - Core decision summary
  - Top N files requiring human verification (with why-review and human-check)
  - Safe-to-ignore categories
- Only include user-approved recommendations
- Update existing bot comment if re-running (don't spam the PR)

### Markdown File Output

- Generate a well-structured markdown file with the same content as the PR comment
- Save to configurable path (default: `./code-review-output.md`)
- Include metadata: timestamp, PR URL, review mode, config used

### Output Formatting

- Consistent formatting across both outputs
- Use the structured format from the brief (emoji headers, indented details)
- Score badges or indicators for quick visual scanning

## Technical Decisions

- Use `inquirer` or `prompts` npm package for terminal interactivity
- GitHub API (from 01-core-infrastructure) for PR comment posting
- Markdown generation with template strings

## Dependencies

- **01-core-infrastructure:** Shared types (`ReviewOutput`, `Recommendation`), GitHub API client, config
- **04-review-agent:** `ReviewOutput` as input

## What This Split Provides to Others

- This is the terminal split — no downstream consumers
- Produces user-visible output (PR comments or markdown files)
