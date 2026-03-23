# Code Review: Section 05 - Interactive Terminal Flow

The implementation is generally faithful to the plan, but there are several issues worth calling out:

1. **Logger mock shape mismatch (test brittleness / potential test failures):** The plan specifies the mock logger should have `info`, `warn`, `error`, `debug` methods. The test's `makeLogger()` creates `info`, `warn`, `error`, `verbose`, `success` -- no `debug`. Meanwhile the source code only calls `logger.info`, so this is not a runtime issue, but it signals the test factory does not match the plan's specification and may not match the real `Logger` interface. If the real Logger type requires `debug`, the test types will fail to compile.

2. **Unsafe non-null assertion on decisions array:** `const decision = decisions[i]!;` uses a non-null assertion. If any bug in the loop logic causes `currentIndex` to skip past an entry without setting a decision, this will produce a runtime error when calling `decision.action`. A defensive check or explicit guard would be safer for a user-facing interactive flow.

3. **The `as OutputDestination` cast is a type safety smell:** `select()` returns `string`, and the code force-casts it to `OutputDestination`. If `@inquirer/prompts` ever returns an unexpected value (or the choices are misconfigured), this bypasses TypeScript's guarantees. A runtime validation or exhaustive check after the cast would be more robust.

4. **Zero recommendations path diverges from plan:** The plan says 'Returns null when the user cancels (Ctrl+C / ESC) or when zero recommendations are accepted.' But the implementation returns null when there are zero recommendations *total* (before even entering the loop), with the message 'No recommendations to post.' This conflates 'no recommendations exist' with 'user rejected all recommendations' -- both produce the same null return and the same log message.

5. **Missing test for ExitPromptError during `input()` prompt:** The plan says 'All calls to select() and input() from @inquirer/prompts must be wrapped in a try/catch.' The test only tests ExitPromptError thrown by `select()`. There is no test for Ctrl+C during the `input()` call (the 'Enter note' prompt). The implementation's outer try/catch does cover it, but without a test, there is no regression protection for that path.

6. **Missing test for ExitPromptError during the destination prompt:** Similarly, the user could press Ctrl+C at the final destination `select()` prompt. No test covers this specific scenario. The outer try/catch handles it, but it is untested.

7. **Safe-to-ignore display test is fragile:** The test checks that the output contains '8' as the total count, but '8' could appear anywhere in the chalk-formatted output (e.g., in a line number, score, or other numeric context). This is a false-positive-prone assertion.

8. **No test for repo mode summary header:** The plan specifies 'analyzed file count in repo mode' for the header. The test suite never exercises `contextOutput.mode === 'repo'` with `repoFiles` populated to verify the 'Files analyzed:' branch.

9. **`repoFiles` property access without type safety:** The code accesses `contextOutput.repoFiles` but if `repoFiles` is `undefined` and `.length` is called, it would crash. Need a guard.

10. **Extra test not in the plan:** The test 'hides Post as PR comment when context mode is repo' is a good addition not explicitly listed in the plan's test cases.

11. **No visual separator between recommendations in the loop:** The plan says to print recommendation details but the implementation does not print any blank line or separator between consecutive recommendations. After rapid cycles, the terminal output will be a wall of text.
