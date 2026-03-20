

# Section 04: Utilities — Logger, URL Parser, and Secret Redaction

## Overview

This section implements three utility modules that other sections depend on:

1. **Logger factory** (`src/utils/logger.ts`) — DI-friendly logging with verbose support
2. **URL parser** (`src/utils/url-parser.ts`) — GitHub PR and repo URL parsing via `new URL()`
3. **Secret redaction** (`src/utils/redact.ts`) — Strips API keys/tokens from log output

These utilities have no dependencies on other application modules (only on the project setup from section-01). They are consumed by sections 05 (Claude client), 06 (GitHub client), and 08 (commands).

## Dependencies

- **section-01-project-setup**: Project must be scaffolded with TypeScript, Vitest, and `chalk` installed as a runtime dependency.

## File Paths

| File | Purpose |
|------|---------|
| `src/utils/logger.ts` | Logger factory and Logger type |
| `src/utils/logger.test.ts` | Logger tests |
| `src/utils/url-parser.ts` | GitHub URL parsing |
| `src/utils/url-parser.test.ts` | URL parser tests |
| `src/utils/redact.ts` | Secret redaction utility |
| `src/utils/redact.test.ts` | Redaction tests |

---

## Tests

Write all tests before implementation. Tests are co-located alongside source files.

### Logger Tests (`src/utils/logger.test.ts`)

```
# Test: createLogger returns a logger instance
# Test: logger.info writes to stdout
# Test: logger.error writes to stderr
# Test: logger.verbose suppressed when verbose=false
# Test: logger.verbose outputs when verbose=true
# Test: logger.warn outputs with warning prefix
# Test: Multiple logger instances are independent (not shared state)
```

**Testing approach**: Use `vi.spyOn` on `process.stdout.write` and `process.stderr.write` to capture output. Create logger instances with `createLogger({ verbose: true })` and `createLogger({ verbose: false })` and assert correct output behavior. For the independence test, create two loggers with different verbose settings and confirm they do not interfere with each other.

### URL Parser Tests (`src/utils/url-parser.test.ts`)

```
# Test: Parses standard PR URL (https://github.com/owner/repo/pull/123)
# Test: Parses PR URL with trailing slash
# Test: Parses PR URL with query params (strips them)
# Test: Parses PR URL with fragment (strips it)
# Test: Rejects non-github.com hostname
# Test: Rejects malformed PR URL (missing pull number)
# Test: Rejects PR URL with non-numeric pull number
# Test: Parses standard repo URL (https://github.com/owner/repo)
# Test: Parses repo URL with trailing slash
# Test: Rejects URL with no path segments
# Test: Error messages include expected format example
```

**Testing approach**: Import the two parser functions directly. For success cases, assert the returned object shape (`{ owner, repo, number }` for PR, `{ owner, repo }` for repo). For failure cases, assert that a `URLParseError` is thrown and that the error message contains an example of the expected format.

### Redaction Tests (`src/utils/redact.test.ts`)

```
# Test: Redacts strings matching API key patterns (sk-*, ghp_*, etc.)
# Test: Redacts Authorization header values
# Test: Preserves non-secret content unchanged
# Test: Handles null/undefined input gracefully
# Test: Redacts multiple secrets in same string
```

**Testing approach**: Call `redactSecrets()` with various inputs and assert that secret-like substrings are replaced with a placeholder like `[REDACTED]` while non-secret text is preserved verbatim.

---

## Implementation Details

### Logger (`src/utils/logger.ts`)

**Exported interface and factory**:

```typescript
interface Logger {
  info(msg: string): void;
  verbose(msg: string): void;
  error(msg: string): void;
  warn(msg: string): void;
  success(msg: string): void;
}

function createLogger(options: { verbose: boolean }): Logger;
```

**Behavior by method**:

- `info(msg)` — Always prints to stdout. No prefix or color needed (normal output).
- `verbose(msg)` — Only prints when `options.verbose` is `true`. Use a dim/gray style via `chalk` to distinguish from normal output.
- `error(msg)` — Always prints to **stderr**. Use `chalk.red` for coloring.
- `warn(msg)` — Always prints to stderr. Use `chalk.yellow` for coloring.
- `success(msg)` — Always prints to stdout. Use `chalk.green` for coloring.

**Design constraints**:

- Use a **factory function** (`createLogger`), not a class or singleton. Each call returns a fresh, independent logger instance with its own `verbose` setting captured in closure.
- The logger is threaded through the application via dependency injection. The CLI entry point (section-08) creates the logger once and passes it to pipeline runner, clients, and commands.
- Do **not** use `console.log`/`console.error` — write directly to `process.stdout.write` / `process.stderr.write` (append `\n`) so that tests can spy on output without capturing Vitest's own console output.

### URL Parser (`src/utils/url-parser.ts`)

**Exported functions**:

```typescript
function parsePRUrl(input: string): { owner: string; repo: string; number: number };
function parseRepoUrl(input: string): { owner: string; repo: string };
```

Both functions should also be importable individually. Additionally, export the `URLParseError` class from this module (or re-export it if defined in a shared errors file).

**Parsing algorithm** (use `new URL()`, not regex):

1. Call `new URL(input)`. If this throws, catch and throw `URLParseError` with a descriptive message.
2. Validate `url.hostname === "github.com"`. No GitHub Enterprise support.
3. Extract `url.pathname`, strip leading/trailing slashes, split by `/` to get path segments.
4. For PR URLs: expect segments `[owner, repo, "pull", numberString]`. Validate `numberString` parses to a positive integer.
5. For repo URLs: expect segments `[owner, repo]` (exactly two segments, or two segments followed by extra segments that are ignored — but the simplest approach is to require exactly the owner and repo).
6. Query params (`url.search`) and fragments (`url.hash`) are automatically ignored by only looking at `pathname`.

**Error messages** must include an example of the expected format, e.g.:
- `"Invalid PR URL. Expected format: https://github.com/owner/repo/pull/123"`
- `"Invalid repository URL. Expected format: https://github.com/owner/repo"`

**`URLParseError`** — extends `Error`. Set `this.name = "URLParseError"`. This is one of the domain error types from the error hierarchy (section-02 may define it, or it can be defined here and re-exported). If section-02 has already defined it in a shared errors module, import from there. Otherwise, define it locally in this file.

### Secret Redaction (`src/utils/redact.ts`)

**Exported function**:

```typescript
function redactSecrets(text: string): string;
```

**Patterns to redact** — replace matches with `"[REDACTED]"`:

- Anthropic API keys: pattern matching `sk-ant-[A-Za-z0-9_-]+` or similar `sk-` prefixed strings
- GitHub tokens: `ghp_[A-Za-z0-9]+`, `gho_[A-Za-z0-9]+`, `ghs_[A-Za-z0-9]+`, `github_pat_[A-Za-z0-9_]+`
- Generic bearer tokens: `Bearer [A-Za-z0-9._-]+` in Authorization header contexts
- Authorization header values: `Authorization:\s*.+` should redact the value portion

**Edge cases**:

- If the input is `null` or `undefined`, return an empty string (defensive — callers may pass error messages that are undefined).
- Multiple secrets in a single string should all be redacted independently.
- Non-secret content must pass through unchanged. The patterns should be specific enough to avoid false positives on normal text.

**Usage**: This utility is called by the logger's verbose output path and by error formatting code to prevent accidental secret leakage in logs, stack traces, or error messages displayed to users.