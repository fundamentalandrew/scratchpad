I now have all the context needed. Let me produce the section content.

# Section 03: AST Analyzer

## Overview

This section implements the Tree-sitter parser initialization and file parsing module for the Analysis Agent. The AST analyzer is responsible for parsing TypeScript and JavaScript source files into syntax trees that the AST classifier (section 04) will compare. It provides two core capabilities: parsing source code into Tree-sitter `Tree` objects, and detecting whether a given file path is a supported language.

This module lives at `03-analysis-agent/src/deterministic/ast-analyzer.ts`.

## Dependencies

- **Section 01 (Foundation):** Project scaffolding must be in place, including `package.json` with `tree-sitter`, `tree-sitter-typescript`, and `tree-sitter-javascript` dependencies, `tsconfig.json`, `vitest.config.ts`, and the directory structure under `03-analysis-agent/src/deterministic/`.
- **Core Infrastructure (`01-core-infrastructure`):** No direct imports needed for this module. The AST analyzer is a standalone utility that takes raw source strings and returns Tree-sitter trees.

## npm Dependencies Required

These must be listed in `03-analysis-agent/package.json` (set up by section 01):

- `tree-sitter` -- native AST parser (C bindings via node-gyp)
- `tree-sitter-typescript` -- provides both TypeScript and TSX grammars
- `tree-sitter-javascript` -- provides JavaScript grammar

## File Paths

- **Implementation:** `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/deterministic/ast-analyzer.ts`
- **Tests:** `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/ast-analyzer.test.ts`

## Tests (Write First)

The test file `ast-analyzer.test.ts` should cover the following cases. Tests should import `parseFile` and `isSupportedLanguage` from the implementation module.

### `ast-analyzer.test.ts`

```typescript
/**
 * Tests for ast-analyzer.ts
 *
 * Test cases:
 *
 * 1. parseFile returns a valid Tree for TypeScript source
 *    - Pass a simple TS snippet (e.g., `const x: number = 1;`)
 *    - Assert the returned object has a rootNode property
 *    - Assert rootNode.type is "program"
 *
 * 2. parseFile returns a valid Tree for JavaScript source
 *    - Pass a simple JS snippet (e.g., `const x = 1;`)
 *    - Assert rootNode exists and rootNode.type is "program"
 *
 * 3. isSupportedLanguage returns true for supported extensions
 *    - Test each of: .ts, .tsx, .js, .jsx, .mjs, .cjs
 *    - All should return true
 *
 * 4. isSupportedLanguage returns false for unsupported extensions
 *    - Test each of: .py, .go, .css, .json, .md, .rs, .html
 *    - All should return false
 *
 * 5. parseFile handles empty source string without throwing
 *    - Pass "" as source with language "typescript"
 *    - Should return a Tree (not throw)
 *    - rootNode should still have type "program"
 *
 * 6. parseFile handles syntactically invalid source
 *    - Pass malformed code (e.g., `const = = = ;`)
 *    - Should return a Tree (tree-sitter is error-tolerant)
 *    - The tree will contain ERROR or MISSING nodes -- assert rootNode exists
 *
 * 7. Parser initialization is lazy
 *    - Import the module; no grammar should be loaded until parseFile is called
 *    - This is a design constraint verified by the implementation structure
 *      (parsers stored as null, initialized on first use)
 *    - Can be tested by verifying that calling isSupportedLanguage does NOT
 *      trigger parser creation (no side effects)
 */
```

## Implementation Details

### Interface

The module exports two functions:

```typescript
function parseFile(source: string, language: "typescript" | "javascript"): Tree

function isSupportedLanguage(filePath: string): boolean
```

Where `Tree` is the `tree-sitter` Tree type (from the `tree-sitter` package).

### Language Detection (`isSupportedLanguage`)

Maps file extensions to supported languages:

- `.ts`, `.tsx` maps to `"typescript"`
- `.js`, `.jsx`, `.mjs`, `.cjs` maps to `"javascript"`

The function extracts the extension from the file path and checks membership. It should handle paths with multiple dots (e.g., `foo.test.ts` should match `.ts`). Return `false` for any extension not in the map.

A helper function `detectLanguage(filePath: string): "typescript" | "javascript" | null` is useful internally and may be exported for use by the AST classifier in section 04.

### Parser Initialization (Lazy Loading)

Tree-sitter parsers are expensive to initialize. The module should use lazy initialization:

- Maintain module-level variables for the TypeScript and JavaScript parsers, initially `null`.
- On the first call to `parseFile` for a given language, create a `Parser` instance, load the appropriate grammar, and cache it.
- Subsequent calls reuse the cached parser.

The `tree-sitter` library API for initialization:

```typescript
import Parser from "tree-sitter";
// tree-sitter-typescript exports .typescript and .tsx
import TypeScript from "tree-sitter-typescript";
// tree-sitter-javascript exports the grammar directly
import JavaScript from "tree-sitter-javascript";

const parser = new Parser();
parser.setLanguage(TypeScript.typescript); // for .ts files
// or
parser.setLanguage(JavaScript);            // for .js files
```

Note: `tree-sitter-typescript` exports an object with `.typescript` and `.tsx` properties. For simplicity in v1, use `.typescript` for both `.ts` and `.tsx` files (the TypeScript grammar handles TSX syntax). If TSX-specific parsing is needed later, this can be split.

### `parseFile` Behavior

1. Look up the cached parser for the given language. If not initialized, create and cache it.
2. Call `parser.parse(source)` which returns a `Tree`.
3. Return the `Tree` directly.

Tree-sitter is error-tolerant: it always returns a tree, even for syntactically invalid input. The tree may contain `ERROR` or `MISSING` nodes, but it will not throw. This means `parseFile` should not need try/catch around the parse call itself, though wrapping for unexpected errors (e.g., grammar loading failure) is reasonable.

### Error Handling

- If grammar loading fails (e.g., native bindings not compiled), throw a descriptive error at initialization time. This is a hard dependency -- the module cannot function without the native grammars.
- The caller (AST classifier and orchestrator) is responsible for catching parse errors and falling back to LLM scoring for that file.

### Module Structure

The implementation should be straightforward -- approximately 40-60 lines of code. No classes needed; module-level state for cached parsers with exported functions is sufficient.

## Design Notes

- **Why native tree-sitter and not WASM:** The plan specifies native bindings for speed. This is a CLI tool, not a browser app, so node-gyp compilation is acceptable. The project already has native dependencies.
- **TSX handling:** Using the TypeScript grammar for `.tsx` files. The tree-sitter TypeScript grammar supports JSX syntax natively.
- **No content reconstruction:** The analyzer does NOT attempt to reconstruct file content from unified diffs. It requires full before/after source strings, which come from the Context Agent's `PRFile` data (or will be fetched separately). This boundary is enforced at the orchestration layer (section 08), not here.
- **Scope boundary:** This module only parses. It does not compare trees or classify changes -- that is section 04 (AST classifier). The analyzer's job is to turn source strings into Tree-sitter trees reliably.