# Research Findings: Core Infrastructure Technology Stack

## 1. TypeScript CLI Frameworks: Commander.js vs yargs vs oclif

### Comparison

| Criteria | Commander.js | yargs | oclif |
|---|---|---|---|
| Weekly Downloads | ~276M | ~148M | ~223K |
| Install Size | 180 KB (0 deps) | 850 KB (7 deps) | 12 MB (30+ deps) |
| Startup Overhead | Negligible | ~20ms | 70-100ms |
| TypeScript Support | Good (types bundled) | Good (@types/yargs) | First-class (TS-native) |

### Subcommand Routing
- **Commander.js**: `.command()` / `.addCommand()`. Two styles: action handlers or standalone executables. Straightforward for moderate hierarchies.
- **yargs**: `.command(name, desc, builder, handler)`. Richer middleware layer for pre/post-processing hooks.
- **oclif**: File-based routing — one class per command. Directory structure maps to command hierarchy. Most structured for large CLIs.

### TypeScript Quality Note
Bloomberg's Stricli analysis identifies a limitation: Commander.js and yargs use method chaining, making end-to-end static typing difficult. Parsed arguments may lack accurate TypeScript types. oclif's class-based approach with typed static properties avoids this but adds boilerplate.

### Recommendation
For this project (multi-command CLI with `review-pr`, `review-repo`, `init`): **Commander.js** is the pragmatic choice — minimal overhead, zero dependencies, huge ecosystem, sufficient subcommand support. The type-safety limitations are manageable for 3 commands with known flag shapes.

