

# Section 03: Configuration System

## Overview

This section implements the configuration system for the AI Code Review Agent. It includes a Zod-based config schema with sensible defaults, and a config loader that discovers `.codereview.json` by walking up the directory tree (stopping at the git root), then merges values in priority order: defaults < config file < environment variables < CLI flags.

## Dependencies

- **section-01-project-setup**: Project scaffolding, `package.json`, `tsconfig.json`, vitest config must exist.
- **section-02-shared-types**: The error type hierarchy must be defined (specifically `ConfigError`). The Zod library must be installed.
- **Runtime dependency**: `picomatch` must be installed (added in section-01 setup). Used for glob matching of ignore patterns at consumption time, but the config system stores the pattern strings.

## Files to Create

- `src/config/schema.ts` — Zod config schema and default values
- `src/config/loader.ts` — Config discovery, loading, merging
- `src/config/schema.test.ts` — Tests for the schema
- `src/config/loader.test.ts` — Tests for the loader

## Tests First

All tests use Vitest. Test files are co-located with source files.

### Config Schema Tests (`src/config/schema.test.ts`)

```
# Test: Default config is valid (all defaults pass schema validation)
  - Call the schema's parse/safeParse on the default config object
  - Expect success with no errors

# Test: Schema rejects negative criticalThreshold
  - Provide config with criticalThreshold: -1
  - Expect validation failure

# Test: Schema rejects criticalThreshold above 10
  - Provide config with criticalThreshold: 11
  - Expect validation failure

# Test: Schema accepts partial config (only overridden fields)
  - Provide only { model: "claude-sonnet-4-5-20250514" } to a partial/merge schema
  - Expect it to be accepted and merged with defaults correctly

# Test: Schema rejects unknown keys with strict mode
  - Provide config with an unexpected field like { foo: "bar" }
  - Expect validation failure or the key to be stripped (depending on strict vs passthrough)
```

### Config Loader Tests (`src/config/loader.test.ts`)

These tests require filesystem mocking. Use a temporary directory structure created with `node:fs` in `beforeEach`/`afterEach` hooks, or use `vi.mock` to mock `fs` functions.

```
# Test: Loads .codereview.json from current directory
  - Create a temp dir with a .codereview.json and a .git directory
  - Call loadConfig with that dir as the starting point
  - Expect returned config to include values from the file

# Test: Walks up directory tree and finds config in parent
  - Create temp/parent/.codereview.json and temp/parent/.git/
  - Create temp/parent/child/ (no config file)
  - Call loadConfig starting from child
  - Expect config loaded from parent's .codereview.json

# Test: Stops walking at git root (.git directory boundary)
  - Create temp/grandparent/.codereview.json (no .git)
  - Create temp/grandparent/parent/.git/ (git root, no config)
  - Create temp/grandparent/parent/child/
  - Call loadConfig starting from child
  - Expect defaults returned (should NOT find grandparent's config because parent is the git root)

# Test: --config flag overrides discovery (loads from explicit path)
  - Create a config file at a non-standard path (e.g., /tmp/custom-config.json)
  - Call loadConfig with configPath option pointing to that file
  - Expect config loaded from the explicit path, discovery skipped

# Test: Returns defaults when no config file found
  - Create a temp dir with .git but no .codereview.json
  - Call loadConfig
  - Expect all default values returned

# Test: Merges config file values over defaults
  - Create .codereview.json with { "criticalThreshold": 5 }
  - Call loadConfig
  - Expect criticalThreshold=5 but all other fields at defaults

# Test: Environment variables override config file values (ANTHROPIC_API_KEY)
  - Set process.env.ANTHROPIC_API_KEY to "test-key"
  - Create .codereview.json with { "apiKey": "file-key" }
  - Call loadConfig
  - Expect apiKey to be "test-key" (env wins)
  - Clean up env var in afterEach

# Test: Environment variables override config file values (GITHUB_TOKEN)
  - Set process.env.GITHUB_TOKEN to "ghp_test"
  - Call loadConfig
  - Expect githubToken to be "ghp_test"
  - Clean up env var in afterEach

# Test: Handles malformed JSON gracefully with clear error
  - Write invalid JSON to .codereview.json (e.g., "{ bad json")
  - Call loadConfig
  - Expect a ConfigError thrown with a message mentioning JSON parse failure

# Test: Handles missing file at --config path with clear error
  - Call loadConfig with configPath pointing to a non-existent file
  - Expect a ConfigError thrown with a message about the file not being found
```

## Implementation Details

### Config Schema (`src/config/schema.ts`)

Define a Zod schema for the full configuration shape. The schema should use `z.object()` with the following fields and defaults:

**Fields:**

