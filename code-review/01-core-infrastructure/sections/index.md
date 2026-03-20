<!-- PROJECT_CONFIG
runtime: typescript-npm
test_command: npx vitest run
END_PROJECT_CONFIG -->

<!-- SECTION_MANIFEST
section-01-project-setup
section-02-shared-types
section-03-config-system
section-04-utils
section-05-claude-client
section-06-github-client
section-07-pipeline
section-08-commands
section-09-integration
END_MANIFEST -->

# Implementation Sections Index

## Dependency Graph

| Section | Depends On | Blocks | Parallelizable |
|---------|------------|--------|----------------|
| section-01-project-setup | - | all | Yes |
| section-02-shared-types | 01 | 03, 05, 06, 07 | No |
| section-03-config-system | 01, 02 | 08 | Yes |
| section-04-utils | 01 | 05, 06, 08 | Yes |
| section-05-claude-client | 02, 04 | 07 | Yes |
| section-06-github-client | 02, 04 | 08 | Yes |
| section-07-pipeline | 02, 05 | 08 | No |
| section-08-commands | 03, 04, 06, 07 | 09 | No |
| section-09-integration | all | - | No |

## Execution Order

1. section-01-project-setup (no dependencies)
2. section-02-shared-types (after 01)
3. section-03-config-system, section-04-utils (parallel after 02)
4. section-05-claude-client, section-06-github-client (parallel after 02+04)
5. section-07-pipeline (after 02+05)
6. section-08-commands (after 03+04+06+07)
7. section-09-integration (final)

## Section Summaries

### section-01-project-setup
Package.json, tsconfig.json, vitest config, directory structure scaffolding, dev dependencies installation. Produces a buildable/testable empty project.

### section-02-shared-types
All shared TypeScript types and Zod schemas: ReviewMode, RiskLevel, FileScore, Recommendation, ContextOutput, AnalysisOutput, ReviewOutput. Also agent contract types and error type hierarchy.

### section-03-config-system
Zod config schema with defaults, config file discovery (walk up to git root), config loader with merge logic (defaults < file < env vars), picomatch ignore pattern support.

### section-04-utils
Logger factory (createLogger with DI), URL parser (new URL() based, PR + repo URLs), secret redaction utility.

### section-05-claude-client
Thin wrapper around @anthropic-ai/sdk. Structured output via output_config.format + Zod. Content block extraction, token tracking, error classification (retryable vs not).

### section-06-github-client
Octokit wrapper with throttling + retry plugins. Auth resolution (env -> gh CLI -> config). Methods: getPR, getPRFiles, getPRDiff, postPRComment, getRepoTree with truncation detection.

### section-07-pipeline
Agent interface (with idempotent flag), pipeline runner with retry/backoff (respecting idempotency), PipelineResult/StageResult types, stub agents for testing.

### section-08-commands
CLI entry point with Commander.js, review-pr command, review-repo command, init command with templates. Wires config + clients + pipeline together.

### section-09-integration
End-to-end tests: full pipeline with stubs, CLI command parsing, config loading + pipeline execution flow. Verifies all pieces work together.
