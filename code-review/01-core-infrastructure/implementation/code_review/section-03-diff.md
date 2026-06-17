diff --git a/code-review/01-core-infrastructure/src/config/loader.test.ts b/code-review/01-core-infrastructure/src/config/loader.test.ts
new file mode 100644
index 0000000..6d36929
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/config/loader.test.ts
@@ -0,0 +1,135 @@
+import { describe, it, expect, beforeEach, afterEach } from "vitest";
+import fs from "node:fs";
+import os from "node:os";
+import path from "node:path";
+import { loadConfig } from "./loader.js";
+import { ConfigError } from "../utils/errors.js";
+
+function createTempDir(): string {
+  return fs.mkdtempSync(path.join(os.tmpdir(), "config-test-"));
+}
+
+function rimraf(dir: string): void {
+  fs.rmSync(dir, { recursive: true, force: true });
+}
+
+describe("loadConfig", () => {
+  let tmpDir: string;
+  const savedEnv: Record<string, string | undefined> = {};
+
+  beforeEach(() => {
+    tmpDir = createTempDir();
+    savedEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
+    savedEnv.GITHUB_TOKEN = process.env.GITHUB_TOKEN;
+    delete process.env.ANTHROPIC_API_KEY;
+    delete process.env.GITHUB_TOKEN;
+  });
+
+  afterEach(() => {
+    rimraf(tmpDir);
+    if (savedEnv.ANTHROPIC_API_KEY !== undefined) {
+      process.env.ANTHROPIC_API_KEY = savedEnv.ANTHROPIC_API_KEY;
+    } else {
+      delete process.env.ANTHROPIC_API_KEY;
+    }
+    if (savedEnv.GITHUB_TOKEN !== undefined) {
+      process.env.GITHUB_TOKEN = savedEnv.GITHUB_TOKEN;
+    } else {
+      delete process.env.GITHUB_TOKEN;
+    }
+  });
+
+  it("loads .codereview.json from current directory", () => {
+    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
+    fs.writeFileSync(
+      path.join(tmpDir, ".codereview.json"),
+      JSON.stringify({ criticalThreshold: 5 }),
+    );
+    const config = loadConfig({ startDir: tmpDir });
+    expect(config.criticalThreshold).toBe(5);
+  });
+
+  it("walks up directory tree and finds config in parent", () => {
+    const parent = tmpDir;
+    const child = path.join(parent, "child");
+    fs.mkdirSync(path.join(parent, ".git"), { recursive: true });
+    fs.mkdirSync(child, { recursive: true });
+    fs.writeFileSync(
+      path.join(parent, ".codereview.json"),
+      JSON.stringify({ criticalThreshold: 3 }),
+    );
+    const config = loadConfig({ startDir: child });
+    expect(config.criticalThreshold).toBe(3);
+  });
+
+  it("stops walking at git root (.git directory boundary)", () => {
+    const grandparent = tmpDir;
+    const parent = path.join(grandparent, "parent");
+    const child = path.join(parent, "child");
+    fs.mkdirSync(child, { recursive: true });
+    fs.mkdirSync(path.join(parent, ".git"), { recursive: true });
+    // Config above git root — should NOT be found
+    fs.writeFileSync(
+      path.join(grandparent, ".codereview.json"),
+      JSON.stringify({ criticalThreshold: 1 }),
+    );
+    const config = loadConfig({ startDir: child });
+    expect(config.criticalThreshold).toBe(8); // default
+  });
+
+  it("--config flag overrides discovery", () => {
+    const customPath = path.join(tmpDir, "custom-config.json");
+    fs.writeFileSync(customPath, JSON.stringify({ criticalThreshold: 7 }));
+    const config = loadConfig({ configPath: customPath });
+    expect(config.criticalThreshold).toBe(7);
+  });
+
+  it("returns defaults when no config file found", () => {
+    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
+    const config = loadConfig({ startDir: tmpDir });
+    expect(config.criticalThreshold).toBe(8);
+    expect(config.model).toBe("claude-sonnet-4-5-20250514");
+    expect(config.output.console).toBe(true);
+  });
+
+  it("merges config file values over defaults", () => {
+    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
+    fs.writeFileSync(
+      path.join(tmpDir, ".codereview.json"),
+      JSON.stringify({ criticalThreshold: 5 }),
+    );
+    const config = loadConfig({ startDir: tmpDir });
+    expect(config.criticalThreshold).toBe(5);
+    expect(config.model).toBe("claude-sonnet-4-5-20250514"); // default preserved
+  });
+
+  it("environment variables override config file values (ANTHROPIC_API_KEY)", () => {
+    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
+    fs.writeFileSync(
+      path.join(tmpDir, ".codereview.json"),
+      JSON.stringify({ apiKey: "file-key" }),
+    );
+    process.env.ANTHROPIC_API_KEY = "test-key";
+    const config = loadConfig({ startDir: tmpDir });
+    expect(config.apiKey).toBe("test-key");
+  });
+
+  it("environment variables override config file values (GITHUB_TOKEN)", () => {
+    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
+    process.env.GITHUB_TOKEN = "ghp_test";
+    const config = loadConfig({ startDir: tmpDir });
+    expect(config.githubToken).toBe("ghp_test");
+  });
+
+  it("handles malformed JSON gracefully with clear error", () => {
+    fs.mkdirSync(path.join(tmpDir, ".git"), { recursive: true });
+    fs.writeFileSync(path.join(tmpDir, ".codereview.json"), "{ bad json");
+    expect(() => loadConfig({ startDir: tmpDir })).toThrow(ConfigError);
+  });
+
+  it("handles missing file at --config path with clear error", () => {
+    expect(() =>
+      loadConfig({ configPath: "/tmp/nonexistent-config-12345.json" }),
+    ).toThrow(ConfigError);
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/config/loader.ts b/code-review/01-core-infrastructure/src/config/loader.ts
new file mode 100644
index 0000000..012bf24
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/config/loader.ts
@@ -0,0 +1,99 @@
+import fs from "node:fs";
+import path from "node:path";
+import { configSchema, partialConfigSchema, defaultConfig } from "./schema.js";
+import type { CodeReviewConfig } from "./schema.js";
+import { ConfigError } from "../utils/errors.js";
+
+const CONFIG_FILENAME = ".codereview.json";
+
+function discoverConfigFile(startDir: string): string | null {
+  let current = path.resolve(startDir);
+
+  for (;;) {
+    const configPath = path.join(current, CONFIG_FILENAME);
+    if (fs.existsSync(configPath)) {
+      return configPath;
+    }
+    const gitDir = path.join(current, ".git");
+    if (fs.existsSync(gitDir)) {
+      return null; // reached git root without finding config
+    }
+    const parent = path.dirname(current);
+    if (parent === current) {
+      return null; // filesystem root
+    }
+    current = parent;
+  }
+}
+
+export function loadConfig(options?: {
+  configPath?: string;
+  cliFlags?: Partial<CodeReviewConfig>;
+  startDir?: string;
+}): CodeReviewConfig {
+  let fileConfig: Record<string, unknown> = {};
+
+  // Step 1: Discovery or direct load
+  if (options?.configPath) {
+    if (!fs.existsSync(options.configPath)) {
+      throw new ConfigError(`Config file not found: ${options.configPath}`);
+    }
+    const raw = fs.readFileSync(options.configPath, "utf-8");
+    try {
+      fileConfig = JSON.parse(raw) as Record<string, unknown>;
+    } catch {
+      throw new ConfigError(`Invalid JSON in config file: ${options.configPath}`);
+    }
+  } else {
+    const discovered = discoverConfigFile(options?.startDir ?? process.cwd());
+    if (discovered) {
+      const raw = fs.readFileSync(discovered, "utf-8");
+      try {
+        fileConfig = JSON.parse(raw) as Record<string, unknown>;
+      } catch {
+        throw new ConfigError(`Invalid JSON in config file: ${discovered}`);
+      }
+    }
+  }
+
+  // Step 2: Validate file config against partial schema
+  const partialResult = partialConfigSchema.safeParse(fileConfig);
+  if (!partialResult.success) {
+    const issues = partialResult.error.issues
+      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
+      .join("\n");
+    throw new ConfigError(`Invalid config values:\n${issues}`);
+  }
+
+  // Step 3: Merge in priority order: defaults < file < env < CLI flags
+  const envOverrides: Record<string, unknown> = {};
+  if (process.env.ANTHROPIC_API_KEY) {
+    envOverrides.apiKey = process.env.ANTHROPIC_API_KEY;
+  }
+  if (process.env.GITHUB_TOKEN) {
+    envOverrides.githubToken = process.env.GITHUB_TOKEN;
+  }
+
+  const merged = {
+    ...defaultConfig,
+    ...partialResult.data,
+    ...envOverrides,
+    ...(options?.cliFlags ?? {}),
+    output: {
+      ...defaultConfig.output,
+      ...(partialResult.data.output ?? {}),
+      ...(options?.cliFlags?.output ?? {}),
+    },
+  };
+
+  // Step 4: Validate final merged config
+  const finalResult = configSchema.safeParse(merged);
+  if (!finalResult.success) {
+    const issues = finalResult.error.issues
+      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
+      .join("\n");
+    throw new ConfigError(`Invalid final config:\n${issues}`);
+  }
+
+  return finalResult.data;
+}
diff --git a/code-review/01-core-infrastructure/src/config/schema.test.ts b/code-review/01-core-infrastructure/src/config/schema.test.ts
new file mode 100644
index 0000000..029590e
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/config/schema.test.ts
@@ -0,0 +1,32 @@
+import { describe, it, expect } from "vitest";
+import { configSchema, partialConfigSchema, defaultConfig } from "./schema.js";
+
+describe("configSchema", () => {
+  it("default config is valid", () => {
+    const result = configSchema.safeParse(defaultConfig);
+    expect(result.success).toBe(true);
+  });
+
+  it("rejects negative criticalThreshold", () => {
+    const result = configSchema.safeParse({ ...defaultConfig, criticalThreshold: -1 });
+    expect(result.success).toBe(false);
+  });
+
+  it("rejects criticalThreshold above 10", () => {
+    const result = configSchema.safeParse({ ...defaultConfig, criticalThreshold: 11 });
+    expect(result.success).toBe(false);
+  });
+
+  it("accepts partial config via partialConfigSchema", () => {
+    const result = partialConfigSchema.safeParse({ model: "claude-sonnet-4-5-20250514" });
+    expect(result.success).toBe(true);
+    if (result.success) {
+      expect(result.data.model).toBe("claude-sonnet-4-5-20250514");
+    }
+  });
+
+  it("rejects unknown keys with strict mode", () => {
+    const result = configSchema.safeParse({ ...defaultConfig, foo: "bar" });
+    expect(result.success).toBe(false);
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/config/schema.ts b/code-review/01-core-infrastructure/src/config/schema.ts
new file mode 100644
index 0000000..d526517
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/config/schema.ts
@@ -0,0 +1,33 @@
+import { z } from "zod";
+
+const DEFAULT_IGNORE_PATTERNS = [
+  "node_modules/**", "dist/**", "build/**", "coverage/**",
+  ".next/**", "vendor/**", "*.lock", "*.min.*", ".git/**",
+  "*.png", "*.jpg", "*.svg", "*.gif", "*.ico",
+  "*.woff", "*.woff2", ".turbo/**", ".pnpm-store/**",
+];
+
+const outputSchema = z.object({
+  console: z.boolean().default(true),
+  markdown: z.boolean().default(false),
+  markdownPath: z.string().default("./code-review-report.md"),
+  githubComment: z.boolean().default(false),
+}).strict();
+
+export const configSchema = z.object({
+  ignorePatterns: z.array(z.string()).default(DEFAULT_IGNORE_PATTERNS),
+  criticalThreshold: z.number().min(0).max(10).default(8),
+  domainRulesPath: z.string().default("./DOMAIN_RULES.md"),
+  architecturePath: z.string().default("./ARCHITECTURE.md"),
+  apiKey: z.string().optional(),
+  githubToken: z.string().optional(),
+  model: z.string().default("claude-sonnet-4-5-20250514"),
+  maxRetries: z.number().min(0).default(3),
+  output: outputSchema.default({}),
+}).strict();
+
+export const partialConfigSchema = configSchema.partial();
+
+export type CodeReviewConfig = z.infer<typeof configSchema>;
+
+export const defaultConfig: CodeReviewConfig = configSchema.parse({});
