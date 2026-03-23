import { describe, it, expect, vi } from "vitest";
import { createReviewAgent, deriveSeverity, groupLowRiskFiles } from "../../src/review-agent.js";
import { LLMReviewResponseSchema } from "../../src/types.js";
import { ReviewOutputSchema } from "@core/agents/schemas.js";
import { defaultConfig } from "@core/config/schema.js";
import type { AnalysisOutput, ContextOutput, FileScore } from "../../src/types.js";

function makeContext(overrides: Partial<ContextOutput> = {}): ContextOutput {
  return {
    mode: "pr" as const,
    repository: { owner: "test", repo: "test-repo", defaultBranch: "main" },
    pr: {
      number: 42,
      title: "Add payment processing",
      description: "Stripe integration",
      author: "dev-user",
      baseBranch: "main",
      headBranch: "feature/payments",
      files: [],
      diff: "",
    },
    domainRules: null,
    architectureDoc: null,
    referencedIssues: [],
    ...overrides,
  } as ContextOutput;
}

function makeLLMResponse(files?: string[]) {
  const fileList = files ?? ["src/payments.ts"];
  return {
    data: {
      coreDecision: "The migration adds a new payment provider",
      recommendations: fileList.map((file) => ({
        file,
        category: "security",
        message: `Review needed for ${file}`,
        suggestion: `Improve ${file}`,
        humanCheckNeeded: `Verify ${file} is correct`,
        estimatedReviewTime: "15" as const,
      })),
      focusAreas: ["Payment security", "Error handling"],
      summary: "This PR introduces a new payment provider",
    },
    usage: { inputTokens: 1000, outputTokens: 500 },
  };
}

function makeInput(overrides: Partial<AnalysisOutput> = {}): AnalysisOutput {
  return {
    scoredFiles: [
      { path: "src/payments.ts", score: 9, riskLevel: "critical" as const, reasons: ["Security"] },
      { path: "src/utils.ts", score: 2, riskLevel: "low" as const, reasons: ["Formatting"] },
    ],
    criticalFiles: [
      { path: "src/payments.ts", score: 9, riskLevel: "critical" as const, reasons: ["Security"] },
    ],
    summary: {
      totalFiles: 2,
      criticalCount: 1,
      highCount: 0,
      categories: { "security-change": 1, "other": 1 },
    },
    contextPassthrough: makeContext(),
    ...overrides,
  };
}

function makeDeps(queryMock = vi.fn().mockResolvedValue(makeLLMResponse())) {
  return {
    claude: { query: queryMock } as any,
    logger: { info: vi.fn(), verbose: vi.fn(), error: vi.fn(), warn: vi.fn(), success: vi.fn() },
    config: defaultConfig,
  };
}

