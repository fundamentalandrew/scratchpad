Now I have all the context needed. Let me generate the section content.

# Section 01: Schema Updates

## Overview

This section extends schemas in `01-core-infrastructure` to support the Review Agent (Agent C). All changes are backward-compatible -- new fields are optional, and existing tests and stubs continue to work after modification.

**Files to modify:**
- `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/schemas.ts`
- `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/stubs.ts`
- `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/types.ts`

**Files to create:**
- `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/schemas.review.test.ts`

**No dependencies on other sections.** This section blocks all other sections.

---

## Tests First

Create `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/schemas.review.test.ts` with the following test stubs. Use `vitest` with `describe`/`it`/`expect` (matching existing test patterns in the project -- see `stubs.test.ts` for reference).

```
# Test: Extended RecommendationSchema accepts optional humanCheckNeeded, estimatedReviewTime, score
  - Parse an object with existing fields (file, severity, category, message) plus the three new optional fields
  - Expect parse to succeed and all fields to be present on the result

# Test: Extended RecommendationSchema still validates without new optional fields (backward compat)
  - Parse an object with only existing fields (file, severity, category, message)
  - Expect parse to succeed (no errors)

# Test: estimatedReviewTime only accepts enum values "5", "15", "30", "60"
  - Parse with estimatedReviewTime: "5" -> success
  - Parse with estimatedReviewTime: "10" -> failure
  - Parse with estimatedReviewTime: "999" -> failure

# Test: IgnoreGroupSchema validates label, count, description
  - Parse { label: "tests/*", count: 5, description: "Standard mock updates" } -> success
  - Parse missing any required field -> failure

# Test: Extended ReviewOutputSchema accepts safeToIgnore and summary fields
  - Parse a full ReviewOutput object including safeToIgnore array and summary string
  - Expect parse to succeed

# Test: AnalysisOutputSchema accepts optional contextPassthrough field
  - Parse a valid AnalysisOutput with a contextPassthrough containing a valid ContextOutput
  - Expect parse to succeed and contextPassthrough to be present

# Test: AnalysisOutputSchema validates without contextPassthrough (backward compat)
  - Parse a valid AnalysisOutput without contextPassthrough
  - Expect parse to succeed

# Test: Updated stub review agent output conforms to extended ReviewOutputSchema
  - Call createStubReviewAgent().run({} as any)
  - Parse the result with ReviewOutputSchema
  - Expect parse to succeed
  - Expect result to have safeToIgnore array and summary string
```

Import schemas directly from `./schemas.js` and the stub from `./stubs.js`. The test file lives alongside the existing `stubs.test.ts` in the same directory so the vitest config (`include: ["src/**/*.test.ts"]`) picks it up automatically.

---

## Implementation Details

### 1. Extend RecommendationSchema

In `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/schemas.ts`, add three optional fields to the existing `RecommendationSchema`:

```typescript
export const RecommendationSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  severity: RiskLevelSchema,
  category: z.string(),
  message: z.string(),
  suggestion: z.string().optional(),
  // New fields for Review Agent
  humanCheckNeeded: z.string().optional(),
  estimatedReviewTime: z.enum(["5", "15", "30", "60"]).optional(),
  score: z.number().min(0).max(10).optional(),
});
```

All three are optional to maintain backward compatibility. Existing code that creates `Recommendation` objects without these fields will continue to work.

### 2. Add IgnoreGroupSchema

Add a new schema in the same file, placed after `RecommendationSchema`:

```typescript
export const IgnoreGroupSchema = z.object({
  label: z.string(),
  count: z.number(),
  description: z.string(),
});
```

Export the inferred type alongside the other type exports at the bottom of the file:

```typescript
export type IgnoreGroup = z.infer<typeof IgnoreGroupSchema>;
```

### 3. Extend ReviewOutputSchema

Add two new required fields to the existing `ReviewOutputSchema`:

```typescript
export const ReviewOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema),
  coreDecision: z.string(),
  focusAreas: z.array(z.string()),
  // New fields for Review Agent
  safeToIgnore: z.array(IgnoreGroupSchema),
  summary: z.string(),
});
```

These are **required** fields (not optional). This means the stub review agent must also be updated to provide them.

### 4. Add contextPassthrough to AnalysisOutputSchema

Add an optional field that carries the `ContextOutput` through the pipeline:

```typescript
export const AnalysisOutputSchema = z.object({
  scoredFiles: z.array(FileScoreSchema),
  criticalFiles: z.array(FileScoreSchema),
  summary: z.object({
    totalFiles: z.number(),
    criticalCount: z.number(),
    highCount: z.number(),
    categories: z.record(z.string(), z.number()),
  }),
  contextPassthrough: ContextOutputSchema.optional(),
});
```

**Important ordering note:** `ContextOutputSchema` is defined earlier in the file (line 72) and uses `.refine()`. Since `AnalysisOutputSchema` references it, the declaration order is already correct. No circular dependency issues.

### 5. Update types.ts re-exports

In `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/types.ts`, add the new `IgnoreGroup` type to the re-exports:

```typescript
export type {
  ContextOutput,
  AnalysisOutput,
  ReviewOutput,
  IgnoreGroup,
} from "./schemas.js";
```

### 6. Update createStubReviewAgent

In `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/stubs.ts`, update the return value of `createStubReviewAgent` to include the new required fields:

```typescript
export function createStubReviewAgent(logger?: Logger): Agent<AnalysisOutput, ReviewOutput> {
  return {
    name: "StubReviewAgent",
    idempotent: true,
    async run(_input: AnalysisOutput): Promise<ReviewOutput> {
      logger?.verbose("[STUB] StubReviewAgent running");
      await new Promise((r) => setTimeout(r, 100));
      return {
        recommendations: [
          {
            file: "src/index.ts",
            line: 5,
            severity: "medium",
            category: "maintainability",
            message: "Consider adding error handling",
            suggestion: "Wrap in try/catch block",
          },
          {
            file: "README.md",
            severity: "low",
            category: "documentation",
            message: "Update API section to match new changes",
          },
        ],
        coreDecision: "Approve with minor suggestions",
        focusAreas: ["Error handling in entry point", "Documentation accuracy"],
        // New fields
        safeToIgnore: [
          { label: "tests/", count: 0, description: "No test files in stub" },
        ],
        summary: "Stub review: minor suggestions for error handling and documentation.",
      };
    },
  };
}
```

### 7. Verify existing tests still pass

After making these changes, the existing test at `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/stubs.test.ts` must still pass. The key test is "stub output passes Zod schema validation" which parses the review agent output with `ReviewOutputSchema.parse()`. Since we added the new required fields to both the schema and the stub, this test will continue to pass.

The pipeline test ("full pipeline with all stubs runs end-to-end without errors") also must continue to pass. Since the stub review agent now includes all required fields and the analysis output schema change is optional, this should work without modification.

---

## Verification Checklist

1. New test file `schemas.review.test.ts` has all 8 test cases listed above
2. `RecommendationSchema` has three new optional fields: `humanCheckNeeded`, `estimatedReviewTime`, `score`
3. `IgnoreGroupSchema` is defined and exported (both schema and type)
4. `ReviewOutputSchema` has two new required fields: `safeToIgnore`, `summary`
5. `AnalysisOutputSchema` has one new optional field: `contextPassthrough`
6. `createStubReviewAgent` return value includes `safeToIgnore` and `summary`
7. `types.ts` re-exports `IgnoreGroup`
8. Run `cd /home/andrew/code/scratchpad/code-review/01-core-infrastructure && npx vitest run` -- all existing tests plus new tests pass