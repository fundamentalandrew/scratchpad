

# Section 02: Shared Types & Zod Schemas

## Overview

This section defines all shared TypeScript types, Zod schemas, and the error type hierarchy that form the foundation every other section depends on. There are three files to create and one test file.

**Depends on:** section-01-project-setup (project scaffolding must exist)
**Blocks:** sections 03, 05, 06, 07 (config, Claude client, GitHub client, pipeline)

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/types/common.ts` | Base types: `ReviewMode`, `RiskLevel`, `FileScore`, `Recommendation` |
| `src/agents/types.ts` | Agent I/O contract types: `ContextOutput`, `AnalysisOutput`, `ReviewOutput` |
| `src/agents/schemas.ts` | Zod schemas for all contract types, with inferred TS types exported |
| `src/agents/schemas.test.ts` | Tests for schema validation |
| `src/utils/errors.ts` | Error type hierarchy |
| `src/utils/errors.test.ts` | Tests for error types |

---

## Tests First

### Schema Validation Tests (`src/agents/schemas.test.ts`)

Write tests covering these cases:

```
# Test: FileScore schema accepts valid data (all fields populated)
# Test: FileScore schema rejects score outside 0-10 range
# Test: FileScore schema rejects invalid RiskLevel value
# Test: Recommendation schema accepts minimal valid data (without optional fields)
# Test: Recommendation schema accepts full data (with line, suggestion)
# Test: ContextOutput schema accepts valid PR-mode data
# Test: ContextOutput schema accepts valid repo-mode data (with repoFiles, without pr)
# Test: ContextOutput schema rejects data with both pr.files and repoFiles missing
# Test: AnalysisOutput schema accepts valid data with summary counts
# Test: ReviewOutput schema accepts valid data with recommendations array
# Test: All schemas produce valid JSON Schema via toJSONSchema/zod-to-json-schema
```

Each test should use `schema.safeParse(data)` and assert `.success` is `true` or `false` as appropriate. For the JSON Schema test, call the Zod-to-JSON-Schema conversion on each exported schema and verify the result is a plain object with a `"type"` property.

### Error Type Tests (`src/utils/errors.test.ts`)

```
# Test: ConfigError has user-friendly message
# Test: PipelineError includes agent name and attempt count
# Test: AuthError suggests remediation steps in message
# Test: URLParseError includes expected format
# Test: ClaudeAPIError includes retryable flag
# Test: All error types extend Error (proper prototype chain)
```

Each test constructs the error and asserts on `instanceof Error`, the `message` property containing expected substrings, and (for `ClaudeAPIError`) the `retryable` boolean property. For `PipelineError`, verify that `agentName` and `attempts` properties are accessible.

---

## Implementation Details

### 1. Common Types (`src/types/common.ts`)

Define and export these base types:

```typescript
type ReviewMode = "pr" | "repo";
type RiskLevel = "critical" | "high" | "medium" | "low";

interface FileScore {
  path: string;
  score: number;          // 0-10
  riskLevel: RiskLevel;
  reasons: string[];
}