| Field | Type | Default | Constraint |
|-------|------|---------|------------|
| `ignorePatterns` | `string[]` | See below | — |
| `criticalThreshold` | `number` | `8` | min 0, max 10 |
| `domainRulesPath` | `string` | `"./DOMAIN_RULES.md"` | — |
| `architecturePath` | `string` | `"./ARCHITECTURE.md"` | — |
| `apiKey` | `string` (optional) | `undefined` | — |
| `githubToken` | `string` (optional) | `undefined` | — |
| `model` | `string` | `"claude-sonnet-4-5-20250514"` | — |
| `maxRetries` | `number` | `3` | min 0 |
| `output` | object | See below | — |

**`output` sub-object:**

| Field | Type | Default |
|-------|------|---------|
| `console` | `boolean` | `true` |
| `markdown` | `boolean` | `false` |
| `markdownPath` | `string` | `"./code-review-report.md"` |
| `githubComment` | `boolean` | `false` |

**Default `ignorePatterns`:**

```typescript
[
  "node_modules/**", "dist/**", "build/**", "coverage/**",
  ".next/**", "vendor/**", "*.lock", "*.min.*", ".git/**",
  "*.png", "*.jpg", "*.svg", "*.gif", "*.ico",
  "*.woff", "*.woff2", ".turbo/**", ".pnpm-store/**"
]
```

**Exports:**

- The Zod schema object (e.g., `configSchema`)
- A partial version of the schema for file-level config (all fields optional) used during merging
- The inferred TypeScript type: `type CodeReviewConfig = z.infer<typeof configSchema>`
- The default config object (obtained by parsing `{}` through the schema with all defaults applied)

Use `.strict()` on the schema to reject unknown keys, which helps catch typos in config files.

### Config Loader (`src/config/loader.ts`)

Export a `loadConfig` function with the following signature concept:

```typescript
function loadConfig(options?: {
  configPath?: string;   // explicit --config path, skips discovery
  cliFlags?: Partial<CodeReviewConfig>;  // CLI flag overrides
  startDir?: string;     // starting directory for discovery (default: process.cwd())
}): CodeReviewConfig
```

This function is synchronous (uses `fs.readFileSync`, `fs.existsSync`). Config loading happens once at startup, so sync is appropriate and simpler.

**Step 1 — Discovery or direct load:**

If `options.configPath` is provided:
- Check file exists with `fs.existsSync`. If not, throw `ConfigError` with message like `Config file not found: <path>`.
- Read and parse the file.

If `options.configPath` is NOT provided:
- Start at `options.startDir` (or `process.cwd()`).
- Walk up directories looking for `.codereview.json`.
- At each level, also check for `.git` directory to establish the boundary.
- Stop when: (a) `.codereview.json` found, (b) `.git` found without config (stop here, return no file config), or (c) filesystem root reached.
- The key logic: at each directory, check for `.codereview.json` first, then check for `.git`. If config found, use it. If `.git` found but no config, stop searching (do not go above git root).

**Step 2 — Parse JSON:**

Wrap `JSON.parse()` in try/catch. On failure, throw `ConfigError` with the file path and a hint about the JSON syntax error.

**Step 3 — Validate the file config against the partial schema:**

Use the partial version of the Zod schema to validate just the file contents. This catches invalid field types/values early with clear messages.

**Step 4 — Merge in priority order:**

```
hardcoded defaults  ←  config file values  ←  env vars  ←  CLI flags
```

Environment variable mapping (only applied if the env var is defined and non-empty):
- `process.env.ANTHROPIC_API_KEY` maps to `apiKey`
- `process.env.GITHUB_TOKEN` maps to `githubToken`

Use object spread or a shallow merge for top-level fields, with special handling for the nested `output` object (deep merge one level).

**Step 5 — Validate the final merged config:**

Parse the merged result through the full Zod schema. On failure, format the Zod error issues into a readable message showing which fields failed and why, then throw `ConfigError`.

**Helper — `discoverConfigFile(startDir: string): string | null`:**

Extract the directory-walking logic into a helper function for testability. This function returns the path to the found `.codereview.json` or `null` if none found.

```typescript
function discoverConfigFile(startDir: string): string | null {
  // Walk up from startDir
  // At each level: check for .codereview.json, then check for .git
  // Return path if found, null if git root reached or filesystem root reached
}
```

Use `path.dirname()` and `path.join()` for path manipulation. Detect filesystem root by checking if `path.dirname(current) === current`.

## Key Design Notes

- The config system is intentionally synchronous. It runs once during CLI startup before any async work begins.
- Ignore patterns use picomatch semantics (not gitignore). This is documented so users know the syntax. The config system only stores patterns as strings; the actual matching happens when agents filter files.
- The `.strict()` mode on the Zod schema means typos in config keys (e.g., `"igorePatterns"`) will produce a clear error rather than being silently ignored.
- Environment variables only map two specific secrets (`apiKey`, `githubToken`). Other config fields are not exposed via env vars to keep the surface small.
- The `ConfigError` type is defined in section-02 (shared types / error hierarchy). Import it from there.