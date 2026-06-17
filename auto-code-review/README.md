# Principal-Grade AI Code Review

A Claude Code skill that reviews GitHub Pull Requests like a principal engineer. It spawns parallel AI subagents to analyze architecture, performance, and maintainability — then lets you curate the findings before publishing them as inline PR comments.

**What it ignores:** syntax, formatting, naming, linting, basic CVEs (those belong in CI/CD).

**What it focuses on:** macro-architecture, domain boundaries, abstraction leakage, coupling, resource leaks, N+1 queries, God Classes, testability.

## Prerequisites

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- [GitHub CLI (`gh`)](https://cli.github.com/) installed and authenticated
- Python 3.10+

## Installation

1. Clone this repository somewhere on your machine:

   ```bash
   git clone <repo-url> ~/tools/auto-code-review
   ```

2. Add the skill to your Claude Code settings. Open `~/.claude/settings.json` (or your project's `.claude/settings.json`) and add:

   ```json
   {
     "skills": [
       "~/tools/auto-code-review"
     ]
   }
   ```

   That's it. The skill is now available in any repository you use Claude Code in.

## Usage

Navigate to any git repository that has a GitHub remote, open Claude Code, and run:

```
/review-pr 142
```

Replace `142` with any open PR number.

## What Happens

The review runs in 5 phases:

### Phase 1 — Pre-Flight

The tool fetches the PR diff via `gh`, filters out noise (lockfiles, minified assets, generated code), and checks the size. If the diff exceeds 800 lines or 15 files, it asks you to confirm before proceeding.

If your repo has an `ARCHITECTURE.md` at the root, it's loaded as the source of truth. Subagents treat its rules as absolute law.

### Phase 2 — Parallel Analysis

Three AI subagents run concurrently:

| Agent | Focus |
|---|---|
| **System Architect** | Trade-offs, scalability, DDD violations, coupling, dependency direction |
| **Performance Analyst** | Resource leaks, blocking ops, N+1 queries, unbounded fetches, concurrency hazards |
| **Maintainability Lead** | Cognitive load, God Classes, Feature Envy, testability, shotgun surgery |

Each agent returns structured findings and any questions about ambiguous design decisions.

### Phase 3 — Deferred Questions

Agents never interrupt mid-analysis. Instead, they log assumptions and batch their questions. After all agents finish, you're presented with deduplicated multiple-choice questions:

```
Question 1/3:
  Source: system-architect
  File:   src/payments/controller.ts:42
  Agent assumed: This bypasses the repository pattern intentionally

  The PaymentController accesses the database directly. Is this intentional?

  [1] Yes, acceptable exception for high-throughput webhook.
  [2] No, this is a mistake. Flag it for refactoring.
  [3] Custom answer

  Your choice (1-3):
```

### Phase 4 — Draft Review

A markdown report is generated at `.claude/pr_review_draft.md` with all findings. Each finding has a hidden HTML comment mapping it to a specific file and line:

```markdown
<!-- GH_META: file=src/payments/controller.ts line=42 agent=system-architect severity=high -->
#### Direct database access bypasses repository layer
```

Open the file in your IDE. **Delete any findings you disagree with.** Edit the text of any you want to keep. Then return to the terminal.

### Phase 5 — Publish

Type `publish` in the terminal. The tool parses your edited draft, extracts the surviving findings, and posts them as inline threaded comments on the PR via the GitHub API.

Type `abort` to cancel without publishing. The draft file is preserved.

## Standalone Usage (Without Claude Code)

You can also run the script directly:

```bash
cd /path/to/your/repo
python3 ~/tools/auto-code-review/review_pr.py 142
```

## ARCHITECTURE.md

For best results, add an `ARCHITECTURE.md` to the root of your project. This file acts as local governance — its rules override generic engineering heuristics. Example:

```markdown
# Architecture Rules

## Dependency Direction
All dependencies point inward. Domain layer MUST NOT import from infrastructure or API layers.

## Database Access
All database access MUST go through repository interfaces. No direct ORM calls outside the repository layer.

## Async Boundaries
All I/O operations in the API layer MUST be async. Blocking calls are only permitted in CLI entrypoints.
```

## How It Works Internally

```
review_pr.py          Main orchestrator — runs the 5-phase pipeline
prompts/
  system-architect.md     Subagent system prompt (architecture focus)
  performance-analyst.md  Subagent system prompt (performance focus)
  maintainability-lead.md Subagent system prompt (maintainability focus)
tools/
  diff_fetcher.py         Fetches and filters PR diffs via gh CLI
  question_logger.py      Deduplicates and presents batched questions
  draft_generator.py      Generates markdown with hidden GH_META tags
  github_publisher.py     Parses edited draft, posts comments via gh api
```

## Customization

- **Circuit breaker thresholds:** Edit `MAX_DIFF_LINES` and `MAX_CORE_FILES` in `review_pr.py`
- **Noise filters:** Edit `NOISE_PATTERNS`, `NOISE_EXTENSIONS`, `NOISE_DIRECTORIES` in `tools/diff_fetcher.py`
- **Subagent behavior:** Edit the prompt files in `prompts/` to adjust focus areas or severity definitions
- **Draft output path:** Edit `DRAFT_PATH` in `review_pr.py` (default: `.claude/pr_review_draft.md`)
