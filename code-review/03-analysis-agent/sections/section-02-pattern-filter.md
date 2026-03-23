Now I have all the context I need. Let me produce the section content.

# Section 02: Pattern Filter

## Overview

This section implements the glob-based file filtering module for the analysis agent. The pattern filter is the first step of the deterministic layer: it removes files that are obviously irrelevant to code review (lock files, generated code, snapshots, translations, SVGs, etc.) before any AST analysis or LLM scoring occurs.

The module wraps the existing `filterFiles()` utility from core infrastructure, adding analysis-specific default ignore patterns and producing `FileScore` entries (score 0, riskLevel "low") for all ignored files.

## File to Create

`/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/deterministic/pattern-filter.ts`

## Test File to Create

`/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/pattern-filter.test.ts`

## Dependencies

- **Section 01 (Foundation):** Project scaffolding must exist (package.json, tsconfig.json, vitest.config.ts, directory structure). The `@core` path alias should resolve to `01-core-infrastructure/src`.
- **Core infrastructure modules used:**
  - `filterFiles()` from `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/utils/file-filter.ts` -- generic glob-based filter that splits bare patterns (no `/`) with `matchBase: true` from path patterns
  - `FileScore` type from `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/schemas.ts` -- `{ path: string; score: number; riskLevel: RiskLevel; reasons: string[] }`
  - `PRFileSchema` / `PRFile` -- `{ path: string; status: string; additions: number; deletions: number; patch?: string | null; previousPath?: string }`
  - `RiskLevel` -- `"critical" | "high" | "medium" | "low"`

## Tests (Write First)

The test file `pattern-filter.test.ts` should cover these cases:

### Test: files matching default analysis patterns are filtered

Files named `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, files matching `*.generated.*`, `*.snap`, files under `prisma/migrations/**`, `**/locales/**`, `**/__snapshots__/**`, and `**/*.svg` should appear in the `ignored` array, not `passed`.

### Test: files matching core ignore patterns are filtered

Files under `node_modules/**`, `dist/**`, `*.lock`, etc. (the core default patterns from config) should also be filtered out. The function receives these as a separate parameter and merges them.

### Test: files not matching any pattern pass through

A file like `src/components/Button.tsx` should appear in the `passed` array.

### Test: pattern merging -- analysis patterns combine with core patterns, no duplicates

When both `corePatterns` and `analysisPatterns` contain `**/*.svg`, the merged set should deduplicate. Verify by passing a file that matches the shared pattern -- it should be filtered exactly once (appears once in `ignored`, not twice).

### Test: empty file list returns empty passed and ignored arrays

Calling with an empty array of files should return `{ passed: [], ignored: [] }`.

### Test: ignored files produce FileScore entries with score 0, riskLevel "low", correct reason string

Each ignored file should produce a `FileScore` with `score: 0`, `riskLevel: "low"`, and `reasons` containing a string like `"Filtered by ignore pattern"`.

### Test: glob patterns handle nested paths correctly

A file at `prisma/migrations/001_init/migration.sql` should be caught by `prisma/migrations/**`. A file at `src/locales/en/common.json` should be caught by `**/locales/**`.

### Test helper setup

Create `PRFile`-shaped test objects using a minimal factory. Example:

```typescript
function makePRFile(path: string): PRFile {
  return { path, status: "modified", additions: 10, deletions: 5, patch: "..." };
}
```

## Implementation Details

### Analysis-Specific Default Patterns

These are the hardcoded patterns specific to the analysis layer (distinct from the core `DEFAULT_IGNORE_PATTERNS` in config/schema.ts):

```typescript
const ANALYSIS_IGNORE_PATTERNS = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "*.generated.*",
  "*.gen.*",
  "*.graphql",
  "prisma/migrations/**",
  "**/locales/**",
  "**/translations/**",
  "**/i18n/**",
  "**/*.svg",
  "**/__snapshots__/**",
  "**/*.snap",
];
```

Note: Core infrastructure already ignores `*.svg` in its `DEFAULT_IGNORE_PATTERNS`. The analysis patterns overlap intentionally -- the merge step deduplicates.

### Function Interface

```typescript
interface PatternFilterResult {
  passed: PRFile[];
  ignored: PRFile[];
  ignoredScores: FileScore[];
}

function filterChangedFiles(
  files: PRFile[],
  corePatterns: string[],
  analysisPatterns?: string[]
): PatternFilterResult
```

- `files`: The array of `PRFile` objects from `ContextOutput.pr.files`.
- `corePatterns`: The `ignorePatterns` from `CodeReviewConfig` (user-configured or defaults from core).
- `analysisPatterns`: Optional override. When omitted, uses `ANALYSIS_IGNORE_PATTERNS`. Exposed for testability and future configurability.

### Implementation Logic

1. **Merge patterns:** Combine `corePatterns` and `analysisPatterns` (defaulting to `ANALYSIS_IGNORE_PATTERNS`). Deduplicate using `Array.from(new Set([...corePatterns, ...analysisPatterns]))`.

2. **Call core `filterFiles()`:** Pass the merged patterns to `filterFiles(files, mergedPatterns, (f) => f.path)`. This returns only the files that did NOT match any pattern (the passed files).

3. **Compute ignored files:** The ignored set is the difference: files in the original array that are not in the passed set.

4. **Build `FileScore` entries for ignored files:** For each ignored file, create:
   ```typescript
   {
     path: file.path,
     score: 0,
     riskLevel: "low",
     reasons: ["Filtered by ignore pattern"],
   }
   ```

5. **Return** `{ passed, ignored, ignoredScores }`.

### Important Notes

- The `FileScoreSchema` in core allows `score: 0` (min is 0), so ignored file scores are valid. Score 0 is only assigned by the deterministic layer, never by the LLM (which uses 1-10).
- The core `filterFiles()` function handles the split between bare globs (matched with `matchBase: true`) and path globs automatically via picomatch. The pattern filter module does not need to handle this distinction.
- The `ANALYSIS_IGNORE_PATTERNS` constant should be exported for use in tests and potential future configuration.

### Export

The module should export:
- `filterChangedFiles` -- the main function
- `ANALYSIS_IGNORE_PATTERNS` -- the default pattern list (for testing and transparency)
- `PatternFilterResult` -- the return type

These should be re-exported through the barrel file at `03-analysis-agent/src/index.ts` (created in section 01).

## Implementation Notes

### Files Created/Modified
- `src/deterministic/pattern-filter.ts` — main implementation
- `tests/unit/pattern-filter.test.ts` — 9 tests, all passing
- `src/index.ts` — updated with barrel re-exports (added during code review)

### Deviations from Plan
- None. Implementation matches plan exactly.

### Code Review Fixes
- Added barrel re-exports for `filterChangedFiles`, `ANALYSIS_IGNORE_PATTERNS`, `PatternFilterResult` to `index.ts` (was missing in initial implementation)
- Added extra test for `__snapshots__` directory pattern with non-snap file to independently verify directory glob