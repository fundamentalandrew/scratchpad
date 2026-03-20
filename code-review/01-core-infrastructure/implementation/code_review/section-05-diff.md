diff --git a/code-review/01-core-infrastructure/src/clients/claude.test.ts b/code-review/01-core-infrastructure/src/clients/claude.test.ts
new file mode 100644
index 0000000..531c73f
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/clients/claude.test.ts
@@ -0,0 +1,233 @@
+import { describe, it, expect, vi, beforeEach } from "vitest";
+import { z } from "zod";
+import { ClaudeClient } from "./claude.js";
+import { ClaudeAPIError } from "../utils/errors.js";
+import type { Logger } from "../utils/logger.js";
+
+const mockCreate = vi.hoisted(() => vi.fn());
+
+vi.mock("@anthropic-ai/sdk", () => {
+  class MockAnthropic {
+    messages = { create: mockCreate };
+    constructor(public _options: Record<string, unknown>) {}
+  }
+  return { default: MockAnthropic };
+});
+
+function createMockLogger(): Logger {
+  return {
+    info: vi.fn(),
+    verbose: vi.fn(),
+    error: vi.fn(),
+    warn: vi.fn(),
+    success: vi.fn(),
+  };
+}
+
+function makeResponse(overrides: Record<string, unknown> = {}) {
+  return {
+    id: "msg_test",
+    type: "message",
+    role: "assistant",
+    content: [{ type: "text", text: '{"name":"Alice","age":30}' }],
+    model: "claude-sonnet-4-5-20250514",
+    stop_reason: "end_turn",
+    usage: { input_tokens: 100, output_tokens: 50 },
+    ...overrides,
+  };
+}
+
+const TestSchema = z.object({
+  name: z.string(),
+  age: z.number(),
+});
+
+describe("ClaudeClient", () => {
+  beforeEach(() => {
+    vi.clearAllMocks();
+  });
+
+  it("constructor creates Anthropic client with provided API key", () => {
+    const client = new ClaudeClient({ apiKey: "sk-ant-test-key" });
+    // Verify the client was created successfully (no throw)
+    expect(client).toBeInstanceOf(ClaudeClient);
+    expect(client.getTokenUsage()).toEqual({
+      totalInputTokens: 0,
+      totalOutputTokens: 0,
+    });
+  });
+
+  it("query() sends output_config.format with JSON Schema from Zod schema", async () => {
+    mockCreate.mockResolvedValueOnce(makeResponse());
+    const client = new ClaudeClient({ apiKey: "sk-ant-test-key" });
+
+    await client.query({
+      messages: [{ role: "user", content: "test" }],
+      schema: TestSchema,
+    });
+
+    expect(mockCreate).toHaveBeenCalledWith(
+      expect.objectContaining({
+        output_config: expect.objectContaining({
+          format: expect.objectContaining({
+            type: "json_schema",
+            schema: expect.any(Object),
+          }),
+        }),
+      }),
+    );
+  });
+
+  it("query() extracts text from content blocks correctly (not just content[0])", async () => {
+    mockCreate.mockResolvedValueOnce(
+      makeResponse({
+        content: [
+          { type: "text", text: '{"name":"Al' },
+          { type: "text", text: 'ice","age":30}' },
+        ],
+      }),
+    );
+    const client = new ClaudeClient({ apiKey: "sk-ant-test-key" });
+
+    const result = await client.query({
+      messages: [{ role: "user", content: "test" }],
+      schema: TestSchema,
+    });
+
+    expect(result.data).toEqual({ name: "Alice", age: 30 });
+  });
+
+  it("query() parses and validates response against Zod schema", async () => {
+    mockCreate.mockResolvedValueOnce(makeResponse());
+    const client = new ClaudeClient({ apiKey: "sk-ant-test-key" });
+
+    const result = await client.query({
+      messages: [{ role: "user", content: "test" }],
+      schema: TestSchema,
+    });
+
+    expect(result.data).toEqual({ name: "Alice", age: 30 });
+  });
+
+  it("query() returns typed data and usage stats on success", async () => {
+    mockCreate.mockResolvedValueOnce(makeResponse());
+    const client = new ClaudeClient({ apiKey: "sk-ant-test-key" });
+
+    const result = await client.query({
+      messages: [{ role: "user", content: "test" }],
+      schema: TestSchema,
+    });
+
+    expect(result.data.name).toBe("Alice");
+    expect(result.data.age).toBe(30);
+    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 50 });
+  });
+
+  it("query() throws ClaudeAPIError with retryable=false on refusal", async () => {
+    mockCreate.mockResolvedValue(makeResponse({ stop_reason: "refusal" }));
+    const client = new ClaudeClient({ apiKey: "sk-ant-test-key" });
+
+    try {
+      await client.query({
+        messages: [{ role: "user", content: "test" }],
+        schema: TestSchema,
+      });
+      expect.fail("Should have thrown");
+    } catch (e) {
+      expect(e).toBeInstanceOf(ClaudeAPIError);
+      expect((e as ClaudeAPIError).retryable).toBe(false);
+    }
+  });
+
+  it("query() throws ClaudeAPIError with retryable=true on Zod validation failure", async () => {
+    mockCreate.mockResolvedValueOnce(
+      makeResponse({
+        content: [{ type: "text", text: '{"name":"Alice","age":"not-a-number"}' }],
+      }),
+    );
+    const client = new ClaudeClient({ apiKey: "sk-ant-test-key" });
+
+    try {
+      await client.query({
+        messages: [{ role: "user", content: "test" }],
+        schema: TestSchema,
+      });
+      expect.fail("Should have thrown");
+    } catch (e) {
+      expect(e).toBeInstanceOf(ClaudeAPIError);
+      expect((e as ClaudeAPIError).retryable).toBe(true);
+    }
+  });
+
+  it("query() passes system prompt when provided", async () => {
+    mockCreate.mockResolvedValueOnce(makeResponse());
+    const client = new ClaudeClient({ apiKey: "sk-ant-test-key" });
+
+    await client.query({
+      messages: [{ role: "user", content: "test" }],
+      schema: TestSchema,
+      systemPrompt: "You are a helpful assistant.",
+    });
+
+    expect(mockCreate).toHaveBeenCalledWith(
+      expect.objectContaining({
+        system: "You are a helpful assistant.",
+      }),
+    );
+  });
+
+  it("query() uses default maxTokens when not specified", async () => {
+    mockCreate.mockResolvedValueOnce(makeResponse());
+    const client = new ClaudeClient({ apiKey: "sk-ant-test-key" });
+
+    await client.query({
+      messages: [{ role: "user", content: "test" }],
+      schema: TestSchema,
+    });
+
+    expect(mockCreate).toHaveBeenCalledWith(
+      expect.objectContaining({
+        max_tokens: 4096,
+      }),
+    );
+  });
+
+  it("query() tracks cumulative token usage across multiple calls", async () => {
+    mockCreate
+      .mockResolvedValueOnce(makeResponse())
+      .mockResolvedValueOnce(
+        makeResponse({ usage: { input_tokens: 200, output_tokens: 100 } }),
+      );
+    const client = new ClaudeClient({ apiKey: "sk-ant-test-key" });
+
+    await client.query({
+      messages: [{ role: "user", content: "call 1" }],
+      schema: TestSchema,
+    });
+    await client.query({
+      messages: [{ role: "user", content: "call 2" }],
+      schema: TestSchema,
+    });
+
+    expect(client.getTokenUsage()).toEqual({
+      totalInputTokens: 300,
+      totalOutputTokens: 150,
+    });
+  });
+
+  it("query() logs API call details in verbose mode", async () => {
+    mockCreate.mockResolvedValueOnce(makeResponse());
+    const logger = createMockLogger();
+    const client = new ClaudeClient({
+      apiKey: "sk-ant-test-key",
+      logger,
+    });
+
+    await client.query({
+      messages: [{ role: "user", content: "test" }],
+      schema: TestSchema,
+    });
+
+    expect(logger.verbose).toHaveBeenCalled();
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/clients/claude.ts b/code-review/01-core-infrastructure/src/clients/claude.ts
new file mode 100644
index 0000000..e2fa9fd
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/clients/claude.ts
@@ -0,0 +1,106 @@
+import Anthropic from "@anthropic-ai/sdk";
+import type { ZodSchema } from "zod";
+import { ClaudeAPIError } from "../utils/errors.js";
+import { redactSecrets } from "../utils/redact.js";
+import type { Logger } from "../utils/logger.js";
+
+export class ClaudeClient {
+  private client: Anthropic;
+  private model: string;
+  private logger?: Logger;
+  private totalInputTokens = 0;
+  private totalOutputTokens = 0;
+
+  constructor(options: {
+    apiKey: string;
+    model?: string;
+    maxRetries?: number;
+    logger?: Logger;
+  }) {
+    this.client = new Anthropic({
+      apiKey: options.apiKey,
+      maxRetries: options.maxRetries ?? 3,
+    });
+    this.model = options.model ?? "claude-sonnet-4-5-20250514";
+    this.logger = options.logger;
+  }
+
+  async query<T>(options: {
+    messages: Array<{ role: "user" | "assistant"; content: string }>;
+    schema: ZodSchema<T>;
+    systemPrompt?: string;
+    maxTokens?: number;
+  }): Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }> {
+    const jsonSchema = options.schema.toJSONSchema();
+
+    const requestParams: Record<string, unknown> = {
+      model: this.model,
+      max_tokens: options.maxTokens ?? 4096,
+      messages: options.messages,
+      output_config: {
+        format: {
+          type: "json_schema",
+          schema: jsonSchema,
+        },
+      },
+    };
+
+    if (options.systemPrompt !== undefined) {
+      requestParams.system = options.systemPrompt;
+    }
+
+    const startTime = Date.now();
+    const response = await this.client.messages.create(requestParams as Parameters<typeof this.client.messages.create>[0]);
+    const duration = Date.now() - startTime;
+
+    if (response.stop_reason === "refusal") {
+      throw new ClaudeAPIError("Model refused the request", false);
+    }
+
+    const text = response.content
+      .filter((block): block is { type: "text"; text: string } => block.type === "text")
+      .map((block) => block.text)
+      .join("");
+
+    let parsed: unknown;
+    try {
+      parsed = JSON.parse(text);
+    } catch {
+      throw new ClaudeAPIError("Failed to parse JSON from response", true);
+    }
+
+    const result = options.schema.safeParse(parsed);
+    if (!result.success) {
+      throw new ClaudeAPIError(
+        `Zod validation failed: ${result.error.message}`,
+        true,
+      );
+    }
+
+    this.totalInputTokens += response.usage.input_tokens;
+    this.totalOutputTokens += response.usage.output_tokens;
+
+    if (this.logger) {
+      this.logger.verbose(
+        redactSecrets(
+          `Claude API call: model=${this.model} input_tokens=${response.usage.input_tokens} output_tokens=${response.usage.output_tokens} duration=${duration}ms`,
+        ),
+      );
+    }
+
+    return {
+      data: result.data,
+      usage: {
+        inputTokens: response.usage.input_tokens,
+        outputTokens: response.usage.output_tokens,
+      },
+    };
+  }
+
+  getTokenUsage(): { totalInputTokens: number; totalOutputTokens: number } {
+    return {
+      totalInputTokens: this.totalInputTokens,
+      totalOutputTokens: this.totalOutputTokens,
+    };
+  }
+}
