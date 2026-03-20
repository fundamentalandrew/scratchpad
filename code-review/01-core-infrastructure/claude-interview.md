# Interview Transcript — Core Infrastructure

## Q1: CLI Input Format

**Question:** For the CLI, should `review-pr` accept just a GitHub URL (e.g., `https://github.com/org/repo/pull/123`) and parse owner/repo/number from it, or should it also support shorthand like `org/repo#123`?

**Answer:** URL only — parse standard GitHub PR URLs. Simpler, less ambiguous.

## Q2: Agent Pipeline Error Handling

**Question:** When an agent in the pipeline fails (e.g., Claude API error, malformed output), what's the desired behavior?

**Answer:** Retry then halt — retry the failed agent 2-3 times with exponential backoff, then halt if still failing. No partial results.

## Q3: GitHub Authentication

**Question:** For the GitHub API client, what authentication method should we support initially?

**Answer:** Token + gh CLI auth — support `GITHUB_TOKEN` env var and also detect/reuse authentication from the GitHub CLI (`gh auth token`).

## Q4: Configuration File Discovery

**Question:** For the configuration file (`.codereview.json`), should it be auto-discovered by walking up from CWD, or only loaded from an explicit path?

**Answer:** Walk up directory tree — search CWD and parent directories, similar to eslint/prettier config discovery.

## Q5: Repo Audit Scope

**Question:** For the `review-repo` command (full repo audit), how should it determine which files to review?

**Answer:** All tracked files (`git ls-files`) minus configured ignore patterns.

## Q6: Output Formats

**Question:** What output format should the review produce?

**Answer:** Three formats (multi-select):
1. Terminal/console output (rich formatted with tables/colors)
2. Markdown file (written to disk)
3. GitHub PR comment (posted as a comment on the PR)

No JSON output needed initially.

## Q7: Pipeline Architecture

**Question:** Should the pipeline be hardcoded (Context → Analysis → Review → Output) or configurable/extensible?

**Answer:** Hardcoded pipeline — fixed 4-stage sequence. Simpler, covers the use case. No plugin system needed.

## Q8: Context Files

**Question:** Should the Context agent scan for additional common files (README, CONTRIBUTING, etc.) beyond DOMAIN_RULES.md and ARCHITECTURE.md?

**Answer:** Just domain rules + architecture — only the two explicitly mentioned files.

## Q9: Claude API Streaming

**Question:** Should the Claude API client support streaming responses?

**Answer:** Batch only — wait for full response, then parse structured output. Simpler implementation.
