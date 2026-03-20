Now I have all the context I need. Let me generate the section content.

# Section 05: Domain Rules Loader

## Overview

This section implements the `loadDomainRules()` function in `02-context-agent/src/domain-rules.ts`. The function discovers and loads two optional documentation files from the target repository: a domain rules document and an architecture document. It uses a "config-first, fallback-search" strategy -- try the configured path first, then search well-known fallback locations.

## Dependencies

- **Section 01 (Schema Extensions):** The `ContextOutputSchema` must already have `domainRules: z.string().nullable()` and `architectureDoc: z.string().nullable()` fields (these already exist in the current schema at `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/agents/schemas.ts`).
- **Section 02 (GitHub Client Extensions):** The `GitHubClient` class must have a `getFileContent(owner, repo, path, ref?)` method that returns `string | null` (returns null on 404, throws on other errors). This method lives at `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/clients/github.ts`.

## File to Create

`/home/andrew/code/scratchpad/code-review/02-context-agent/src/domain-rules.ts`

## File to Create (Tests)

`/home/andrew/code/scratchpad/code-review/02-context-agent/src/domain-rules.test.ts`

## Config Context

The `CodeReviewConfig` type (from `/home/andrew/code/scratchpad/code-review/01-core-infrastructure/src/config/schema.ts`) contains:
- `domainRulesPath: string` -- defaults to `"./DOMAIN_RULES.md"`
- `architecturePath: string` -- defaults to `"./ARCHITECTURE.md"`

## Tests (Write First)

All tests go in `domain-rules.test.ts`, co-located with the source. Use Vitest. Mock `GitHubClient` -- specifically its `getFileContent` method.

```typescript
// domain-rules.test.ts
// Framework: Vitest
// Mock: GitHubClient.getFileContent

// --- Domain Rules Loading ---

// Test: loads domain rules from config.domainRulesPath when found
//   Setup: getFileContent returns content for config path
//   Assert: result.domainRules === returned content

// Test: falls back to DOMAIN_RULES.md when config path not found
//   Setup: getFileContent returns null for config path, returns content for "DOMAIN_RULES.md"
//   Assert: result.domainRules === fallback content

// Test: falls back to .github/DOMAIN_RULES.md when root not found
//   Setup: getFileContent returns null for config path and "DOMAIN_RULES.md", returns content for ".github/DOMAIN_RULES.md"
//   Assert: result.domainRules === fallback content

// Test: falls back to docs/DOMAIN_RULES.md when .github not found
//   Setup: getFileContent returns null for config path, "DOMAIN_RULES.md", and ".github/DOMAIN_RULES.md", returns content for "docs/DOMAIN_RULES.md"
//   Assert: result.domainRules === fallback content

// Test: returns null when no domain rules file found anywhere
//   Setup: getFileContent returns null for all paths
//   Assert: result.domainRules === null

// --- Architecture Doc Loading ---

// Test: loads architecture doc from config.architecturePath when found
//   Setup: getFileContent returns content for config path
//   Assert: result.architectureDoc === returned content

// Test: falls back to ARCHITECTURE.md when config path not found
//   Setup: getFileContent returns null for config path, returns content for "ARCHITECTURE.md"

// Test: falls back to .github/ARCHITECTURE.md when root not found
//   Setup: getFileContent returns null for config path and "ARCHITECTURE.md", returns content for ".github/ARCHITECTURE.md"

// Test: falls back to docs/architecture.md when .github not found
//   Setup: getFileContent returns null for all above, returns content for "docs/architecture.md"
//   Note: lowercase "architecture.md" in the docs/ fallback path

// Test: returns null when no architecture doc found anywhere

// --- Combined Behavior ---

// Test: loads both domain rules and architecture doc independently
//   Setup: domain rules found at config path, architecture doc found at fallback
//   Assert: both are non-null with correct content

// Test: returns both null when neither found

// Test: passes ref parameter to getFileContent calls
//   Setup: call with ref = "abc123"
//   Assert: every getFileContent call includes ref = "abc123"

// Test: propagates non-404 errors (fail fast)
//   Setup: getFileContent throws GitHubAPIError (e.g., 500)
//   Assert: loadDomainRules rejects with the same error
```

## Implementation Details

### Function Signature

```typescript
import type { GitHubClient } from "../../01-core-infrastructure/src/clients/github.js";
import type { CodeReviewConfig } from "../../01-core-infrastructure/src/config/schema.js";
import type { Logger } from "../../01-core-infrastructure/src/utils/logger.js";

export async function loadDomainRules(options: {
  github: GitHubClient;
  owner: string;
  repo: string;
  ref?: string;
  config: CodeReviewConfig;
  logger?: Logger;
}): Promise<{ domainRules: string | null; architectureDoc: string | null }>
```

### Search Strategy

The function performs two independent file searches (domain rules and architecture doc). Each follows the same pattern:

1. Try the path from config (`config.domainRulesPath` or `config.architecturePath`) via `github.getFileContent(owner, repo, path, ref)`.
2. If that returns `null`, try fallback paths in order, stopping at the first hit.

**Domain rules fallback paths (in order):**
1. `DOMAIN_RULES.md`
2. `.github/DOMAIN_RULES.md`
3. `docs/DOMAIN_RULES.md`

**Architecture doc fallback paths (in order):**
1. `ARCHITECTURE.md`
2. `.github/ARCHITECTURE.md`
3. `docs/architecture.md` (note: lowercase)

### Config Path Handling

The config defaults are `"./DOMAIN_RULES.md"` and `"./ARCHITECTURE.md"`. When passing to `getFileContent`, strip any leading `./` prefix since the GitHub Contents API expects paths relative to the repo root without a dot-slash prefix.

### Ref Parameter

The `ref` parameter (a git SHA or branch name) is passed through to every `getFileContent` call. In PR mode, the caller passes `base.sha` so domain rules are read from the base branch (representing the repo's current policy baseline, not the PR's changes). In repo mode, `ref` may be undefined (defaults to the repo's default branch).

### Error Handling

- `getFileContent` returns `null` for 404 (file not found). This is normal and expected -- most fallback paths will return null.
- Any non-404 error thrown by `getFileContent` (e.g., 500 server error, network failure) should propagate up immediately. Do not catch these. The pipeline runner handles retries.
- The two searches (domain rules and architecture) are independent. A failure in one should not prevent the other from being attempted. However, since non-404 errors propagate immediately, in practice any API error will abort the function.

### Optimization Note

The two searches can be run in parallel with `Promise.all` since they are independent. This is a minor optimization (saves a few hundred milliseconds at most) but is straightforward to implement. Alternatively, running them sequentially is also acceptable.

### Helper Function

Consider extracting a small helper to avoid duplicating the "try config path, then fallbacks" logic:

```typescript
async function findFile(
  github: GitHubClient,
  owner: string,
  repo: string,
  ref: string | undefined,
  configPath: string,
  fallbackPaths: string[],
): Promise<string | null>
```

This helper tries `configPath` first, then iterates through `fallbackPaths`, returning the first non-null result (or null if all return null).