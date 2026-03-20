# Usage Guide

## Quick Start

The Context Agent gathers repository context for code review. It supports two modes:

### PR Mode

Fetches PR metadata, files, diff, referenced issues, review comments, and domain rules:

```typescript
import { createContextAgent } from "./02-context-agent/src/index.js";
import { GitHubClient } from "./01-core-infrastructure/src/clients/github.js";
import { defaultConfig } from "./01-core-infrastructure/src/config/schema.js";
import { createLogger } from "./01-core-infrastructure/src/utils/logger.js";

const github = new GitHubClient({ token: process.env.GITHUB_TOKEN });
const logger = createLogger({ verbose: true });

const agent = createContextAgent({ github, logger });

const context = await agent.run({
  mode: "pr",
  owner: "my-org",
  repo: "my-repo",
  number: 123,
  config: defaultConfig,
});

// context.pr.files — filtered PR files
// context.pr.diff — full diff
// context.referencedIssues — issues linked via "Fixes #N"
// context.comments — review comments
// context.domainRules — DOMAIN_RULES.md content (or null)
// context.architectureDoc — ARCHITECTURE.md content (or null)
```

### Repo Mode

Fetches the repository file tree, detects tech stack, and loads domain rules:

```typescript
const context = await agent.run({
  mode: "repo",
  owner: "my-org",
  repo: "my-repo",
  config: { ...defaultConfig, ignorePatterns: [] },
});

// context.repoFiles — filtered file paths
// context.techStack — { languages, frameworks, dependencies }
// context.domainRules — DOMAIN_RULES.md content (or null)
```

### Pipeline Integration

The context agent is designed to be the first stage in a review pipeline:

```typescript
import { runPipeline } from "./01-core-infrastructure/src/pipeline/runner.js";
import { createStubAnalysisAgent } from "./01-core-infrastructure/src/agents/stubs.js";

const result = await runPipeline(
  [contextAgent, analysisAgent],
  { mode: "pr", owner: "org", repo: "repo", number: 1, config: defaultConfig },
  { logger },
);
// result.stages[0].data — ContextOutput
// result.output — AnalysisOutput
```

## API Reference

### `createContextAgent(options)`

Factory function that returns an `Agent<ContextAgentInput, ContextOutput>`.

**Options:**
- `github: GitHubClient` — GitHub API client instance
- `logger?: Logger` — optional logger

### `ContextAgentInput`

```typescript
interface ContextAgentInput {
  mode: "pr" | "repo";
  owner: string;
  repo: string;
  number?: number;       // Required when mode === "pr"
  config: CodeReviewConfig;
}
```

### `ContextOutput`

Output validated by `ContextOutputSchema` (Zod). Key fields:

| Field | PR Mode | Repo Mode |
|-------|---------|-----------|
| `mode` | `"pr"` | `"repo"` |
| `repository` | `{ owner, repo, defaultBranch }` | Same |
| `pr` | PR metadata, files, diff | — |
| `repoFiles` | — | Filtered file paths |
| `referencedIssues` | Linked issues | — |
| `comments` | Review comments | — |
| `techStack` | — | Languages, frameworks, deps |
| `domainRules` | Content or null | Content or null |
| `architectureDoc` | Content or null | Content or null |

### Internal Utilities

These are imported from `01-core-infrastructure` and used internally:

- **`filterFiles(files, patterns, getPath)`** — Filters files by ignore glob patterns using picomatch
- **`parseClosingReferences(body)`** — Extracts issue references from PR descriptions
- **`loadDomainRules(options)`** — Loads DOMAIN_RULES.md and ARCHITECTURE.md with config-first, fallback-search strategy
- **`detectTechStack(options)`** — Parses manifest files to detect languages, frameworks, and dependencies

## Running Tests

```bash
cd 02-context-agent
npm test
```

30 tests total: 25 unit tests + 5 integration tests.
