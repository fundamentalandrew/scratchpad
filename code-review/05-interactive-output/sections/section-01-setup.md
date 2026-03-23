Now I have all the context I need. Let me generate the section content.

# Section 01: Project Setup

## Overview

This section covers the initial scaffolding for the `05-interactive-output` module. It creates the project configuration files (`package.json`, `tsconfig.json`, `vitest.config.ts`), the module-specific TypeScript types (`types.ts`), and the public entry point (`src/index.ts`). All subsequent sections depend on this one being completed first.

This module is the final stage of a multi-agent code review CLI pipeline. It receives structured review results from the upstream review agent and presents them interactively in the terminal for user curation, then publishes approved recommendations as either a GitHub PR comment or a markdown file.

---

## Directory Structure to Create

All files live under `/home/andrew/code/scratchpad/code-review/05-interactive-output/`.

```
05-interactive-output/
  package.json
  tsconfig.json
  vitest.config.ts
  src/
    index.ts
    types.ts
    formatters/       (empty directories; files added in later sections)
    publishers/
  tests/
    formatters/
    publishers/
```

---

## Tests First

There are no runtime tests for this section since it only defines TypeScript types (compile-time checked) and configuration files. Verification is that the project compiles and vitest can run with zero tests passing. However, you should confirm the setup works by running `npx tsc --noEmit` and `npx vitest run` (which should exit cleanly with "no tests found" or similar).

---

## File: `package.json`

Create `/home/andrew/code/scratchpad/code-review/05-interactive-output/package.json`.

Follow the convention from existing modules (e.g., `04-review-agent/package.json`):

