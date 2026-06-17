# Research Findings: 05-Interactive-Output Module

## Part 1: Codebase Research

### Project Architecture

Sequential pipeline of agents: Context Agent → Analysis Agent → Review Agent → **Output (this module)**

Each module has its own `src/`, `package.json`, `tsconfig.json`, and `vitest.config.ts`. Modules import from core via `@core/*` path aliases.

### Core Types (from 01-core-infrastructure/src/agents/schemas.ts)

**ReviewOutput** — primary input to this module:
```typescript
ReviewOutput {
  recommendations: Recommendation[];
  coreDecision: string;
  focusAreas: string[];
  safeToIgnore: IgnoreGroup[];
  summary: string;
}
```

**Recommendation:**
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

**IgnoreGroup:**
```typescript
{
  label: string;
  count: number;
  description: string;
}
```

**ContextOutput** (available via contextPassthrough):
```typescript
{
  mode: "pr" | "repo";
  repository: { owner: string; repo: string; defaultBranch: string };
  pr?: { number, title, description, author, baseBranch, headBranch, files, diff };
  repoFiles?: Array<{path: string}>;
  domainRules: string | null;
  architectureDoc: string | null;
  techStack?: { languages, frameworks, dependencies };
}
```

### Configuration (01-core-infrastructure/src/config/schema.ts)

Output-relevant config:
```typescript
output: {
  console: boolean;        // default: true
  markdown: boolean;       // default: false
  markdownPath: string;    // default: "./code-review-report.md"
  githubComment: boolean;  // default: false
}
```

Also: `criticalThreshold` (0-10, default: 8), `githubToken`, `model`.

### GitHub Client (01-core-infrastructure/src/clients/github.ts)

`GitHubClient` class with:
- `postPRComment(owner, repo, number, body)` — creates PR comment
- `getReviewComments(...)` — could be used to find existing comments
- Token resolution: `GITHUB_TOKEN` env → `gh auth token` → config file → AuthError
- Uses `@octokit/rest` with retry and throttling plugins

### Logger (01-core-infrastructure/src/utils/logger.ts)

```typescript
interface Logger {
  info(msg: string): void;     // stdout plain
  verbose(msg: string): void;  // stdout dimmed, conditional
  error(msg: string): void;    // stderr red
  warn(msg: string): void;     // stderr yellow
  success(msg: string): void;  // stdout green
}
```

Uses chalk v5.6.2.

### Agent Interface (01-core-infrastructure/src/pipeline/types.ts)

```typescript
interface Agent<TInput, TOutput> {
  name: string;
  idempotent: boolean;
  run(input: TInput): Promise<TOutput>;
}
```

Output agent: `name: "output"`, `idempotent: false` (file writes/API calls).

### Module Export Pattern

Modules export via `src/index.ts`:
- Factory function (e.g., `createOutputAgent()`)
- Type re-exports with `type` keyword
- Zod schemas for runtime validation

### Testing Setup

- **Framework:** Vitest 4.1.0
- **Patterns:** Schema validation tests, mock `process.stdout.write`/`process.stderr.write`, mock external APIs, `vi.spyOn()` for I/O
- **Run:** `npm test` (vitest run), `npm test:watch` (vitest watch)
- **Location:** `src/**/*.test.ts` or `tests/**/*.test.ts`

### Available Dependencies

Already in core: `@octokit/rest`, `@octokit/plugin-retry`, `@octokit/plugin-throttling`, `chalk` v5.6.2, `commander`, `zod` v4.3.6.

**Not yet installed:** Interactive terminal prompt library (inquirer/prompts) — needs to be added.

### Output Format (from BRIEF.md)

```
🧠 Strategic PR Review Guide
This PR modifies {totalFiles} files.
You only need to deeply review these {criticalCount} files.

🎯 The Core Decision Made by AI:
{coreDecision}

🛑 Top N Files Requiring Human Verification:
{file} — Why review: {message} — Human check: {humanCheckNeeded}

✅ Safely Ignore / Skim ({count} Files):
{groupLabel} ({count} files) - {description}
```

