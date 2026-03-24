import { describe, it, expect } from "vitest";
import { configSchema, partialConfigSchema, defaultConfig } from "./schema.js";

describe("configSchema", () => {
  it("default config is valid", () => {
    const result = configSchema.safeParse(defaultConfig);
    expect(result.success).toBe(true);
  });

  it("rejects negative criticalThreshold", () => {
    const result = configSchema.safeParse({ ...defaultConfig, criticalThreshold: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects criticalThreshold above 10", () => {
    const result = configSchema.safeParse({ ...defaultConfig, criticalThreshold: 11 });
    expect(result.success).toBe(false);
  });

  it("accepts partial config via partialConfigSchema", () => {
    const result = partialConfigSchema.safeParse({ model: "claude-sonnet-4-6" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe("claude-sonnet-4-6");
    }
  });

  it("rejects unknown keys with strict mode", () => {
    const result = configSchema.safeParse({ ...defaultConfig, foo: "bar" });
    expect(result.success).toBe(false);
  });
});
