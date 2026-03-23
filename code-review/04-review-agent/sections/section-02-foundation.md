Now I have all the context needed. Let me generate the section content.

# Section 02: Foundation — Project Scaffolding and Types

## Overview

This section sets up the `04-review-agent` project: directory structure, configuration files, the `LLMReviewResponseSchema` Zod schema, local types, and barrel exports. This is pure scaffolding with no business logic.

**Depends on:** section-01-schema-updates (schemas in `01-core-infrastructure` must be extended first)
**Blocks:** section-03-prompt-builder, section-04-review-agent, section-05-unit-tests, section-06-integration-tests

## Directory Structure

Create the following directories and files:

```
04-review-agent/
├── src/
│   ├── review-agent.ts       # (empty placeholder, implemented in section-04)
│   ├── prompt-builder.ts     # (empty placeholder, implemented in section-03)
│   ├── types.ts              # LLM response schema + re-exports
│   └── index.ts              # Barrel exports
├── tests/
│   ├── unit/
│   │   ├── review-agent.test.ts      # (empty, implemented in section-05)
│   │   └── prompt-builder.test.ts    # (empty, implemented in section-05)
│   └── integration/
│       └── review-agent.test.ts      # (empty, implemented in section-06)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Files to Create

### `/home/andrew/code/scratchpad/code-review/04-review-agent/package.json`

Mirror the `03-analysis-agent` pattern but with a simpler dependency list. The review agent does not need tree-sitter or picomatch.

- `name`: `"review-agent"`
- `version`: `"0.1.0"`
- `type`: `"module"`
- `scripts`: `build` (tsc), `test` (vitest run), `test:watch` (vitest)
- `dependencies`: `zod` (^4.3.6)
- `devDependencies`: `@types/node` (^25.5.0), `typescript` (^5.9.3), `vitest` (^4.1.0)

### `/home/andrew/code/scratchpad/code-review/04-review-agent/tsconfig.json`

Identical to `03-analysis-agent/tsconfig.json`:

- `target`: ES2022
- `module`: Node16
- `moduleResolution`: Node16
- `strict`: true
- `outDir`: `./dist`
- `rootDir`: `./src`
- `declaration`: true
- `esModuleInterop`: true
- `skipLibCheck`: true
- `forceConsistentCasingInFileNames`: true
- `resolveJsonModule`: true
- `paths`: `{ "@core/*": ["../01-core-infrastructure/src/*"] }`
- `include`: `["src"]`
- `exclude`: `["node_modules", "dist"]`

### `/home/andrew/code/scratchpad/code-review/04-review-agent/vitest.config.ts`

Identical to `03-analysis-agent/vitest.config.ts`:

- Resolve alias `@core` to `path.resolve(__dirname, "../01-core-infrastructure/src")`
- Test config: `globals: false`, `environment: "node"`, `include: ["src/**/*.test.ts", "tests/**/*.test.ts"]`

### `/home/andrew/code/scratchpad/code-review/04-review-agent/src/types.ts`

This file defines the LLM response schema (what Claude returns) and re-exports relevant core types.

**LLMReviewResponseSchema** -- a Zod object schema with these fields:

- `coreDecision: z.string()` -- one-sentence summary of the key decision
- `recommendations: z.array(z.object({...}))` -- array of recommendation objects from the LLM, each with:
  - `file: z.string()`
  - `category: z.string()`
  - `message: z.string()`
  - `suggestion: z.string().optional()`
  - `humanCheckNeeded: z.string()`
  - `estimatedReviewTime: z.enum(["5", "15", "30", "60"])`
- `focusAreas: z.array(z.string())` -- 3-5 high-level areas
- `summary: z.string()` -- one paragraph overview

Export the inferred type as `LLMReviewResponse`.

**Re-exports from core:** Re-export these types from `@core/agents/schemas.js` for convenience:
- `ContextOutput`
- `AnalysisOutput`
- `ReviewOutput`
- `FileScore`
- `Recommendation`

Also re-export the schemas themselves if needed by downstream code (e.g., `ReviewOutputSchema` for parse validation in tests).

### `/home/andrew/code/scratchpad/code-review/04-review-agent/src/index.ts`

Barrel exports. For now, export:
- `createReviewAgent` from `./review-agent.js` (the function will be implemented in section-04; for now export a placeholder or leave as a forward declaration)
- All public types from `./types.js`

Since `review-agent.ts` and `prompt-builder.ts` are not yet implemented, create them as empty files or with stub exports so that `index.ts` does not cause import errors. A simple approach: have `review-agent.ts` export a stub `createReviewAgent` function that throws "not implemented", and `prompt-builder.ts` export stub functions similarly. These will be replaced in sections 03 and 04.

### Placeholder files

**`/home/andrew/code/scratchpad/code-review/04-review-agent/src/review-agent.ts`** -- stub:

```typescript
/** Review agent factory. Implemented in section-04. */
export function createReviewAgent(deps: any): any {
  throw new Error("Not implemented - see section-04");
}
```

**`/home/andrew/code/scratchpad/code-review/04-review-agent/src/prompt-builder.ts`** -- stub:

```typescript
/** Prompt builders. Implemented in section-03. */
export function buildPRSystemPrompt(context: any): string {
  throw new Error("Not implemented - see section-03");
}

