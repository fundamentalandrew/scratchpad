diff --git a/code-review/01-core-infrastructure/implementation/deep_implement_config.json b/code-review/01-core-infrastructure/implementation/deep_implement_config.json
index c710755..a87bdac 100644
--- a/code-review/01-core-infrastructure/implementation/deep_implement_config.json
+++ b/code-review/01-core-infrastructure/implementation/deep_implement_config.json
@@ -45,6 +45,10 @@
     "section-07-pipeline": {
       "status": "complete",
       "commit_hash": "bb5ea4d"
+    },
+    "section-08-commands": {
+      "status": "complete",
+      "commit_hash": "19d21cd"
     }
   },
   "pre_commit": {
diff --git a/code-review/01-core-infrastructure/src/integration.test.ts b/code-review/01-core-infrastructure/src/integration.test.ts
new file mode 100644
index 0000000..d36dd3f
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/integration.test.ts
@@ -0,0 +1,376 @@
+import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
+import fs from "node:fs";
+import os from "node:os";
+import path from "node:path";
+
+// Mocks must be declared before imports
+vi.mock("./clients/github.js", () => ({
+  resolveGitHubToken: vi.fn(() => "mock-gh-token"),
+  GitHubClient: vi.fn(),
+}));
+
+vi.mock("@anthropic-ai/sdk", () => ({
+  default: vi.fn(),
+}));
+
+import { runPipeline } from "./pipeline/runner.js";
+import type { Agent, PipelineResult } from "./pipeline/types.js";
+import {
+  createStubContextAgent,
+  createStubAnalysisAgent,
+  createStubReviewAgent,
+  createStubOutputAgent,
+} from "./agents/stubs.js";
+import {
+  ContextOutputSchema,
+  AnalysisOutputSchema,
+  ReviewOutputSchema,
+} from "./agents/schemas.js";
+import { loadConfig } from "./config/loader.js";
+import { defaultConfig } from "./config/schema.js";
+import { createLogger } from "./utils/logger.js";
+import type { Logger } from "./utils/logger.js";
+import { PipelineError } from "./utils/errors.js";
+import { resolveGitHubToken } from "./clients/github.js";
+
+describe("Integration: Full Pipeline with Stubs", () => {
+  it("runs end-to-end with all stub agents and returns valid PipelineResult", async () => {
+    const agents = [
+      createStubContextAgent(),
+      createStubAnalysisAgent(),
+      createStubReviewAgent(),
+      createStubOutputAgent(),
+    ];
+
+    const result = await runPipeline(agents, {});
+
+    expect(result.output).toBeDefined();
+    expect(result.stages).toHaveLength(4);
+    expect(result.totalDuration).toBeGreaterThanOrEqual(0);
+
+    // Final output should be valid ReviewOutput
+    const parsed = ReviewOutputSchema.safeParse(result.output);
+    expect(parsed.success).toBe(true);
+  });
+
+  it("chains stage outputs correctly through all 4 stub stages", async () => {
+    const agents = [
+      createStubContextAgent(),
+      createStubAnalysisAgent(),
+      createStubReviewAgent(),
+      createStubOutputAgent(),
+    ];
+
+    const result = await runPipeline(agents, {});
+
+    for (const stage of result.stages) {
+      expect(stage.success).toBe(true);
+      expect(stage.duration).toBeGreaterThanOrEqual(0);
+      expect(stage.attempts).toBe(1);
+    }
+
+    expect(result.stages[0].agentName).toBe("StubContextAgent");
+    expect(result.stages[1].agentName).toBe("StubAnalysisAgent");
+    expect(result.stages[2].agentName).toBe("StubReviewAgent");
+    expect(result.stages[3].agentName).toBe("StubOutputAgent");
+  });
+
+  it("stub agent outputs pass their respective Zod schemas", async () => {
+    const contextAgent = createStubContextAgent();
+    const contextOut = await contextAgent.run({});
+    expect(ContextOutputSchema.safeParse(contextOut).success).toBe(true);
+
+    const analysisAgent = createStubAnalysisAgent();
+    const analysisOut = await analysisAgent.run(contextOut);
+    expect(AnalysisOutputSchema.safeParse(analysisOut).success).toBe(true);
+
+    const reviewAgent = createStubReviewAgent();
+    const reviewOut = await reviewAgent.run(analysisOut);
+    expect(ReviewOutputSchema.safeParse(reviewOut).success).toBe(true);
+  });
+});
+
+describe("Integration: Config + Pipeline Flow", () => {
+  let tmpDir: string;
+
+  beforeEach(() => {
+    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cr-integration-"));
+  });
+
+  afterEach(() => {
+    fs.rmSync(tmpDir, { recursive: true, force: true });
+  });
+
+  it("loads config from temp directory and merges with defaults", () => {
+    const configData = { criticalThreshold: 5, model: "claude-sonnet-4-5-20250514" };
+    fs.writeFileSync(path.join(tmpDir, ".codereview.json"), JSON.stringify(configData));
+    // Create .git dir so discovery stops here
+    fs.mkdirSync(path.join(tmpDir, ".git"));
+
+    const config = loadConfig({ startDir: tmpDir });
+
+    expect(config.criticalThreshold).toBe(5);
+    expect(config.model).toBe("claude-sonnet-4-5-20250514");
+    // Defaults are preserved for unset fields
+    expect(config.maxRetries).toBe(defaultConfig.maxRetries);
+    expect(config.output.console).toBe(true);
+  });
+
+  it("config-driven pipeline run completes successfully", async () => {
+    const configData = { maxRetries: 2 };
+    fs.writeFileSync(path.join(tmpDir, ".codereview.json"), JSON.stringify(configData));
+    fs.mkdirSync(path.join(tmpDir, ".git"));
+
+    const config = loadConfig({ startDir: tmpDir });
+
+    const agents = [
+      createStubContextAgent(),
+      createStubAnalysisAgent(),
+      createStubReviewAgent(),
+      createStubOutputAgent(),
+    ];
+
+    const result = await runPipeline(agents, {}, { maxRetries: config.maxRetries });
+
+    expect(result.output).toBeDefined();
+    expect(result.stages).toHaveLength(4);
+  });
+});
+
+describe("Integration: CLI Command Parsing", () => {
+  it("parses review-pr command with valid URL and --verbose flag", async () => {
+    // Dynamically import Commander to avoid module-level side effects
+    const { Command } = await import("commander");
+    const program = new Command();
+    const captured: { url: string; verbose: boolean } = { url: "", verbose: false };
+
+    program
+      .option("--verbose", "verbose", false)
+      .option("--config <path>", "config path");
+
+    program
+      .command("review-pr <url>")
+      .action((url: string) => {
+        captured.url = url;
+        captured.verbose = program.opts().verbose;
+      });
+
+    await program.parseAsync([
+      "node",
+      "script",
+      "review-pr",
+      "https://github.com/owner/repo/pull/42",
+      "--verbose",
+    ]);
+
+    expect(captured.url).toBe("https://github.com/owner/repo/pull/42");
+    expect(captured.verbose).toBe(true);
+  });
+
+  it("parses review-repo command with valid URL", async () => {
+    const { Command } = await import("commander");
+    const program = new Command();
+    const captured: { url: string } = { url: "" };
+
+    program
+      .option("--verbose", "verbose", false)
+      .option("--config <path>", "config path");
+
+    program
+      .command("review-repo <url>")
+      .action((url: string) => {
+        captured.url = url;
+      });
+
+    await program.parseAsync([
+      "node",
+      "script",
+      "review-repo",
+      "https://github.com/owner/repo",
+    ]);
+
+    expect(captured.url).toBe("https://github.com/owner/repo");
+  });
+});
+
+describe("Integration: End-to-End Command Handlers", () => {
+  let savedApiKey: string | undefined;
+  let savedGhToken: string | undefined;
+  const mockResolveGitHubToken = resolveGitHubToken as ReturnType<typeof vi.fn>;
+
+  beforeEach(() => {
+    vi.resetAllMocks();
+    savedApiKey = process.env.ANTHROPIC_API_KEY;
+    savedGhToken = process.env.GITHUB_TOKEN;
+    process.env.ANTHROPIC_API_KEY = "test-api-key";
+    process.env.GITHUB_TOKEN = "test-gh-token";
+    mockResolveGitHubToken.mockReturnValue("test-gh-token");
+  });
+
+  afterEach(() => {
+    if (savedApiKey !== undefined) {
+      process.env.ANTHROPIC_API_KEY = savedApiKey;
+    } else {
+      delete process.env.ANTHROPIC_API_KEY;
+    }
+    if (savedGhToken !== undefined) {
+      process.env.GITHUB_TOKEN = savedGhToken;
+    } else {
+      delete process.env.GITHUB_TOKEN;
+    }
+  });
+
+  it("review-pr flow with mocked clients completes successfully", async () => {
+    const { reviewPR } = await import("./commands/review-pr.js");
+
+    // reviewPR uses stub agents internally (from shared.ts), which return valid data
+    // The pipeline should complete end-to-end
+    const result = reviewPR(
+      "https://github.com/owner/repo/pull/42",
+      { verbose: false },
+    );
+
+    await expect(result).resolves.toBeUndefined();
+  });
+
+  it("review-repo flow with mocked clients completes successfully", async () => {
+    const { reviewRepo } = await import("./commands/review-repo.js");
+
+    const result = reviewRepo(
+      "https://github.com/owner/repo",
+      { verbose: false },
+    );
+
+    await expect(result).resolves.toBeUndefined();
+  });
+});
+
+describe("Integration: Config Env Var Override", () => {
+  let savedApiKey: string | undefined;
+  let savedGhToken: string | undefined;
+
+  beforeEach(() => {
+    savedApiKey = process.env.ANTHROPIC_API_KEY;
+    savedGhToken = process.env.GITHUB_TOKEN;
+  });
+
+  afterEach(() => {
+    if (savedApiKey !== undefined) {
+      process.env.ANTHROPIC_API_KEY = savedApiKey;
+    } else {
+      delete process.env.ANTHROPIC_API_KEY;
+    }
+    if (savedGhToken !== undefined) {
+      process.env.GITHUB_TOKEN = savedGhToken;
+    } else {
+      delete process.env.GITHUB_TOKEN;
+    }
+  });
+
+  it("env vars flow through to loaded config", () => {
+    process.env.ANTHROPIC_API_KEY = "env-api-key";
+    process.env.GITHUB_TOKEN = "env-gh-token";
+
+    const config = loadConfig();
+
+    expect(config.apiKey).toBe("env-api-key");
+    expect(config.githubToken).toBe("env-gh-token");
+  });
+});
+
+describe("Integration: Error Propagation", () => {
+  it("pipeline failure surfaces as PipelineError with agent name and attempt count", async () => {
+    const failingAgent: Agent<unknown, unknown> = {
+      name: "FailingAgent",
+      idempotent: false,
+      async run() {
+        throw new Error("Something went wrong");
+      },
+    };
+
+    try {
+      await runPipeline([failingAgent], {});
+      expect.fail("Should have thrown");
+    } catch (err) {
+      expect(err).toBeInstanceOf(PipelineError);
+      const pErr = err as PipelineError;
+      expect(pErr.agentName).toBe("FailingAgent");
+      expect(pErr.attempts).toBe(1);
+      expect(pErr.message).toContain("FailingAgent");
+      expect(pErr.message).toContain("Something went wrong");
+    }
+  });
+
+  it("idempotent agent exhausts retries before surfacing PipelineError", async () => {
+    let callCount = 0;
+    const retryAgent: Agent<unknown, unknown> = {
+      name: "RetryAgent",
+      idempotent: true,
+      async run() {
+        callCount++;
+        throw new Error("Always fails");
+      },
+    };
+
+    try {
+      await runPipeline([retryAgent], {}, { maxRetries: 2 });
+      expect.fail("Should have thrown");
+    } catch (err) {
+      expect(err).toBeInstanceOf(PipelineError);
+      const pErr = err as PipelineError;
+      expect(pErr.agentName).toBe("RetryAgent");
+      expect(pErr.attempts).toBe(2);
+      expect(callCount).toBe(2);
+    }
+  });
+});
+
+describe("Integration: Verbose Logging", () => {
+  it("verbose mode produces log output during pipeline execution", async () => {
+    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
+
+    const logger = createLogger({ verbose: true });
+    const agents = [
+      createStubContextAgent(logger),
+      createStubAnalysisAgent(logger),
+      createStubReviewAgent(logger),
+      createStubOutputAgent(logger),
+    ];
+
+    await runPipeline(agents, {}, { logger });
+
+    const output = writeSpy.mock.calls.map((c) => String(c[0])).join("");
+
+    // Pipeline runner logs "Running <agent>..." for each agent
+    expect(output).toContain("Running StubContextAgent...");
+    expect(output).toContain("Running StubAnalysisAgent...");
+    expect(output).toContain("Running StubReviewAgent...");
+    expect(output).toContain("Running StubOutputAgent...");
+
+    // Stub agents log verbose messages
+    expect(output).toContain("[STUB] StubContextAgent running");
+
+    writeSpy.mockRestore();
+  });
+
+  it("non-verbose mode suppresses verbose log lines", async () => {
+    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
+
+    const logger = createLogger({ verbose: false });
+    const agents = [
+      createStubContextAgent(logger),
+      createStubOutputAgent(logger),
+    ];
+
+    await runPipeline(agents, {}, { logger });
+
+    const output = writeSpy.mock.calls.map((c) => String(c[0])).join("");
+
+    // info-level logs still appear (pipeline runner uses logger.info)
+    expect(output).toContain("Running StubContextAgent...");
+    // verbose-level stub logs should NOT appear
+    expect(output).not.toContain("[STUB]");
+
+    writeSpy.mockRestore();
+  });
+});
