import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Mocks must be declared before imports
vi.mock("./clients/github.js", () => ({
  resolveGitHubToken: vi.fn(() => "mock-gh-token"),
  GitHubClient: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(),
}));

// Mocks for CLI parsing tests — hoisted to top level
vi.mock("./commands/review-pr.js", () => ({
  reviewPR: vi.fn(),
}));

vi.mock("./commands/review-repo.js", () => ({
  reviewRepo: vi.fn(),
}));

vi.mock("./commands/init.js", () => ({
  initProject: vi.fn(),
}));

import { runPipeline } from "./pipeline/runner.js";
import type { Agent, PipelineResult } from "./pipeline/types.js";
import {
  createStubContextAgent,
  createStubAnalysisAgent,
  createStubReviewAgent,
  createStubOutputAgent,
} from "./agents/stubs.js";
import {
  ContextOutputSchema,
  AnalysisOutputSchema,
  ReviewOutputSchema,
} from "./agents/schemas.js";
import { loadConfig } from "./config/loader.js";
import { defaultConfig } from "./config/schema.js";
import { createLogger } from "./utils/logger.js";
import type { Logger } from "./utils/logger.js";
import { PipelineError } from "./utils/errors.js";
import { resolveGitHubToken } from "./clients/github.js";

describe("Integration: Fixture Schema Validation", () => {
  it("stub context agent output passes ContextOutputSchema", async () => {
    const agent = createStubContextAgent();
    const output = await agent.run({});
    expect(ContextOutputSchema.safeParse(output).success).toBe(true);
  });

  it("stub analysis agent output passes AnalysisOutputSchema", async () => {
    const contextAgent = createStubContextAgent();
    const contextOut = await contextAgent.run({});
    const agent = createStubAnalysisAgent();
    const output = await agent.run(contextOut);
    expect(AnalysisOutputSchema.safeParse(output).success).toBe(true);
  });

  it("stub review agent output passes ReviewOutputSchema", async () => {
    const contextAgent = createStubContextAgent();
    const contextOut = await contextAgent.run({});
    const analysisAgent = createStubAnalysisAgent();
    const analysisOut = await analysisAgent.run(contextOut);
    const agent = createStubReviewAgent();
    const output = await agent.run(analysisOut);
    expect(ReviewOutputSchema.safeParse(output).success).toBe(true);
  });
});

describe("Integration: Full Pipeline with Stubs", () => {
  it("runs end-to-end with all stub agents and returns valid PipelineResult", async () => {
    const agents = [
      createStubContextAgent(),
      createStubAnalysisAgent(),
      createStubReviewAgent(),
      createStubOutputAgent(),
    ];

    const result = await runPipeline(agents, {});

    expect(result.output).toBeDefined();
    expect(result.stages).toHaveLength(4);
    expect(result.totalDuration).toBeGreaterThanOrEqual(0);

    // Final output should be valid ReviewOutput
    const parsed = ReviewOutputSchema.safeParse(result.output);
    expect(parsed.success).toBe(true);
  });

  it("chains stage outputs correctly through all 4 stub stages", async () => {
    const agents = [
      createStubContextAgent(),
      createStubAnalysisAgent(),
      createStubReviewAgent(),
      createStubOutputAgent(),
    ];

    const result = await runPipeline(agents, {});

    for (const stage of result.stages) {
      expect(stage.success).toBe(true);
      expect(stage.duration).toBeGreaterThanOrEqual(0);
      expect(stage.attempts).toBe(1);
    }

    expect(result.stages[0].agentName).toBe("StubContextAgent");
    expect(result.stages[1].agentName).toBe("StubAnalysisAgent");
    expect(result.stages[2].agentName).toBe("StubReviewAgent");
    expect(result.stages[3].agentName).toBe("StubOutputAgent");
  });
});

