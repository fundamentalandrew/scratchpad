# TDD Plan: 02-Context Agent (Agent A)

Testing framework: **Vitest** (existing project convention)
Mocking: **vi.mock()** for external dependencies
Test location: Co-located with source files (`*.test.ts`)
Run command: `npm test`

---

## 2. Schema Extensions (01-core-infrastructure)

### Tests to write BEFORE modifying schemas

```typescript
// Test: ReferencedIssueSchema validates a complete issue with all fields
// Test: ReferencedIssueSchema validates a same-repo issue (no owner/repo)
// Test: ReferencedIssueSchema rejects missing required fields (number, title, state)

// Test: ReviewCommentSchema validates a complete comment with all fields
// Test: ReviewCommentSchema validates a comment without optional path/line
// Test: ReviewCommentSchema requires id field

// Test: TechStackSchema validates with populated arrays and dependencies
// Test: TechStackSchema validates with empty arrays and empty dependencies record

// Test: PRFileSchema accepts previousPath for renamed files
// Test: PRFileSchema works without previousPath (backward compat)

// Test: ContextOutputSchema accepts referencedIssues, comments, techStack
// Test: ContextOutputSchema validates without new optional fields (backward compat)
// Test: ContextOutputSchema still requires either pr or repoFiles
// Test: StubContextAgent output passes ContextOutputSchema validation (existing test, verify still passes)
```

---

## 3. GitHubClient Extensions (01-core-infrastructure)

### Tests to write BEFORE implementing new methods

```typescript
// --- getReferencedIssues ---
// Test: fetches same-repo issues by number, returns { number, title, state, body }
// Test: fetches cross-repo issues using provided owner/repo
// Test: skips issues that return 404 (logs warning, returns remaining)
// Test: skips issues that return 403 (logs warning, returns remaining)
// Test: returns empty array when given empty issue list

// --- getReviewComments ---
// Test: fetches and maps review comments (id, author, body, path, line, createdAt)
// Test: paginates correctly (mock multi-page response)
// Test: handles comments without path/line (non-inline comments)
// Test: returns empty array on 403 (insufficient permissions)
// Test: returns empty array when no comments exist

// --- getFileContent ---
// Test: fetches and base64-decodes file content
// Test: returns null for 404 (file not found)
// Test: returns null when response is array (directory)
// Test: returns null for symlink/submodule type responses
// Test: returns null and logs warning for sensitive file paths (.env, .pem, .key)
// Test: passes ref parameter when provided
// Test: throws GitHubAPIError for non-404 errors (500, network)

// --- getPR (extended) ---
// Test: returns headSha and baseSha alongside existing fields
```

---

## 5. File Filtering Module

### Tests to write BEFORE implementing filterFiles

```typescript
// Test: filters out files matching a single glob pattern (e.g., "node_modules/**")
// Test: filters out files matching multiple patterns
// Test: keeps files that don't match any pattern
// Test: works with PR file objects (uses getPath accessor)
// Test: works with simple path strings
// Test: handles empty file list (returns empty)
// Test: handles empty pattern list (returns all files)
// Test: matches nested paths correctly (e.g., "dist/**" matches "dist/index.js")
// Test: does not match partial directory names (e.g., "dist/**" should NOT match "redistribution/file.js")
```

---

## 6. Domain Rules Loader

### Tests to write BEFORE implementing loadDomainRules

```typescript
// Test: loads domain rules from config.domainRulesPath when found
// Test: falls back to DOMAIN_RULES.md when config path not found
// Test: falls back to .github/DOMAIN_RULES.md when root not found
// Test: falls back to docs/DOMAIN_RULES.md when .github not found
// Test: returns null when no domain rules file found anywhere

// Test: loads architecture doc from config.architecturePath when found
// Test: falls back to ARCHITECTURE.md when config path not found
// Test: falls back to .github/ARCHITECTURE.md when root not found
// Test: falls back to docs/architecture.md when .github not found
// Test: returns null when no architecture doc found anywhere

// Test: loads both domain rules and architecture doc independently
// Test: returns both null when neither found
// Test: passes ref parameter to getFileContent calls
// Test: propagates non-404 errors (fail fast)
```

