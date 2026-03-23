Now I have enough context to write the section. Here is the output:

# Section 04: AST Classifier

## Overview

This section implements AST-based change classification and subtree hashing for move detection. Given two parsed Tree-sitter syntax trees (before and after a change), the classifier determines the nature of the change: format-only, rename-only, moved-function, or structural. Changes classified as non-structural with high confidence (>= 0.9) are auto-scored as low-risk, avoiding unnecessary LLM API calls.

This section produces two files:
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/deterministic/ast-classifier.ts`
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/deterministic/subtree-hash.ts`

And two test files:
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/ast-classifier.test.ts`
- `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/subtree-hash.test.ts`

## Dependencies

- **section-01-foundation**: Provides project scaffolding, `tsconfig.json`, `vitest.config.ts`, `package.json` with `tree-sitter` dependencies, and internal types in `src/deterministic/types.ts` (including `ClassificationResult`).
- **section-03-ast-analyzer**: Provides `parseFile()` and `isSupportedLanguage()` functions. The classifier receives already-parsed `Tree` objects from tree-sitter, so it depends on the analyzer having been implemented. The `Tree` and `SyntaxNode` types come from the `tree-sitter` package directly.

## Types

The classifier uses these types (defined in section-01-foundation's `src/deterministic/types.ts`):

```typescript
type ClassificationResult = {
  changeType: "format-only" | "rename-only" | "moved-function" | "structural"
  confidence: number  // 0-1
  details: string     // human-readable explanation
}

