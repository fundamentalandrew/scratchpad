

# Section 08: CLI Entry Point & Commands

## Overview

This section implements the CLI entry point using Commander.js and the three command handlers: `review-pr`, `review-repo`, and `init`. It wires together the config system (section 03), logger/URL parser (section 04), GitHub client (section 06), and pipeline runner (section 07) into a usable command-line tool.

## Dependencies

- **Section 01 (Project Setup)**: Package.json with `commander` dependency, tsconfig, directory structure
- **Section 02 (Shared Types)**: Agent contract types (`ContextOutput`, `AnalysisOutput`, `ReviewOutput`), common types (`ReviewMode`)
- **Section 03 (Config System)**: `loadConfig` function, `CodeReviewConfig` type, config schema with defaults
- **Section 04 (Utils)**: `createLogger`, `parsePRUrl`, `parseRepoUrl`, `URLParseError`
- **Section 06 (GitHub Client)**: `GitHubClient`, `resolveGitHubToken`
- **Section 07 (Pipeline)**: `runPipeline`, `Agent` interface, stub agents

## Files to Create/Modify

- `src/index.ts` — CLI entry point
- `src/commands/review-pr.ts` — review-pr command handler
- `src/commands/review-repo.ts` — review-repo command handler
- `src/commands/init.ts` — init command handler
- `src/commands/review-pr.test.ts` — tests for review-pr
- `src/commands/review-repo.test.ts` — tests for review-repo
- `src/commands/init.test.ts` — tests for init

---

## Tests

Write all tests before implementation. Tests use Vitest and mock external dependencies (config loader, pipeline runner, clients).

### `src/commands/review-pr.test.ts`

```
# Test: review-pr command rejects missing URL argument
# Test: review-pr command rejects invalid URL format
# Test: review-pr command loads config before running pipeline
# Test: review-pr command fails with clear message when no API key configured
```

Test strategy: Mock `loadConfig`, `parsePRUrl`, `resolveGitHubToken`, `runPipeline`, and `createLogger`. Invoke the command handler function directly (not through Commander parsing) to test the business logic in isolation. For the "rejects missing URL" test, verify the handler throws or returns an error when no URL is provided. For config loading, verify `loadConfig` is called before `runPipeline`. For missing API key, set up `loadConfig` to return a config without `apiKey` and verify an `AuthError` is thrown.

### `src/commands/review-repo.test.ts`

```
# Test: review-repo command rejects missing URL argument
# Test: review-repo command passes mode "repo" to pipeline
```

Test strategy: Same mocking approach as review-pr. Verify the initial pipeline input has `mode: "repo"`. Verify `parseRepoUrl` is called (not `parsePRUrl`).

### `src/commands/init.test.ts`

```
# Test: Creates DOMAIN_RULES.md when it doesn't exist
# Test: Creates ARCHITECTURE.md when it doesn't exist
# Test: Skips DOMAIN_RULES.md when it already exists (no overwrite)
# Test: Skips ARCHITECTURE.md when it already exists (no overwrite)
# Test: Reports which files were created vs skipped
# Test: Created files contain expected template sections
```

Test strategy: Use a temporary directory (via `fs.mkdtemp`) as the working directory. Call the init handler with that directory. After execution, check the filesystem for created files and their contents. For the "skips existing" tests, pre-create the files with custom content and verify they are not overwritten. For the "reports" test, capture the logger output and verify it mentions created/skipped files. Clean up the temp directory in `afterEach`.

---

## Implementation Details

### CLI Entry Point (`src/index.ts`)

This is the main entry point. It must have `#!/usr/bin/env node` as its very first line (before any imports) so the compiled output can be executed directly.

Set up Commander.js program:

- **Program metadata**: Name `"code-review"`, description `"AI-powered code review agent"`, version read from `package.json` (use `createRequire` or a hardcoded version string since ESM cannot `require` JSON directly without import assertions).
- **Global options**: `--verbose` (boolean flag, default false), `--config <path>` (string, optional).
- **Commands**: Register `review-pr`, `review-repo`, and `init` as subcommands.

