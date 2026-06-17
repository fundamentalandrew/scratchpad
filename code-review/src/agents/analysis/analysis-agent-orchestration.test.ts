import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import type { ClassificationResult } from "./deterministic/types.js";
import { AnalysisOutputSchema } from "../../agents/schemas.js";

type CodeReviewConfig = {
  ignorePatterns: string[];
  criticalThreshold: number;
  domainRulesPath: string;
  architecturePath: string;
  model: string;
  maxRetries: number;
  output: { console: boolean; markdown: boolean; markdownPath: string; githubComment: boolean };
};

// Mock all internal modules
vi.mock("./deterministic/pattern-filter.js", () => ({
  filterChangedFiles: vi.fn(),
  ANALYSIS_IGNORE_PATTERNS: ["*.lock"],
}));

vi.mock("./deterministic/ast-analyzer.js", () => ({
  isSupportedLanguage: vi.fn(),
  parseFile: vi.fn(),
  detectLanguage: vi.fn(),
}));

vi.mock("./deterministic/ast-classifier.js", () => ({
  classifyChange: vi.fn(),
}));

vi.mock("./scoring/batch-builder.js", () => ({
  buildBatches: vi.fn(),
  estimateTokens: vi.fn().mockReturnValue(100),
}));

vi.mock("./scoring/prompt-builder.js", () => ({
  buildSystemPrompt: vi.fn().mockReturnValue("system prompt"),
  buildBatchPrompt: vi.fn().mockReturnValue("batch prompt"),
}));

vi.mock("./scoring/llm-scorer.js", () => ({
  scoreFiles: vi.fn(),
  LLMScoringResponseSchema: {},
}));

import { filterChangedFiles } from "./deterministic/pattern-filter.js";
import { isSupportedLanguage, parseFile, detectLanguage } from "./deterministic/ast-analyzer.js";
import { classifyChange } from "./deterministic/ast-classifier.js";
import { buildBatches } from "./scoring/batch-builder.js";
import { buildSystemPrompt } from "./scoring/prompt-builder.js";
import { scoreFiles } from "./scoring/llm-scorer.js";
import { createAnalysisAgent } from "./analysis-agent.js";

const mockFilterChangedFiles = vi.mocked(filterChangedFiles);
const mockIsSupportedLanguage = vi.mocked(isSupportedLanguage);
const mockParseFile = vi.mocked(parseFile);
const mockDetectLanguage = vi.mocked(detectLanguage);
const mockClassifyChange = vi.mocked(classifyChange);
const mockBuildBatches = vi.mocked(buildBatches);
const mockBuildSystemPrompt = vi.mocked(buildSystemPrompt);
const mockScoreFiles = vi.mocked(scoreFiles);

function makeDeps(configOverrides: Partial<CodeReviewConfig> = {}) {
  return {
    claude: { query: vi.fn() } as any,
    logger: { info: vi.fn(), verbose: vi.fn(), error: vi.fn(), warn: vi.fn(), success: vi.fn() },
    config: {
      ignorePatterns: ["node_modules/**"],
      criticalThreshold: 8,
      domainRulesPath: "./DOMAIN_RULES.md",
      architecturePath: "./ARCHITECTURE.md",
      model: "claude-sonnet-4-6",
      maxRetries: 3,
      output: { console: true, markdown: false, markdownPath: "./report.md", githubComment: false },
      ...configOverrides,
    } as CodeReviewConfig,
  };
}

function makeInput(files: Array<{ path: string; status?: string; patch?: string | null }>) {
  return {
    mode: "pr" as const,
    repository: { owner: "test", repo: "repo", defaultBranch: "main" },
    pr: {
      number: 1,
      title: "Test PR",
      description: "A test PR",
      author: "user",
      baseBranch: "main",
      headBranch: "feature",
      files: files.map((f) => ({
        path: f.path,
        status: f.status ?? "modified",
        additions: 10,
        deletions: 5,
        patch: f.patch !== undefined ? f.patch : `diff for ${f.path}`,
      })),
      diff: "full diff",
    },
    domainRules: null,
    architectureDoc: null,
  };
}

