import { describe, it, expect } from "vitest";
import {
  createAnalysisAgent,
  type ClassificationResult,
  type FunctionInfo,
  type FilterResult,
  type AnalysisFile,
  type PRFile,
  type ScoringContext,
  type ScoringFile,
  type FileBatch,
  type LLMScoringResult,
  type LowRiskSummary,
} from "../../src/index.js";

describe("foundation smoke tests", () => {
  it("createAnalysisAgent is a function", () => {
    expect(typeof createAnalysisAgent).toBe("function");
  });

  it("createAnalysisAgent returns agent with correct shape", () => {
    const agent = createAnalysisAgent({
      claude: {} as any,
      config: {} as any,
    });
    expect(agent.name).toBe("analysis");
    expect(agent.idempotent).toBe(true);
    expect(typeof agent.run).toBe("function");
  });

  it("stub run() rejects with not implemented", async () => {
    const agent = createAnalysisAgent({
      claude: {} as any,
      config: {} as any,
    });
    await expect(agent.run({} as any)).rejects.toThrow("Not implemented");
  });

  it("deterministic types are importable", () => {
    const classification: ClassificationResult = {
      changeType: "format-only",
      confidence: 0.95,
      details: "test",
    };
    expect(classification.changeType).toBe("format-only");

    const func: FunctionInfo = {
      name: "test",
      hash: "abc",
      startLine: 1,
      endLine: 10,
    };
    expect(func.name).toBe("test");

    const filter: FilterResult = { passed: [], ignored: [] };
    expect(filter.passed).toEqual([]);

    const prFile: PRFile = {
      path: "test.ts",
      status: "modified",
      additions: 1,
      deletions: 0,
      patch: null,
    };
    expect(prFile.path).toBe("test.ts");

    const file: AnalysisFile = {
      ...prFile,
      beforeContent: "old",
      afterContent: "new",
    };
    expect(file.beforeContent).toBe("old");
  });

  it("scoring types are importable", () => {
    const context: ScoringContext = {
      domainRules: null,
      architectureDoc: null,
      techStack: { languages: [], frameworks: [], dependencies: {} },
      prTitle: "test",
      prDescription: "test",
    };
    expect(context.prTitle).toBe("test");

    const scoringFile: ScoringFile = {
      path: "test.ts",
      diff: "+line",
      status: "modified",
    };
    expect(scoringFile.path).toBe("test.ts");

    const batch: FileBatch = {
      files: [scoringFile],
      estimatedTokens: 100,
      isLargeFile: false,
    };
    expect(batch.files.length).toBe(1);

    const result: LLMScoringResult = {
      file: "test.ts",
      score: 5,
      reason: "test",
      changeType: "logic-change",
    };
    expect(result.score).toBe(5);

    const summary: LowRiskSummary = {
      path: "test.ts",
      changeType: "format-only",
      suggestedScore: 1,
    };
    expect(summary.suggestedScore).toBe(1);
  });
});
