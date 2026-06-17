# code-review-agent

AI-powered code review agent that distills large PRs to the critical files requiring human attention. Uses Claude to score files by semantic impact, filter noise, and produce actionable review recommendations.

## Prerequisites

- Node.js >= 20
- An [Anthropic API key](https://console.anthropic.com/)
- A GitHub token (or the [`gh` CLI](https://cli.github.com/) authenticated)

## Install

```bash
npm install
npm run build
```

The built CLI is available at `./dist/index.js`, or via the `code-review` bin:

```bash
npm link   # makes `code-review` available globally
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `GITHUB_TOKEN` | No | GitHub personal access token. Falls back to `gh auth token` if not set |

Both can also be provided via the config file (see below).

## Usage

```bash
# Review a pull request
code-review review-pr https://github.com/owner/repo/pull/123

# Review a repository
code-review review-repo https://github.com/owner/repo

# Initialize config files in current directory
code-review init
```

### Global Flags

| Flag | Description |
|---|---|
| `--verbose` | Enable verbose output |
| `--config <path>` | Path to config file |

## Configuration

Place a `.codereview.json` file in your project root (or anywhere up to the git root — it's discovered automatically).

```json
{
  "ignorePatterns": [
    "node_modules/**", "dist/**", "build/**", "coverage/**",
    ".next/**", "vendor/**", "*.lock", "*.min.*", ".git/**",
    "*.png", "*.jpg", "*.svg", "*.gif", "*.ico",
    "*.woff", "*.woff2", ".turbo/**", ".pnpm-store/**"
  ],
  "criticalThreshold": 8,
  "domainRulesPath": "./DOMAIN_RULES.md",
  "architecturePath": "./ARCHITECTURE.md",
  "apiKey": "<anthropic-api-key>",
  "githubToken": "<github-token>",
  "model": "claude-sonnet-4-5-20250514",
  "maxRetries": 3,
  "output": {
    "console": true,
    "markdown": false,
    "markdownPath": "./code-review-report.md",
    "githubComment": false
  }
}
```

All fields are optional — sensible defaults are applied. Priority: defaults < config file < environment variables < CLI flags.

### Domain Context Files

Run `code-review init` to generate starter templates, or create them manually:

- **`DOMAIN_RULES.md`** — Business rules, naming conventions, and review criteria injected into the review prompt. Also searched at `.github/DOMAIN_RULES.md` and `docs/DOMAIN_RULES.md`.
- **`ARCHITECTURE.md`** — System overview, key patterns, and architectural decisions. Also searched at `.github/ARCHITECTURE.md` and `docs/architecture.md`.

## How It Works

The tool runs a four-stage agent pipeline:

1. **Context Agent** — Fetches PR metadata, diffs, linked issues from GitHub. Loads domain rules and architecture docs. Detects tech stack from manifest files.
2. **Analysis Agent** — Scores each changed file 1–10 by semantic impact using Tree-sitter AST analysis and Claude. Filters noise (formatting, renames, generated code) and categorizes files by risk level.
3. **Review Agent** — Synthesizes context and analysis into actionable recommendations with severity, categories, and suggested actions. Identifies the core architectural decision in the PR.
4. **Output Agent** — Presents results via interactive terminal UI. Publishes to configured destinations (console, markdown file, or GitHub PR comment).

## Output Formats

| Format | Config Key | Description |
|---|---|---|
| Console | `output.console` | Prints results to stdout (default) |
| Markdown | `output.markdown` | Writes report to `output.markdownPath` |
| GitHub Comment | `output.githubComment` | Posts/updates a comment on the PR |

## Development

```bash
# Run in dev mode (no build step)
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build
npm run build
```

## Project Structure

```
src/
├── index.ts              # CLI entry point
├── commands/             # Command handlers (review-pr, review-repo, init)
├── config/               # Configuration schema and loader
├── agents/
│   ├── context/          # Stage 1: Context gathering
│   ├── analysis/         # Stage 2: File scoring and noise filtering
│   ├── review/           # Stage 3: Recommendation synthesis
│   └── output/           # Stage 4: Interactive UI and publishing
├── pipeline/             # Agent orchestration engine
├── clients/              # GitHub and Claude API clients
├── context/              # Domain rules and tech stack detection
└── utils/                # Logging, errors, URL parsing, file filtering
```
