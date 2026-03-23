import { describe, it, expect, vi } from "vitest";
import { createReviewAgent } from "./review-agent.js";
import { ReviewOutputSchema } from "../../agents/schemas.js";
import { defaultConfig } from "../../config/schema.js";
import type { AnalysisOutput, FileScore } from "./types.js";

// ---------- helpers ----------

function buildAnalysisInput(
  files: Array<{ path: string; score: number; riskLevel?: string; reasons?: string[] }>,
  overrides: {
    mode?: "pr" | "repo";
    prTitle?: string;
    prDescription?: string;
    domainRules?: string | null;
    architectureDoc?: string | null;
    categories?: Record<string, number>;
  } = {},
): AnalysisOutput {
  const scoredFiles: FileScore[] = files.map((f) => ({
    path: f.path,
    score: f.score,
    riskLevel: (f.riskLevel ?? (f.score >= 8 ? "critical" : f.score >= 5 ? "high" : f.score >= 3 ? "medium" : "low")) as FileScore["riskLevel"],
    reasons: f.reasons ?? [`Reason for ${f.path}`],
  }));

  const criticalFiles = scoredFiles.filter((f) => f.score >= 8);
  const highFiles = scoredFiles.filter((f) => f.score >= 5 && f.score < 8);

  const categories = overrides.categories ?? {};
  if (Object.keys(categories).length === 0) {
    for (const f of files) {
      const cat = f.score >= 8 ? "security-change" : f.score >= 4 ? "logic-change" : "other";
      categories[cat] = (categories[cat] ?? 0) + 1;
    }
  }

  return {
    scoredFiles,
    criticalFiles,
    summary: {
      totalFiles: files.length,
      criticalCount: criticalFiles.length,
      highCount: highFiles.length,
      categories,
    },
    contextPassthrough: {
      mode: overrides.mode ?? "pr",
      repository: { owner: "test-org", repo: "test-repo", defaultBranch: "main" },
      pr: {
        number: 99,
        title: overrides.prTitle ?? "Test PR for review",
        description: overrides.prDescription ?? "Integration test",
        author: "dev",
        baseBranch: "main",
        headBranch: "feature/test",
        files: files.map((f) => ({
          path: f.path,
          status: "modified",
          additions: 10,
          deletions: 5,
          patch: `@@ -1,5 +1,10 @@\n+// changes in ${f.path}`,
        })),
        diff: files.map((f) => `diff --git a/${f.path} b/${f.path}`).join("\n"),
      },
      domainRules: overrides.domainRules ?? null,
      architectureDoc: overrides.architectureDoc ?? null,
    },
  };
}

function buildMockClaudeClient(
  files: string[],
  overrides: {
    coreDecision?: string;
    focusAreas?: string[];
    summary?: string;
  } = {},
) {
  const query = vi.fn().mockResolvedValue({
    data: {
      coreDecision: overrides.coreDecision ?? "Key architectural decision identified",
      recommendations: files.map((file) => ({
        file,
        category: "logic",
        message: `Review concern for ${file}`,
        suggestion: `Suggestion for ${file}`,
        humanCheckNeeded: `Verify ${file} handles edge cases`,
        estimatedReviewTime: "15" as const,
      })),
      focusAreas: overrides.focusAreas ?? ["Error handling", "Security boundaries"],
      summary: overrides.summary ?? "Review summary for this PR",
    },
    usage: { inputTokens: 500, outputTokens: 200 },
  });
  return { query };
}

// ---------- tests ----------

