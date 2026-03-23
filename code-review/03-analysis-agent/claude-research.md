# Research Findings: Analysis Agent (Agent B)

## Part 1: Codebase Analysis

### Project Overview
Multi-agent TypeScript CLI system — a "Macro-Reviewer" that distills large PRs (100+ files) down to critical files requiring human attention. Uses Claude AI, Tree-sitter AST analysis, and GitHub API in a sequential pipeline.

### Architecture: 5-Part Sequential Pipeline

```
01-core-infrastructure (foundation layer)
  └── 02-context-agent (fetch & structure context)
        └── 03-analysis-agent (noise reduction + LLM scoring)
              └── 04-review-agent (synthesis & recommendations)
                    └── 05-interactive-output (terminal UX + posting)
```

### 01-Core Infrastructure

**Dependencies:**
- `@anthropic-ai/sdk` (^0.80.0), `@octokit/rest` (^22.0.1), `picomatch` (^4.0.3), `zod` (^4.3.6), `chalk` (^5.6.2), `commander` (^14.0.3)

**Agent Interface (`/src/pipeline/types.ts`):**
```typescript
Agent<TInput, TOutput> = {
  name: string
  idempotent: boolean
  run(input: TInput): Promise<TOutput>
}
```

**Schemas (`/src/agents/schemas.ts`):**
- `FileScoreSchema`: `{ path, score (0-10), riskLevel: "critical"|"high"|"medium"|"low", reasons: string[] }`
- `AnalysisOutputSchema`: `{ scoredFiles: FileScore[], criticalFiles: FileScore[], summary: { totalFiles, criticalCount, highCount, categories } }`
- `ContextOutputSchema`: `{ mode, repository, pr?, files, diff, domainRules, architectureDoc, techStack, referencedIssues, comments }`

**ClaudeClient (`/src/clients/claude.ts`):**
```typescript
class ClaudeClient {
  constructor({ apiKey, model?, maxRetries?, logger? })
  async query<T>({ messages, schema: ZodSchema<T>, systemPrompt?, maxTokens? }): Promise<{data: T, usage: {inputTokens, outputTokens}}>
  getTokenUsage(): { totalInputTokens, totalOutputTokens }
}
```
- Uses structured output with Zod schemas
- Tracks cumulative token usage

**Config (`/src/config/schema.ts`):**
- `ignorePatterns`: default list (node_modules, dist, build, coverage, .next, vendor, *.lock, *.min.*, images, fonts, etc.)
- `criticalThreshold`: 8 (default)
- `model`: `claude-sonnet-4-5-20250514`
- Config discovery: walks up from CWD looking for `.codereview.json`
- Merging priority: defaults < file < env vars < CLI flags

**File Filter (`/src/utils/file-filter.ts`):**
- `filterFiles<T>(files, patterns, getPath)` using picomatch
- Bare globs use `matchBase: true`, path globs use directory-anchored mode

**Pipeline Runner (`/src/pipeline/runner.ts`):**
- Sequential chain, retry with exponential backoff (1s, 2s, 4s)
- Only retries idempotent agents
- Returns full execution trace

**Stub Agents (`/src/agents/stubs.ts`):**
- `createStubContextAgent()`, `createStubAnalysisAgent()`, `createStubReviewAgent()`, `createStubOutputAgent()` for testing

### 02-Context Agent

**Factory:** `createContextAgent({ github, logger })` → `Agent<ContextAgentInput, ContextOutput>`

**PR Mode:**
1. `getPR()` first (sequential — provides SHAs)
2. Parallel: `getPRFiles()` + filter, `getPRDiff()`, `fetchReferencedIssues()`, `getReviewComments()`
3. Maps to `ContextOutput`

**Testing:** Vitest with path alias `@core` → `../01-core-infrastructure/src`, mocks for all external dependencies.

### Key Patterns to Follow
1. Agent factory pattern: `createXAgent(deps) → Agent<TIn, TOut>`
2. Zod schemas as single source of truth
3. Logger injection via constructor
4. Config-first: all behavior controlled by config
5. Idempotent agents for retry support

---

## Part 2: Web Research — Best Practices

### Tree-sitter AST Parsing in Node.js

**Current packages:**
- `tree-sitter` (native N-API bindings) — best for CLI/server
- `tree-sitter-typescript` — provides both `.typescript` and `.tsx` grammars

**Parsing:**
```javascript
const Parser = require('tree-sitter');
const TypeScript = require('tree-sitter-typescript').typescript;
const parser = new Parser();
parser.setLanguage(TypeScript);
const tree = parser.parse(sourceCode);
```

**Comparing before/after:** Parse both versions independently, then compare ASTs by walking node types and structure. `getChangedRanges()` reports syntax-level changes (not text), which naturally ignores formatting.

**Alternative: `@ast-grep/napi`** — higher-level pattern matching backed by tree-sitter:
```javascript
import { parse, Lang } from '@ast-grep/napi';
const ast = parse(Lang.TypeScript, source);
const root = ast.root();
const matches = root.findAll('function $NAME($$$PARAMS) { $$$ }');
```

