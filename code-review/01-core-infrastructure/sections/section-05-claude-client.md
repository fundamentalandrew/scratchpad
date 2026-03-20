

# Section 05: Claude API Client

## Overview

This section implements a thin wrapper around the `@anthropic-ai/sdk` that provides structured output via Zod schemas, content block extraction, token tracking, and error classification. The client lives at `src/clients/claude.ts` with tests at `src/clients/claude.test.ts`.

## Dependencies

- **section-02-shared-types**: Zod schemas from `src/agents/schemas.ts` are used as the `schema` parameter in `query()`. The `ClaudeAPIError` error type from the shared error hierarchy (with its `retryable` flag) is used for error classification.
- **section-04-utils**: The `Logger` instance from `src/utils/logger.ts` is injected into the client constructor for verbose logging. The `redactSecrets` utility from `src/utils/redact.ts` is used when logging payloads.

## File to Create

`/Users/andrew/Code/scratchpad/code-review/src/clients/claude.ts`

## Tests (Write First)

Create `/Users/andrew/Code/scratchpad/code-review/src/clients/claude.test.ts`.

Mock the Anthropic SDK -- do not make real API calls. Use `vi.mock('@anthropic-ai/sdk')` to replace the SDK module.

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

### Test Strategy

Each test should create a `ClaudeClient` instance with a mocked Anthropic SDK. The mock should return controlled responses from `client.messages.create()`. For the logger, create a simple spy object with `info`, `verbose`, `error`, `warn`, and `success` methods using `vi.fn()`.

A typical mock response shape from the SDK:

```typescript
{
  id: "msg_xxx",
  type: "message",
  role: "assistant",
  content: [{ type: "text", text: '{"key": "value"}' }],
  model: "claude-sonnet-4-5-20250514",
  stop_reason: "end_turn",
  usage: { input_tokens: 100, output_tokens: 50 }
}
```

For the multi-block extraction test, return a response with multiple content blocks (e.g., a `text` block followed by another `text` block). The client should concatenate all text blocks, not just read `content[0]`.

For the refusal test, set `stop_reason: "refusal"` in the mock response.

For the Zod validation failure test, return valid JSON that does not match the provided Zod schema.

## Implementation Details

### Constructor

```typescript
/** Signature only -- implement fully */
class ClaudeClient {
  constructor(options: {
    apiKey: string;
    model?: string;       // default: "claude-sonnet-4-5-20250514"
    maxRetries?: number;  // default: 3, passed to SDK's own retry config
    logger?: Logger;
  })
}
```

- Instantiate the Anthropic SDK client: `new Anthropic({ apiKey, maxRetries })`
- Store model name, logger reference, and initialize cumulative token counters (`totalInputTokens`, `totalOutputTokens`) to zero.

### `query<T>(options)` Method

```typescript
/** Signature only -- implement fully */
async query<T>(options: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  schema: ZodSchema<T>;
  systemPrompt?: string;
  maxTokens?: number;  // default: 4096
}): Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }>
```

Step-by-step behavior:

1. **Convert Zod schema to JSON Schema.** Use Zod's built-in `.toJSONSchema()` method (available in Zod 4+) or the `zod-to-json-schema` library. The resulting JSON Schema object is passed as `output_config.format`.

2. **Call the Anthropic SDK.**
   ```typescript
   const response = await this.client.messages.create({
     model: this.model,
     max_tokens: options.maxTokens ?? 4096,
     system: options.systemPrompt,  // omit if undefined
     messages: options.messages,
     output_config: {
       format: {
         type: "json_schema",
         schema: jsonSchema,
       }
     }
   });
   ```

3. **Check for refusal.** If `response.stop_reason === "refusal"`, throw a `ClaudeAPIError` with `retryable: false` and a message indicating the model refused the request.

4. **Extract text from content blocks.** Iterate over `response.content`, filter for blocks where `block.type === "text"`, and join their `.text` properties. Do NOT blindly access `content[0].text` -- responses may have multiple content blocks.

5. **Parse JSON.** Call `JSON.parse()` on the extracted text. Wrap in try/catch; if JSON parsing fails, throw `ClaudeAPIError` with `retryable: true`.

6. **Validate with Zod.** Call `schema.safeParse(parsed)`. If validation fails, throw `ClaudeAPIError` with `retryable: true` and include the Zod error details in the message. The rationale for `retryable: true` is that the LLM may produce valid output on the next attempt.

7. **Update cumulative token usage.** Add `response.usage.input_tokens` and `response.usage.output_tokens` to the running totals.

8. **Log in verbose mode.** If a logger is present, log the model name, token counts for this call, and call duration. Use `redactSecrets()` on any logged content to prevent accidental key leakage.

9. **Return result.** Return `{ data: validatedResult.data, usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens } }`.

### Retry Strategy -- Single Layer Only

The Anthropic SDK already handles network/transient retries internally (controlled by the `maxRetries` constructor option). The `ClaudeClient` wrapper does NOT add its own retry logic. Retries for agent-level failures (e.g., Zod validation failure) happen in the pipeline runner (section-07) only. This avoids multiplicative retry stacking (SDK retries x wrapper retries x runner retries).

### Error Classification

The `ClaudeAPIError` class (defined in section-02 or section-04 as part of the error hierarchy) must have a `retryable: boolean` property. The claude client uses it as follows:

| Condition | `retryable` | Rationale |
|---|---|---|
| Zod validation failure | `true` | LLM output is nondeterministic; retry may produce valid output |
| JSON parse failure | `true` | Same as above |
| Model refusal (`stop_reason: "refusal"`) | `false` | Retrying the same prompt will likely be refused again |
| SDK errors (rate limit, network) | N/A | Handled internally by the SDK; never reach wrapper code |

### Cumulative Token Tracking

The client exposes a method or getter to retrieve total tokens used across all calls in the client's lifetime:

```typescript
/** Signature only */
getTokenUsage(): { totalInputTokens: number; totalOutputTokens: number }
```

This is used by the pipeline runner to report total token consumption at the end of a run.

### Error Type Reference

The `ClaudeAPIError` should follow this shape (defined in the error hierarchy, likely `src/utils/errors.ts`):

```typescript
class ClaudeAPIError extends Error {
  readonly retryable: boolean;
  constructor(message: string, options: { retryable: boolean; cause?: Error });
}
```

## Runtime Dependencies

- `@anthropic-ai/sdk` -- the official Anthropic SDK (already in project dependencies from section-01)
- `zod` -- for schema validation and JSON Schema generation
- `zod-to-json-schema` -- if Zod's built-in `.toJSONSchema()` is not available; check which Zod version is installed. If using Zod 3.x, you need this package. If using Zod 4+, the built-in method works.

## Key Design Decisions

- **No streaming**: Structured output requires a complete response, so batch mode is used exclusively.
- **DI for logger**: The logger is injected via constructor, not imported as a global. This makes tests clean and avoids shared state issues with Vitest parallelism.
- **Generic `query<T>`**: The method is generic over the Zod schema's inferred type, so callers get full type safety on the returned `data` field.
- **Content block iteration**: The implementation must handle multiple text blocks in a response by concatenating them, rather than assuming a single block at index 0.