describe("Review Agent Integration", () => {
  it("full pipeline with mixed scores produces valid ReviewOutput", async () => {
    const input = buildAnalysisInput([
      { path: "src/auth.ts", score: 9 },
      { path: "src/handler.ts", score: 6 },
      { path: "src/config.ts", score: 4 },
      { path: "src/utils.ts", score: 2 },
      { path: "tests/helper.ts", score: 1 },
    ]);

    const highFiles = ["src/auth.ts", "src/handler.ts", "src/config.ts"];
    const claude = buildMockClaudeClient(highFiles);
    const agent = createReviewAgent({ claude: claude as any, config: defaultConfig });
    const result = await agent.run(input);

    expect(result.recommendations).toHaveLength(3);
    expect(result.safeToIgnore.length).toBeGreaterThan(0);
    expect(result.coreDecision).toBeTruthy();
    expect(result.focusAreas.length).toBeGreaterThan(0);
    expect(result.summary).toBeTruthy();

    // Severity derived deterministically from score
    const byFile = new Map(result.recommendations.map((r) => [r.file, r]));
    expect(byFile.get("src/auth.ts")!.severity).toBe("critical");   // score 9
    expect(byFile.get("src/handler.ts")!.severity).toBe("high");    // score 6
    expect(byFile.get("src/config.ts")!.severity).toBe("medium");   // score 4
  });

  it("high-score files (4+) appear as recommendations with humanCheckNeeded", async () => {
    const input = buildAnalysisInput([
      { path: "src/payment.ts", score: 8 },
      { path: "src/validate.ts", score: 5 },
      { path: "src/readme.ts", score: 1 },
    ]);

    const claude = buildMockClaudeClient(["src/payment.ts", "src/validate.ts"]);
    const agent = createReviewAgent({ claude: claude as any, config: defaultConfig });
    const result = await agent.run(input);

    expect(result.recommendations).toHaveLength(2);
    for (const rec of result.recommendations) {
      expect(rec.humanCheckNeeded).toBeTruthy();
      expect(typeof rec.humanCheckNeeded).toBe("string");
    }
    // Scores come from analysis data
    const byFile = new Map(result.recommendations.map((r) => [r.file, r]));
    expect(byFile.get("src/payment.ts")!.score).toBe(8);
    expect(byFile.get("src/validate.ts")!.score).toBe(5);
  });

  it("low-score files appear in safeToIgnore with correct counts", async () => {
    const input = buildAnalysisInput([
      { path: "src/a.ts", score: 2, reasons: ["Minor"] },
      { path: "src/b.ts", score: 1, reasons: ["Trivial"] },
      { path: "tests/c.test.ts", score: 1, reasons: ["Test"] },
      { path: "tests/d.test.ts", score: 2, reasons: ["Test"] },
      { path: "src/main.ts", score: 7 },
    ]);

    const claude = buildMockClaudeClient(["src/main.ts"]);
    const agent = createReviewAgent({ claude: claude as any, config: defaultConfig });
    const result = await agent.run(input);

    // No low-score file in recommendations
    for (const rec of result.recommendations) {
      expect(rec.score).toBeGreaterThanOrEqual(4);
    }

    // safeToIgnore should have groups
    const totalIgnored = result.safeToIgnore.reduce((sum, g) => sum + g.count, 0);
    expect(totalIgnored).toBe(4);

    // Sorted by count descending
    for (let i = 1; i < result.safeToIgnore.length; i++) {
      expect(result.safeToIgnore[i].count).toBeLessThanOrEqual(result.safeToIgnore[i - 1].count);
    }
  });

  it("coreDecision is a non-empty string", async () => {
    const input = buildAnalysisInput([{ path: "src/app.ts", score: 6 }]);
    const claude = buildMockClaudeClient(["src/app.ts"]);
    const agent = createReviewAgent({ claude: claude as any, config: defaultConfig });
    const result = await agent.run(input);

    expect(typeof result.coreDecision).toBe("string");
    expect(result.coreDecision.length).toBeGreaterThan(0);
  });

  it("focusAreas is non-empty array", async () => {
    const input = buildAnalysisInput([{ path: "src/app.ts", score: 6 }]);
    const claude = buildMockClaudeClient(["src/app.ts"]);
    const agent = createReviewAgent({ claude: claude as any, config: defaultConfig });
    const result = await agent.run(input);

    expect(Array.isArray(result.focusAreas)).toBe(true);
    expect(result.focusAreas.length).toBeGreaterThan(0);
  });

  it("output conforms to ReviewOutputSchema (Zod parse)", async () => {
    const input = buildAnalysisInput([
      { path: "src/auth.ts", score: 9 },
      { path: "src/utils.ts", score: 2 },
    ]);

    const claude = buildMockClaudeClient(["src/auth.ts"]);
    const agent = createReviewAgent({ claude: claude as any, config: defaultConfig });
    const result = await agent.run(input);

    expect(() => ReviewOutputSchema.parse(result)).not.toThrow();
  });

  it("idempotency - same input produces same output structure", async () => {
    const input = buildAnalysisInput([
      { path: "src/auth.ts", score: 9 },
      { path: "src/handler.ts", score: 5 },
      { path: "src/utils.ts", score: 2 },
      { path: "tests/a.test.ts", score: 1 },
    ]);

    const claude = buildMockClaudeClient(["src/auth.ts", "src/handler.ts"]);
    const agent = createReviewAgent({ claude: claude as any, config: defaultConfig });
    const result1 = await agent.run(input);
    const result2 = await agent.run(input);

    expect(result1.recommendations.length).toBe(result2.recommendations.length);
    expect(result1.safeToIgnore).toEqual(result2.safeToIgnore);
    expect(result1.coreDecision).toBe(result2.coreDecision);
    expect(result1.focusAreas).toEqual(result2.focusAreas);
    expect(result1.summary).toBe(result2.summary);
  });

  it("empty PR (no files) returns empty output", async () => {
    const input = buildAnalysisInput([]);
    const claude = buildMockClaudeClient([]);
    const agent = createReviewAgent({ claude: claude as any, config: defaultConfig });
    const result = await agent.run(input);

    expect(result.recommendations).toEqual([]);
    expect(result.safeToIgnore).toEqual([]);
    expect(result.coreDecision).toBeTruthy();
    expect(claude.query).not.toHaveBeenCalled();
  });

  it("all-ignored files (score 0) appear only in safeToIgnore", async () => {
    const input = buildAnalysisInput([
      { path: "lock/package-lock.json", score: 0, reasons: ["Lock file"] },
      { path: "lock/yarn.lock", score: 0, reasons: ["Lock file"] },
      { path: "gen/types.generated.ts", score: 0, reasons: ["Generated"] },
    ]);

    const claude = buildMockClaudeClient([]);
    const agent = createReviewAgent({ claude: claude as any, config: defaultConfig });
    const result = await agent.run(input);

    expect(result.recommendations).toEqual([]);
    expect(result.safeToIgnore.length).toBeGreaterThan(0);
    const totalIgnored = result.safeToIgnore.reduce((sum, g) => sum + g.count, 0);
    expect(totalIgnored).toBe(3);
    expect(result.coreDecision).toBeTruthy();
    expect(result.summary).toBeTruthy();
    expect(claude.query).not.toHaveBeenCalled();
  });
});