**Recommendations:**
- Use native `tree-sitter` for CLI tools (faster than WASM)
- Parse both file versions independently (not incremental parsing)
- Consider `@ast-grep/napi` for pattern-based structural matching
- Use subtree hashing for move detection

**Sources:** [node-tree-sitter docs](https://tree-sitter.github.io/node-tree-sitter/), [tree-sitter-typescript](https://www.npmjs.com/package/tree-sitter-typescript), [ast-grep](https://ast-grep.github.io/guide/api-usage/js-api.html), [diffsitter](https://github.com/afnanenayet/diffsitter)

### Claude API Structured Output with Zod

**GA status:** Structured outputs are generally available (no longer beta) for Claude Opus 4.6, Sonnet 4.6, Sonnet 4.5, Opus 4.5, Haiku 4.5.

**Pattern:**
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const response = await client.messages.parse({
  model: "claude-sonnet-4-5-20250514",
  max_tokens: 4096,
  messages: [{ role: "user", content: prompt }],
  output_config: { format: zodOutputFormat(schema) },
});
// response.parsed_output is fully typed
```

**Key details:**
- Use `client.messages.parse()` with `zodOutputFormat()` from `@anthropic-ai/sdk/helpers/zod`
- Uses constrained decoding — model literally cannot produce tokens violating the schema
- Schema limitations: no `minimum`/`maximum`/`minLength`/`maxLength`, must use `additionalProperties: false`
- All `z.enum()` values are guaranteed exact

**Note:** The existing `ClaudeClient` in core-infrastructure already wraps this pattern.

**Sources:** [Claude Structured Outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [Anthropic SDK TypeScript](https://github.com/anthropics/anthropic-sdk-typescript)

### AST-Based Code Change Classification

**Taxonomy:**

| Category | AST Signal | Detection Strategy |
|----------|-----------|-------------------|
| Format-only | Same AST structure, different whitespace | Compare node types and children; ignore leaf text |
| Rename-only | Same structure, different identifier names | Match by position; compare identifier `text()` |
| Moved code | Identical subtrees at different positions | Hash subtrees, find matches across diff |
| Extracted method | New function + call replacing inline code | Detect new function + matching removed statements |
| Inlined code | Removed function + body at call sites | Inverse of extract detection |
| Logic change | Different control flow or expressions | Structural differences in statement/expression nodes |

**Key tools/research:**
- **GumTree**: AST diff with insert/delete/update/move actions (single-file)
- **RefactoringMiner v3.0+**: 60+ refactoring types, cross-file move detection, multi-mapping
- **diffsitter**: Rust CLI using tree-sitter for AST-level diffs
- **Subtree hashing**: Hash `type` + structure (ignoring leaf text) for move detection

**Recommendations:**
- Start with tree-sitter AST comparison for format vs structural separation
- Use subtree hashing for move/copy detection
- For rename: compare nodes at matching positions, check if only identifiers differ
- For extract: new function declarations whose body matches removed statements
- Reserve LLM for ambiguous cases

**Sources:** [RefactoringMiner](https://github.com/tsantalis/refactoringminer), [GumTree](https://github.com/SpoonLabs/gumtree-spoon-ast-diff), [Refactoring-Aware AST Differencing (TOSEM 2024)](https://arxiv.org/html/2403.05939v2)

### Token Chunking Strategies

**Strategy 1: File-Level Grouping by Directory**
- Sort files by directory path
- Greedily accumulate into batches up to token budget
- Keep same-directory files together

**Strategy 2: Hierarchical with Parent Context**
- Level 1: Repository overview
- Level 2: Module/directory summaries
- Level 3: Individual file diffs
- Level 4: Function-level (for very large files)
- Include context preamble with each chunk

**Strategy 3: Semantic Chunking**
- Split at AST boundaries (functions, classes, modules)
- Attach imports + type definitions as shared context
- For large functions, split at statement boundaries

**Strategy 4: Priority-Based Token Allocation**
- Pre-classify with AST analysis
- Skip/summarize format-only and rename-only
- Allocate more tokens to logic changes and security-sensitive files

**Strategy 5: Map-Reduce**
- Map: Review each file/chunk independently
- Reduce: Aggregate findings, send summaries for final synthesis

**Chunk size recommendations:**
- Single file diff: 2,000-4,000 tokens
- File group batch: 8,000-16,000 tokens
- Context preamble: 500-1,000 tokens
- Max per LLM call: 70-80% of context window

**Key finding:** AST-based batching produced 3.55x more actionable feedback vs naive approaches.

**Sources:** [Pinecone Chunking Strategies](https://www.pinecone.io/learn/chunking-strategies/), [AST-Based Batching Thesis (Radboud 2025)](https://www.cs.ru.nl/bachelors-theses/2025/), [Deepchecks Token Limits](https://www.deepchecks.com/5-approaches-to-solve-llm-token-limits/)

---

## Testing Infrastructure

### Existing Setup
- **Framework:** Vitest with node environment
- **Pattern:** `src/**/*.test.ts`
- **Path aliases:** `@core` → `../01-core-infrastructure/src`
- **Mocking:** GitHub client, Claude API, file system
- **Integration tests:** Stub agents through pipeline runner
- **Schema validation:** Zod `safeParse` for contract testing
