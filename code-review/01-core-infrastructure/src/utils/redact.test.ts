import { describe, it, expect } from "vitest";
import { redactSecrets } from "./redact.js";

describe("redactSecrets", () => {
  it("redacts Anthropic API keys", () => {
    const input = "key is sk-ant-api03-abc123XYZ";
    expect(redactSecrets(input)).toBe("key is [REDACTED]");
  });

  it("redacts GitHub tokens (ghp_, gho_, ghs_, github_pat_)", () => {
    expect(redactSecrets("token: ghp_abc123DEF")).toBe("token: [REDACTED]");
    expect(redactSecrets("token: gho_abc123")).toBe("token: [REDACTED]");
    expect(redactSecrets("token: ghs_abc123")).toBe("token: [REDACTED]");
    expect(redactSecrets("token: github_pat_abc123_DEF")).toBe("token: [REDACTED]");
  });

  it("redacts Authorization header values", () => {
    const input = "Authorization: Bearer eyJhbGciOiJIUz.payload.sig";
    expect(redactSecrets(input)).toContain("[REDACTED]");
    expect(redactSecrets(input)).not.toContain("eyJhbGciOiJIUz");
  });

  it("preserves non-secret content unchanged", () => {
    const input = "This is a normal log message with no secrets";
    expect(redactSecrets(input)).toBe(input);
  });

  it("handles null/undefined input gracefully", () => {
    expect(redactSecrets(null as unknown as string)).toBe("");
    expect(redactSecrets(undefined as unknown as string)).toBe("");
  });

  it("redacts multiple secrets in same string", () => {
    const input = "api=sk-ant-key123 token=ghp_abc456";
    const result = redactSecrets(input);
    expect(result).not.toContain("sk-ant-key123");
    expect(result).not.toContain("ghp_abc456");
    expect(result.match(/\[REDACTED\]/g)?.length).toBe(2);
  });
});
