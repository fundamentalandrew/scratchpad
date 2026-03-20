Now I have all the context needed. Let me generate the section content.

# Section 04: Issue Parser

## Overview

This section implements `parseClosingReferences()`, a pure function that extracts GitHub closing-reference issue numbers from a PR description body. It lives in `02-context-agent/src/issue-parser.ts` with co-located tests in `02-context-agent/src/issue-parser.test.ts`.

The issue parser is a utility consumed by the Context Agent's PR mode (section-07). It has no runtime dependencies on other modules -- it is a standalone string-parsing function.

## Dependencies

- **section-01-schema-extensions**: Defines `ReferencedIssueSchema` with fields `number`, `title`, `state`, `body?`, `owner?`, `repo?`. The issue parser does NOT use the schema directly -- it returns plain objects with `{ owner?, repo?, number }` which are later enriched by fetching from the GitHub API. The parser output is a subset: it only extracts the reference coordinates, not the issue content.

No npm dependencies are required beyond what the project already has. The implementation is pure regex-based string parsing.

## File Paths

- **Create:** `/home/andrew/code/scratchpad/code-review/02-context-agent/src/issue-parser.ts`
- **Create:** `/home/andrew/code/scratchpad/code-review/02-context-agent/src/issue-parser.test.ts`

## Tests (Write First)

All tests go in `/home/andrew/code/scratchpad/code-review/02-context-agent/src/issue-parser.test.ts`.

Use Vitest. Import the function under test:

```typescript
import { parseClosingReferences } from "./issue-parser";
```

### Test cases to implement

```typescript
// --- Basic keyword recognition ---
// Test: parses "fixes #123" → [{ number: 123 }]
// Test: parses "closes #123" → [{ number: 123 }]
// Test: parses "resolves #123" → [{ number: 123 }]

// --- Past-tense keywords ---
// Test: parses past tense "fixed #123", "closed #123", "resolved #123"

// --- Case insensitivity ---
// Test: case-insensitive "FIXES #123", "Closes #123"

// --- Punctuation variants ---
// Test: parses colon variant "fixes: #123"
// Test: parses parenthesized "fixes (#123)"

// --- Multiple issues ---
// Test: parses multiple issues "fixes #1, #2, #3"

// --- Cross-repo references ---
// Test: parses cross-repo "fixes owner/repo#123" → [{ owner: "owner", repo: "repo", number: 123 }]

// --- URL references ---
// Test: parses full URL "fixes https://github.com/owner/repo/issues/123"

// --- Deduplication ---
// Test: deduplicates repeated issue numbers

// --- Empty / no-match cases ---
// Test: returns empty array for body with no closing references
// Test: returns empty array for null/empty body

// --- Code block exclusion ---
// Test: skips references inside inline code blocks
// Test: skips references inside fenced code blocks

// --- Mixed references ---
// Test: handles body with mix of same-repo and cross-repo refs
```

Each test should call `parseClosingReferences(bodyString)` and assert on the returned array contents. For deduplication tests, verify the array length equals the number of unique references.

### Example test structure

```typescript
describe("parseClosingReferences", () => {
  it("parses 'fixes #123'", () => {
    const result = parseClosingReferences("fixes #123");
    expect(result).toEqual([{ number: 123 }]);
  });

  it("returns empty array for null body", () => {
    const result = parseClosingReferences(null as unknown as string);
    // Also handle undefined and empty string
    expect(result).toEqual([]);
  });

  it("skips references inside fenced code blocks", () => {
    const body = "Some text\n```\nfixes #999\n```\nfixes #1";
    const result = parseClosingReferences(body);
    expect(result).toEqual([{ number: 1 }]);
  });
});
```

## Implementation Details

### Function Signature

```typescript
export function parseClosingReferences(
  body: string
): Array<{ owner?: string; repo?: string; number: number }>
```

### Return Type

Each element in the returned array has:
- `number` (number) -- always present, the issue number
- `owner` (string, optional) -- present only for cross-repo references
- `repo` (string, optional) -- present only for cross-repo references

### Algorithm

1. **Guard clause**: If `body` is falsy (null, undefined, empty string), return `[]`.

2. **Strip code blocks**: Before scanning for references, remove content inside fenced code blocks (triple-backtick regions) and inline code (single-backtick spans). Replace them with empty strings or whitespace so that issue references inside code are not matched. A simple approach:
   - First, remove fenced code blocks: replace matches of `` /```[\s\S]*?```/ `` with empty string.
   - Then, remove inline code: replace matches of `` /`[^`]+`/ `` with empty string.

3. **Define the keyword pattern**: The closing keywords are: `close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`, `resolves`, `resolved`. Build a regex group: `(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)`.

4. **Match references**: Use a regex that captures the keyword followed by optional punctuation (`:`, `(`, whitespace) and then one or more issue references. Each reference can be one of three forms:
   - **Same-repo**: `#(\d+)`
   - **Cross-repo**: `([\w.-]+)\/([\w.-]+)#(\d+)`
   - **URL**: `https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)`

   After a keyword match, continue scanning for comma-separated additional `#N` references (e.g., `fixes #1, #2, #3`).

5. **Deduplicate**: Track seen references by a composite key (`owner/repo#number` or just `#number`). Only add unique entries to the result array.

6. **Return** the deduplicated array.

### Regex Strategy

Rather than one monolithic regex, consider a two-phase approach:

- **Phase 1**: Find keyword positions using a simple regex like `/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*[:(\s]/gi`. For each match, extract the substring following the keyword.
- **Phase 2**: From that substring, greedily extract issue references (same-repo `#N`, cross-repo `owner/repo#N`, or URL form), allowing comma separators between them.

This is more readable and easier to maintain than a single complex regex.

### Edge Cases

- **Colon variant** (`fixes: #123`): The optional `:` after the keyword must be consumed.
- **Parenthesized** (`fixes (#123)`): The optional `(` must be consumed, and a trailing `)` should not break parsing.
- **Multiple after one keyword** (`fixes #1, #2, #3`): After the first reference, continue matching `,\s*#(\d+)` patterns.
- **Mixed in one body**: A single PR description may contain both same-repo and cross-repo references across multiple lines. Each keyword-reference group is parsed independently.
- **No keyword, bare `#123`**: This should NOT be matched. Only references preceded by a closing keyword are extracted.
- **References in URLs without keyword**: A bare `https://github.com/owner/repo/issues/123` without a closing keyword should NOT be matched.

## How This Module Is Used

The Context Agent's PR mode (section-07) calls `parseClosingReferences(prDescription)` to get the list of issue coordinates. It then passes same-repo numbers and cross-repo refs to `github.getReferencedIssues()` (from section-02) to fetch full issue details (title, state, body). The fetched issues are stored in `ContextOutput.referencedIssues`.