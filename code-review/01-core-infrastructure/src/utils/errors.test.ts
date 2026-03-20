import { describe, it, expect } from "vitest";
import {
  ConfigError,
  AuthError,
  PipelineError,
  GitHubAPIError,
  ClaudeAPIError,
  URLParseError,
} from "./errors.js";

describe("ConfigError", () => {
  it("has user-friendly message", () => {
    const err = new ConfigError("Missing required field: model");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ConfigError");
    expect(err.message).toContain("Missing required field");
  });
});

describe("PipelineError", () => {
  it("includes agent name and attempt count", () => {
    const cause = new Error("timeout");
    const err = new PipelineError("ContextAgent", 3, cause);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("PipelineError");
    expect(err.agentName).toBe("ContextAgent");
    expect(err.attempts).toBe(3);
    expect(err.message).toContain("ContextAgent");
    expect(err.message).toContain("3");
    expect(err.message).toContain("timeout");
  });
});

describe("AuthError", () => {
  it("suggests remediation steps in message", () => {
    const err = new AuthError("GitHub token not found");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AuthError");
    expect(err.message).toContain("GitHub token not found");
    expect(err.message).toContain("Remediation");
    expect(err.message).toContain("GITHUB_TOKEN");
  });
});

describe("URLParseError", () => {
  it("includes expected format", () => {
    const err = new URLParseError("Invalid URL: foo/bar");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("URLParseError");
    expect(err.message).toContain("Invalid URL");
    expect(err.message).toContain("https://github.com/owner/repo/pull/123");
  });
});

describe("ClaudeAPIError", () => {
  it("includes retryable flag", () => {
    const retryable = new ClaudeAPIError("Validation failed", true);
    expect(retryable).toBeInstanceOf(Error);
    expect(retryable.name).toBe("ClaudeAPIError");
    expect(retryable.retryable).toBe(true);

    const notRetryable = new ClaudeAPIError("Content refused", false);
    expect(notRetryable.retryable).toBe(false);
  });
});

describe("All error types extend Error", () => {
  it("proper prototype chain for all errors", () => {
    const errors = [
      new ConfigError("test"),
      new AuthError("test"),
      new PipelineError("agent", 1, new Error("cause")),
      new GitHubAPIError("test"),
      new ClaudeAPIError("test", false),
      new URLParseError("test"),
    ];
    for (const err of errors) {
      expect(err).toBeInstanceOf(Error);
    }
  });
});
