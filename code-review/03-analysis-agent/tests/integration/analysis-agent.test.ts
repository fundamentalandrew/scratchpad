import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { createAnalysisAgent } from "../../src/analysis-agent.js";
import { AnalysisOutputSchema } from "@core/agents/schemas.js";
import type { AnalysisOutput } from "@core/agents/schemas.js";

// ---------- helpers ----------

function buildContextOutput(
  files: Array<{
    path: string;
    status?: string;
    additions?: number;
    deletions?: number;
    patch?: string | null;
    previousPath?: string;
    beforeContent?: string;
    afterContent?: string;
  }>,
  overrides: {
    domainRules?: string | null;
    architectureDoc?: string | null;
    techStack?: { languages: string[]; frameworks: string[]; dependencies: Record<string, string> };
    prTitle?: string;
    prDescription?: string;
  } = {},
) {
  return {
    mode: "pr" as const,
    repository: { owner: "test-org", repo: "test-repo", defaultBranch: "main" },
    pr: {
      number: 42,
      title: overrides.prTitle ?? "Test PR",
      description: overrides.prDescription ?? "Integration test PR",
      author: "test-author",
      baseBranch: "main",
      headBranch: "feature/test",
      files: files.map((f) => ({
        path: f.path,
        status: f.status ?? "modified",
        additions: f.additions ?? 10,
        deletions: f.deletions ?? 5,
        patch: f.patch !== undefined ? f.patch : `@@ -1,5 +1,10 @@\n+// changes in ${f.path}`,
        ...(f.previousPath ? { previousPath: f.previousPath } : {}),
        // AnalysisFile extensions (beforeContent/afterContent) are spread onto the file object
        // so the agent can pick them up when casting to AnalysisFile
        ...(f.beforeContent !== undefined ? { beforeContent: f.beforeContent } : {}),
        ...(f.afterContent !== undefined ? { afterContent: f.afterContent } : {}),
      })),
      diff: files.map((f) => `diff --git a/${f.path} b/${f.path}`).join("\n"),
    },
    domainRules: overrides.domainRules ?? null,
    architectureDoc: overrides.architectureDoc ?? null,
    ...(overrides.techStack ? { techStack: overrides.techStack } : {}),
  };
}

function buildMockClaudeClient(
  scores: Array<{ file: string; score: number; reason?: string; changeType?: string }>,
) {
  const query = vi.fn().mockResolvedValue({
    data: {
      scores: scores.map((s) => ({
        file: s.file,
        score: s.score,
        reason: s.reason ?? `Score reason for ${s.file}`,
        changeType: s.changeType ?? "logic-change",
      })),
    },
    usage: { inputTokens: 100, outputTokens: 50 },
  });
  return { query };
}

function defaultConfig(overrides: Record<string, unknown> = {}) {
  return {
    ignorePatterns: [] as string[],
    criticalThreshold: 8,
    domainRulesPath: "",
    architecturePath: "",
    model: "claude-sonnet-4-5-20250514",
    maxRetries: 3,
    output: { console: false, markdown: false, markdownPath: "", githubComment: false },
    ...overrides,
  };
}

// ---------- tests ----------

