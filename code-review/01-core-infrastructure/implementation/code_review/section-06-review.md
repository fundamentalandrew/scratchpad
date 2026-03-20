# Code Review: Section 06 - GitHub API Client

## High Severity

1. **AuthError message doesn't match plan exactly** — AuthError prepends user message with "Remediation:" suffix from the class itself. The plan wanted a specific string, but AuthError already handles remediation messaging.

2. **Original error (cause) discarded in GitHubAPIError** — GitHubAPIError doesn't accept ErrorOptions, so original Octokit stack traces are lost.

## Medium Severity

3. **No test for GitHubAPIError on API failure** — No test verifies methods throw GitHubAPIError when Octokit rejects.

4. **Throttle handler types manually cast** — onRateLimit/onSecondaryRateLimit use Record<string, unknown> instead of proper plugin types.

## Low Severity

5. **Empty GITHUB_TOKEN string treated as unset** — `if (process.env.GITHUB_TOKEN)` is falsy for "".

6. **Verbose logging not tested** — No tests assert logger.verbose was called.

7. **getPRFiles mapping uses Record<string, unknown>** — Defeats type safety with manual casts.