### Sources
- [Grizzly Peak Software: CLI Framework Comparison](https://www.grizzlypeaksoftware.com/library/cli-framework-comparison-commander-vs-yargs-vs-oclif-utxlf9v9)
- [Bloomberg Stricli: Alternatives Considered](https://bloomberg.github.io/stricli/docs/getting-started/alternatives)
- [npm-compare: Commander vs oclif vs yargs](https://npm-compare.com/commander,oclif,vorpal,yargs)

---

## 2. Anthropic Claude SDK Structured Output with Zod

### Two Mechanisms

1. **JSON Outputs (`output_config.format`)** — Controls response format. Claude's response body matches your JSON Schema. **Recommended for structured responses.**
2. **Strict Tool Use (`strict: true`)** — Guarantees schema validation on tool call parameters.

Both are GA on Claude Opus 4.6, Sonnet 4.6, Sonnet 4.5, Opus 4.5, Haiku 4.5. The `output_format` parameter has moved to `output_config.format`; beta headers are no longer required.

### Recommended Pattern: output_config.format + Zod

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const AnalysisSchema = z.object({
  summary: z.string(),
  issues: z.array(z.object({
    severity: z.enum(["critical", "warning", "info"]),
    description: z.string(),
    line: z.number().optional(),
  })),
});

type Analysis = z.infer<typeof AnalysisSchema>;

const response = await client.messages.create({
  model: "claude-sonnet-4-5-20250514",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Analyze this code..." }],
  output_config: {
    format: {
      type: "json_schema",
      schema: zodToJsonSchema(AnalysisSchema),
    }
  }
});

// Runtime validation
const analysis = AnalysisSchema.parse(JSON.parse(response.content[0].text));
```

### Key Caveats
- **First-request latency**: New schemas incur compilation overhead; cached for 24h after.
- **Refusals**: If `stop_reason: "refusal"`, output may not match schema. Always check.
- **Max tokens**: Truncated responses produce invalid JSON. Set `max_tokens` generously.

### Sources
- [Claude API Docs: Structured Outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)

---

## 3. GitHub REST API PR Data Fetching

### Key Endpoints

| Data | Endpoint | Octokit Method |
|---|---|---|
| PR metadata | `GET /repos/{owner}/{repo}/pulls/{pull_number}` | `octokit.rest.pulls.get()` |
| Changed files | `GET /repos/{owner}/{repo}/pulls/{pull_number}/files` | `octokit.rest.pulls.listFiles()` |
| Full diff | Same as get, with `mediaType: { format: "diff" }` | `octokit.rest.pulls.get({ mediaType: { format: "diff" } })` |
| Review comments | `GET /repos/{owner}/{repo}/pulls/{pull_number}/comments` | `octokit.rest.pulls.listReviewComments()` |
| PR commits | `GET /repos/{owner}/{repo}/pulls/{pull_number}/commits` | `octokit.rest.pulls.listCommits()` |

**Limit**: Files endpoint returns max 3,000 files per PR, paginated at 30/page (max 100 via `per_page`).

### Authentication
- **PAT** (development): `new Octokit({ auth: "ghp_xxx" })` — 5,000 req/hr
- **GitHub App** (production): Up to 15,000 req/hr, finer-grained permissions

### Rate Limiting & Pagination

```typescript
import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";
import { retry } from "@octokit/plugin-retry";

const MyOctokit = Octokit.plugin(throttling, retry);
const octokit = new MyOctokit({
  auth: process.env.GITHUB_TOKEN,
  throttle: {
    onRateLimit: (retryAfter, options, octokit, retryCount) => {
      if (retryCount < 2) return true;
    },
    onSecondaryRateLimit: (retryAfter, options, octokit) => true,
  },
});

// Paginate all files
const allFiles = await octokit.paginate(octokit.rest.pulls.listFiles, {
  owner, repo, pull_number, per_page: 100,
});
```

### Recommendation
Use `@octokit/rest` + `@octokit/plugin-throttling` + `@octokit/plugin-retry`. Always paginate with `per_page: 100`. Use `mediaType: { format: "diff" }` for full diffs.

### Sources
- [GitHub Docs: REST API for Pull Requests](https://docs.github.com/en/rest/pulls/pulls)
- [octokit/rest.js Documentation (v22)](https://octokit.github.io/rest.js/v22/)
- [octokit/plugin-throttling.js](https://github.com/octokit/plugin-throttling.js/)

---

## 4. Multi-Agent Pipeline Orchestration in TypeScript

### Framework Comparison

| Criteria | LangChain (TS) | Claude-Flow | Custom Node.js |
|---|---|---|---|
| Setup time | 10-15 min | 5-10 min | ~5 min |
| Dependencies | High | Low-moderate | Minimal (LLM SDK only) |
| Best for | Complex multi-provider | Claude-centric | Simple pipelines, <=5 agents |

For 3-5 stages with a single LLM provider, **custom orchestration** is recommended: zero framework dependencies, ~60 lines of coordination code.

### Recommended Pattern: Typed Sequential Pipeline

```typescript
interface PipelineStage<TInput, TOutput> {
  name: string;
  execute: (input: TInput) => Promise<TOutput>;
}

// Wrap stages with retry + timing
interface StageResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  stageName: string;
  durationMs: number;
}

async function executeStage<TIn, TOut>(
  stage: PipelineStage<TIn, TOut>,
  input: TIn,
  maxRetries = 2,
): Promise<StageResult<TOut>> {
  const start = Date.now();
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await stage.execute(input);
      return { success: true, data, stageName: stage.name, durationMs: Date.now() - start };
    } catch (error) {
      if (attempt === maxRetries) {
        return { success: false, error: error as Error, stageName: stage.name, durationMs: Date.now() - start };
      }
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new Error("Unreachable");
}
```

### Key Patterns
- **Sequential chains**: Output of stage A feeds into stage B. Best for review pipelines.
- **Fan-out/fan-in**: Analyze files concurrently with `Promise.allSettled` for partial failure tolerance.
- **Zod at boundaries**: Validate LLM output at each stage boundary with Zod schemas.

### Sources
- [SitePoint: Orchestration Wars (March 2026)](https://www.sitepoint.com/agent-orchestration-framework-comparison-2026/)
- [Andy Peatling: Architecting AI Agents with TypeScript](https://apeatling.com/articles/architecting-ai-agents-with-typescript/)

---

## 5. Testing Recommendations (New Project)

Since this is a new project, recommended testing setup:

- **Framework**: Vitest (fast, native TypeScript/ESM support, Jest-compatible API)
- **Patterns**:
  - Unit tests for pipeline stages with mocked LLM responses
  - Integration tests for CLI command parsing
  - Zod schema validation tests for all agent contracts
  - Mock Anthropic SDK responses for deterministic testing
- **Structure**: Co-located test files (`*.test.ts`) alongside source files