describe("Integration: Config + Pipeline Flow", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cr-integration-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads config from temp directory and merges with defaults", () => {
    const configData = { criticalThreshold: 5, model: "claude-sonnet-4-6" };
    fs.writeFileSync(path.join(tmpDir, ".codereview.json"), JSON.stringify(configData));
    fs.mkdirSync(path.join(tmpDir, ".git"));

    const config = loadConfig({ startDir: tmpDir });

    expect(config.criticalThreshold).toBe(5);
    expect(config.model).toBe("claude-sonnet-4-6");
    expect(config.maxRetries).toBe(defaultConfig.maxRetries);
    expect(config.output.console).toBe(true);
  });

  it("config-driven pipeline run completes successfully", async () => {
    const configData = { maxRetries: 2 };
    fs.writeFileSync(path.join(tmpDir, ".codereview.json"), JSON.stringify(configData));
    fs.mkdirSync(path.join(tmpDir, ".git"));

    const config = loadConfig({ startDir: tmpDir });

    const agents = [
      createStubContextAgent(),
      createStubAnalysisAgent(),
      createStubReviewAgent(),
      createStubOutputAgent(),
    ];

    const result = await runPipeline(agents, {}, { maxRetries: config.maxRetries });

    expect(result.output).toBeDefined();
    expect(result.stages).toHaveLength(4);
  });
});

describe("Integration: CLI Command Parsing", () => {
  it("parses review-pr command with valid URL and --verbose flag", async () => {
    const { createProgram } = await import("./index.js");
    const { reviewPR } = await import("./commands/review-pr.js");
    const mockReviewPR = reviewPR as ReturnType<typeof vi.fn>;
    mockReviewPR.mockResolvedValue(undefined);

    const program = createProgram();
    await program.parseAsync([
      "node",
      "script",
      "review-pr",
      "https://github.com/owner/repo/pull/42",
      "--verbose",
    ]);

    expect(mockReviewPR).toHaveBeenCalledWith(
      "https://github.com/owner/repo/pull/42",
      expect.objectContaining({ verbose: true }),
    );
  });

  it("parses review-repo command with valid URL", async () => {
    const { createProgram } = await import("./index.js");
    const { reviewRepo } = await import("./commands/review-repo.js");
    const mockReviewRepo = reviewRepo as ReturnType<typeof vi.fn>;
    mockReviewRepo.mockResolvedValue(undefined);

    const program = createProgram();
    await program.parseAsync([
      "node",
      "script",
      "review-repo",
      "https://github.com/owner/repo",
    ]);

    expect(mockReviewRepo).toHaveBeenCalledWith(
      "https://github.com/owner/repo",
      expect.objectContaining({ verbose: false }),
    );
  });
});

describe("Integration: End-to-End Command Handlers", () => {
  let savedApiKey: string | undefined;
  let savedGhToken: string | undefined;
  const mockResolveGitHubToken = resolveGitHubToken as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    savedApiKey = process.env.ANTHROPIC_API_KEY;
    savedGhToken = process.env.GITHUB_TOKEN;
    process.env.ANTHROPIC_API_KEY = "test-api-key";
    process.env.GITHUB_TOKEN = "test-gh-token";
    mockResolveGitHubToken.mockReturnValue("test-gh-token");
  });

  afterEach(() => {
    if (savedApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = savedApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    if (savedGhToken !== undefined) {
      process.env.GITHUB_TOKEN = savedGhToken;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
  });

  it("review-pr flow with stub agents completes successfully", async () => {
    const logger = createLogger({ verbose: false });
    const agents = [
      createStubContextAgent(logger),
      createStubAnalysisAgent(logger),
      createStubReviewAgent(logger),
      createStubOutputAgent(logger),
    ];

    const result = await runPipeline(
      agents,
      { mode: "pr", owner: "test", repo: "repo", number: 42 },
    );

    expect(result.output).toBeDefined();
    expect(result.stages).toHaveLength(4);
  });

  it("review-repo flow with stub agents completes successfully", async () => {
    const logger = createLogger({ verbose: false });
    const agents = [
      createStubContextAgent(logger),
      createStubAnalysisAgent(logger),
      createStubReviewAgent(logger),
      createStubOutputAgent(logger),
    ];

    const result = await runPipeline(
      agents,
      { mode: "repo", owner: "test", repo: "repo" },
    );

    expect(result.output).toBeDefined();
    expect(result.stages).toHaveLength(4);
  });
});