interface Recommendation {
  file: string;
  line?: number;
  severity: RiskLevel;
  category: string;       // "security", "performance", "logic", etc.
  message: string;
  suggestion?: string;
}
```

These are plain TypeScript types (no Zod here). They are re-exported or referenced by the Zod schemas in `src/agents/schemas.ts`.

### 2. Agent Contract Types (`src/agents/types.ts`)

Define input/output shapes for each pipeline stage. These are TypeScript interfaces only (the Zod equivalents live in `schemas.ts`).

**ContextOutput** -- produced by the Context Agent:
- `mode`: `ReviewMode`
- `repository`: `{ owner: string; repo: string; defaultBranch: string }`
- `pr?`: optional object with `{ number: number; title: string; description: string; author: string; baseBranch: string; headBranch: string; files: Array<{ path: string; status: string; additions: number; deletions: number; patch?: string | null }>; diff: string }`
- `repoFiles?`: `Array<{ path: string }>` -- only present in repo mode
- `domainRules`: `string | null`
- `architectureDoc`: `string | null`

Key design note: PR mode uses `pr.files` for the file list; repo mode uses `repoFiles`. There is no overloaded `files` field. The `patch` field on PR files can be `null` or `undefined` for binary files or truncated large diffs.

**AnalysisOutput** -- produced by the Analysis Agent:
- `scoredFiles`: `FileScore[]` (all files with scores)
- `criticalFiles`: `FileScore[]` (files above threshold)
- `summary`: `{ totalFiles: number; criticalCount: number; highCount: number; categories: Record<string, number> }`

**ReviewOutput** -- produced by the Review Agent:
- `recommendations`: `Recommendation[]`
- `coreDecision`: `string` (high-level summary)
- `focusAreas`: `string[]` (top areas needing human review)

### 3. Zod Schemas (`src/agents/schemas.ts`)

Create Zod schemas corresponding to every type above. These serve two purposes:
1. **Runtime validation** of LLM output at pipeline stage boundaries
2. **JSON Schema generation** for Claude's `output_config.format`

Use `z.infer<typeof Schema>` to derive TypeScript types from the Zod schemas. Export **both** the schemas and the inferred types. This ensures types and validation stay in sync.

Specific schema constraints to enforce:
- `RiskLevel`: `z.enum(["critical", "high", "medium", "low"])`
- `FileScore.score`: `z.number().min(0).max(10)`
- `FileScore.reasons`: `z.array(z.string())`
- `Recommendation.line`: `z.number().optional()`
- `Recommendation.suggestion`: `z.string().optional()`
- `ContextOutput`: Use `.optional()` for `pr` and `repoFiles`. Add a `.refine()` to ensure at least one of `pr` or `repoFiles` is present (reject data where both are missing).
- `ContextOutput.pr.files[].patch`: `z.string().nullable().optional()` to handle null patches on binary/large files

For JSON Schema generation, use either `zod-to-json-schema` (npm package) or Zod's built-in `.toJSONSchema()` if available in the installed version. The test suite validates this works.

### 4. Error Type Hierarchy (`src/utils/errors.ts`)

Define a small hierarchy of domain-specific error classes. All extend `Error` with proper prototype chain setup.

- **`ConfigError`** -- invalid config, missing required values. Constructor takes a message string.
- **`AuthError`** -- missing API keys or tokens. Message should include remediation steps (e.g., "Set GITHUB_TOKEN env var, install gh CLI, or add githubToken to .codereview.json").
- **`PipelineError`** -- agent failure after retries exhausted. Constructor takes `agentName: string`, `attempts: number`, and `cause: Error`. Store `agentName` and `attempts` as public properties. Message format: `"Agent '{agentName}' failed after {attempts} attempt(s): {cause.message}"`.
- **`GitHubAPIError`** -- GitHub API failures. Wraps Octokit errors with context.
- **`ClaudeAPIError`** -- Claude API failures. Has a `retryable: boolean` property. Zod validation failures are retryable (LLM may produce valid output on next attempt); refusals are not.
- **`URLParseError`** -- invalid GitHub URL format. Message should include the expected format example (e.g., "Expected: https://github.com/owner/repo/pull/123").

Each error class must call `super(message)` and set `this.name` to the class name. Use `Object.setPrototypeOf(this, ClassName.prototype)` in each constructor to ensure `instanceof` checks work correctly with TypeScript class inheritance targeting ES2022.

---

## Implementation Order Within This Section

1. Create `src/types/common.ts` (plain types, no dependencies)
2. Create `src/agents/types.ts` (references common types)
3. Create `src/agents/schemas.ts` (Zod schemas, references common types)
4. Create `src/utils/errors.ts` (standalone error classes)
5. Create `src/agents/schemas.test.ts` and `src/utils/errors.test.ts`
6. Run `npx vitest run` to verify all tests pass