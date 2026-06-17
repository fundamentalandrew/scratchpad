# Code Review Interview: Section 06 - GitHub API Client

## Triage Summary

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | AuthError message mismatch | High | Let go — AuthError class handles remediation messaging |
| 2 | GitHubAPIError missing cause | High | Auto-fix |
| 3 | No test for GitHubAPIError | Medium | Auto-fix |
| 4 | Throttle handler types | Medium | Let go — pragmatic for plugin interop |
| 5 | Empty GITHUB_TOKEN edge case | Low | Let go — empty string is effectively no token |
| 6 | Verbose logging not tested | Low | Let go — low value |
| 7 | Record<string, unknown> casts | Low | Let go — paginate returns untyped results |

## Auto-fixes Applied

### Fix 2: GitHubAPIError now preserves cause
- Added optional `ErrorOptions` parameter to `GitHubAPIError` constructor
- All 5 catch blocks in `github.ts` now pass `{ cause: e }` to preserve original stack traces

### Fix 3: Added error wrapping test
- New test: "getPR throws GitHubAPIError with cause on API failure"
- Verifies error wrapping, message content, and cause preservation

## Items Let Go
- #1: AuthError already constructs proper remediation message
- #4, #7: Type cast pragmatism for third-party interop
- #5, #6: Minor edge cases with low impact
