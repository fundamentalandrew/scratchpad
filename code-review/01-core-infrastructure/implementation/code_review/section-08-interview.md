# Code Review Interview: Section 08 - CLI Entry Point & Commands

## Interview Decisions

### Code duplication (Asked user)
- **Finding:** review-pr.ts and review-repo.ts were ~90% identical
- **Decision:** User chose to extract shared helper
- **Action:** Created `commands/shared.ts` with `runReviewPipeline()`. Commands now just parse URL and call shared helper.

## Auto-fixes Applied

### Environment variable pollution
- **Finding:** Test deleted process.env.ANTHROPIC_API_KEY without restoring
- **Fix:** Added save/restore of env var in beforeEach/afterEach
- **Status:** Applied

### review-repo test missing parseRepoUrl assertion
- **Finding:** Test only checked mode but not which parser was called
- **Fix:** Added `expect(mockParseRepoUrl).toHaveBeenCalledWith(...)` assertion
- **Status:** Applied

## Let Go (No Action)

- Missing GitHub token validation test — resolveGitHubToken has its own test coverage
- Client instantiation skipped — stubs are used now per spec; real clients will be wired with real agents
- Untyped pipeline input — will get a type when real agents define their input contract
- Hardcoded version — acceptable per plan
- API key test fragility — works correctly in practice
- Top-level logger not verbose — minor, error output doesn't need verbose mode
