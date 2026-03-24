import Anthropic from "@anthropic-ai/sdk";
import type { Message, MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages.js";
import type { ZodSchema } from "zod";
import { ClaudeAPIError } from "../utils/errors.js";
import { redactSecrets } from "../utils/redact.js";
import type { Logger } from "../utils/logger.js";

export class ClaudeClient {
  private client: Anthropic;
  private model: string;
  private logger?: Logger;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  constructor(options: {
    apiKey: string;
    model?: string;
    maxRetries?: number;
    logger?: Logger;
  }) {
    this.client = new Anthropic({
      apiKey: options.apiKey,
      maxRetries: options.maxRetries ?? 3,
    });
    this.model = options.model ?? "claude-sonnet-4-6";
    this.logger = options.logger;
  }

  async query<T>(options: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    schema: ZodSchema<T>;
    systemPrompt?: string;
    maxTokens?: number;
  }): Promise<{ data: T; usage: { inputTokens: number; outputTokens: number } }> {
    const jsonSchema = stripUnsupportedProperties(options.schema.toJSONSchema()) as Record<string, unknown>;

    const requestParams: MessageCreateParamsNonStreaming = {
      model: this.model,
      max_tokens: options.maxTokens ?? 4096,
      messages: options.messages,
      output_config: {
        format: {
          type: "json_schema",
          schema: jsonSchema,
        },
      },
      ...(options.systemPrompt !== undefined ? { system: options.systemPrompt } : {}),
    };

    const startTime = Date.now();
    const response: Message = await this.client.messages.create(requestParams);
    const duration = Date.now() - startTime;

    if (response.stop_reason === "refusal") {
      throw new ClaudeAPIError("Model refused the request", false);
    }

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new ClaudeAPIError("Failed to parse JSON from response", true, { cause: e as Error });
    }

    const result = options.schema.safeParse(parsed);
    if (!result.success) {
      throw new ClaudeAPIError(
        `Zod validation failed: ${result.error.message}`,
        true,
      );
    }

    this.totalInputTokens += response.usage.input_tokens;
    this.totalOutputTokens += response.usage.output_tokens;

    if (this.logger) {
      this.logger.verbose(
        redactSecrets(
          `Claude API call: model=${this.model} input_tokens=${response.usage.input_tokens} output_tokens=${response.usage.output_tokens} duration=${duration}ms`,
        ),
      );
    }

    return {
      data: result.data,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  getTokenUsage(): { totalInputTokens: number; totalOutputTokens: number } {
    return {
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
    };
  }
}

const UNSUPPORTED_NUMBER_PROPS = ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"];

function stripUnsupportedProperties(schema: unknown): unknown {
  if (schema === null || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(stripUnsupportedProperties);

  const obj = schema as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (obj.type === "number" && UNSUPPORTED_NUMBER_PROPS.includes(key)) {
      continue;
    }
    result[key] = stripUnsupportedProperties(value);
  }

  return result;
}
