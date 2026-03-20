# Section 06: Tech Stack Detector

## Overview

This section implements the `detectTechStack()` function in `02-context-agent/src/tech-stack.ts`. The function examines root-level manifest files in a repository (e.g., `package.json`, `go.mod`, `requirements.txt`) to derive the project's languages, frameworks, and dependencies. It returns a `TechStack` object conforming to the `TechStackSchema` defined in section-01.

## Dependencies

- **section-01-schema-extensions**: Provides `TechStackSchema` and the `TechStack` type (with fields `languages: string[]`, `frameworks: string[]`, `dependencies: Record<string, string>`).
- **section-02-github-client-extensions**: Provides the `getFileContent(owner, repo, path, ref?)` method on `GitHubClient`, which fetches and base64-decodes a single file's content, returning `string | null`.

Both dependencies must be implemented before this section can run end-to-end, but tests can be written immediately using mocks.

## Actual Files Created

- `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/context/tech-stack.ts`
- `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/context/tech-stack.test.ts`

**Deviation from plan:** Files placed in `01-core-infrastructure/src/context/` instead of `02-context-agent/src/` — same rationale as section 05 (no separate package infrastructure exists).

## Tests: 13 passing

---

## Tests (Write First)

Create the test file at `/home/andrew/code/scratchpad/code-review/02-context-agent/src/tech-stack.test.ts`. All tests use a mocked `GitHubClient` -- mock `getFileContent` to return appropriate content strings or `null`.

```typescript
// tech-stack.test.ts
// Import detectTechStack and any types needed
// Mock GitHubClient with a vi.fn() for getFileContent

// Test: detects Node.js/TypeScript from package.json presence
//   - filePaths includes "package.json"
//   - getFileContent returns a JSON string with dependencies and devDependencies
//   - Result languages should include "TypeScript" or "JavaScript"

// Test: parses package.json dependencies and devDependencies
//   - getFileContent returns JSON with { dependencies: { "express": "^4.18.0" }, devDependencies: { "vitest": "^1.0.0" } }
//   - Result dependencies record includes both "express" and "vitest" with their version strings

// Test: detects React framework from react dependency
//   - package.json dependencies include "react"
//   - Result frameworks should include "React"

// Test: detects Express framework from express dependency
//   - package.json dependencies include "express"
//   - Result frameworks should include "Express"

// Test: detects Next.js from next dependency
//   - package.json dependencies include "next"
//   - Result frameworks should include "Next.js"

// Test: detects Go from go.mod presence
//   - filePaths includes "go.mod"
//   - getFileContent returns a go.mod content string
//   - Result languages should include "Go"

// Test: detects Python from requirements.txt presence
//   - filePaths includes "requirements.txt"
//   - getFileContent returns "flask==2.0.0\nrequests>=2.28"
//   - Result languages should include "Python"

// Test: detects Rust from Cargo.toml presence
//   - filePaths includes "Cargo.toml"
//   - getFileContent returns a TOML string with [dependencies]
//   - Result languages should include "Rust"

// Test: returns empty languages/frameworks/dependencies when no manifests found
//   - filePaths contains only non-manifest files like ["src/index.ts", "README.md"]
//   - Result: { languages: [], frameworks: [], dependencies: {} }

// Test: skips manifests that fail to parse (logs warning)
//   - filePaths includes "package.json"
//   - getFileContent returns invalid JSON (e.g., "not json")
//   - Result should not throw, languages may still include the language, dependencies empty
//   - Logger warn should have been called

// Test: only checks root-level manifests (not nested in subdirectories)
//   - filePaths includes "packages/sub/package.json" but NOT "package.json"
//   - getFileContent should NOT be called for "packages/sub/package.json"
//   - Result should not detect Node.js from nested manifest

// Test: treats dependency versions as raw strings
//   - package.json with dependency version "^4.18.0"
//   - Result dependencies should contain the exact string "^4.18.0", no parsing

// Test: passes ref parameter to getFileContent calls
//   - Call detectTechStack with ref: "abc123"
//   - Verify getFileContent was called with ref "abc123"
```

