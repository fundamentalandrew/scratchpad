Now I have all the context I need. Let me produce the section content.

# Section 03: File Filter Module

## Overview

This section implements `filterFiles()` in `02-context-agent/src/file-filter.ts` — a generic utility that applies glob-based ignore patterns to file lists using `picomatch`. It is called by the Context Agent in both PR mode and repo mode to remove noise (node_modules, dist, lock files, images, etc.) before passing file data to downstream agents.

## Dependencies

- **Section 01 (Schema Extensions):** The `PRFileSchema` type defines the shape of PR file objects that this filter operates on. The filter itself is generic and does not import schemas directly, but the Context Agent will pass PR file objects through it.
- **picomatch:** Already a dependency of `01-core-infrastructure` (`picomatch@^4.0.3` with `@types/picomatch@^4.0.2`). Since `02-context-agent` will live in the same package (or import from it), picomatch is available.

## Files Created

`/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/utils/file-filter.ts`
`/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/utils/file-filter.test.ts`

**Deviation from plan:** Files placed in `01-core-infrastructure/src/utils/` (not `02-context-agent/src/`) because the project is a single package. Consistent with existing utils like `logger.ts` and `errors.ts`.

**Implementation notes:**
- Pattern splitting: bare globs (no `/`) use `matchBase: true`, path globs use default mode, to work around picomatch limitation where `matchBase` breaks directory-anchored patterns like `dist/**`.
- JSDoc comment added per code review to document the non-obvious splitting heuristic.
- 10 tests total, including nested matchBase verification.

## Tests (Write First)

Create the test file `file-filter.test.ts` co-located with the source. All tests use Vitest.

```typescript
import { describe, it, expect } from "vitest";
import { filterFiles } from "./file-filter";

describe("filterFiles", () => {
  // Test: filters out files matching a single glob pattern (e.g., "node_modules/**")
  // Test: filters out files matching multiple patterns
  // Test: keeps files that don't match any pattern
  // Test: works with PR file objects (uses getPath accessor)
  // Test: works with simple path strings
  // Test: handles empty file list (returns empty)
  // Test: handles empty pattern list (returns all files)
  // Test: matches nested paths correctly (e.g., "dist/**" matches "dist/index.js")
  // Test: does not match partial directory names (e.g., "dist/**" should NOT match "redistribution/file.js")
});
```

### Test Details

**Single glob pattern:** Pass files like `["node_modules/foo/bar.js", "src/index.ts", "node_modules/baz/qux.js"]` with pattern `["node_modules/**"]`. Expect only `["src/index.ts"]` returned.

**Multiple patterns:** Use patterns `["node_modules/**", "*.lock", "dist/**"]` against a mix of matching and non-matching files. Verify all matching files are removed.

**Keeps non-matching files:** Given patterns that target specific directories, files in `src/`, `lib/`, etc. should pass through unchanged.

**PR file objects with getPath accessor:** Create objects shaped like `{ path: string; status: string; additions: number; deletions: number }` and pass a `getPath` function `(f) => f.path`. Verify the full objects are returned (not just paths).

**Simple path strings:** Pass `string[]` directly with `getPath` as `(f) => f`. Verify correct filtering.

**Empty file list:** `filterFiles([], ["node_modules/**"], (f) => f)` returns `[]`.

**Empty pattern list:** `filterFiles(["src/a.ts", "src/b.ts"], [], (f) => f)` returns all files.

**Nested path matching:** Pattern `"dist/**"` should match `"dist/index.js"` and `"dist/sub/deep.js"`.

**No partial directory match:** Pattern `"dist/**"` must NOT match `"redistribution/file.js"`. This verifies picomatch is configured correctly (no partial matching on directory prefixes).

## Implementation

### Function Signature

```typescript
export function filterFiles<T>(
  files: T[],
  patterns: string[],
  getPath: (file: T) => string
): T[]
```

### Behavior

1. If `patterns` is empty, return `files` unchanged (no filtering needed).
2. Use `picomatch` to compile all patterns into a single matcher. Use `picomatch(patterns)` which returns a function that returns `true` if the input matches ANY of the patterns.
3. Iterate over `files`. For each file, extract the path via `getPath(file)`. If the matcher returns `true` for that path, exclude the file. Otherwise, keep it.
4. Return the filtered array.

### picomatch Configuration

Use default picomatch options. The key behaviors to verify:
- `picomatch(patterns)` accepts an array and matches if ANY pattern matches.
- Glob `**` matches nested directories.
- Patterns like `"dist/**"` only match paths starting with `dist/`, not paths containing `dist` as a substring of another directory name (picomatch handles this correctly by default).
- Patterns like `"*.lock"` match files at any level (picomatch's default `matchBase` behavior may need to be checked — if `*.lock` only matches at root level, consider using `**/*.lock` in the default patterns or setting `{ matchBase: true }`).

### Important Note on matchBase

The default ignore patterns from the config schema (in `01-core-infrastructure/src/config/schema.ts`) include patterns like `"*.lock"` and `"*.min.*"`. By default, picomatch does NOT match these against nested paths — `"*.lock"` would only match `"package.lock"` but not `"subdir/package.lock"`.

To handle this correctly, either:
- Set `{ matchBase: true }` in picomatch options so bare globs match the basename, OR
- Ensure the default config patterns use `**/*.lock` form instead.

Since the config patterns are defined in section 01 and already use `"*.lock"` form, the `filterFiles` function should use `{ matchBase: true }` to match user expectations. Alternatively, check picomatch behavior and document the convention clearly.

### Export

Export `filterFiles` from the module's `index.ts` so it is available for the Context Agent and for testing.

## Usage Context

The Context Agent calls `filterFiles` in two places:

1. **PR mode:** After `github.getPRFiles()` returns an array of file objects with `{ path, status, additions, deletions, patch }`, call `filterFiles(files, config.ignorePatterns, (f) => f.path)` to remove ignored files before including them in `ContextOutput.pr.files`.

2. **Repo mode:** After `github.getRepoTree()` returns an array of `{ path }` objects, call `filterFiles(files, config.ignorePatterns, (f) => f.path)` to remove ignored files before including them in `ContextOutput.repoFiles`.