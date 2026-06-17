# Code Review: Section 07 - Output Agent

The implementation is largely faithful to the plan and covers the core orchestration flow. However, there are several issues worth calling out:

1. **Non-null assertion on `deps.contextOutput.pr!.number` (output-agent.ts:49):** When `result.destination` is "pr-comment", the code does `deps.contextOutput.pr!.number` with a non-null assertion. There is no runtime guard ensuring `contextOutput.mode === "pr"` or that `contextOutput.pr` is defined before reaching this branch. If `runInteractiveReview` somehow returns "pr-comment" when the context is in repo mode (a bug in the interactive layer, or a future refactor), this will throw a cryptic `Cannot read properties of undefined` error at runtime. A defensive check with a clear error message (e.g., "Cannot publish PR comment without PR context") would be far safer.

2. **`new Date().toISOString()` is untestable (output-agent.ts:54):** The markdown-file branch calls `new Date().toISOString()` inline. The test works around this with `expect.any(String)`, which means the test cannot actually verify the timestamp value or format. The plan mentions building a metadata object with a timestamp, but proper dependency injection of a clock/time function would make this deterministic and testable.

3. **No test for error propagation:** The plan explicitly describes error handling behavior -- that GitHub publisher failures and file write failures should propagate up. There are zero tests verifying that errors from `publishPRComment` or `publishMarkdownFile` actually propagate. A rejected promise from either publisher should bubble up unhandled, but this is never asserted.

4. **Missing test for pr-comment in non-PR mode:** There is no test that exercises the edge case where the destination is "pr-comment" but context is repo mode. Given the non-null assertion issue in point 1, this is a real gap.

5. **`buildPrUrl` constructs a hardcoded GitHub URL (output-agent.ts:39):** The URL template `https://github.com/${owner}/${repo}/pull/${contextOutput.pr.number}` is hardcoded to github.com. If this tool ever supports GitHub Enterprise (different host), this will silently produce wrong URLs. Minor concern.

6. **`getTotalFilesReviewed` returns 0 silently (output-agent.ts:33):** If neither `pr.files` nor `repoFiles` exist, the function returns 0 without any logging. A formatter receiving `totalFilesReviewed = 0` could produce misleading output.

7. **Test helper `makeContextOutput` uses `repoFiles` with bare `{ path: string }` objects:** If the actual `ContextOutput` schema requires more fields on repo files, this test would pass with mocks but break at integration time.

8. **Unused import concern:** The test imports `Recommendation` but the decision field content is never verified as passed through correctly to formatters.

Overall the implementation matches the plan's requirements and the code is clean and readable. The most critical issue is the non-null assertion (#1) which is a crash waiting to happen in edge cases.