describe("createReviewAgent", () => {
  it("agent.name is 'review' and agent.idempotent is true", () => {
    const agent = createReviewAgent(makeDeps());
    expect(agent.name).toBe("review");
    expect(agent.idempotent).toBe(true);
  });

  it("empty scoredFiles returns empty recommendations and safeToIgnore", async () => {
    const deps = makeDeps();
    const agent = createReviewAgent(deps);
    const result = await agent.run(
      makeInput({ scoredFiles: [], criticalFiles: [] }),
    );
    expect(result.recommendations).toEqual([]);
    expect(result.safeToIgnore).toEqual([]);
    expect(deps.claude.query).not.toHaveBeenCalled();
  });

  it("all files below threshold produces only safeToIgnore, no recommendations", async () => {
    const deps = makeDeps();
    const agent = createReviewAgent(deps);
    const lowFiles: FileScore[] = [
      { path: "src/a.ts", score: 2, riskLevel: "low", reasons: ["Minor"] },
      { path: "src/b.ts", score: 3, riskLevel: "low", reasons: ["Trivial"] },
    ];
    const result = await agent.run(makeInput({ scoredFiles: lowFiles, criticalFiles: [] }));
    expect(result.recommendations).toEqual([]);
    expect(result.safeToIgnore.length).toBeGreaterThan(0);
    expect(deps.claude.query).not.toHaveBeenCalled();
  });

  it("files scoring 4+ appear in recommendations with correct scores from analysis data", async () => {
    const agent = createReviewAgent(makeDeps());
    const result = await agent.run(makeInput());
    const rec = result.recommendations.find((r) => r.file === "src/payments.ts");
    expect(rec).toBeDefined();
    expect(rec!.score).toBe(9);
  });

  it("severity derived deterministically from score", async () => {
    const agent = createReviewAgent(makeDeps());
    const result = await agent.run(makeInput());
    const rec = result.recommendations.find((r) => r.file === "src/payments.ts");
    expect(rec!.severity).toBe("critical"); // score 9
  });

  it("LLM response fields mapped correctly", async () => {
    const agent = createReviewAgent(makeDeps());
    const result = await agent.run(makeInput());
    const rec = result.recommendations[0];
    expect(rec.message).toBe("Review needed for src/payments.ts");
    expect(rec.humanCheckNeeded).toBe("Verify src/payments.ts is correct");
    expect(rec.estimatedReviewTime).toBe("15");
    expect(rec.category).toBe("security");
    expect(rec.suggestion).toBe("Improve src/payments.ts");
  });

  it("safeToIgnore groups computed from low-score files", async () => {
    const agent = createReviewAgent(makeDeps());
    const result = await agent.run(makeInput());
    // src/utils.ts scores 2, should be in safeToIgnore
    expect(result.safeToIgnore.length).toBeGreaterThan(0);
    expect(result.safeToIgnore[0].count).toBe(1);
  });

  it("safeToIgnore grouped by category when matching", () => {
    const files: FileScore[] = [
      { path: "src/a.ts", score: 2, riskLevel: "low", reasons: ["test-change"] },
      { path: "src/b.ts", score: 1, riskLevel: "low", reasons: ["test-change"] },
      { path: "src/c.ts", score: 3, riskLevel: "low", reasons: ["Config"] },
    ];
    const groups = groupLowRiskFiles(files, { "test-change": 5 });
    const catGroup = groups.find((g) => g.label === "test-change");
    expect(catGroup).toBeDefined();
    expect(catGroup!.count).toBe(2);
    // The non-matching file goes to directory group
    const dirGroup = groups.find((g) => g.label === "src/");
    expect(dirGroup).toBeDefined();
    expect(dirGroup!.count).toBe(1);
  });

  it("safeToIgnore grouped by top-level directory", () => {
    const files: FileScore[] = [
      { path: "tests/a.test.ts", score: 1, riskLevel: "low", reasons: ["Test"] },
      { path: "tests/b.test.ts", score: 2, riskLevel: "low", reasons: ["Test"] },
      { path: "src/c.ts", score: 1, riskLevel: "low", reasons: ["Config"] },
    ];
    const groups = groupLowRiskFiles(files, {});
    const testGroup = groups.find((g) => g.label === "tests/");
    expect(testGroup).toBeDefined();
    expect(testGroup!.count).toBe(2);
  });

  it("splits directory groups exceeding 20 files by next path segment", () => {
    const files: FileScore[] = Array.from({ length: 25 }, (_, i) => ({
      path: `src/sub${i % 3}/file-${i}.ts`,
      score: 2,
      riskLevel: "low" as const,
      reasons: ["Minor"],
    }));
    const groups = groupLowRiskFiles(files, {});
    // Should have split into src/sub0/, src/sub1/, src/sub2/
    expect(groups.length).toBe(3);
    for (const g of groups) {
      expect(g.label).toMatch(/^src\/sub\d\//);
    }
  });

  it("safeToIgnore sorted by count descending, label ascending", async () => {
    const files: FileScore[] = [
      { path: "tests/a.ts", score: 1, riskLevel: "low", reasons: ["Test"] },
      { path: "tests/b.ts", score: 2, riskLevel: "low", reasons: ["Test"] },
      { path: "tests/c.ts", score: 1, riskLevel: "low", reasons: ["Test"] },
      { path: "src/d.ts", score: 1, riskLevel: "low", reasons: ["Config"] },
    ];
    const groups = groupLowRiskFiles(files, {});
    expect(groups[0].label).toBe("tests/");
    expect(groups[0].count).toBe(3);
    expect(groups[1].label).toBe("src/");
    expect(groups[1].count).toBe(1);
  });

  it("PR mode uses buildPRSystemPrompt", async () => {
    const queryMock = vi.fn().mockResolvedValue(makeLLMResponse());
    const agent = createReviewAgent(makeDeps(queryMock));
    await agent.run(makeInput());
    const call = queryMock.mock.calls[0][0];
    expect(call.systemPrompt).toContain("principal engineer synthesizing a code review");
  });

  it("repo mode uses buildRepoSystemPrompt", async () => {
    const queryMock = vi.fn().mockResolvedValue(makeLLMResponse());
    const agent = createReviewAgent(makeDeps(queryMock));
    await agent.run(
      makeInput({ contextPassthrough: makeContext({ mode: "repo" as const }) }),
    );
    const call = queryMock.mock.calls[0][0];
    expect(call.systemPrompt).toContain("architecture assessment");
  });

  it("missing contextPassthrough returns minimal output with warning log", async () => {
    const deps = makeDeps();
    const agent = createReviewAgent(deps);
    const result = await agent.run(makeInput({ contextPassthrough: undefined }));
    expect(result.recommendations).toEqual([]);
    expect(result.safeToIgnore).toEqual([]);
    expect(result.coreDecision).toContain("missing context");
    expect(deps.logger.warn).toHaveBeenCalled();
    expect(deps.claude.query).not.toHaveBeenCalled();
  });

  it("coreDecision from LLM passed through to output", async () => {
    const agent = createReviewAgent(makeDeps());
    const result = await agent.run(makeInput());
    expect(result.coreDecision).toBe("The migration adds a new payment provider");
  });

  it("focusAreas from LLM passed through to output", async () => {
    const agent = createReviewAgent(makeDeps());
    const result = await agent.run(makeInput());
    expect(result.focusAreas).toEqual(["Payment security", "Error handling"]);
  });

  it("summary from LLM passed through to output", async () => {
    const agent = createReviewAgent(makeDeps());
    const result = await agent.run(makeInput());
    expect(result.summary).toBe("This PR introduces a new payment provider");
  });

  it("output conforms to ReviewOutputSchema.parse()", async () => {
    const agent = createReviewAgent(makeDeps());
    const result = await agent.run(makeInput());
    expect(() => ReviewOutputSchema.parse(result)).not.toThrow();
  });

  it("multi-file scores and severities mapped correctly through run()", async () => {
    const files: FileScore[] = [
      { path: "src/auth.ts", score: 10, riskLevel: "critical", reasons: ["Auth"] },
      { path: "src/api.ts", score: 8, riskLevel: "critical", reasons: ["API"] },
      { path: "src/handler.ts", score: 6, riskLevel: "high", reasons: ["Logic"] },
      { path: "src/validate.ts", score: 5, riskLevel: "high", reasons: ["Validation"] },
      { path: "src/config.ts", score: 4, riskLevel: "medium", reasons: ["Config"] },
      { path: "src/readme.ts", score: 2, riskLevel: "low", reasons: ["Docs"] },
    ];
    const highRiskFiles = files.filter((f) => f.score >= 4).map((f) => f.path);
    const queryMock = vi.fn().mockResolvedValue(makeLLMResponse(highRiskFiles));
    const agent = createReviewAgent(makeDeps(queryMock));
    const result = await agent.run(makeInput({
      scoredFiles: files,
      criticalFiles: files.filter((f) => f.riskLevel === "critical"),
    }));

    expect(result.recommendations).toHaveLength(5);
    const byFile = new Map(result.recommendations.map((r) => [r.file, r]));
    expect(byFile.get("src/auth.ts")!.severity).toBe("critical");
    expect(byFile.get("src/auth.ts")!.score).toBe(10);
    expect(byFile.get("src/api.ts")!.severity).toBe("critical");
    expect(byFile.get("src/handler.ts")!.severity).toBe("high");
    expect(byFile.get("src/validate.ts")!.severity).toBe("high");
    expect(byFile.get("src/config.ts")!.severity).toBe("medium");
    expect(byFile.get("src/config.ts")!.score).toBe(4);
    // Low-score file should be in safeToIgnore, not recommendations
    expect(byFile.has("src/readme.ts")).toBe(false);
    expect(result.safeToIgnore.length).toBeGreaterThan(0);
  });

  it("Claude client called with LLMReviewResponseSchema", async () => {
    const queryMock = vi.fn().mockResolvedValue(makeLLMResponse());
    const agent = createReviewAgent(makeDeps(queryMock));
    await agent.run(makeInput());
    expect(queryMock).toHaveBeenCalledWith(
      expect.objectContaining({ schema: LLMReviewResponseSchema }),
    );
  });
});

describe("deriveSeverity", () => {
  it("returns critical for 8-10", () => {
    expect(deriveSeverity(8)).toBe("critical");
    expect(deriveSeverity(9)).toBe("critical");
    expect(deriveSeverity(10)).toBe("critical");
  });

  it("returns high for 5-7", () => {
    expect(deriveSeverity(5)).toBe("high");
    expect(deriveSeverity(6)).toBe("high");
    expect(deriveSeverity(7)).toBe("high");
  });

  it("returns medium for 4", () => {
    expect(deriveSeverity(4)).toBe("medium");
  });

  it("returns low for < 4", () => {
    expect(deriveSeverity(3)).toBe("low");
    expect(deriveSeverity(1)).toBe("low");
  });
});
