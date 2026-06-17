import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "./loader.js";
import { ConfigError } from "../utils/errors.js";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "config-test-"));
}

function rimraf(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe("loadConfig", () => {
  let tmpDir: string;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    tmpDir = createTempDir();
    savedEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    savedEnv.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    rimraf(tmpDir);
    if (savedEnv.ANTHROPIC_API_KEY !== undefined) {
      process.env.ANTHROPIC_API_KEY = savedEnv.ANTHROPIC_API_KEY;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    if (savedEnv.GITHUB_TOKEN !== undefined) {
      process.env.GITHUB_TOKEN = savedEnv.GITHUB_TOKEN;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
  });

  it("loads .codereview.json from current directory", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".codereview.json"),
      JSON.stringify({ criticalThreshold: 5 }),
    );
    const config = loadConfig({ startDir: tmpDir });
    expect(config.criticalThreshold).toBe(5);
  });

  it("walks up directory tree and finds config in parent", () => {
    const parent = tmpDir;
    const child = path.join(parent, "child");
    fs.mkdirSync(path.join(parent, ".git"), { recursive: true });
    fs.mkdirSync(child, { recursive: true });
    fs.writeFileSync(
      path.join(parent, ".codereview.json"),
      JSON.stringify({ criticalThreshold: 3 }),
    );
    const config = loadConfig({ startDir: child });
    expect(config.criticalThreshold).toBe(3);
  });

  it("stops walking at git root (.git directory boundary)", () => {
    const grandparent = tmpDir;
    const parent = path.join(grandparent, "parent");
    const child = path.join(parent, "child");
    fs.mkdirSync(child, { recursive: true });
    fs.mkdirSync(path.join(parent, ".git"), { recursive: true });
    // Config above git root — should NOT be found
    fs.writeFileSync(
      path.join(grandparent, ".codereview.json"),
      JSON.stringify({ criticalThreshold: 1 }),
    );
    const config = loadConfig({ startDir: child });
    expect(config.criticalThreshold).toBe(8); // default
  });

  it("--config flag overrides discovery", () => {
    const customPath = path.join(tmpDir, "custom-config.json");
    fs.writeFileSync(customPath, JSON.stringify({ criticalThreshold: 7 }));
    const config = loadConfig({ configPath: customPath });
    expect(config.criticalThreshold).toBe(7);
  });

  it("returns defaults when no config file found", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    const config = loadConfig({ startDir: tmpDir });
    expect(config.criticalThreshold).toBe(8);
    expect(config.model).toBe("claude-sonnet-4-6");
    expect(config.output.console).toBe(true);
  });

  it("merges config file values over defaults", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".codereview.json"),
      JSON.stringify({ criticalThreshold: 5 }),
    );
    const config = loadConfig({ startDir: tmpDir });
    expect(config.criticalThreshold).toBe(5);
    expect(config.model).toBe("claude-sonnet-4-6"); // default preserved
  });

  it("environment variables override config file values (ANTHROPIC_API_KEY)", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".codereview.json"),
      JSON.stringify({ apiKey: "file-key" }),
    );
    process.env.ANTHROPIC_API_KEY = "test-key";
    const config = loadConfig({ startDir: tmpDir });
    expect(config.apiKey).toBe("test-key");
  });

  it("environment variables override config file values (GITHUB_TOKEN)", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    process.env.GITHUB_TOKEN = "ghp_test";
    const config = loadConfig({ startDir: tmpDir });
    expect(config.githubToken).toBe("ghp_test");
  });

  it("handles malformed JSON gracefully with clear error", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".codereview.json"), "{ bad json");
    expect(() => loadConfig({ startDir: tmpDir })).toThrow(
      expect.objectContaining({
        message: expect.stringContaining("Invalid JSON"),
      }),
    );
  });

  it("handles missing file at --config path with clear error", () => {
    expect(() =>
      loadConfig({ configPath: "/tmp/nonexistent-config-12345.json" }),
    ).toThrow(
      expect.objectContaining({
        message: expect.stringContaining("/tmp/nonexistent-config-12345.json"),
      }),
    );
  });

  it("CLI flags override all other sources", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".codereview.json"),
      JSON.stringify({ criticalThreshold: 5, model: "file-model" }),
    );
    process.env.ANTHROPIC_API_KEY = "env-key";
    const config = loadConfig({
      startDir: tmpDir,
      cliFlags: { criticalThreshold: 2, apiKey: "cli-key" },
    });
    expect(config.criticalThreshold).toBe(2); // CLI beats file
    expect(config.apiKey).toBe("cli-key"); // CLI beats env
    expect(config.model).toBe("file-model"); // file still applies for non-overridden
  });

  it("deep merges the output sub-object", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".codereview.json"),
      JSON.stringify({ output: { markdown: true } }),
    );
    const config = loadConfig({ startDir: tmpDir });
    expect(config.output.markdown).toBe(true);
    expect(config.output.console).toBe(true); // default preserved
    expect(config.output.markdownPath).toBe("./code-review-report.md"); // default preserved
  });

  it("rejects unknown keys in config file", () => {
    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".codereview.json"),
      JSON.stringify({ igorePatterns: ["*.log"] }),
    );
    expect(() => loadConfig({ startDir: tmpDir })).toThrow(ConfigError);
  });
});