---

## 7. Issue Parser

### Tests to write BEFORE implementing parseClosingReferences

```typescript
// Test: parses "fixes #123" → [{ number: 123 }]
// Test: parses "closes #123" → [{ number: 123 }]
// Test: parses "resolves #123" → [{ number: 123 }]
// Test: parses past tense "fixed #123", "closed #123", "resolved #123"
// Test: case-insensitive "FIXES #123", "Closes #123"

// Test: parses colon variant "fixes: #123"
// Test: parses parenthesized "fixes (#123)"
// Test: parses multiple issues "fixes #1, #2, #3"

// Test: parses cross-repo "fixes owner/repo#123" → [{ owner: "owner", repo: "repo", number: 123 }]
// Test: parses full URL "fixes https://github.com/owner/repo/issues/123"

// Test: deduplicates repeated issue numbers
// Test: returns empty array for body with no closing references
// Test: returns empty array for null/empty body
// Test: skips references inside inline code blocks
// Test: skips references inside fenced code blocks
// Test: handles body with mix of same-repo and cross-repo refs
```

---

## 8. Tech Stack Detector

### Tests to write BEFORE implementing detectTechStack

```typescript
// Test: detects Node.js/TypeScript from package.json presence
// Test: parses package.json dependencies and devDependencies
// Test: detects React framework from react dependency
// Test: detects Express framework from express dependency
// Test: detects Next.js from next dependency

// Test: detects Go from go.mod presence
// Test: detects Python from requirements.txt presence
// Test: detects Rust from Cargo.toml presence

// Test: returns empty languages/frameworks/dependencies when no manifests found
// Test: skips manifests that fail to parse (logs warning)
// Test: only checks root-level manifests (not nested in subdirectories)
// Test: treats dependency versions as raw strings
// Test: passes ref parameter to getFileContent calls
```

---

## 4/9. Context Agent — PR Mode

### Tests to write BEFORE implementing PR mode

```typescript
// Test: produces valid ContextOutput for a standard PR (passes schema validation)
// Test: calls getPR first, then parallelizes remaining calls
// Test: passes baseSha as ref to domain rules loader
// Test: applies ignorePatterns to filter PR files
// Test: includes previousPath for renamed files
// Test: parses PR description for referenced issues and fetches them
// Test: fetches review comments
// Test: sets referencedIssues to empty array when no refs in description
// Test: sets comments to empty array when no review comments exist
// Test: loads domain rules and architecture doc

// Test: throws when mode is "pr" but number is undefined
// Test: throws when owner or repo is empty
// Test: propagates GitHubAPIError from getPR (fail fast)
```

---

## 4/9. Context Agent — Repo Mode

### Tests to write BEFORE implementing repo mode

```typescript
// Test: produces valid ContextOutput for a repo (passes schema validation)
// Test: fetches file tree and applies ignorePatterns
// Test: detects tech stack from manifest files
// Test: loads domain rules and architecture doc
// Test: sets repoFiles array from filtered tree
// Test: does not include pr field in output

// Test: throws when owner or repo is empty
// Test: propagates GitHubAPIError from getRepoTree (fail fast)
// Test: handles truncated tree (warning logged, continues)
```

---

## Integration Tests

### Tests to write AFTER all modules are assembled

```typescript
// Test: full PR mode flow with mocked GitHubClient — output passes ContextOutputSchema.safeParse()
// Test: full repo mode flow with mocked GitHubClient — output passes ContextOutputSchema.safeParse()
// Test: PR mode with no domain rules, no linked issues, no comments — still valid output
// Test: repo mode with no manifests, no domain rules — still valid output with empty techStack
// Test: pipeline integration — ContextAgent output feeds into StubAnalysisAgent without error
```
