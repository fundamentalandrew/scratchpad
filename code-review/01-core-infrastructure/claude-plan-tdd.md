# TDD Plan — Core Infrastructure

Testing framework: **Vitest** with native TypeScript/ESM support. Co-located test files (`*.test.ts`) alongside source.

---

## 2. Project Setup & Tooling

No tests for this section — it's scaffolding. Verify setup works by running `vitest --run` with a trivial passing test.

---

## 3. Shared Types & Zod Schemas

### Zod Schema Validation Tests (`src/agents/schemas.test.ts`)

```
# Test: FileScore schema accepts valid data (all fields populated)
# Test: FileScore schema rejects score outside 0-10 range
# Test: FileScore schema rejects invalid RiskLevel value
# Test: Recommendation schema accepts minimal valid data (without optional fields)
# Test: Recommendation schema accepts full data (with line, suggestion)
# Test: ContextOutput schema accepts valid PR-mode data
# Test: ContextOutput schema accepts valid repo-mode data (with repoFiles, without pr)
# Test: ContextOutput schema rejects data with both pr.files and repoFiles missing
# Test: AnalysisOutput schema accepts valid data with summary counts
# Test: ReviewOutput schema accepts valid data with recommendations array
# Test: All schemas produce valid JSON Schema via toJSONSchema/zod-to-json-schema
```

---

## 4. Configuration System

### Config Schema Tests (`src/config/schema.test.ts`)

```
# Test: Default config is valid (all defaults pass schema validation)
# Test: Schema rejects negative criticalThreshold
# Test: Schema rejects criticalThreshold above 10
# Test: Schema accepts partial config (only overridden fields)
# Test: Schema rejects unknown keys with strict mode
```

### Config Loader Tests (`src/config/loader.test.ts`)

```
# Test: Loads .codereview.json from current directory
# Test: Walks up directory tree and finds config in parent
# Test: Stops walking at git root (.git directory boundary)
# Test: --config flag overrides discovery (loads from explicit path)
# Test: Returns defaults when no config file found
# Test: Merges config file values over defaults
# Test: Environment variables override config file values (ANTHROPIC_API_KEY)
# Test: Environment variables override config file values (GITHUB_TOKEN)
# Test: Handles malformed JSON gracefully with clear error
# Test: Handles missing file at --config path with clear error
```

---

## 5. CLI Entry Point & Commands

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

### CLI Integration Tests (`src/commands/review-pr.test.ts`, `review-repo.test.ts`)

```
# Test: review-pr command rejects missing URL argument
# Test: review-pr command rejects invalid URL format
# Test: review-pr command loads config before running pipeline
# Test: review-pr command fails with clear message when no API key configured
# Test: review-repo command rejects missing URL argument
# Test: review-repo command passes mode "repo" to pipeline
```

### Init Command Tests (`src/commands/init.test.ts`)

```
# Test: Creates DOMAIN_RULES.md when it doesn't exist
# Test: Creates ARCHITECTURE.md when it doesn't exist
# Test: Skips DOMAIN_RULES.md when it already exists (no overwrite)
# Test: Skips ARCHITECTURE.md when it already exists (no overwrite)
# Test: Reports which files were created vs skipped
# Test: Created files contain expected template sections
```

---

## 6. Logger Utility

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

---

## 7. Claude API Client

### Claude Client Tests (`src/clients/claude.test.ts`)

Mock the Anthropic SDK — do not make real API calls.

```
# Test: Constructor creates Anthropic client with provided API key
# Test: query() sends output_config.format with JSON Schema from Zod schema
# Test: query() extracts text from content blocks correctly (not just content[0])
# Test: query() parses and validates response against Zod schema
# Test: query() returns typed data and usage stats on success
# Test: query() throws ClaudeAPIError with retryable=false on refusal (stop_reason: "refusal")
# Test: query() throws ClaudeAPIError with retryable=true on Zod validation failure
# Test: query() passes system prompt when provided
# Test: query() uses default maxTokens when not specified
# Test: query() tracks cumulative token usage across multiple calls
# Test: query() logs API call details in verbose mode (via injected logger)
```

---

## 8. GitHub API Client

### GitHub Client Tests (`src/clients/github.test.ts`)

Mock Octokit — do not make real API calls.

```
# Test: resolveGitHubToken returns GITHUB_TOKEN env var when set
# Test: resolveGitHubToken falls back to gh auth token when env var missing
# Test: resolveGitHubToken falls back to config when gh not installed
# Test: resolveGitHubToken throws AuthError when no token found
# Test: resolveGitHubToken warns when token found in config file
# Test: getPR returns typed PR metadata object
# Test: getPRFiles paginates and returns all files
# Test: getPRFiles preserves null patch field (doesn't crash)
# Test: getPRDiff returns unified diff string
# Test: getRepoTree returns array of file paths
# Test: getRepoTree warns on truncated response
# Test: postPRComment posts body to correct PR
```

---

## 9. Agent Orchestration Pipeline

### Pipeline Runner Tests (`src/pipeline/runner.test.ts`)

```
# Test: Runs agents sequentially, passing output as next input
# Test: Returns PipelineResult with final output and timing metadata
# Test: Records per-stage duration in StageResult
# Test: Retries idempotent agent on failure (up to maxRetries)
# Test: Uses exponential backoff between retries (1s, 2s, 4s)
# Test: Does NOT retry non-idempotent agent (fails immediately)
# Test: Halts pipeline on agent failure after retries exhausted
# Test: PipelineError includes agent name, attempt count, and original error
# Test: Successful pipeline returns all stage results
# Test: Pipeline with 4 stages chains outputs correctly (A→B→C→D)
```

### Stub Agent Tests (`src/agents/stubs.test.ts`)

```
# Test: Each stub agent returns valid typed output matching its contract
# Test: Stub output passes Zod schema validation
# Test: Stubs log their stub status in verbose mode
# Test: Full pipeline with all stubs runs end-to-end without errors
```

---

## 10. Init Command Templates

Covered in section 5 (init command tests).

---

## 11. Error Handling Strategy

### Error Type Tests (`src/utils/errors.test.ts`)

```
# Test: ConfigError has user-friendly message
# Test: PipelineError includes agent name and attempt count
# Test: AuthError suggests remediation steps in message
# Test: URLParseError includes expected format
# Test: ClaudeAPIError includes retryable flag
# Test: All error types extend Error (proper prototype chain)
```

### Redaction Tests (`src/utils/redact.test.ts`)

```
# Test: Redacts strings matching API key patterns (sk-*, ghp_*, etc.)
# Test: Redacts Authorization header values
# Test: Preserves non-secret content unchanged
# Test: Handles null/undefined input gracefully
# Test: Redacts multiple secrets in same string
```