The entry point creates the logger using `createLogger({ verbose })` from the parsed global options, then passes it to command handlers.

**Top-level error handler**: Wrap command execution in a try/catch that:
1. Catches `ConfigError` — prints the validation message and exits with code 1
2. Catches `AuthError` — prints the remediation suggestion and exits with code 1
3. Catches `PipelineError` — prints which agent failed, attempt count, and the underlying error message; exits with code 1
4. Catches `URLParseError` — prints the message (which includes expected format); exits with code 1
5. Catches unknown errors — prints full stack trace; exits with code 1

Use `process.exitCode = 1` rather than `process.exit(1)` where possible, to allow pending I/O to flush.

### `review-pr` Command (`src/commands/review-pr.ts`)

Export a function that registers the command on a Commander program, or export an action handler that can be tested independently.

Recommended pattern — export a handler function:

```typescript
/**
 * Handler for the review-pr command.
 * @param url - GitHub PR URL string
 * @param options - CLI options (verbose, config path)
 */
export async function reviewPR(url: string, options: { verbose: boolean; config?: string }): Promise<void>
```

Handler steps:

1. **Parse URL**: Call `parsePRUrl(url)` to extract `{ owner, repo, number }`. If it throws `URLParseError`, let it propagate to the top-level handler.
2. **Load config**: Call `loadConfig({ configPath: options.config })` to get merged config. Pass CLI flags to override.
3. **Validate credentials**: Check that `config.apiKey` or `ANTHROPIC_API_KEY` env var exists. Check GitHub token via `resolveGitHubToken(config)`. If either is missing, throw `AuthError` with a descriptive message.
4. **Create logger**: `createLogger({ verbose: options.verbose })`.
5. **Create clients**: Instantiate `ClaudeClient` and `GitHubClient` with the resolved config and logger.
6. **Build pipeline input**: Construct an object with `mode: "pr"`, the parsed `owner`/`repo`/`number`, and the loaded config.
7. **Create agents**: For now, use stub agents from section 07. The actual agents will be swapped in during later splits.
8. **Run pipeline**: Call `runPipeline(agents, input, { logger, maxRetries: config.maxRetries })`.
9. **Display results**: Log the pipeline result. For now, log a JSON summary to stdout. The output formatting will be enhanced in later splits.

### `review-repo` Command (`src/commands/review-repo.ts`)

Same structure as `review-pr` but:

```typescript
export async function reviewRepo(url: string, options: { verbose: boolean; config?: string }): Promise<void>
```

- Uses `parseRepoUrl(url)` instead of `parsePRUrl(url)` to extract `{ owner, repo }`.
- Sets `mode: "repo"` in the pipeline input.
- Does not include a PR number in the input.
- The Context Agent (in a later split) will use `getRepoTree` to get the file list, filtered by ignore patterns from config.

### `init` Command (`src/commands/init.ts`)

```typescript
/**
 * Handler for the init command.
 * @param targetDir - Directory to create files in (defaults to CWD)
 * @param logger - Logger instance for reporting
 */
export async function initProject(targetDir: string, logger: Logger): Promise<void>
```

Handler steps:

1. **Check for DOMAIN_RULES.md**: Use `fs.existsSync(path.join(targetDir, 'DOMAIN_RULES.md'))`.
   - If missing: write the template (see below), log "Created DOMAIN_RULES.md"
   - If exists: log "Skipped DOMAIN_RULES.md (already exists)"
2. **Check for ARCHITECTURE.md**: Same pattern.
   - If missing: write the template, log "Created ARCHITECTURE.md"
   - If exists: log "Skipped ARCHITECTURE.md (already exists)"
3. Use `fs.writeFileSync` (or async `fs.promises.writeFile`) to create files.

**DOMAIN_RULES.md template content:**

```markdown
# Domain Rules

## Business Rules
<!-- Describe key business rules that reviewers should be aware of -->

## Naming Conventions
<!-- Document naming patterns specific to this project -->

## Review Criteria
<!-- List domain-specific things to watch for in code reviews -->
```

**ARCHITECTURE.md template content:**