type FunctionInfo = {
  name: string
  hash: string
  startLine: number
  endLine: number
}
```

The `Tree` and `SyntaxNode` types are imported from the `tree-sitter` npm package.

## Tests First

### `subtree-hash.test.ts`

File: `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/subtree-hash.test.ts`

This test file requires real Tree-sitter parsing to produce `SyntaxNode` objects. Use the `parseFile` function from section-03's `ast-analyzer.ts` to create trees from source strings, then pass nodes to the hashing functions.

Test cases:

- **Identical function bodies produce identical hashes**: Parse two identical function declarations. Call `hashSubtree` on each function node. Hashes must be equal.
- **Renamed function (different name, same body) produces identical hash**: Parse `function foo() { return 1; }` and `function bar() { return 1; }`. Hashes must be equal because identifier text is excluded from hashing.
- **Different function bodies produce different hashes**: Parse `function foo() { return 1; }` and `function foo() { return 2; }`. Hashes must differ because literal values are included.
- **Literal value changes produce different hashes**: Specifically test `return 0` vs `return 1` in otherwise identical functions.
- **`extractFunctionHashes` finds all top-level function declarations**: Parse source with multiple top-level functions. Result map should contain an entry for each.
- **`extractFunctionHashes` finds method declarations in classes**: Parse a class with methods. Each method should appear in the result.
- **`extractFunctionHashes` includes name, hash, and line range for each function**: Verify all three fields are present and reasonable.
- **Hash is stable**: Call `hashSubtree` twice on the same node. Results must be identical.

### `ast-classifier.test.ts`

File: `/home/andrew/code/scratchpad/code-review/03-analysis-agent/tests/unit/ast-classifier.test.ts`

Each test parses before/after TypeScript source strings using `parseFile`, then calls `classifyChange(beforeTree, afterTree)`.

Test cases:

- **Format-only -- whitespace changes**: Before has compact formatting, after has expanded formatting (added newlines, indentation changes). Same code logic. Result: `changeType: "format-only"`, confidence >= 0.9.
- **Format-only -- comment changes**: Before has no comments, after adds comments but code is identical. Result: `changeType: "format-only"`. Note: Tree-sitter includes comment nodes, so the classifier must either ignore comment nodes during comparison or treat comment-only differences as format-only.
- **Rename-only -- single variable renamed consistently**: All occurrences of `fetchData` become `getData`. Result: `changeType: "rename-only"`, confidence >= 0.9.
- **Rename-only -- multiple variables renamed with consistent mappings**: `foo` becomes `bar` and `baz` becomes `qux` throughout. Each old name maps to exactly one new name. Result: `changeType: "rename-only"`.
- **Rename-only rejected -- inconsistent rename mapping**: Same old name `x` maps to `y` in one place and `z` in another. Result: `changeType: "structural"`.
- **Moved function**: A top-level function appears at a different position in the file but body is unchanged. Result: `changeType: "moved-function"`.
- **Structural -- logic change**: An operator changes (e.g., `>` to `>=`) or a condition is added. Result: `changeType: "structural"`.
- **Structural -- new function added**: After tree has a function that does not exist in before tree. Result: `changeType: "structural"`.
- **Structural -- function body changed**: Same function name but different body logic. Result: `changeType: "structural"`.
- **Confidence threshold -- high confidence auto-classifies**: A clear format-only change returns confidence >= 0.9.
- **Confidence threshold -- low confidence falls through**: Design a case where classification is ambiguous (e.g., whitespace changes combined with a subtle structural difference that the classifier is uncertain about). Confidence should be < 0.9, and such files would proceed to LLM scoring in the orchestration layer.

## Implementation Details

### Subtree Hash (`subtree-hash.ts`)

File: `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/deterministic/subtree-hash.ts`

**Exports:**

```typescript
function hashSubtree(node: SyntaxNode): string
function extractFunctionHashes(tree: Tree): Map<string, FunctionInfo>
```

**`hashSubtree` algorithm:**

1. Start with `node.type` as the base string.
2. For identifier nodes: use only the node type (`"identifier"`), not the text. This makes renamed symbols produce the same hash.
3. For literal/number/string nodes: include the text value. This ensures `return 0` and `return 1` produce different hashes.
4. Recursively hash all named children (skip anonymous nodes like punctuation to reduce noise).
5. Concatenate: `nodeType(child1Hash, child2Hash, ...)`.
6. Apply a fast hash function (e.g., a simple string hash or use Node's `crypto.createHash('sha256')`) to the concatenated string. The choice of hash does not matter much since collisions at this scale are negligible; a deterministic string hash suffices.

**`extractFunctionHashes` algorithm:**

1. Walk the root node's children (top-level declarations only for top-level functions).
2. For each child, check if its type is one of: `function_declaration`, `lexical_declaration` (arrow functions assigned to const), `export_statement` wrapping a function, `method_definition`, `class_declaration` (recurse into class body for methods).
3. For function-like nodes, extract:
   - `name`: the identifier child's text
   - `hash`: `hashSubtree(node)` called on the function body (not including the name, so renames match)
   - `startLine`: `node.startPosition.row`
   - `endLine`: `node.endPosition.row`
4. Return a `Map<string, FunctionInfo>` keyed by function name.

**Important subtlety for hashing function bodies vs whole declarations:** When comparing moved functions, hash only the function body subtree (not the declaration wrapper with its name). This way `function foo() { ... }` and `function bar() { ... }` with the same body produce the same body hash, enabling move detection even when a function is renamed during the move.

### AST Classifier (`ast-classifier.ts`)

File: `/home/andrew/code/scratchpad/code-review/03-analysis-agent/src/deterministic/ast-classifier.ts`

**Exports:**

```typescript
function classifyChange(before: Tree, after: Tree): ClassificationResult
```

**Classification pipeline (checked in order, first match wins):**

1. **Check for format-only changes:**
   - Walk both trees in parallel using a recursive comparison function.
   - At each node pair, compare `node.type` and `node.namedChildCount`.
   - Skip comment nodes (type `"comment"` or `"block_comment"`) in both trees during comparison. This means added/removed comments are treated as format-only.
   - For leaf nodes (no named children), compare the node text. If all text matches, structure is identical.
   - If the entire tree comparison shows structural identity with identical leaf text, return `{ changeType: "format-only", confidence: 1.0, details: "Only whitespace/formatting changes detected" }`.

2. **Check for rename-only changes:**
   - If the tree structures are identical (same node types, same child counts) but some identifier leaf texts differ:
   - Collect all `(oldText, newText)` pairs where identifier nodes differ.
   - Check consistency: each `oldText` maps to exactly one `newText`, and each `newText` maps to exactly one `oldText` (bijective mapping).
   - If consistent, return `{ changeType: "rename-only", confidence: 0.95, details: "Consistent renames: foo→bar, baz→qux" }`.
   - If inconsistent (same old name maps to multiple new names), fall through to structural.

3. **Check for moved-function changes:**
   - Use `extractFunctionHashes` on both before and after trees.
   - Compare the hash sets. If every function hash in the before tree exists in the after tree (and vice versa), but the order or position differs, this is a move.
   - Also check that no new hashes appeared and none disappeared. If hashes only moved, return `{ changeType: "moved-function", confidence: 0.9, details: "Functions reordered: foo moved from line X to line Y" }`.
   - If some hashes are new or missing, this is a structural change (function added/removed/modified).

4. **Fallback to structural:**
   - If none of the above matched, return `{ changeType: "structural", confidence: 1.0, details: "Structural code changes detected" }`.

**Comment handling detail:** Tree-sitter's TypeScript grammar includes `comment` nodes in the tree. The parallel walk must filter these out. One approach: when collecting named children for comparison, skip any child whose type is `"comment"`. This way, adding or removing comments does not break structural comparison.

**Confidence values:**
- Format-only with perfect match: 1.0
- Rename-only with bijective mapping: 0.95
- Moved-function with all hashes matching: 0.9
- Structural: 1.0 (it is always confident that something structural changed)

The 0.9 threshold matters for the orchestration layer (section-08): files classified with confidence >= 0.9 are auto-scored as low-risk (score 1-2). Files below 0.9 are sent to LLM scoring. With the values above, all three non-structural classifications meet the threshold, but the confidence system exists so that future, more nuanced heuristics can express uncertainty.

## Implementation Notes

- **Files created:** `src/deterministic/ast-classifier.ts`, `src/deterministic/subtree-hash.ts`, `src/deterministic/shared-constants.ts`, `tests/unit/ast-classifier.test.ts` (14 tests), `tests/unit/subtree-hash.test.ts` (9 tests). Total: 23 tests.
- **Deviations from plan:**
  - Added `shared-constants.ts` to deduplicate `IDENTIFIER_TYPES` between classifier and hasher.
  - Added `getOperatorTokens` comparison in parallel tree walk to detect operator changes (e.g., `>` vs `>=`) which tree-sitter represents as anonymous tokens not visible to named-children-only traversal.
  - Added explicit empty file edge case handling at start of `classifyChange`.
  - Added arrow function (`lexical_declaration`) support in `extractFunctionHashes`.
- **Confidence values match plan:** format-only=1.0, rename-only=0.95, moved-function=0.9, structural=1.0.

## Edge Cases

- **Empty files**: If before or after is an empty source string, Tree-sitter produces a tree with just a root node and no children. An empty-to-non-empty change is structural (new code added). A non-empty-to-empty change is structural (all code removed). Empty-to-empty is format-only.
- **Parse errors**: If Tree-sitter produces error nodes in the tree (syntactically invalid source), the classifier should fall back to structural. Check for error nodes by walking the tree and looking for `node.type === "ERROR"`. If any error nodes exist in either tree, return structural with a detail noting parse errors.
- **Very large files**: The tree walk is O(n) in AST node count. For typical source files (< 10,000 lines), this completes in milliseconds. No special handling needed.
- **Mixed changes**: A file that has both formatting changes and a logic change should be classified as structural. The pipeline checks format-only first, and since the logic change breaks structural identity, it falls through correctly.