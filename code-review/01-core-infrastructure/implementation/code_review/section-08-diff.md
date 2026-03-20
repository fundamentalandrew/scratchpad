diff --git a/code-review/01-core-infrastructure/implementation/deep_implement_config.json b/code-review/01-core-infrastructure/implementation/deep_implement_config.json
index 70dbeca..c710755 100644
--- a/code-review/01-core-infrastructure/implementation/deep_implement_config.json
+++ b/code-review/01-core-infrastructure/implementation/deep_implement_config.json
@@ -41,6 +41,10 @@
     "section-06-github-client": {
       "status": "complete",
       "commit_hash": "e001076"
+    },
+    "section-07-pipeline": {
+      "status": "complete",
+      "commit_hash": "bb5ea4d"
     }
   },
   "pre_commit": {
diff --git a/code-review/01-core-infrastructure/src/commands/init.test.ts b/code-review/01-core-infrastructure/src/commands/init.test.ts
new file mode 100644
index 0000000..9685892
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/commands/init.test.ts
@@ -0,0 +1,91 @@
+import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
+import fs from "node:fs";
+import os from "node:os";
+import path from "node:path";
+import { initProject } from "./init.js";
+import type { Logger } from "../utils/logger.js";
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
+describe("initProject", () => {
+  let tmpDir: string;
+  let logger: Logger;
+
+  beforeEach(() => {
+    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "init-test-"));
+    logger = createMockLogger();
+  });
+
+  afterEach(() => {
+    fs.rmSync(tmpDir, { recursive: true, force: true });
+  });
+
+  it("creates DOMAIN_RULES.md when it doesn't exist", async () => {
+    await initProject(tmpDir, logger);
+
+    const filePath = path.join(tmpDir, "DOMAIN_RULES.md");
+    expect(fs.existsSync(filePath)).toBe(true);
+    const content = fs.readFileSync(filePath, "utf-8");
+    expect(content).toContain("# Domain Rules");
+  });
+
+  it("creates ARCHITECTURE.md when it doesn't exist", async () => {
+    await initProject(tmpDir, logger);
+
+    const filePath = path.join(tmpDir, "ARCHITECTURE.md");
+    expect(fs.existsSync(filePath)).toBe(true);
+    const content = fs.readFileSync(filePath, "utf-8");
+    expect(content).toContain("# Architecture");
+  });
+
+  it("skips DOMAIN_RULES.md when it already exists (no overwrite)", async () => {
+    const filePath = path.join(tmpDir, "DOMAIN_RULES.md");
+    fs.writeFileSync(filePath, "custom content");
+
+    await initProject(tmpDir, logger);
+
+    expect(fs.readFileSync(filePath, "utf-8")).toBe("custom content");
+  });
+
+  it("skips ARCHITECTURE.md when it already exists (no overwrite)", async () => {
+    const filePath = path.join(tmpDir, "ARCHITECTURE.md");
+    fs.writeFileSync(filePath, "custom architecture");
+
+    await initProject(tmpDir, logger);
+
+    expect(fs.readFileSync(filePath, "utf-8")).toBe("custom architecture");
+  });
+
+  it("reports which files were created vs skipped", async () => {
+    // Pre-create one file
+    fs.writeFileSync(path.join(tmpDir, "DOMAIN_RULES.md"), "existing");
+
+    await initProject(tmpDir, logger);
+
+    const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
+    expect(infoCalls.some((msg: string) => msg.includes("Skipped") && msg.includes("DOMAIN_RULES.md"))).toBe(true);
+    expect(infoCalls.some((msg: string) => msg.includes("Created") && msg.includes("ARCHITECTURE.md"))).toBe(true);
+  });
+
+  it("created files contain expected template sections", async () => {
+    await initProject(tmpDir, logger);
+
+    const domain = fs.readFileSync(path.join(tmpDir, "DOMAIN_RULES.md"), "utf-8");
+    expect(domain).toContain("## Business Rules");
+    expect(domain).toContain("## Naming Conventions");
+    expect(domain).toContain("## Review Criteria");
+
+    const arch = fs.readFileSync(path.join(tmpDir, "ARCHITECTURE.md"), "utf-8");
+    expect(arch).toContain("## System Overview");
+    expect(arch).toContain("## Key Patterns");
+    expect(arch).toContain("## Architectural Decisions");
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/commands/init.ts b/code-review/01-core-infrastructure/src/commands/init.ts
new file mode 100644
index 0000000..0d85747
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/commands/init.ts
@@ -0,0 +1,47 @@
+import fs from "node:fs";
+import path from "node:path";
+import type { Logger } from "../utils/logger.js";
+
+const DOMAIN_RULES_TEMPLATE = `# Domain Rules
+
+## Business Rules
+<!-- Describe key business rules that reviewers should be aware of -->
+
+## Naming Conventions
+<!-- Document naming patterns specific to this project -->
+
+## Review Criteria
+<!-- List domain-specific things to watch for in code reviews -->
+`;
+
+const ARCHITECTURE_TEMPLATE = `# Architecture
+
+## System Overview
+<!-- High-level description of the system architecture -->
+
+## Key Patterns
+<!-- Document architectural patterns used in this project -->
+
+## Architectural Decisions
+<!-- List key decisions and their rationale -->
+`;
+
+const FILES: Array<{ name: string; template: string }> = [
+  { name: "DOMAIN_RULES.md", template: DOMAIN_RULES_TEMPLATE },
+  { name: "ARCHITECTURE.md", template: ARCHITECTURE_TEMPLATE },
+];
+
+export async function initProject(
+  targetDir: string,
+  logger: Logger,
+): Promise<void> {
+  for (const { name, template } of FILES) {
+    const filePath = path.join(targetDir, name);
+    if (fs.existsSync(filePath)) {
+      logger.info(`Skipped ${name} (already exists)`);
+    } else {
+      fs.writeFileSync(filePath, template, "utf-8");
+      logger.info(`Created ${name}`);
+    }
+  }
+}
diff --git a/code-review/01-core-infrastructure/src/commands/review-pr.test.ts b/code-review/01-core-infrastructure/src/commands/review-pr.test.ts
new file mode 100644
index 0000000..9f2fae7
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/commands/review-pr.test.ts
@@ -0,0 +1,103 @@
+import { describe, it, expect, vi, beforeEach } from "vitest";
+import { reviewPR } from "./review-pr.js";
+
+vi.mock("../config/loader.js", () => ({
+  loadConfig: vi.fn(),
+}));
+
+vi.mock("../utils/url-parser.js", () => ({
+  parsePRUrl: vi.fn(),
+}));
+
+vi.mock("../clients/github.js", () => ({
+  resolveGitHubToken: vi.fn(),
+  GitHubClient: vi.fn(),
+}));
+
+vi.mock("../pipeline/runner.js", () => ({
+  runPipeline: vi.fn(),
+}));
+
+vi.mock("../agents/stubs.js", () => ({
+  createStubContextAgent: vi.fn(() => ({ name: "StubContext", idempotent: true, run: vi.fn() })),
+  createStubAnalysisAgent: vi.fn(() => ({ name: "StubAnalysis", idempotent: true, run: vi.fn() })),
+  createStubReviewAgent: vi.fn(() => ({ name: "StubReview", idempotent: true, run: vi.fn() })),
+  createStubOutputAgent: vi.fn(() => ({ name: "StubOutput", idempotent: false, run: vi.fn() })),
+}));
+
+import { loadConfig } from "../config/loader.js";
+import { parsePRUrl } from "../utils/url-parser.js";
+import { resolveGitHubToken } from "../clients/github.js";
+import { runPipeline } from "../pipeline/runner.js";
+import { URLParseError, AuthError } from "../utils/errors.js";
+
+const mockLoadConfig = loadConfig as ReturnType<typeof vi.fn>;
+const mockParsePRUrl = parsePRUrl as ReturnType<typeof vi.fn>;
+const mockResolveGitHubToken = resolveGitHubToken as ReturnType<typeof vi.fn>;
+const mockRunPipeline = runPipeline as ReturnType<typeof vi.fn>;
+
+describe("reviewPR", () => {
+  beforeEach(() => {
+    vi.resetAllMocks();
+    mockLoadConfig.mockReturnValue({
+      apiKey: "test-key",
+      maxRetries: 3,
+      output: { console: true, markdown: false, githubComment: false },
+    });
+    mockParsePRUrl.mockReturnValue({ owner: "test", repo: "repo", number: 1 });
+    mockResolveGitHubToken.mockReturnValue("gh-token");
+    mockRunPipeline.mockResolvedValue({
+      output: {},
+      stages: [],
+      totalDuration: 100,
+    });
+  });
+
+  it("rejects missing URL argument", async () => {
+    mockParsePRUrl.mockImplementation(() => {
+      throw new URLParseError("Invalid PR URL. Expected format: https://github.com/owner/repo/pull/123");
+    });
+
+    await expect(reviewPR("", { verbose: false })).rejects.toThrow(URLParseError);
+  });
+
+  it("rejects invalid URL format", async () => {
+    mockParsePRUrl.mockImplementation(() => {
+      throw new URLParseError("Invalid PR URL");
+    });
+
+    await expect(reviewPR("not-a-url", { verbose: false })).rejects.toThrow(URLParseError);
+  });
+
+  it("loads config before running pipeline", async () => {
+    const callOrder: string[] = [];
+    mockLoadConfig.mockImplementation(() => {
+      callOrder.push("loadConfig");
+      return {
+        apiKey: "test-key",
+        maxRetries: 3,
+        output: { console: true, markdown: false, githubComment: false },
+      };
+    });
+    mockRunPipeline.mockImplementation(async () => {
+      callOrder.push("runPipeline");
+      return { output: {}, stages: [], totalDuration: 100 };
+    });
+
+    await reviewPR("https://github.com/o/r/pull/1", { verbose: false });
+
+    expect(callOrder).toEqual(["loadConfig", "runPipeline"]);
+  });
+
+  it("fails with clear message when no API key configured", async () => {
+    mockLoadConfig.mockReturnValue({
+      maxRetries: 3,
+      output: { console: true, markdown: false, githubComment: false },
+    });
+    delete process.env.ANTHROPIC_API_KEY;
+
+    await expect(
+      reviewPR("https://github.com/o/r/pull/1", { verbose: false }),
+    ).rejects.toThrow(AuthError);
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/commands/review-pr.ts b/code-review/01-core-infrastructure/src/commands/review-pr.ts
new file mode 100644
index 0000000..9f9a233
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/commands/review-pr.ts
@@ -0,0 +1,54 @@
+import { loadConfig } from "../config/loader.js";
+import { parsePRUrl } from "../utils/url-parser.js";
+import { createLogger } from "../utils/logger.js";
+import { resolveGitHubToken } from "../clients/github.js";
+import { runPipeline } from "../pipeline/runner.js";
+import { AuthError } from "../utils/errors.js";
+import {
+  createStubContextAgent,
+  createStubAnalysisAgent,
+  createStubReviewAgent,
+  createStubOutputAgent,
+} from "../agents/stubs.js";
+
+export async function reviewPR(
+  url: string,
+  options: { verbose: boolean; config?: string },
+): Promise<void> {
+  const { owner, repo, number } = parsePRUrl(url);
+
+  const config = loadConfig({ configPath: options.config });
+
+  const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
+  if (!apiKey) {
+    throw new AuthError("No Anthropic API key configured");
+  }
+
+  const logger = createLogger({ verbose: options.verbose });
+  const githubToken = resolveGitHubToken(config, logger);
+
+  const input = {
+    mode: "pr" as const,
+    owner,
+    repo,
+    number,
+    config,
+    githubToken,
+    apiKey,
+  };
+
+  const agents = [
+    createStubContextAgent(logger),
+    createStubAnalysisAgent(logger),
+    createStubReviewAgent(logger),
+    createStubOutputAgent(logger),
+  ];
+
+  const result = await runPipeline(agents, input, {
+    logger,
+    maxRetries: config.maxRetries,
+  });
+
+  logger.success(`Pipeline completed in ${result.totalDuration}ms`);
+  logger.info(JSON.stringify(result.output, null, 2));
+}
diff --git a/code-review/01-core-infrastructure/src/commands/review-repo.test.ts b/code-review/01-core-infrastructure/src/commands/review-repo.test.ts
new file mode 100644
index 0000000..2acf5e4
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/commands/review-repo.test.ts
@@ -0,0 +1,71 @@
+import { describe, it, expect, vi, beforeEach } from "vitest";
+import { reviewRepo } from "./review-repo.js";
+
+vi.mock("../config/loader.js", () => ({
+  loadConfig: vi.fn(),
+}));
+
+vi.mock("../utils/url-parser.js", () => ({
+  parseRepoUrl: vi.fn(),
+}));
+
+vi.mock("../clients/github.js", () => ({
+  resolveGitHubToken: vi.fn(),
+  GitHubClient: vi.fn(),
+}));
+
+vi.mock("../pipeline/runner.js", () => ({
+  runPipeline: vi.fn(),
+}));
+
+vi.mock("../agents/stubs.js", () => ({
+  createStubContextAgent: vi.fn(() => ({ name: "StubContext", idempotent: true, run: vi.fn() })),
+  createStubAnalysisAgent: vi.fn(() => ({ name: "StubAnalysis", idempotent: true, run: vi.fn() })),
+  createStubReviewAgent: vi.fn(() => ({ name: "StubReview", idempotent: true, run: vi.fn() })),
+  createStubOutputAgent: vi.fn(() => ({ name: "StubOutput", idempotent: false, run: vi.fn() })),
+}));
+
+import { loadConfig } from "../config/loader.js";
+import { parseRepoUrl } from "../utils/url-parser.js";
+import { resolveGitHubToken } from "../clients/github.js";
+import { runPipeline } from "../pipeline/runner.js";
+import { URLParseError } from "../utils/errors.js";
+
+const mockLoadConfig = loadConfig as ReturnType<typeof vi.fn>;
+const mockParseRepoUrl = parseRepoUrl as ReturnType<typeof vi.fn>;
+const mockResolveGitHubToken = resolveGitHubToken as ReturnType<typeof vi.fn>;
+const mockRunPipeline = runPipeline as ReturnType<typeof vi.fn>;
+
+describe("reviewRepo", () => {
+  beforeEach(() => {
+    vi.resetAllMocks();
+    mockLoadConfig.mockReturnValue({
+      apiKey: "test-key",
+      maxRetries: 3,
+      output: { console: true, markdown: false, githubComment: false },
+    });
+    mockParseRepoUrl.mockReturnValue({ owner: "test", repo: "repo" });
+    mockResolveGitHubToken.mockReturnValue("gh-token");
+    mockRunPipeline.mockResolvedValue({
+      output: {},
+      stages: [],
+      totalDuration: 100,
+    });
+  });
+
+  it("rejects missing URL argument", async () => {
+    mockParseRepoUrl.mockImplementation(() => {
+      throw new URLParseError("Invalid repository URL");
+    });
+
+    await expect(reviewRepo("", { verbose: false })).rejects.toThrow(URLParseError);
+  });
+
+  it("passes mode 'repo' to pipeline", async () => {
+    await reviewRepo("https://github.com/o/r", { verbose: false });
+
+    expect(mockRunPipeline).toHaveBeenCalledOnce();
+    const pipelineInput = mockRunPipeline.mock.calls[0][1];
+    expect(pipelineInput.mode).toBe("repo");
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/commands/review-repo.ts b/code-review/01-core-infrastructure/src/commands/review-repo.ts
new file mode 100644
index 0000000..4b21e4f
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/commands/review-repo.ts
@@ -0,0 +1,53 @@
+import { loadConfig } from "../config/loader.js";
+import { parseRepoUrl } from "../utils/url-parser.js";
+import { createLogger } from "../utils/logger.js";
+import { resolveGitHubToken } from "../clients/github.js";
+import { runPipeline } from "../pipeline/runner.js";
+import { AuthError } from "../utils/errors.js";
+import {
+  createStubContextAgent,
+  createStubAnalysisAgent,
+  createStubReviewAgent,
+  createStubOutputAgent,
+} from "../agents/stubs.js";
+
+export async function reviewRepo(
+  url: string,
+  options: { verbose: boolean; config?: string },
+): Promise<void> {
+  const { owner, repo } = parseRepoUrl(url);
+
+  const config = loadConfig({ configPath: options.config });
+
+  const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
+  if (!apiKey) {
+    throw new AuthError("No Anthropic API key configured");
+  }
+
+  const logger = createLogger({ verbose: options.verbose });
+  const githubToken = resolveGitHubToken(config, logger);
+
+  const input = {
+    mode: "repo" as const,
+    owner,
+    repo,
+    config,
+    githubToken,
+    apiKey,
+  };
+
+  const agents = [
+    createStubContextAgent(logger),
+    createStubAnalysisAgent(logger),
+    createStubReviewAgent(logger),
+    createStubOutputAgent(logger),
+  ];
+
+  const result = await runPipeline(agents, input, {
+    logger,
+    maxRetries: config.maxRetries,
+  });
+
+  logger.success(`Pipeline completed in ${result.totalDuration}ms`);
+  logger.info(JSON.stringify(result.output, null, 2));
+}
diff --git a/code-review/01-core-infrastructure/src/index.ts b/code-review/01-core-infrastructure/src/index.ts
index c000025..3d8614b 100644
--- a/code-review/01-core-infrastructure/src/index.ts
+++ b/code-review/01-core-infrastructure/src/index.ts
@@ -1,2 +1,65 @@
 #!/usr/bin/env node
-// CLI entry point — implemented in section-08
+import { Command } from "commander";
+import { createLogger } from "./utils/logger.js";
+import { reviewPR } from "./commands/review-pr.js";
+import { reviewRepo } from "./commands/review-repo.js";
+import { initProject } from "./commands/init.js";
+import { ConfigError, AuthError, PipelineError, URLParseError } from "./utils/errors.js";
+
+const program = new Command();
+
+program
+  .name("code-review")
+  .description("AI-powered code review agent")
+  .version("0.1.0")
+  .option("--verbose", "Enable verbose output", false)
+  .option("--config <path>", "Path to config file");
+
+program
+  .command("review-pr <url>")
+  .description("Review a GitHub pull request")
+  .action(async (url: string) => {
+    const opts = program.opts<{ verbose: boolean; config?: string }>();
+    await reviewPR(url, opts);
+  });
+
+program
+  .command("review-repo <url>")
+  .description("Review a GitHub repository")
+  .action(async (url: string) => {
+    const opts = program.opts<{ verbose: boolean; config?: string }>();
+    await reviewRepo(url, opts);
+  });
+
+program
+  .command("init")
+  .description("Initialize review config files in the current directory")
+  .action(async () => {
+    const opts = program.opts<{ verbose: boolean; config?: string }>();
+    const logger = createLogger({ verbose: opts.verbose });
+    await initProject(process.cwd(), logger);
+  });
+
+try {
+  await program.parseAsync(process.argv);
+} catch (err) {
+  const logger = createLogger({ verbose: false });
+
+  if (err instanceof ConfigError) {
+    logger.error(`Configuration error: ${err.message}`);
+  } else if (err instanceof AuthError) {
+    logger.error(`Authentication error: ${err.message}`);
+  } else if (err instanceof PipelineError) {
+    logger.error(
+      `Pipeline failed: Agent '${err.agentName}' failed after ${err.attempts} attempt(s): ${err.cause instanceof Error ? err.cause.message : String(err.cause)}`,
+    );
+  } else if (err instanceof URLParseError) {
+    logger.error(err.message);
+  } else if (err instanceof Error) {
+    logger.error(err.stack ?? err.message);
+  } else {
+    logger.error(String(err));
+  }
+
+  process.exitCode = 1;
+}
diff --git a/code-review/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json b/code-review/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json
index b204177..8983302 100644
--- a/code-review/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json
+++ b/code-review/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json
@@ -1 +1 @@
-{"version":"4.1.0","results":[[":01-core-infrastructure/src/smoke.test.ts",{"duration":1.2342079999999953,"failed":false}],[":01-core-infrastructure/src/utils/errors.test.ts",{"duration":2.3534170000000074,"failed":false}],[":01-core-infrastructure/src/agents/schemas.test.ts",{"duration":5.846833999999973,"failed":false}],[":01-core-infrastructure/dist/smoke.test.js",{"duration":1.7578340000000026,"failed":false}],[":01-core-infrastructure/src/clients/claude.test.ts",{"duration":5.698166999999984,"failed":false}],[":01-core-infrastructure/src/clients/github.test.ts",{"duration":5.841124999999991,"failed":false}],[":01-core-infrastructure/src/config/schema.test.ts",{"duration":2.780791999999991,"failed":false}],[":01-core-infrastructure/src/config/loader.test.ts",{"duration":10.168083999999993,"failed":false}],[":01-core-infrastructure/src/utils/url-parser.test.ts",{"duration":3.3840409999999963,"failed":false}],[":01-core-infrastructure/src/utils/logger.test.ts",{"duration":4.31966700000001,"failed":false}],[":01-core-infrastructure/src/utils/redact.test.ts",{"duration":2.1379579999999976,"failed":false}],[":01-core-infrastructure/src/agents/stubs.test.ts",{"duration":1512.1192760000001,"failed":false}],[":01-core-infrastructure/src/pipeline/runner.test.ts",{"duration":15.04029100000001,"failed":false}]]}
\ No newline at end of file
+{"version":"4.1.0","results":[[":01-core-infrastructure/src/smoke.test.ts",{"duration":1.6077510000000075,"failed":false}],[":01-core-infrastructure/src/utils/errors.test.ts",{"duration":3.1170350000000013,"failed":false}],[":01-core-infrastructure/src/agents/schemas.test.ts",{"duration":10.773810999999995,"failed":false}],[":01-core-infrastructure/dist/smoke.test.js",{"duration":1.7578340000000026,"failed":false}],[":01-core-infrastructure/src/clients/claude.test.ts",{"duration":11.363895999999997,"failed":false}],[":01-core-infrastructure/src/clients/github.test.ts",{"duration":7.895013000000006,"failed":false}],[":01-core-infrastructure/src/config/schema.test.ts",{"duration":4.005919000000006,"failed":false}],[":01-core-infrastructure/src/config/loader.test.ts",{"duration":12.308343000000008,"failed":false}],[":01-core-infrastructure/src/utils/url-parser.test.ts",{"duration":4.7951029999999975,"failed":false}],[":01-core-infrastructure/src/utils/logger.test.ts",{"duration":5.8659490000000005,"failed":false}],[":01-core-infrastructure/src/utils/redact.test.ts",{"duration":3.1940210000000064,"failed":false}],[":01-core-infrastructure/src/agents/stubs.test.ts",{"duration":1516.491034,"failed":false}],[":01-core-infrastructure/src/pipeline/runner.test.ts",{"duration":18.998598000000015,"failed":false}],[":01-core-infrastructure/src/commands/review-pr.test.ts",{"duration":4.217486999999991,"failed":false}],[":01-core-infrastructure/src/commands/review-repo.test.ts",{"duration":4.649142999999995,"failed":false}],[":01-core-infrastructure/src/commands/init.test.ts",{"duration":5.902553999999995,"failed":false}]]}
\ No newline at end of file