```markdown
# Architecture

## System Overview
<!-- High-level description of the system architecture -->

## Key Patterns
<!-- Document architectural patterns used in this project -->

## Architectural Decisions
<!-- List key decisions and their rationale -->
```

### Wiring Commands in `src/index.ts`

Register each command on the Commander program instance:

```typescript
// Pseudocode for command registration structure
program
  .command('review-pr <url>')
  .description('Review a GitHub pull request')
  .action(async (url) => {
    const opts = program.opts();  // gets global --verbose, --config
    await reviewPR(url, opts);
  });

program
  .command('review-repo <url>')
  .description('Review a GitHub repository')
  .action(async (url) => {
    const opts = program.opts();
    await reviewRepo(url, opts);
  });

program
  .command('init')
  .description('Initialize review config files in the current directory')
  .action(async () => {
    const opts = program.opts();
    const logger = createLogger({ verbose: opts.verbose });
    await initProject(process.cwd(), logger);
  });
```

After registering commands, call `program.parseAsync(process.argv)` (not `program.parse()`, since command actions are async).

### Error Types Used

These are defined in section 04 (utils) at `src/utils/errors.ts`. This section uses but does not define them:

- `AuthError` — thrown when API key or GitHub token is missing
- `URLParseError` — thrown by URL parsers for invalid formats
- `ConfigError` — thrown by config loader for invalid config
- `PipelineError` — thrown by pipeline runner on agent failure

### Key Implementation Notes

- **ESM compatibility**: Use `import` statements throughout. For reading `package.json` version, either use `import { createRequire } from 'node:module'` to create a require function, or use `import pkg from '../package.json' assert { type: 'json' }` (import assertions), or simply hardcode the version and update it as part of the build process.
- **Shebang**: The first line of `src/index.ts` must be `#!/usr/bin/env node`. TypeScript's `tsc` preserves this in the output.
- **Async actions**: Commander.js supports async action handlers when using `parseAsync`. Always use `parseAsync` to ensure promise rejections are caught.
- **Testing the CLI parsing**: For integration-level tests of Commander parsing (verifying that `review-pr <url>` routes to the right handler), you can create a program instance in a test and call `program.parseAsync(['node', 'test', 'review-pr', 'https://github.com/o/r/pull/1'])`. However, unit tests of the handler functions themselves (without Commander) are simpler and more focused.
- **Stub agents**: Import stub agents from `src/agents/stubs.ts` (defined in section 07). The command handlers should construct the agent array and pass it to `runPipeline`. When actual agents are implemented in later splits, only the agent construction changes; the pipeline invocation remains the same.

## Implementation Notes

- **Extracted shared helper**: `src/commands/shared.ts` contains `runReviewPipeline()` with config loading, auth validation, logger/agent creation, and pipeline execution. This eliminated ~90% duplication between review-pr and review-repo.
- **ClaudeClient/GitHubClient not instantiated**: Per spec, stub agents are used now. Client construction will be added when real agents are implemented.
- **Pipeline input is untyped**: Input is a plain object. A formal type will be introduced when real agents define their contracts.
- **Version hardcoded to 0.1.0**: Acceptable per plan. Can be updated during build process.
- **Top-level error handler**: Uses `process.exitCode = 1` instead of `process.exit(1)` per plan.
- All 12 new tests pass (4 review-pr, 2 review-repo, 6 init). Full suite: 115 tests across 15 files.

## Actual Files Produced

| File | Purpose |
|------|---------|
| `src/index.ts` | CLI entry point with Commander.js, commands, top-level error handler |
| `src/commands/shared.ts` | Shared helper for review pipeline (config, auth, agents, execution) |
| `src/commands/review-pr.ts` | review-pr handler — parses PR URL, delegates to shared |
| `src/commands/review-pr.test.ts` | 4 tests for review-pr |
| `src/commands/review-repo.ts` | review-repo handler — parses repo URL, delegates to shared |
| `src/commands/review-repo.test.ts` | 2 tests for review-repo |
| `src/commands/init.ts` | init handler — creates DOMAIN_RULES.md and ARCHITECTURE.md templates |
| `src/commands/init.test.ts` | 6 tests for init |