- `name`: `"interactive-output"`
- `version`: `"0.1.0"`
- `type`: `"module"` (ESM, matching all other modules)
- Scripts: `build` (`tsc`), `test` (`vitest run`), `test:watch` (`vitest`)
- Dependencies:
  - `@inquirer/prompts` -- the modern, tree-shakeable, TypeScript-first rewrite of inquirer. Used for `select()` and `input()` prompts in the interactive review flow.
  - `chalk` -- for colored terminal output (already used by core infrastructure's logger, but needed directly here for summary display formatting)
- Dev dependencies (matching versions from other modules):
  - `@types/node`: `^25.5.0`
  - `typescript`: `^5.9.3`
  - `vitest`: `^4.1.0`

---

## File: `tsconfig.json`

Create `/home/andrew/code/scratchpad/code-review/05-interactive-output/tsconfig.json`.

Must match the exact pattern from `04-review-agent/tsconfig.json`:

- `target`: `"ES2022"`
- `module`: `"Node16"`
- `moduleResolution`: `"Node16"`
- `strict`: `true`
- `outDir`: `"./dist"`
- `rootDir`: `"./src"`
- `declaration`: `true`
- `esModuleInterop`: `true`
- `skipLibCheck`: `true`
- `forceConsistentCasingInFileNames`: `true`
- `resolveJsonModule`: `true`
- `paths`: `{ "@core/*": ["../01-core-infrastructure/src/*"] }` -- allows importing core types via `@core/agents/schemas.js`, `@core/utils/logger.js`, `@core/clients/github.js`, etc.
- `include`: `["src"]`
- `exclude`: `["node_modules", "dist"]`

---

## File: `vitest.config.ts`

Create `/home/andrew/code/scratchpad/code-review/05-interactive-output/vitest.config.ts`.

Must match the pattern from `04-review-agent/vitest.config.ts`:

- Import `defineConfig` from `"vitest/config"` and `path` from `"path"`
- Set resolve alias: `"@core"` maps to `path.resolve(__dirname, "../01-core-infrastructure/src")`
- Test config: `globals: false`, `environment: "node"`, `include: ["src/**/*.test.ts", "tests/**/*.test.ts"]`

---

## File: `src/types.ts`

Create `/home/andrew/code/scratchpad/code-review/05-interactive-output/src/types.ts`.

This file defines the module-specific types used throughout the interactive output module. These are TypeScript interfaces/types only (no runtime code, no Zod schemas needed).

### Types to define

**`DecisionAction`** -- A union type representing the possible user actions during recommendation review:
- `"accept"` -- user approves the recommendation for inclusion in output
- `"reject"` -- user declines the recommendation
- `"annotate"` -- user approves with an added note

**`UserDecision`** -- Discriminated union representing a user's decision on a single recommendation (changed from interface during code review for better type safety):
- `{ action: "accept" | "reject" }` -- simple decision with no note
- `{ action: "annotate"; note: string }` -- decision with required note

**`AnnotatedRecommendation`** -- Pairs a recommendation with its user decision. Used as input to formatters:
- `recommendation: Recommendation` -- the original recommendation (import `Recommendation` type from `@core/agents/schemas.js`)
- `decision: UserDecision` -- the user's decision

**`OutputDestination`** -- A union type for where to publish the curated output:
- `"pr-comment"` -- post/update a GitHub PR comment
- `"markdown-file"` -- write a local markdown file
- `"cancel"` -- user chose not to publish

**`OutputConfig`** -- Configuration for the output agent, derived from the pipeline config:
- `markdown: boolean` -- whether markdown file output is the default
- `markdownPath: string` -- file path for markdown output (default: `"./code-review-report.md"`)
- `githubComment: boolean` -- whether PR comment output is the default

**`OutputAgentDependencies`** -- Dependencies injected into the agent factory:
- `logger: Logger` -- import from `@core/utils/logger.js`
- `githubClient: GitHubClient` -- import from `@core/clients/github.js`
- `config: OutputConfig`
- `contextOutput: ContextOutput` -- import from `@core/agents/schemas.js`

All types must be exported. Import external types from core infrastructure using the `@core/*` path alias:
- `Recommendation` and `ContextOutput` from `@core/agents/schemas.js`
- `Logger` from `@core/utils/logger.js`
- `GitHubClient` from `@core/clients/github.js`

---

## File: `src/index.ts`

Create `/home/andrew/code/scratchpad/code-review/05-interactive-output/src/index.ts`.

This is the public API entry point. It should re-export all public types from `types.ts` and will eventually re-export `createOutputAgent` from `output-agent.ts` (added in section-07).

For now, export all types from `./types.js`:
- `DecisionAction`, `UserDecision`, `AnnotatedRecommendation`, `OutputDestination`, `OutputConfig`, `OutputAgentDependencies`

Add a placeholder comment for the future `createOutputAgent` export that section-07 will add.

---

## Key Dependencies on Core Infrastructure

This module imports from `01-core-infrastructure` using the `@core/*` path alias. The relevant source files and their exports are:

- `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/schemas.ts` -- exports `Recommendation`, `ContextOutput`, `ReviewOutput`, `IgnoreGroup` types
- `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/utils/logger.ts` -- exports `Logger` interface
- `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/clients/github.ts` -- exports `GitHubClient` class
- `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/pipeline/types.ts` -- exports `Agent<TInput, TOutput>` interface

The `Agent` interface shape (from core):
```typescript
interface Agent<TInput, TOutput> {
  name: string;
  idempotent: boolean;
  run(input: TInput): Promise<TOutput>;
}
```

The `Logger` interface (from core):
```typescript
interface Logger {
  info(msg: string): void;
  verbose(msg: string): void;
  error(msg: string): void;
  warn(msg: string): void;
  success(msg: string): void;
}
```

---

## Verification Checklist

After implementation, confirm:
1. `npx tsc --noEmit` -- has known TS6059 rootDir errors (same as 04-review-agent) due to cross-module path aliases; not actual type errors
2. `npx vitest run` executes without crashing (exits 1 with "no test files found" which is expected)
3. All type imports from `@core/*` resolve correctly via vitest aliases
4. The `src/index.ts` file exports all defined types

## Deviations from Plan

- **UserDecision type**: Changed from interface with optional `note` to discriminated union for type safety (code review finding, user approved)
- **Empty directories**: Added `.gitkeep` files to `src/formatters/`, `src/publishers/`, `tests/formatters/`, `tests/publishers/` for git tracking