describe("Integration: Config Env Var Override", () => {
  let savedApiKey: string | undefined;
  let savedGhToken: string | undefined;

  beforeEach(() => {
    savedApiKey = process.env.ANTHROPIC_API_KEY;
    savedGhToken = process.env.GITHUB_TOKEN;
  });

  afterEach(() => {
    if (savedApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = savedApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
    if (savedGhToken !== undefined) {
      process.env.GITHUB_TOKEN = savedGhToken;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
  });

  it("env vars flow through to loaded config", () => {
    process.env.ANTHROPIC_API_KEY = "env-api-key";
    process.env.GITHUB_TOKEN = "env-gh-token";

    const config = loadConfig();

    expect(config.apiKey).toBe("env-api-key");
    expect(config.githubToken).toBe("env-gh-token");
  });
});

describe("Integration: Error Propagation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("pipeline failure surfaces as PipelineError with agent name and attempt count", async () => {
    const failingAgent: Agent<unknown, unknown> = {
      name: "FailingAgent",
      idempotent: false,
      async run() {
        throw new Error("Something went wrong");
      },
    };

    try {
      await runPipeline([failingAgent], {});
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PipelineError);
      const pErr = err as PipelineError;
      expect(pErr.agentName).toBe("FailingAgent");
      expect(pErr.attempts).toBe(1);
      expect(pErr.message).toContain("FailingAgent");
      expect(pErr.message).toContain("Something went wrong");
    }
  });

  it("idempotent agent exhausts retries before surfacing PipelineError", async () => {
    vi.useRealTimers(); // Use real timers — backoff is short with maxRetries: 2

    let callCount = 0;
    const retryAgent: Agent<unknown, unknown> = {
      name: "RetryAgent",
      idempotent: true,
      async run() {
        callCount++;
        throw new Error("Always fails");
      },
    };

    try {
      await runPipeline([retryAgent], {}, { maxRetries: 2 });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PipelineError);
      const pErr = err as PipelineError;
      expect(pErr.agentName).toBe("RetryAgent");
      expect(pErr.attempts).toBe(2);
      expect(callCount).toBe(2);
    }
  });
});

describe("Integration: Verbose Logging", () => {
  it("verbose mode produces log output during pipeline execution", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const logger = createLogger({ verbose: true });
    const agents = [
      createStubContextAgent(logger),
      createStubAnalysisAgent(logger),
      createStubReviewAgent(logger),
      createStubOutputAgent(logger),
    ];

    await runPipeline(agents, {}, { logger });

    const stdout = stdoutSpy.mock.calls.map((c) => String(c[0])).join("");

    // Pipeline runner logs "Running <agent>..." for each agent
    expect(stdout).toContain("Running StubContextAgent...");
    expect(stdout).toContain("Running StubAnalysisAgent...");
    expect(stdout).toContain("Running StubReviewAgent...");
    expect(stdout).toContain("Running StubOutputAgent...");

    // Stub agents log verbose messages
    expect(stdout).toContain("[STUB] StubContextAgent running");

    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it("non-verbose mode suppresses verbose log lines", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const logger = createLogger({ verbose: false });
    const agents = [
      createStubContextAgent(logger),
      createStubOutputAgent(logger),
    ];

    await runPipeline(agents, {}, { logger });

    const stdout = stdoutSpy.mock.calls.map((c) => String(c[0])).join("");

    // info-level logs still appear (pipeline runner uses logger.info)
    expect(stdout).toContain("Running StubContextAgent...");
    // verbose-level stub logs should NOT appear
    expect(stdout).not.toContain("[STUB]");

    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });
});