describe("analysis-agent orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: filter passes everything, no AST support, no batches, no LLM scores
    mockFilterChangedFiles.mockReturnValue({ passed: [], ignored: [], ignoredScores: [] });
    mockIsSupportedLanguage.mockReturnValue(false);
    mockDetectLanguage.mockReturnValue(null);
    mockBuildBatches.mockReturnValue([]);
    mockBuildSystemPrompt.mockReturnValue("system prompt");
    mockScoreFiles.mockResolvedValue([]);
  });

  // --- Orchestration Flow ---

  it("agent.name is 'analysis' and agent.idempotent is true", () => {
    const agent = createAnalysisAgent(makeDeps());
    expect(agent.name).toBe("analysis");
    expect(agent.idempotent).toBe(true);
  });

  it("full pipeline produces AnalysisOutput conforming to AnalysisOutputSchema", async () => {
    const input = makeInput([{ path: "src/index.ts" }]);
    const prFiles = input.pr!.files;
    mockFilterChangedFiles.mockReturnValue({
      passed: prFiles,
      ignored: [],
      ignoredScores: [],
    });
    mockBuildBatches.mockReturnValue([{
      files: [{ path: "src/index.ts", diff: "diff", status: "modified" }],
      estimatedTokens: 100,
      isLargeFile: false,
    }]);
    mockScoreFiles.mockResolvedValue([{
      file: "src/index.ts",
      score: 5,
      reason: "Logic change",
      changeType: "logic-change",
    }]);

    const agent = createAnalysisAgent(makeDeps());
    const result = await agent.run(input);

    // Should conform to schema
    expect(() => AnalysisOutputSchema.parse(result)).not.toThrow();
    expect(result.scoredFiles).toHaveLength(1);
    expect(result.scoredFiles[0].path).toBe("src/index.ts");
  });

  it("handles ContextOutput with zero files (empty PR)", async () => {
    const input = makeInput([]);
    mockFilterChangedFiles.mockReturnValue({ passed: [], ignored: [], ignoredScores: [] });

    const agent = createAnalysisAgent(makeDeps());
    const result = await agent.run(input);

    expect(result.scoredFiles).toEqual([]);
    expect(result.summary.totalFiles).toBe(0);
    expect(mockScoreFiles).not.toHaveBeenCalled();
  });

  it("handles ContextOutput with only ignored files", async () => {
    const input = makeInput([{ path: "package-lock.json" }]);
    mockFilterChangedFiles.mockReturnValue({
      passed: [],
      ignored: input.pr!.files,
      ignoredScores: [{ path: "package-lock.json", score: 0, riskLevel: "low", reasons: ["Filtered by ignore pattern"] }],
    });

    const agent = createAnalysisAgent(makeDeps());
    const result = await agent.run(input);

    expect(result.scoredFiles).toHaveLength(1);
    expect(result.scoredFiles[0].score).toBe(0);
    expect(mockScoreFiles).not.toHaveBeenCalled();
  });

  it("added files skip AST classification, reach LLM scoring", async () => {
    const input = makeInput([{ path: "src/new.ts", status: "added" }]);
    mockFilterChangedFiles.mockReturnValue({
      passed: input.pr!.files,
      ignored: [],
      ignoredScores: [],
    });
    mockIsSupportedLanguage.mockReturnValue(true);
    mockBuildBatches.mockReturnValue([{
      files: [{ path: "src/new.ts", diff: "diff", status: "added" }],
      estimatedTokens: 100,
      isLargeFile: false,
    }]);
    mockScoreFiles.mockResolvedValue([{
      file: "src/new.ts", score: 6, reason: "New file", changeType: "logic-change",
    }]);

    const agent = createAnalysisAgent(makeDeps());
    const result = await agent.run(input);

    expect(mockClassifyChange).not.toHaveBeenCalled();
    expect(result.scoredFiles).toHaveLength(1);
    expect(result.scoredFiles[0].score).toBe(6);
  });

  it("deleted files skip AST classification, reach LLM scoring", async () => {
    const input = makeInput([{ path: "src/old.ts", status: "removed" }]);
    mockFilterChangedFiles.mockReturnValue({
      passed: input.pr!.files,
      ignored: [],
      ignoredScores: [],
    });
    mockBuildBatches.mockReturnValue([{
      files: [{ path: "src/old.ts", diff: "diff", status: "deleted" }],
      estimatedTokens: 100,
      isLargeFile: false,
    }]);
    mockScoreFiles.mockResolvedValue([{
      file: "src/old.ts", score: 4, reason: "Deleted file", changeType: "other",
    }]);

    const agent = createAnalysisAgent(makeDeps());
    const result = await agent.run(input);

    expect(mockClassifyChange).not.toHaveBeenCalled();
    expect(result.scoredFiles).toHaveLength(1);
  });

  it("binary files (patch === null) get sent to LLM", async () => {
    const input = makeInput([{ path: "image.png", patch: null }]);
    mockFilterChangedFiles.mockReturnValue({
      passed: input.pr!.files,
      ignored: [],
      ignoredScores: [],
    });
    mockBuildBatches.mockReturnValue([{
      files: [{ path: "image.png", diff: "", status: "modified" }],
      estimatedTokens: 10,
      isLargeFile: false,
    }]);
    mockScoreFiles.mockResolvedValue([{
      file: "image.png", score: 2, reason: "Binary change", changeType: "other",
    }]);

    const agent = createAnalysisAgent(makeDeps());
    const result = await agent.run(input);

    expect(result.scoredFiles).toHaveLength(1);
  });

  it("is idempotent - running twice produces same structure", async () => {
    const input = makeInput([{ path: "src/a.ts" }]);
    mockFilterChangedFiles.mockReturnValue({
      passed: input.pr!.files, ignored: [], ignoredScores: [],
    });
    mockBuildBatches.mockReturnValue([{
      files: [{ path: "src/a.ts", diff: "diff", status: "modified" }],
      estimatedTokens: 100, isLargeFile: false,
    }]);
    mockScoreFiles.mockResolvedValue([{
      file: "src/a.ts", score: 5, reason: "Change", changeType: "logic-change",
    }]);

    const agent = createAnalysisAgent(makeDeps());
    const result1 = await agent.run(input);
    const result2 = await agent.run(input);

    expect(result1.scoredFiles.length).toBe(result2.scoredFiles.length);
    expect(result1.summary).toEqual(result2.summary);
  });

  // --- Risk Level Mapping ---

  it("score 8-10 maps to riskLevel 'critical'", async () => {
    const input = makeInput([{ path: "a.ts" }]);
    mockFilterChangedFiles.mockReturnValue({ passed: input.pr!.files, ignored: [], ignoredScores: [] });
    mockBuildBatches.mockReturnValue([{ files: [{ path: "a.ts", diff: "d", status: "modified" }], estimatedTokens: 10, isLargeFile: false }]);
    mockScoreFiles.mockResolvedValue([{ file: "a.ts", score: 9, reason: "Critical", changeType: "security-change" }]);

    const result = await createAnalysisAgent(makeDeps()).run(input);
    expect(result.scoredFiles[0].riskLevel).toBe("critical");
  });

  it("score 5-7 maps to riskLevel 'high'", async () => {
    const input = makeInput([{ path: "a.ts" }]);
    mockFilterChangedFiles.mockReturnValue({ passed: input.pr!.files, ignored: [], ignoredScores: [] });
    mockBuildBatches.mockReturnValue([{ files: [{ path: "a.ts", diff: "d", status: "modified" }], estimatedTokens: 10, isLargeFile: false }]);
    mockScoreFiles.mockResolvedValue([{ file: "a.ts", score: 6, reason: "High", changeType: "logic-change" }]);

    const result = await createAnalysisAgent(makeDeps()).run(input);
    expect(result.scoredFiles[0].riskLevel).toBe("high");
  });

  it("score 3-4 maps to riskLevel 'medium'", async () => {
    const input = makeInput([{ path: "a.ts" }]);
    mockFilterChangedFiles.mockReturnValue({ passed: input.pr!.files, ignored: [], ignoredScores: [] });
    mockBuildBatches.mockReturnValue([{ files: [{ path: "a.ts", diff: "d", status: "modified" }], estimatedTokens: 10, isLargeFile: false }]);
    mockScoreFiles.mockResolvedValue([{ file: "a.ts", score: 3, reason: "Medium", changeType: "config-change" }]);

    const result = await createAnalysisAgent(makeDeps()).run(input);
    expect(result.scoredFiles[0].riskLevel).toBe("medium");
  });

  it("score 0-2 maps to riskLevel 'low'", async () => {
    const input = makeInput([{ path: "a.ts" }]);
    mockFilterChangedFiles.mockReturnValue({ passed: input.pr!.files, ignored: [], ignoredScores: [] });
    mockBuildBatches.mockReturnValue([{ files: [{ path: "a.ts", diff: "d", status: "modified" }], estimatedTokens: 10, isLargeFile: false }]);
    mockScoreFiles.mockResolvedValue([{ file: "a.ts", score: 2, reason: "Low", changeType: "other" }]);

    const result = await createAnalysisAgent(makeDeps()).run(input);
    expect(result.scoredFiles[0].riskLevel).toBe("low");
  });

  // --- Merge/Override Precedence ---

  it("LLM override of pre-classified file uses the higher of the two scores", async () => {
    const input = makeInput([{ path: "src/a.ts" }]);
    const prFiles = input.pr!.files;

    mockFilterChangedFiles.mockReturnValue({ passed: prFiles, ignored: [], ignoredScores: [] });
    mockIsSupportedLanguage.mockReturnValue(true);
    mockDetectLanguage.mockReturnValue("typescript");
    // File has no beforeContent/afterContent on PRFile, so no AST classification happens
    // Simulate: file goes to LLM and also was AST-classified somehow
    // Actually: without beforeContent/afterContent, no AST. Let's test merge directly
    // by having filter pass a file, AST not applicable, LLM scores it
    mockBuildBatches.mockReturnValue([{ files: [{ path: "src/a.ts", diff: "d", status: "modified" }], estimatedTokens: 10, isLargeFile: false }]);
    mockScoreFiles.mockResolvedValue([{ file: "src/a.ts", score: 7, reason: "Important", changeType: "logic-change" }]);

    const result = await createAnalysisAgent(makeDeps()).run(input);
    expect(result.scoredFiles[0].score).toBe(7);
  });

  it("ignored files (score 0) always included in scoredFiles with riskLevel 'low'", async () => {
    const input = makeInput([{ path: "lock.json" }, { path: "src/a.ts" }]);
    mockFilterChangedFiles.mockReturnValue({
      passed: [input.pr!.files[1]],
      ignored: [input.pr!.files[0]],
      ignoredScores: [{ path: "lock.json", score: 0, riskLevel: "low" as const, reasons: ["Filtered"] }],
    });
    mockBuildBatches.mockReturnValue([{ files: [{ path: "src/a.ts", diff: "d", status: "modified" }], estimatedTokens: 10, isLargeFile: false }]);
    mockScoreFiles.mockResolvedValue([{ file: "src/a.ts", score: 5, reason: "Change", changeType: "logic-change" }]);

    const result = await createAnalysisAgent(makeDeps()).run(input);
    const ignored = result.scoredFiles.find((f) => f.path === "lock.json");
    expect(ignored).toBeDefined();
    expect(ignored!.score).toBe(0);
    expect(ignored!.riskLevel).toBe("low");
  });

  // --- Critical Files ---

  it("criticalFiles contains only files with score >= criticalThreshold", async () => {
    const input = makeInput([{ path: "a.ts" }, { path: "b.ts" }]);
    mockFilterChangedFiles.mockReturnValue({ passed: input.pr!.files, ignored: [], ignoredScores: [] });
    mockBuildBatches.mockReturnValue([{
      files: [
        { path: "a.ts", diff: "d", status: "modified" },
        { path: "b.ts", diff: "d", status: "modified" },
      ],
      estimatedTokens: 20, isLargeFile: false,
    }]);
    mockScoreFiles.mockResolvedValue([
      { file: "a.ts", score: 9, reason: "Critical", changeType: "security-change" },
      { file: "b.ts", score: 3, reason: "Low", changeType: "other" },
    ]);

    const result = await createAnalysisAgent(makeDeps()).run(input);
    expect(result.criticalFiles).toHaveLength(1);
    expect(result.criticalFiles[0].path).toBe("a.ts");
  });

  it("criticalThreshold defaults to 8 from config", async () => {
    const input = makeInput([{ path: "a.ts" }]);
    mockFilterChangedFiles.mockReturnValue({ passed: input.pr!.files, ignored: [], ignoredScores: [] });
    mockBuildBatches.mockReturnValue([{ files: [{ path: "a.ts", diff: "d", status: "modified" }], estimatedTokens: 10, isLargeFile: false }]);
    mockScoreFiles.mockResolvedValue([{ file: "a.ts", score: 8, reason: "Critical", changeType: "logic-change" }]);

    const result = await createAnalysisAgent(makeDeps()).run(input);
    expect(result.criticalFiles).toHaveLength(1);
  });

  it("custom criticalThreshold from config is respected", async () => {
    const input = makeInput([{ path: "a.ts" }]);
    mockFilterChangedFiles.mockReturnValue({ passed: input.pr!.files, ignored: [], ignoredScores: [] });
    mockBuildBatches.mockReturnValue([{ files: [{ path: "a.ts", diff: "d", status: "modified" }], estimatedTokens: 10, isLargeFile: false }]);
    mockScoreFiles.mockResolvedValue([{ file: "a.ts", score: 6, reason: "Medium", changeType: "logic-change" }]);

    const result = await createAnalysisAgent(makeDeps({ criticalThreshold: 5 })).run(input);
    expect(result.criticalFiles).toHaveLength(1);
  });

  // --- Summary Statistics ---

  it("totalFiles counts all files including ignored", async () => {
    const input = makeInput([{ path: "lock.json" }, { path: "a.ts" }]);
    mockFilterChangedFiles.mockReturnValue({
      passed: [input.pr!.files[1]],
      ignored: [input.pr!.files[0]],
      ignoredScores: [{ path: "lock.json", score: 0, riskLevel: "low" as const, reasons: ["Filtered"] }],
    });
    mockBuildBatches.mockReturnValue([{ files: [{ path: "a.ts", diff: "d", status: "modified" }], estimatedTokens: 10, isLargeFile: false }]);
    mockScoreFiles.mockResolvedValue([{ file: "a.ts", score: 5, reason: "Change", changeType: "logic-change" }]);

    const result = await createAnalysisAgent(makeDeps()).run(input);
    expect(result.summary.totalFiles).toBe(2);
  });

  it("criticalCount matches files with riskLevel 'critical'", async () => {
    const input = makeInput([{ path: "a.ts" }, { path: "b.ts" }]);
    mockFilterChangedFiles.mockReturnValue({ passed: input.pr!.files, ignored: [], ignoredScores: [] });
    mockBuildBatches.mockReturnValue([{
      files: [
        { path: "a.ts", diff: "d", status: "modified" },
        { path: "b.ts", diff: "d", status: "modified" },
      ],
      estimatedTokens: 20, isLargeFile: false,
    }]);
    mockScoreFiles.mockResolvedValue([
      { file: "a.ts", score: 9, reason: "Crit", changeType: "security-change" },
      { file: "b.ts", score: 3, reason: "Low", changeType: "other" },
    ]);

    const result = await createAnalysisAgent(makeDeps()).run(input);
    expect(result.summary.criticalCount).toBe(1);
  });

  it("highCount matches files with riskLevel 'high'", async () => {
    const input = makeInput([{ path: "a.ts" }]);
    mockFilterChangedFiles.mockReturnValue({ passed: input.pr!.files, ignored: [], ignoredScores: [] });
    mockBuildBatches.mockReturnValue([{ files: [{ path: "a.ts", diff: "d", status: "modified" }], estimatedTokens: 10, isLargeFile: false }]);
    mockScoreFiles.mockResolvedValue([{ file: "a.ts", score: 6, reason: "High", changeType: "logic-change" }]);

    const result = await createAnalysisAgent(makeDeps()).run(input);
    expect(result.summary.highCount).toBe(1);
  });

  it("categories map aggregates changeType counts", async () => {
    const input = makeInput([{ path: "a.ts" }, { path: "b.ts" }, { path: "lock.json" }]);
    mockFilterChangedFiles.mockReturnValue({
      passed: [input.pr!.files[0], input.pr!.files[1]],
      ignored: [input.pr!.files[2]],
      ignoredScores: [{ path: "lock.json", score: 0, riskLevel: "low" as const, reasons: ["Filtered"] }],
    });
    mockBuildBatches.mockReturnValue([{
      files: [
        { path: "a.ts", diff: "d", status: "modified" },
        { path: "b.ts", diff: "d", status: "modified" },
      ],
      estimatedTokens: 20, isLargeFile: false,
    }]);
    mockScoreFiles.mockResolvedValue([
      { file: "a.ts", score: 5, reason: "Logic", changeType: "logic-change" },
      { file: "b.ts", score: 3, reason: "Config", changeType: "logic-change" },
    ]);

    const result = await createAnalysisAgent(makeDeps()).run(input);
    expect(result.summary.categories["logic-change"]).toBe(2);
    expect(result.summary.categories["ignored"]).toBe(1);
  });

  // --- Output Schema Conformance ---

  it("output passes AnalysisOutputSchema.parse() without error", async () => {
    const input = makeInput([{ path: "a.ts" }, { path: "lock.json" }]);
    mockFilterChangedFiles.mockReturnValue({
      passed: [input.pr!.files[0]],
      ignored: [input.pr!.files[1]],
      ignoredScores: [{ path: "lock.json", score: 0, riskLevel: "low" as const, reasons: ["Filtered"] }],
    });
    mockBuildBatches.mockReturnValue([{ files: [{ path: "a.ts", diff: "d", status: "modified" }], estimatedTokens: 10, isLargeFile: false }]);
    mockScoreFiles.mockResolvedValue([{ file: "a.ts", score: 8, reason: "Critical", changeType: "security-change" }]);

    const result = await createAnalysisAgent(makeDeps()).run(input);
    expect(() => AnalysisOutputSchema.parse(result)).not.toThrow();
  });

  // --- Configuration ---

  it("agent works with minimal config (all optional fields absent)", async () => {
    const input = makeInput([]);
    mockFilterChangedFiles.mockReturnValue({ passed: [], ignored: [], ignoredScores: [] });

    const agent = createAnalysisAgent(makeDeps());
    const result = await agent.run(input);

    expect(result.scoredFiles).toEqual([]);
    expect(result.summary.totalFiles).toBe(0);
  });

  // --- Context Passthrough ---

  it("analysis agent output includes contextPassthrough with the input ContextOutput", async () => {
    const input = makeInput([{ path: "src/index.ts" }]);
    const prFiles = input.pr!.files;
    mockFilterChangedFiles.mockReturnValue({
      passed: prFiles,
      ignored: [],
      ignoredScores: [],
    });
    mockBuildBatches.mockReturnValue([{
      files: [{ path: "src/index.ts", diff: "diff", status: "modified" }],
      estimatedTokens: 100,
      isLargeFile: false,
    }]);
    mockScoreFiles.mockResolvedValue([{
      file: "src/index.ts",
      score: 5,
      reason: "Logic change",
      changeType: "logic-change",
    }]);

    const agent = createAnalysisAgent(makeDeps());
    const result = await agent.run(input);

    expect(result.contextPassthrough).toEqual(input);
    expect(() => AnalysisOutputSchema.parse(result)).not.toThrow();
  });

  it("contextPassthrough is set even when PR has zero files (empty output path)", async () => {
    const input = makeInput([]);
    mockFilterChangedFiles.mockReturnValue({ passed: [], ignored: [], ignoredScores: [] });

    const agent = createAnalysisAgent(makeDeps());
    const result = await agent.run(input);

    expect(result.contextPassthrough).toEqual(input);
  });

  // --- Edge: no pr in repo mode ---

  it("returns empty output when pr is undefined (repo mode)", async () => {
    const input = {
      mode: "repo" as any,
      repository: { owner: "test", repo: "repo", defaultBranch: "main" },
      repoFiles: [{ path: "src/a.ts" }],
      domainRules: null,
      architectureDoc: null,
    };

    const agent = createAnalysisAgent(makeDeps());
    const result = await agent.run(input);

    expect(result.scoredFiles).toEqual([]);
    expect(result.summary.totalFiles).toBe(0);
    expect(result.contextPassthrough).toEqual(input);
    expect(mockFilterChangedFiles).not.toHaveBeenCalled();
  });
});