export function buildRepoSystemPrompt(context: any): string {
  throw new Error("Not implemented - see section-03");
}

export function buildUserPrompt(files: any[], context: any, summary: any): string {
  throw new Error("Not implemented - see section-03");
}
```

**Empty test files** -- create empty files at:
- `/home/andrew/code/scratchpad/code-review/04-review-agent/tests/unit/review-agent.test.ts`
- `/home/andrew/code/scratchpad/code-review/04-review-agent/tests/unit/prompt-builder.test.ts`
- `/home/andrew/code/scratchpad/code-review/04-review-agent/tests/integration/review-agent.test.ts`

## Tests

There are no dedicated tests for this section in the TDD plan -- this is pure scaffolding. Verification consists of:

1. `npx vitest run` executes without errors in `04-review-agent/` (no tests fail, zero tests found is acceptable)
2. `npx tsc --noEmit` compiles without errors
3. The `LLMReviewResponseSchema` can be imported and used to parse a conforming object

A minimal smoke test can be added directly in a test file to confirm the schema works:

```
File: /home/andrew/code/scratchpad/code-review/04-review-agent/tests/unit/types.test.ts

# Test: LLMReviewResponseSchema parses a valid response object
  - Construct an object matching the schema shape
  - Call LLMReviewResponseSchema.parse(obj) 
  - Expect it to not throw

# Test: LLMReviewResponseSchema rejects invalid estimatedReviewTime value
  - Pass an object with estimatedReviewTime: "10"
  - Expect parse to throw a ZodError

# Test: LLMReviewResponseSchema requires all non-optional fields
  - Pass an object missing coreDecision
  - Expect parse to throw
```

## Implementation Checklist

1. Create directory structure under `04-review-agent/`
2. Write `package.json` mirroring 03-analysis-agent (fewer deps)
3. Write `tsconfig.json` (copy from 03-analysis-agent)
4. Write `vitest.config.ts` (copy from 03-analysis-agent)
5. Write `src/types.ts` with `LLMReviewResponseSchema` and re-exports
6. Write `src/prompt-builder.ts` with stub exports
7. Write `src/review-agent.ts` with stub export
8. Write `src/index.ts` barrel file
9. Create empty test files in `tests/unit/` and `tests/integration/`
10. Optionally create `tests/unit/types.test.ts` with the smoke tests above
11. Run `npm install` (or ensure workspace resolution works)
12. Verify `npx tsc --noEmit` passes
13. Verify `npx vitest run` passes (zero failures)