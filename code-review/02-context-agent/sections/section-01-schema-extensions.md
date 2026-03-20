Now I have everything I need. Here is the section content:

# Section 01: Schema Extensions

## Overview

This section extends the Zod schemas in `01-core-infrastructure/src/agents/schemas.ts` to support the new data structures the Context Agent will produce. Three new schemas are added (`ReferencedIssueSchema`, `ReviewCommentSchema`, `TechStackSchema`), one existing schema is modified (`PRFileSchema` gets a `previousPath` field), and the `ContextOutputSchema` gains three new optional fields. The `StubContextAgent` in `stubs.ts` is also updated to include the new fields.

All changes are in the `01-core-infrastructure` package. No other sections need to be completed first.

## Dependencies

None. This is the first section in the dependency graph.

## Files to Modify

- `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/schemas.ts` -- add new schemas, modify existing ones
- `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/stubs.ts` -- update stub output with new optional fields
- `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/schemas.test.ts` -- add tests for new schemas

## Tests (Write First)

Add the following test cases to `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/schemas.test.ts`. Write these tests before making any schema changes -- they should fail initially and pass once the schemas are implemented.

### ReferencedIssueSchema tests

```typescript
describe("ReferencedIssueSchema", () => {
  // Test: validates a complete issue with all fields (number, title, state, body, owner, repo)
  // Test: validates a same-repo issue (no owner/repo -- these are optional)
  // Test: rejects missing required fields (number, title, state)
});
```

Required fields: `number` (number), `title` (string), `state` (string). Optional fields: `body` (string), `owner` (string), `repo` (string).

### ReviewCommentSchema tests

```typescript
describe("ReviewCommentSchema", () => {
  // Test: validates a complete comment with all fields (id, author, body, path, line, createdAt)
  // Test: validates a comment without optional path/line
  // Test: requires id field (reject when missing)
});
```

Required fields: `id` (number), `author` (string), `body` (string), `createdAt` (string). Optional fields: `path` (string), `line` (number).

### TechStackSchema tests

```typescript
describe("TechStackSchema", () => {
  // Test: validates with populated arrays and dependencies record
  //   e.g. { languages: ["TypeScript"], frameworks: ["React"], dependencies: { react: "^18.0.0" } }
  // Test: validates with empty arrays and empty dependencies record
  //   e.g. { languages: [], frameworks: [], dependencies: {} }
});
```

All fields required: `languages` (string array), `frameworks` (string array), `dependencies` (record of string to string).

### PRFileSchema tests

```typescript
describe("PRFileSchema (extended)", () => {
  // Test: accepts previousPath for renamed files
  //   e.g. { path: "new/path.ts", status: "renamed", additions: 0, deletions: 0, previousPath: "old/path.ts" }
  // Test: works without previousPath (backward compat)
  //   e.g. { path: "src/index.ts", status: "modified", additions: 5, deletions: 2 }
});
```

Note: `PRFileSchema` is currently declared with `const` (not exported). You will need to export it so tests can reference it directly, or test it indirectly through `ContextOutputSchema` by embedding files in a PR object. Exporting it is the cleaner approach.

### ContextOutputSchema tests (extended)

Add to the existing `ContextOutputSchema` describe block:

```typescript
// Test: accepts referencedIssues, comments, and techStack as optional fields
//   Build a valid PR-mode object with all three new fields populated and verify safeParse succeeds
// Test: validates without new optional fields (backward compat)
//   The existing tests already cover this, but add an explicit test that omits referencedIssues, comments, and techStack
// Test: still requires either pr or repoFiles (existing refinement unchanged)
//   Verify that adding the new fields does NOT bypass the existing .refine() check
```

### StubContextAgent test (verify existing test still passes)

The existing test in `stubs.test.ts` at line 48-54 validates that `createStubContextAgent` output passes `ContextOutputSchema.parse()`. After updating the stub, this test must continue to pass. No new test is needed -- just verify it still works after the changes.

## Implementation Details

### New Schemas to Add in `schemas.ts`

