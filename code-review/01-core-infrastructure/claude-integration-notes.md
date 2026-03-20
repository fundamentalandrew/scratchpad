# Integration Notes — External Review Feedback

## Source
- OpenAI GPT-5.2 review (Gemini failed due to model access)

## Integrating

### 1. Structured output parsing robustness (Point #1)
**Integrating.** The plan should specify extracting text content blocks properly, not blind `JSON.parse`. Also: treat Zod validation failures differently from API errors in retry logic.

### 2. GitHub `patch` field can be null/truncated (Point #2)
**Integrating.** Add `patch?: string | null` to the PR file type and note that `getPRDiff` is the authoritative diff source.

### 3. Repo tree truncation detection (Point #3)
**Integrating.** Check `truncated: true` from the Git Trees API and warn/error. Add a max files limit.

### 5. Config discovery should stop at git root (Point #5)
**Integrating.** Good catch — walking past the git repo root is surprising. Stop at `.git` directory.

### 6. URL parsing should use `new URL()` (Point #6)
**Integrating.** Use `new URL()` for parsing, strip trailing slashes and query params. Keep github.com-only scope for now.

### 8. Specify glob engine for ignore patterns (Point #8)
**Integrating.** Specify `picomatch` as the glob engine. Add more default ignore patterns.

### 9. Clarify PR files vs repo files types (Point #9)
**Integrating.** Remove the overloaded `files` field. Use `pr.files` for PR mode and a separate `repoFiles` for repo mode.

### 11. Secret handling warnings (Point #11)
**Integrating.** Warn if secrets found in config file. Add redaction utility for verbose logging.

### 12. `gh auth token` hardening (Point #12)
**Integrating.** Add timeout and pipe stdio properly. Keep auth order as: env → gh → config.

### 15. Retry policy per agent / idempotency (Point #15)
**Integrating.** Add `idempotent` flag to Agent interface. Output Agent (which posts comments) should not be auto-retried.

### 16. Logger as dependency injection (Point #16)
**Integrating.** Use `createLogger()` factory instead of singleton. Pass logger instance through pipeline.

### 18. Retry layer deduplication (Point #18)
**Integrating.** Define one retry boundary: SDK handles network retries, pipeline runner handles agent-level retries only for transient failures (not Zod validation).

### 21. ESM + shebang handling (Point #21)
**Integrating.** Note the need for shebang preservation in build output.

## NOT Integrating

### 4. Support partial/degraded pipeline results
**Not integrating.** The user explicitly chose "retry then halt" with no partial results. This is a design decision, not an oversight.

### 7. Full output contract specification
**Not integrating now.** Output Agent is split 05's concern. The core infra just defines the contract types. Detailed output rendering is out of scope.

### 10. Token/cost budget controls
**Not integrating.** Good idea but premature for split 01. Can be added when actual agents are implemented and we see real token usage patterns.

### 13. PR comment sanitization
**Not integrating now.** This belongs in split 05 (Output Agent), not core infrastructure.

### 14. Dedup PR files + diff fetching
**Not integrating.** Both are needed: files list for enumeration/metadata, diff for full context. The duplication is acceptable — they serve different purposes.

### 17. Typed pipeline builder
**Not integrating.** The `Agent<any, any>` in the runner is an internal detail; stage composition at the call site enforces types. A builder pattern adds complexity for 4 fixed stages.

### 19. Commander "zero deps" clarification
**Noted.** Commander does have 0 runtime npm dependencies. The claim is accurate.

### 20. CLI flag overrides for config
**Not integrating.** The plan already notes this is limited to `--verbose` and `--config`. Additional overrides can be added incrementally.
