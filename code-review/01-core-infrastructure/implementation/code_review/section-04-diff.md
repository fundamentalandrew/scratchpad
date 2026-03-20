diff --git a/code-review/01-core-infrastructure/src/utils/logger.test.ts b/code-review/01-core-infrastructure/src/utils/logger.test.ts
new file mode 100644
index 0000000..bff33f5
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/utils/logger.test.ts
@@ -0,0 +1,64 @@
+import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
+import { createLogger } from "./logger.js";
+
+describe("createLogger", () => {
+  let stdoutSpy: ReturnType<typeof vi.spyOn>;
+  let stderrSpy: ReturnType<typeof vi.spyOn>;
+
+  beforeEach(() => {
+    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
+    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
+  });
+
+  afterEach(() => {
+    vi.restoreAllMocks();
+  });
+
+  it("returns a logger instance", () => {
+    const logger = createLogger({ verbose: false });
+    expect(logger).toHaveProperty("info");
+    expect(logger).toHaveProperty("verbose");
+    expect(logger).toHaveProperty("error");
+    expect(logger).toHaveProperty("warn");
+    expect(logger).toHaveProperty("success");
+  });
+
+  it("info writes to stdout", () => {
+    const logger = createLogger({ verbose: false });
+    logger.info("hello");
+    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("hello"));
+  });
+
+  it("error writes to stderr", () => {
+    const logger = createLogger({ verbose: false });
+    logger.error("something broke");
+    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("something broke"));
+  });
+
+  it("verbose suppressed when verbose=false", () => {
+    const logger = createLogger({ verbose: false });
+    logger.verbose("debug info");
+    expect(stdoutSpy).not.toHaveBeenCalled();
+  });
+
+  it("verbose outputs when verbose=true", () => {
+    const logger = createLogger({ verbose: true });
+    logger.verbose("debug info");
+    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("debug info"));
+  });
+
+  it("warn outputs with warning styling", () => {
+    const logger = createLogger({ verbose: false });
+    logger.warn("careful");
+    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("careful"));
+  });
+
+  it("multiple logger instances are independent", () => {
+    const quiet = createLogger({ verbose: false });
+    const loud = createLogger({ verbose: true });
+    quiet.verbose("should not appear");
+    expect(stdoutSpy).not.toHaveBeenCalled();
+    loud.verbose("should appear");
+    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("should appear"));
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/utils/logger.ts b/code-review/01-core-infrastructure/src/utils/logger.ts
new file mode 100644
index 0000000..da31938
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/utils/logger.ts
@@ -0,0 +1,31 @@
+import chalk from "chalk";
+
+export interface Logger {
+  info(msg: string): void;
+  verbose(msg: string): void;
+  error(msg: string): void;
+  warn(msg: string): void;
+  success(msg: string): void;
+}
+
+export function createLogger(options: { verbose: boolean }): Logger {
+  return {
+    info(msg: string): void {
+      process.stdout.write(msg + "\n");
+    },
+    verbose(msg: string): void {
+      if (options.verbose) {
+        process.stdout.write(chalk.dim(msg) + "\n");
+      }
+    },
+    error(msg: string): void {
+      process.stderr.write(chalk.red(msg) + "\n");
+    },
+    warn(msg: string): void {
+      process.stderr.write(chalk.yellow(msg) + "\n");
+    },
+    success(msg: string): void {
+      process.stdout.write(chalk.green(msg) + "\n");
+    },
+  };
+}
diff --git a/code-review/01-core-infrastructure/src/utils/redact.test.ts b/code-review/01-core-infrastructure/src/utils/redact.test.ts
new file mode 100644
index 0000000..0352f46
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/utils/redact.test.ts
@@ -0,0 +1,40 @@
+import { describe, it, expect } from "vitest";
+import { redactSecrets } from "./redact.js";
+
+describe("redactSecrets", () => {
+  it("redacts Anthropic API keys", () => {
+    const input = "key is sk-ant-api03-abc123XYZ";
+    expect(redactSecrets(input)).toBe("key is [REDACTED]");
+  });
+
+  it("redacts GitHub tokens (ghp_, gho_, ghs_, github_pat_)", () => {
+    expect(redactSecrets("token: ghp_abc123DEF")).toBe("token: [REDACTED]");
+    expect(redactSecrets("token: gho_abc123")).toBe("token: [REDACTED]");
+    expect(redactSecrets("token: ghs_abc123")).toBe("token: [REDACTED]");
+    expect(redactSecrets("token: github_pat_abc123_DEF")).toBe("token: [REDACTED]");
+  });
+
+  it("redacts Authorization header values", () => {
+    const input = "Authorization: Bearer eyJhbGciOiJIUz.payload.sig";
+    expect(redactSecrets(input)).toContain("[REDACTED]");
+    expect(redactSecrets(input)).not.toContain("eyJhbGciOiJIUz");
+  });
+
+  it("preserves non-secret content unchanged", () => {
+    const input = "This is a normal log message with no secrets";
+    expect(redactSecrets(input)).toBe(input);
+  });
+
+  it("handles null/undefined input gracefully", () => {
+    expect(redactSecrets(null as unknown as string)).toBe("");
+    expect(redactSecrets(undefined as unknown as string)).toBe("");
+  });
+
+  it("redacts multiple secrets in same string", () => {
+    const input = "api=sk-ant-key123 token=ghp_abc456";
+    const result = redactSecrets(input);
+    expect(result).not.toContain("sk-ant-key123");
+    expect(result).not.toContain("ghp_abc456");
+    expect(result.match(/\[REDACTED\]/g)?.length).toBe(2);
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/utils/redact.ts b/code-review/01-core-infrastructure/src/utils/redact.ts
new file mode 100644
index 0000000..3d79888
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/utils/redact.ts
@@ -0,0 +1,19 @@
+const SECRET_PATTERNS: RegExp[] = [
+  /sk-ant-[A-Za-z0-9_-]+/g,
+  /sk-[A-Za-z0-9_-]+/g,
+  /ghp_[A-Za-z0-9]+/g,
+  /gho_[A-Za-z0-9]+/g,
+  /ghs_[A-Za-z0-9]+/g,
+  /github_pat_[A-Za-z0-9_]+/g,
+  /Authorization:\s*.+/g,
+];
+
+export function redactSecrets(text: string): string {
+  if (text == null) return "";
+
+  let result = text;
+  for (const pattern of SECRET_PATTERNS) {
+    result = result.replace(new RegExp(pattern.source, pattern.flags), "[REDACTED]");
+  }
+  return result;
+}
diff --git a/code-review/01-core-infrastructure/src/utils/url-parser.test.ts b/code-review/01-core-infrastructure/src/utils/url-parser.test.ts
new file mode 100644
index 0000000..39ea4c5
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/utils/url-parser.test.ts
@@ -0,0 +1,65 @@
+import { describe, it, expect } from "vitest";
+import { parsePRUrl, parseRepoUrl } from "./url-parser.js";
+import { URLParseError } from "./errors.js";
+
+describe("parsePRUrl", () => {
+  it("parses standard PR URL", () => {
+    const result = parsePRUrl("https://github.com/owner/repo/pull/123");
+    expect(result).toEqual({ owner: "owner", repo: "repo", number: 123 });
+  });
+
+  it("parses PR URL with trailing slash", () => {
+    const result = parsePRUrl("https://github.com/owner/repo/pull/456/");
+    expect(result).toEqual({ owner: "owner", repo: "repo", number: 456 });
+  });
+
+  it("parses PR URL with query params", () => {
+    const result = parsePRUrl("https://github.com/owner/repo/pull/789?diff=split");
+    expect(result).toEqual({ owner: "owner", repo: "repo", number: 789 });
+  });
+
+  it("parses PR URL with fragment", () => {
+    const result = parsePRUrl("https://github.com/owner/repo/pull/10#discussion");
+    expect(result).toEqual({ owner: "owner", repo: "repo", number: 10 });
+  });
+
+  it("rejects non-github.com hostname", () => {
+    expect(() => parsePRUrl("https://gitlab.com/owner/repo/pull/1")).toThrow(URLParseError);
+  });
+
+  it("rejects malformed PR URL (missing pull number)", () => {
+    expect(() => parsePRUrl("https://github.com/owner/repo/pull")).toThrow(URLParseError);
+  });
+
+  it("rejects PR URL with non-numeric pull number", () => {
+    expect(() => parsePRUrl("https://github.com/owner/repo/pull/abc")).toThrow(URLParseError);
+  });
+
+  it("error messages include expected format example", () => {
+    expect(() => parsePRUrl("https://github.com/owner")).toThrow(
+      /https:\/\/github\.com\/owner\/repo\/pull\/123/,
+    );
+  });
+});
+
+describe("parseRepoUrl", () => {
+  it("parses standard repo URL", () => {
+    const result = parseRepoUrl("https://github.com/owner/repo");
+    expect(result).toEqual({ owner: "owner", repo: "repo" });
+  });
+
+  it("parses repo URL with trailing slash", () => {
+    const result = parseRepoUrl("https://github.com/owner/repo/");
+    expect(result).toEqual({ owner: "owner", repo: "repo" });
+  });
+
+  it("rejects URL with no path segments", () => {
+    expect(() => parseRepoUrl("https://github.com")).toThrow(URLParseError);
+  });
+
+  it("error messages include expected format example", () => {
+    expect(() => parseRepoUrl("https://github.com")).toThrow(
+      /https:\/\/github\.com\/owner\/repo/,
+    );
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/utils/url-parser.ts b/code-review/01-core-infrastructure/src/utils/url-parser.ts
new file mode 100644
index 0000000..ac14083
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/utils/url-parser.ts
@@ -0,0 +1,46 @@
+import { URLParseError } from "./errors.js";
+
+export function parsePRUrl(input: string): { owner: string; repo: string; number: number } {
+  let url: URL;
+  try {
+    url = new URL(input);
+  } catch {
+    throw new URLParseError("Invalid URL");
+  }
+
+  if (url.hostname !== "github.com") {
+    throw new URLParseError("Not a GitHub URL");
+  }
+
+  const segments = url.pathname.replace(/^\/|\/$/g, "").split("/");
+  if (segments.length < 4 || segments[2] !== "pull") {
+    throw new URLParseError("Invalid PR URL");
+  }
+
+  const num = Number(segments[3]);
+  if (!Number.isInteger(num) || num <= 0) {
+    throw new URLParseError("Invalid PR URL");
+  }
+
+  return { owner: segments[0], repo: segments[1], number: num };
+}
+
+export function parseRepoUrl(input: string): { owner: string; repo: string } {
+  let url: URL;
+  try {
+    url = new URL(input);
+  } catch {
+    throw new URLParseError("Invalid URL");
+  }
+
+  if (url.hostname !== "github.com") {
+    throw new URLParseError("Not a GitHub URL");
+  }
+
+  const segments = url.pathname.replace(/^\/|\/$/g, "").split("/");
+  if (segments.length < 2 || !segments[0] || !segments[1]) {
+    throw new URLParseError("Invalid repository URL");
+  }
+
+  return { owner: segments[0], repo: segments[1] };
+}