Add these three new schema definitions before the `ContextOutputSchema` definition.

**ReferencedIssueSchema:**
- `number`: `z.number()`
- `title`: `z.string()`
- `state`: `z.string()` -- values will be "open" or "closed" but not constrained at the schema level
- `body`: `z.string().optional()`
- `owner`: `z.string().optional()` -- present for cross-repo references
- `repo`: `z.string().optional()` -- present for cross-repo references

**ReviewCommentSchema:**
- `id`: `z.number()` -- unique comment ID for deduplication/linking
- `author`: `z.string()`
- `body`: `z.string()`
- `path`: `z.string().optional()` -- file path for inline comments
- `line`: `z.number().optional()` -- line number for inline comments
- `createdAt`: `z.string()` -- ISO timestamp

**TechStackSchema:**
- `languages`: `z.array(z.string())`
- `frameworks`: `z.array(z.string())`
- `dependencies`: `z.record(z.string(), z.string())` -- package name to version (raw strings, no semver assumption)

All three schemas should be exported so downstream code and tests can import them.

### Modify PRFileSchema

Add one optional field to the existing `PRFileSchema` object definition:
- `previousPath`: `z.string().optional()` -- previous file path for renamed files

Also change `PRFileSchema` from a non-exported `const` to an exported `const` (add `export` keyword) so it can be imported in tests and by the Context Agent.

### Modify ContextOutputSchema

Add three new optional fields to the existing `.object({...})` call, before the `.refine()`:
- `referencedIssues`: `z.array(ReferencedIssueSchema).optional()`
- `comments`: `z.array(ReviewCommentSchema).optional()`
- `techStack`: `TechStackSchema.optional()`

The existing `.refine()` check (pr or repoFiles must be present) remains exactly as-is.

### Update Type Exports

Add new type exports at the bottom of `schemas.ts`:

```typescript
export type ReferencedIssue = z.infer<typeof ReferencedIssueSchema>;
export type ReviewComment = z.infer<typeof ReviewCommentSchema>;
export type TechStack = z.infer<typeof TechStackSchema>;
```

The existing `ContextOutput` type will automatically pick up the new optional fields since it is derived from `ContextOutputSchema` via `z.infer`.

### Update StubContextAgent in `stubs.ts`

Add the new optional fields to the stub's return value to keep backward compatibility and enable downstream tests:

```typescript
referencedIssues: [],
comments: [],
techStack: { languages: ["TypeScript"], frameworks: [], dependencies: {} },
```

These go inside the object returned by `run()`, alongside the existing `domainRules` and `architectureDoc` fields. Using empty arrays and a minimal `techStack` object keeps the stub simple while ensuring schema validation passes.

## Verification

After implementation, run:

```bash
cd /home/andrew/code/scratchpad/code-review/01-core-infrastructure && npm test
```

All existing tests must continue to pass (backward compatibility). All new tests should pass. Pay particular attention to:
1. The `stubs.test.ts` test that calls `ContextOutputSchema.parse(ctxResult)` -- this validates the stub still conforms after schema changes.
2. The `schemas.test.ts` "JSON Schema generation" test -- all schemas (including new ones, if added to the array) should produce valid JSON Schema output.

## Implementation Notes

**Status:** Complete. 26 tests pass in schemas.test.ts (15 existing + 11 new). All 16 test files pass.

**Deviations from plan:**
- Added a TechStackSchema rejection test (missing required fields) per code review — the plan only specified positive tests.
- Added ReferencedIssueSchema, ReviewCommentSchema, TechStackSchema, and PRFileSchema to the JSON Schema generation test array per code review.

**Files modified:**
- `01-core-infrastructure/src/agents/schemas.ts` — added 3 new schemas, exported PRFileSchema, added previousPath, added 3 optional fields to ContextOutputSchema, added 3 type exports
- `01-core-infrastructure/src/agents/stubs.ts` — added referencedIssues, comments, techStack to stub return
- `01-core-infrastructure/src/agents/schemas.test.ts` — added 11 new tests across 5 new describe blocks