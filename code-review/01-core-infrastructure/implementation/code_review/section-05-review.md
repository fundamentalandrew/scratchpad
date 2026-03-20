# Code Review: Section 05 - Claude API Client

1. **ClaudeAPIError constructor does not match the spec** (Medium severity). The plan specifies the constructor signature as `constructor(message: string, options: { retryable: boolean; cause?: Error })` taking an options object with a `cause` property. The actual `ClaudeAPIError` in `src/utils/errors.ts` (line 43) takes `(message: string, retryable: boolean)` as positional args, and the implementation in `src/clients/claude.ts` calls it that way. While the implementation is internally consistent with the existing error class, neither matches the plan's specified shape. Notably, the `cause` property is never passed, so if the JSON.parse fails, the original parse error is swallowed entirely -- callers debugging a parse failure in production will have no root cause. The catch block should capture the error and forward it.

2. **`system` prompt is unconditionally omitted rather than set to undefined** (Low severity). `requestParams` is typed as `Record<string, unknown>` and then cast with `as Parameters<...>[0]`. This unsafe cast bypasses all type checking on the request payload. The plan shows a direct object literal passed to `messages.create` -- the implementation should use a properly typed object instead.

3. **No test for JSON parse failure** (Medium severity). The plan's error classification table explicitly lists JSON parse failure as a distinct case (`retryable: true`). There is a test for Zod validation failure and refusal, but no test that returns malformed non-JSON text to exercise the `JSON.parse` catch path.

4. **Verbose logging test is weak** (Low severity). The test only asserts `expect(logger.verbose).toHaveBeenCalled()` but does not verify that `redactSecrets` was actually used on the logged content, which is an explicit plan requirement.

5. **`redactSecrets` is applied to a hardcoded log string, not to user content** (Medium severity). `redactSecrets` is called on a template string containing model name, token counts, and duration -- none of which could contain secrets. The actual message payloads (which could contain API keys in user content) are never logged. This is arguably fine from a security standpoint but means `redactSecrets` is doing nothing useful.

6. **Zod 4 `toJSONSchema()` usage is unguarded** (Low severity). If someone passes a Zod type that does not support JSON Schema conversion (e.g., `z.function()`), this will throw an unhandled error that is not wrapped in `ClaudeAPIError`.

7. **Refusal test uses `mockResolvedValue` instead of `mockResolvedValueOnce`** (Low severity, test hygiene). This leaks mock state if test ordering changes.