describe("Analysis Agent Integration", () => {
  describe("Output Schema Conformance", () => {
    it("full pipeline produces AnalysisOutput conforming to AnalysisOutputSchema", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "src/utils.py", score: 5, changeType: "logic-change" },
      ]);

      const input = buildContextOutput([
        { path: "package-lock.json", status: "modified" },
        {
          path: "src/app.ts",
          status: "modified",
          beforeContent: "const x=1;function foo(){return x;}",
          afterContent: "const x = 1;\n\nfunction foo() {\n  return x;\n}",
        },
        { path: "src/utils.py", status: "modified" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(() => AnalysisOutputSchema.parse(result)).not.toThrow();
      expect(result.scoredFiles).toHaveLength(3);
    });
  });

  describe("Ignored Files", () => {
    it("ignored files appear with score 0 and riskLevel low", async () => {
      const mockClaude = buildMockClaudeClient([]);
      const input = buildContextOutput([
        { path: "package-lock.json", status: "modified" },
        { path: "src/types.generated.ts", status: "modified" },
        { path: "__snapshots__/test.snap", status: "modified" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      for (const file of result.scoredFiles) {
        expect(file.score).toBe(0);
        expect(file.riskLevel).toBe("low");
      }
      // Ignored files should not reach LLM
      expect(mockClaude.query).not.toHaveBeenCalled();
    });

    it("all-ignored PR makes no LLM calls", async () => {
      const mockClaude = buildMockClaudeClient([]);
      const input = buildContextOutput([
        { path: "package-lock.json", status: "modified" },
        { path: "yarn.lock", status: "modified" },
        { path: "foo.generated.ts", status: "modified" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(mockClaude.query).not.toHaveBeenCalled();
      expect(result.scoredFiles).toHaveLength(3);
      for (const file of result.scoredFiles) {
        expect(file.score).toBe(0);
      }
    });
  });

  describe("AST Classification", () => {
    it("format-only TS file gets low score without LLM call", async () => {
      const mockClaude = buildMockClaudeClient([]);
      const input = buildContextOutput([
        {
          path: "src/format.ts",
          status: "modified",
          beforeContent: "const x=1;function foo(){return x;}",
          afterContent: "const x = 1;\n\nfunction foo() {\n  return x;\n}",
        },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.scoredFiles).toHaveLength(1);
      expect(result.scoredFiles[0].score).toBeLessThanOrEqual(2);
      expect(result.scoredFiles[0].riskLevel).toBe("low");
    });
  });

  describe("LLM Scoring", () => {
    it("files passing both filters reach LLM and return LLM-assigned scores", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "src/handler.py", score: 7, reason: "Complex logic change", changeType: "logic-change" },
      ]);

      const input = buildContextOutput([
        { path: "src/handler.py", status: "modified" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.scoredFiles).toHaveLength(1);
      expect(result.scoredFiles[0].score).toBe(7);
      expect(result.scoredFiles[0].riskLevel).toBe("high");
      expect(mockClaude.query).toHaveBeenCalled();
    });
  });

  describe("Empty PR", () => {
    it("returns empty scoredFiles and zero counts for empty PR", async () => {
      const mockClaude = buildMockClaudeClient([]);
      const input = buildContextOutput([]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.scoredFiles).toEqual([]);
      expect(result.criticalFiles).toEqual([]);
      expect(result.summary.totalFiles).toBe(0);
      expect(result.summary.criticalCount).toBe(0);
      expect(result.summary.highCount).toBe(0);
      expect(mockClaude.query).not.toHaveBeenCalled();
    });
  });

  describe("Mixed File Types", () => {
    it("each file type triaged correctly", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "src/new.ts", score: 6, changeType: "logic-change" },
        { file: "src/old.ts", score: 4, changeType: "other" },
        { file: "image.png", score: 2, changeType: "other" },
      ]);

      const input = buildContextOutput([
        { path: "src/new.ts", status: "added", patch: "@@ +1,5 @@\n+new code" },
        { path: "src/old.ts", status: "removed", patch: "@@ -1,5 @@\n-old code" },
        { path: "image.png", status: "modified", patch: null },
        {
          path: "src/format.ts",
          status: "modified",
          beforeContent: "const x=1;function foo(){return x;}",
          afterContent: "const x = 1;\n\nfunction foo() {\n  return x;\n}"
        },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.scoredFiles).toHaveLength(4);
      const paths = result.scoredFiles.map((f) => f.path);
      expect(paths).toContain("src/new.ts");
      expect(paths).toContain("src/old.ts");
      expect(paths).toContain("image.png");
      expect(paths).toContain("src/format.ts");
    });

    it("added files (no beforeContent) skip AST, reach LLM", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "src/new-feature.ts", score: 6 },
      ]);

      const input = buildContextOutput([
        { path: "src/new-feature.ts", status: "added" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(mockClaude.query).toHaveBeenCalled();
      expect(result.scoredFiles[0].score).toBe(6);
    });

    it("deleted files (no afterContent) skip AST, reach LLM", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "src/deprecated.ts", score: 4 },
      ]);

      const input = buildContextOutput([
        { path: "src/deprecated.ts", status: "removed" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(mockClaude.query).toHaveBeenCalled();
      expect(result.scoredFiles[0].score).toBe(4);
    });

    it("binary files (patch === null) are not silently dropped", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "assets/logo.png", score: 1, changeType: "other" },
      ]);

      const input = buildContextOutput([
        { path: "assets/logo.png", status: "modified", patch: null },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.scoredFiles).toHaveLength(1);
      expect(result.scoredFiles[0].path).toBe("assets/logo.png");
    });
  });

  describe("Idempotency", () => {
    it("running twice with same input produces same output", async () => {
      const scores = [{ file: "src/app.py", score: 5, changeType: "logic-change" }];
      const mockClaude = buildMockClaudeClient(scores);

      const input = buildContextOutput([
        { path: "src/app.py", status: "modified" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result1 = await agent.run(input);
      const result2 = await agent.run(input);

      expect(result1.scoredFiles.length).toBe(result2.scoredFiles.length);
      expect(result1.summary).toEqual(result2.summary);
      expect(result1.criticalFiles.map((f) => f.path).sort()).toEqual(
        result2.criticalFiles.map((f) => f.path).sort(),
      );
      // Scores should match between runs
      const scores1 = result1.scoredFiles.map((f) => ({ path: f.path, score: f.score })).sort((a, b) => a.path.localeCompare(b.path));
      const scores2 = result2.scoredFiles.map((f) => ({ path: f.path, score: f.score })).sort((a, b) => a.path.localeCompare(b.path));
      expect(scores1).toEqual(scores2);
    });
  });

  describe("Output Assembly and Risk Levels", () => {
    it("risk level mapping: 8-10 critical, 5-7 high, 3-4 medium, 0-2 low", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "a.py", score: 10 },
        { file: "b.py", score: 8 },
        { file: "c.py", score: 7 },
        { file: "d.py", score: 5 },
        { file: "e.py", score: 4 },
        { file: "f.py", score: 3 },
        { file: "g.py", score: 2 },
      ]);

      const input = buildContextOutput([
        ...["a", "b", "c", "d", "e", "f", "g"].map((n) => ({
          path: `${n}.py`,
          status: "modified" as const,
        })),
        // Score 0 comes from ignore patterns (not LLM)
        { path: "package-lock.json", status: "modified" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      const byPath = Object.fromEntries(result.scoredFiles.map((f) => [f.path, f]));
      expect(byPath["a.py"].riskLevel).toBe("critical");
      expect(byPath["b.py"].riskLevel).toBe("critical");
      expect(byPath["c.py"].riskLevel).toBe("high");
      expect(byPath["d.py"].riskLevel).toBe("high");
      expect(byPath["e.py"].riskLevel).toBe("medium");
      expect(byPath["f.py"].riskLevel).toBe("medium");
      expect(byPath["g.py"].riskLevel).toBe("low");
      // Score 0 boundary (ignored file)
      expect(byPath["package-lock.json"].score).toBe(0);
      expect(byPath["package-lock.json"].riskLevel).toBe("low");
    });

    it("AST-classified file not mentioned by LLM keeps deterministic score", async () => {
      // LLM returns no scores for this file
      const mockClaude = buildMockClaudeClient([]);

      const input = buildContextOutput([
        {
          path: "src/formatting.ts",
          status: "modified",
          beforeContent: "const x=1;function foo(){return x;}",
          afterContent: "const x = 1;\n\nfunction foo() {\n  return x;\n}",
        },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.scoredFiles).toHaveLength(1);
      expect(result.scoredFiles[0].score).toBeLessThanOrEqual(2);
    });

    it("criticalFiles contains only files with score >= criticalThreshold", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "critical.py", score: 9 },
        { file: "safe.py", score: 3 },
        { file: "borderline.py", score: 8 },
      ]);

      const input = buildContextOutput([
        { path: "critical.py", status: "modified" },
        { path: "safe.py", status: "modified" },
        { path: "borderline.py", status: "modified" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.criticalFiles).toHaveLength(2);
      const criticalPaths = result.criticalFiles.map((f) => f.path).sort();
      expect(criticalPaths).toEqual(["borderline.py", "critical.py"]);
      // All critical files should also be in scoredFiles
      for (const cf of result.criticalFiles) {
        expect(result.scoredFiles.find((f) => f.path === cf.path)).toBeDefined();
      }
    });

    it("summary.totalFiles counts all files including ignored", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "src/real.py", score: 5 },
      ]);

      const input = buildContextOutput([
        { path: "package-lock.json", status: "modified" },
        { path: "src/real.py", status: "modified" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.summary.totalFiles).toBe(2);
    });

    it("criticalCount and highCount match filtered subsets", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "a.py", score: 9 },
        { file: "b.py", score: 6 },
        { file: "c.py", score: 2 },
      ]);

      const input = buildContextOutput([
        { path: "a.py", status: "modified" },
        { path: "b.py", status: "modified" },
        { path: "c.py", status: "modified" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.summary.criticalCount).toBe(1);
      expect(result.summary.highCount).toBe(1);
    });

    it("categories aggregates changeType counts", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "a.py", score: 5, changeType: "logic-change" },
        { file: "b.py", score: 3, changeType: "logic-change" },
        { file: "c.py", score: 7, changeType: "security-change" },
      ]);

      const input = buildContextOutput([
        { path: "package-lock.json", status: "modified" },
        { path: "a.py", status: "modified" },
        { path: "b.py", status: "modified" },
        { path: "c.py", status: "modified" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.summary.categories["logic-change"]).toBe(2);
      expect(result.summary.categories["security-change"]).toBe(1);
      expect(result.summary.categories["ignored"]).toBe(1);
    });

    it("output conforms to AnalysisOutputSchema (Zod validation)", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "src/main.py", score: 7, changeType: "logic-change" },
        { file: "config.yaml", score: 3, changeType: "config-change" },
      ]);

      const input = buildContextOutput([
        { path: "package-lock.json", status: "modified" },
        { path: "src/main.py", status: "modified" },
        { path: "config.yaml", status: "modified" },
        {
          path: "src/format.ts",
          status: "modified",
          beforeContent: "const x=1;function foo(){return x;}",
          afterContent: "const x = 1;\n\nfunction foo() {\n  return x;\n}",
        },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(() => AnalysisOutputSchema.parse(result)).not.toThrow();
    });
  });

  describe("Context Passthrough", () => {
    it("analysis agent output includes contextPassthrough matching input ContextOutput", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "src/handler.py", score: 5, changeType: "logic-change" },
      ]);

      const input = buildContextOutput([
        { path: "src/handler.py", status: "modified" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.contextPassthrough).toBeDefined();
      expect(result.contextPassthrough!.mode).toBe(input.mode);
      expect(result.contextPassthrough!.pr!.title).toBe(input.pr.title);
      expect(() => AnalysisOutputSchema.parse(result)).not.toThrow();
    });

    it("contextPassthrough is set even when PR has zero files (empty output path)", async () => {
      const mockClaude = buildMockClaudeClient([]);
      const input = buildContextOutput([]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.contextPassthrough).toBeDefined();
      expect(result.contextPassthrough).toEqual(input);
      expect(() => AnalysisOutputSchema.parse(result)).not.toThrow();
    });
  });

  describe("Configuration", () => {
    it("default analysis ignore patterns applied", async () => {
      const mockClaude = buildMockClaudeClient([]);
      const input = buildContextOutput([
        { path: "package-lock.json", status: "modified" },
      ]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.scoredFiles).toHaveLength(1);
      expect(result.scoredFiles[0].score).toBe(0);
      expect(result.scoredFiles[0].riskLevel).toBe("low");
    });

    it("custom criticalThreshold from config is respected", async () => {
      const mockClaude = buildMockClaudeClient([
        { file: "src/app.py", score: 6 },
      ]);

      const input = buildContextOutput([
        { path: "src/app.py", status: "modified" },
      ]);

      const agent = createAnalysisAgent({
        claude: mockClaude as any,
        config: defaultConfig({ criticalThreshold: 6 }),
      });
      const result = await agent.run(input);

      expect(result.criticalFiles).toHaveLength(1);
      expect(result.criticalFiles[0].path).toBe("src/app.py");
    });

    it("agent works with minimal config", async () => {
      const mockClaude = buildMockClaudeClient([]);
      const input = buildContextOutput([]);

      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
      const result = await agent.run(input);

      expect(result.scoredFiles).toEqual([]);
      expect(result.summary.totalFiles).toBe(0);
    });
  });
});