---

## Implementation Details

### Function Signature

```typescript
export async function detectTechStack(options: {
  github: GitHubClient;
  owner: string;
  repo: string;
  ref?: string;
  filePaths: string[];
  logger?: Logger;
}): Promise<TechStack>
```

The `filePaths` parameter is the list of file paths in the repository (from `getRepoTree()` output). The function filters this list for known root-level manifest filenames, fetches their content, and parses them.

### Known Manifest Files

Define a mapping of root-level filenames to their language associations:

| Manifest File | Language(s) |
|---------------|-------------|
| `package.json` | JavaScript, TypeScript (if tsconfig.json also present or if typescript is a devDependency) |
| `go.mod` | Go |
| `requirements.txt` | Python |
| `pyproject.toml` | Python |
| `setup.py` | Python |
| `Cargo.toml` | Rust |
| `pom.xml` | Java |
| `build.gradle` | Java |
| `Gemfile` | Ruby |

### Root-Level Check

Only consider manifests at the repository root. A file path is root-level if it contains no `/` separator. For example, `package.json` is root-level but `packages/foo/package.json` is not. Filter `filePaths` accordingly before attempting to fetch any content.

### Parsing Logic by Manifest Type

**package.json:**
1. `JSON.parse()` the content.
2. Merge keys from `dependencies` and `devDependencies` into the output `dependencies` record (name to version string).
3. Add "JavaScript" to languages. If `typescript` appears in devDependencies, also add "TypeScript".
4. Check dependency names against a known framework map to populate `frameworks`:
   - `react` -> "React"
   - `vue` -> "Vue"
   - `express` -> "Express"
   - `next` -> "Next.js"
   - `@angular/core` -> "Angular"
   - `svelte` -> "Svelte"
   - `fastify` -> "Fastify"
   - `nestjs` or `@nestjs/core` -> "NestJS"

**go.mod:**
1. Parse lines matching `require` blocks or single `require` statements.
2. Extract module paths and versions as dependency entries.
3. Add "Go" to languages.

**requirements.txt:**
1. Parse each non-empty, non-comment line. Split on `==`, `>=`, `<=`, `~=`, `!=` to extract package name and version.
2. Add to dependencies. If no version specifier, use `"*"` as version.
3. Add "Python" to languages.
4. Check for known frameworks: `flask` -> "Flask", `django` -> "Django", `fastapi` -> "FastAPI".

**Cargo.toml:**
1. Parse TOML to extract `[dependencies]` section. A simple line-based parser is sufficient -- look for lines under `[dependencies]` with the format `name = "version"` or `name = { version = "..." }`.
2. Add "Rust" to languages.

**Other manifests (pom.xml, build.gradle, Gemfile):**
1. Add the language to the languages array.
2. Detailed dependency parsing for these is optional; a basic best-effort extraction is fine. If parsing is too complex, just detect the language presence.

### Error Handling

- If `getFileContent` returns `null` for a manifest (file not found despite being in the tree), skip it silently.
- If parsing a manifest throws (malformed JSON, unexpected format), log a warning via the logger and continue processing other manifests. Do not throw.
- If no manifests are found at all, return `{ languages: [], frameworks: [], dependencies: {} }`.

### Return Value

Return an object matching `TechStackSchema`:

```typescript
{
  languages: string[];    // Deduplicated list of detected languages
  frameworks: string[];   // Deduplicated list of detected frameworks
  dependencies: Record<string, string>;  // Package name -> version string
}
```

Ensure `languages` and `frameworks` are deduplicated (use `Set` or `Array.from(new Set(...))`) since multiple manifests could indicate the same language.

---

## Integration Point

This function is called from the Context Agent's repo mode `run()` method (section-08). It receives the file tree from `getRepoTree()` as `filePaths` and the result is placed into `ContextOutput.techStack`. It is not used in PR mode.