---

## Part 2: Web Research

### 2.1 Interactive CLI — Package Comparison

| Feature | `@inquirer/prompts` | `inquirer` (legacy) | `prompts` |
|---|---|---|---|
| Status | Actively developed | Maintained, not actively developed | Stable |
| Architecture | Individual async functions, tree-shakeable | Monolithic question-object | Single function, config-driven |
| TypeScript | First-class | Community types | Community types |
| Bundle | Small (individual packages) | Larger | Very small |

**Recommendation: `@inquirer/prompts`** — official modern rewrite by same author, async/await API, tree-shakeable, first-class TypeScript support.

### Accept/Reject One-at-a-Time Pattern

```javascript
import { confirm } from '@inquirer/prompts';

for (const item of recommendations) {
  console.log(`\n${item.summary}\n${item.details}`);
  const accepted = await confirm({ message: `Accept this finding?`, default: true });
  results.push({ ...item, accepted });
}
```

For richer review, use `select()` with per-item actions (Accept/Reject/Skip).

### Checkbox for Batch Selection

```javascript
import { checkbox } from '@inquirer/prompts';

const selected = await checkbox({
  message: 'Select findings to include:',
  choices: findings.map(f => ({
    name: `[${f.severity}] ${f.title}`,
    value: f.id,
    checked: f.severity === 'critical',
  })),
});
```

### Non-Interactive Environment Handling

```javascript
function canPrompt() {
  return process.stdout.isTTY && !process.env.CI;
}
```

When non-interactive: skip prompts, use defaults or CLI flags. Never hang waiting for input.

Sources: [Inquirer.js GitHub](https://github.com/SBoudrias/Inquirer.js/), [@inquirer/prompts npm](https://www.npmjs.com/package/@inquirer/prompts)

### 2.2 GitHub PR Comment — Update-or-Create Pattern

Use hidden HTML marker to find and update existing comments:

```javascript
const COMMENT_MARKER = '<!-- code-review-bot-report -->';

async function createOrUpdateComment(octokit, { owner, repo, prNumber, body }) {
  const markedBody = `${COMMENT_MARKER}\n${body}`;
  const { data: comments } = await octokit.rest.issues.listComments({
    owner, repo, issue_number: prNumber,
  });
  const existing = comments.find(c => c.body?.includes(COMMENT_MARKER));

  if (existing) {
    await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body: markedBody });
  } else {
    await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body: markedBody });
  }
}
```

**Rate limiting:** 5,000 req/hr authenticated. Wait >= 1 second between write ops. Respect `retry-after` header. Cache listComments results.

Sources: [GitHub Docs - Comments](https://docs.github.com/en/rest/guides/working-with-comments), [GitHub Rate Limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)

### 2.3 Markdown Generation

**Recommendation: Template literals + small helper functions.** Libraries are overkill for this use case.

```javascript
const md = {
  h2: (emoji, text) => `## ${emoji} ${text}`,
  h3: (emoji, text) => `### ${emoji} ${text}`,
  table: (headers, rows) => {
    const header = `| ${headers.join(' | ')} |`;
    const sep = `| ${headers.map(() => '---').join(' | ')} |`;
    const body = rows.map(r => `| ${r.join(' | ')} |`).join('\n');
    return `${header}\n${sep}\n${body}`;
  },
  details: (summary, body) => `<details>\n<summary>${summary}</summary>\n\n${body}\n</details>`,
};
```

**Visual conventions for code review:**
- 🔴 `:red_circle:` — critical
- ⚠️ `:warning:` — warnings
- 💡 `:bulb:` — suggestions
- ✅ `:white_check_mark:` — passed
- Use `<details>` blocks for collapsible sections
- Use tables for structured data
- Include hidden HTML marker at top for update-or-create pattern

Sources: [json2md](https://github.com/IonicaBizau/json2md), [GitHub emoji cheat sheet](https://github.com/ikatyang/emoji-cheat-sheet)
