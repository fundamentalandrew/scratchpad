diff --git a/code-review/04-review-agent/src/review-agent.ts b/code-review/04-review-agent/src/review-agent.ts
index 74099b0..451980b 100644
--- a/code-review/04-review-agent/src/review-agent.ts
+++ b/code-review/04-review-agent/src/review-agent.ts
@@ -1,4 +1,159 @@
-/** Review agent factory. Implemented in section-04. */
-export function createReviewAgent(deps: any): any {
-  throw new Error("Not implemented - see section-04");
+import type { ClaudeClient } from "@core/clients/claude.js";
+import type { Logger } from "@core/utils/logger.js";
+import type { Agent } from "@core/pipeline/types.js";
+import type { CodeReviewConfig } from "@core/config/schema.js";
+import type {
+  AnalysisOutput,
+  ReviewOutput,
+  FileScore,
+  IgnoreGroup,
+  ContextOutput,
+} from "@core/agents/schemas.js";
+import { LLMReviewResponseSchema } from "./types.js";
+import { buildPRSystemPrompt, buildRepoSystemPrompt, buildUserPrompt } from "./prompt-builder.js";
+
+export function createReviewAgent(deps: {
+  claude: ClaudeClient;
+  logger?: Logger;
+  config: CodeReviewConfig;
+}): Agent<AnalysisOutput, ReviewOutput> {
+  return {
+    name: "review",
+    idempotent: true,
+
+    async run(input: AnalysisOutput): Promise<ReviewOutput> {
+      const context = input.contextPassthrough as ContextOutput | undefined;
+
+      if (!context) {
+        deps.logger?.warn("review-agent: contextPassthrough missing, returning minimal output");
+        return {
+          recommendations: [],
+          coreDecision: "Unable to review: missing context data",
+          focusAreas: [],
+          safeToIgnore: [],
+          summary: "",
+        };
+      }
+
+      // Step 2: Separate files by threshold
+      const highRiskFiles = input.scoredFiles.filter((f) => f.score >= 4);
+      const lowRiskFiles = input.scoredFiles.filter((f) => f.score < 4);
+
+      // Step 3: Group low-risk files
+      const safeToIgnore = groupLowRiskFiles(lowRiskFiles, input.summary.categories);
+
+      // Step 4 & 5: Build prompts
+      const systemPrompt =
+        context.mode === "pr"
+          ? buildPRSystemPrompt(context)
+          : buildRepoSystemPrompt(context);
+      const userPrompt = buildUserPrompt(highRiskFiles, context, input.summary);
+
+      // Step 6: Call Claude (skip if no high-risk files)
+      if (highRiskFiles.length === 0) {
+        return {
+          recommendations: [],
+          coreDecision: "No high-risk files detected",
+          focusAreas: [],
+          safeToIgnore,
+          summary: "All files scored below the review threshold.",
+        };
+      }
+
+      const response = await deps.claude.query({
+        messages: [{ role: "user", content: userPrompt }],
+        schema: LLMReviewResponseSchema,
+        systemPrompt,
+        maxTokens: 8192,
+      });
+
+      // Step 7: Map LLM response to ReviewOutput
+      const scoreMap = new Map(input.scoredFiles.map((f) => [f.path, f.score]));
+
+      const recommendations = response.data.recommendations.map((rec) => {
+        const score = scoreMap.get(rec.file);
+        const severity = deriveSeverity(score ?? 4);
+        return {
+          file: rec.file,
+          line: undefined,
+          severity,
+          category: rec.category,
+          message: rec.message,
+          suggestion: rec.suggestion,
+          humanCheckNeeded: rec.humanCheckNeeded,
+          estimatedReviewTime: rec.estimatedReviewTime,
+          score,
+        };
+      });
+
+      return {
+        recommendations,
+        coreDecision: response.data.coreDecision,
+        focusAreas: response.data.focusAreas,
+        safeToIgnore,
+        summary: response.data.summary,
+      };
+    },
+  };
+}
+
+export function deriveSeverity(
+  score: number,
+): "critical" | "high" | "medium" | "low" {
+  if (score >= 8) return "critical";
+  if (score >= 5) return "high";
+  if (score >= 4) return "medium";
+  return "low";
+}
+
+export function groupLowRiskFiles(
+  files: FileScore[],
+  categories: Record<string, number>,
+): IgnoreGroup[] {
+  if (files.length === 0) return [];
+
+  const groups = new Map<string, FileScore[]>();
+
+  for (const file of files) {
+    // Group by top-level directory
+    const segments = file.path.split("/");
+    const label = segments.length > 1 ? segments[0] + "/" : "root";
+    const existing = groups.get(label) ?? [];
+    existing.push(file);
+    groups.set(label, existing);
+  }
+
+  // Split groups that exceed 20 files by next path segment
+  const finalGroups = new Map<string, FileScore[]>();
+  for (const [label, groupFiles] of groups) {
+    if (groupFiles.length > 20) {
+      for (const file of groupFiles) {
+        const segments = file.path.split("/");
+        const subLabel =
+          segments.length > 2
+            ? segments[0] + "/" + segments[1] + "/"
+            : label;
+        const existing = finalGroups.get(subLabel) ?? [];
+        existing.push(file);
+        finalGroups.set(subLabel, existing);
+      }
+    } else {
+      finalGroups.set(label, groupFiles);
+    }
+  }
+
+  const result: IgnoreGroup[] = [];
+  for (const [label, groupFiles] of finalGroups) {
+    const riskLevels = [...new Set(groupFiles.map((f) => f.riskLevel))];
+    result.push({
+      label,
+      count: groupFiles.length,
+      description: `${groupFiles.length} low-risk ${riskLevels.join("/")} files`,
+    });
+  }
+
+  // Sort by count descending, then label ascending
+  result.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
+
+  return result;
 }
diff --git a/code-review/04-review-agent/tests/unit/review-agent.test.ts b/code-review/04-review-agent/tests/unit/review-agent.test.ts
index 9ecf781..a7f28ff 100644
--- a/code-review/04-review-agent/tests/unit/review-agent.test.ts
+++ b/code-review/04-review-agent/tests/unit/review-agent.test.ts
@@ -1,5 +1,252 @@
-import { describe, it } from "vitest";
+import { describe, it, expect, vi } from "vitest";
+import { createReviewAgent, deriveSeverity, groupLowRiskFiles } from "../../src/review-agent.js";
+import { LLMReviewResponseSchema } from "../../src/types.js";
+import { ReviewOutputSchema } from "@core/agents/schemas.js";
+import { defaultConfig } from "@core/config/schema.js";
+import type { AnalysisOutput, ContextOutput, FileScore } from "../../src/types.js";
 
-describe("review agent", () => {
-  it.todo("implemented in section-05");
+function makeContext(overrides: Partial<ContextOutput> = {}): ContextOutput {
+  return {
+    mode: "pr" as const,
+    repository: { owner: "test", repo: "test-repo", defaultBranch: "main" },
+    pr: {
+      number: 42,
+      title: "Add payment processing",
+      description: "Stripe integration",
+      author: "dev-user",
+      baseBranch: "main",
+      headBranch: "feature/payments",
+      files: [],
+      diff: "",
+    },
+    domainRules: null,
+    architectureDoc: null,
+    referencedIssues: [],
+    ...overrides,
+  } as ContextOutput;
+}
+
+function makeLLMResponse() {
+  return {
+    data: {
+      coreDecision: "The migration adds a new payment provider",
+      recommendations: [
+        {
+          file: "src/payments.ts",
+          category: "security",
+          message: "Payment flow lacks idempotency key",
+          suggestion: "Add idempotency key header",
+          humanCheckNeeded: "Verify the payment flow cannot double-charge",
+          estimatedReviewTime: "15" as const,
+        },
+      ],
+      focusAreas: ["Payment security", "Error handling"],
+      summary: "This PR introduces a new payment provider",
+    },
+    usage: { inputTokens: 1000, outputTokens: 500 },
+  };
+}
+
+function makeInput(overrides: Partial<AnalysisOutput> = {}): AnalysisOutput {
+  return {
+    scoredFiles: [
+      { path: "src/payments.ts", score: 9, riskLevel: "critical" as const, reasons: ["Security"] },
+      { path: "src/utils.ts", score: 2, riskLevel: "low" as const, reasons: ["Formatting"] },
+    ],
+    criticalFiles: [
+      { path: "src/payments.ts", score: 9, riskLevel: "critical" as const, reasons: ["Security"] },
+    ],
+    summary: {
+      totalFiles: 2,
+      criticalCount: 1,
+      highCount: 0,
+      categories: { "security-change": 1, "other": 1 },
+    },
+    contextPassthrough: makeContext(),
+    ...overrides,
+  };
+}
+
+function makeDeps(queryMock = vi.fn().mockResolvedValue(makeLLMResponse())) {
+  return {
+    claude: { query: queryMock } as any,
+    logger: { info: vi.fn(), verbose: vi.fn(), error: vi.fn(), warn: vi.fn(), success: vi.fn() },
+    config: defaultConfig,
+  };
+}
+
+describe("createReviewAgent", () => {
+  it("agent.name is 'review' and agent.idempotent is true", () => {
+    const agent = createReviewAgent(makeDeps());
+    expect(agent.name).toBe("review");
+    expect(agent.idempotent).toBe(true);
+  });
+
+  it("empty scoredFiles returns empty recommendations and safeToIgnore", async () => {
+    const deps = makeDeps();
+    const agent = createReviewAgent(deps);
+    const result = await agent.run(
+      makeInput({ scoredFiles: [], criticalFiles: [] }),
+    );
+    expect(result.recommendations).toEqual([]);
+    expect(result.safeToIgnore).toEqual([]);
+    expect(deps.claude.query).not.toHaveBeenCalled();
+  });
+
+  it("all files below threshold produces only safeToIgnore, no recommendations", async () => {
+    const deps = makeDeps();
+    const agent = createReviewAgent(deps);
+    const lowFiles: FileScore[] = [
+      { path: "src/a.ts", score: 2, riskLevel: "low", reasons: ["Minor"] },
+      { path: "src/b.ts", score: 3, riskLevel: "low", reasons: ["Trivial"] },
+    ];
+    const result = await agent.run(makeInput({ scoredFiles: lowFiles, criticalFiles: [] }));
+    expect(result.recommendations).toEqual([]);
+    expect(result.safeToIgnore.length).toBeGreaterThan(0);
+    expect(deps.claude.query).not.toHaveBeenCalled();
+  });
+
+  it("files scoring 4+ appear in recommendations with correct scores from analysis data", async () => {
+    const agent = createReviewAgent(makeDeps());
+    const result = await agent.run(makeInput());
+    const rec = result.recommendations.find((r) => r.file === "src/payments.ts");
+    expect(rec).toBeDefined();
+    expect(rec!.score).toBe(9);
+  });
+
+  it("severity derived deterministically from score", async () => {
+    const agent = createReviewAgent(makeDeps());
+    const result = await agent.run(makeInput());
+    const rec = result.recommendations.find((r) => r.file === "src/payments.ts");
+    expect(rec!.severity).toBe("critical"); // score 9
+  });
+
+  it("LLM response fields mapped correctly", async () => {
+    const agent = createReviewAgent(makeDeps());
+    const result = await agent.run(makeInput());
+    const rec = result.recommendations[0];
+    expect(rec.message).toBe("Payment flow lacks idempotency key");
+    expect(rec.humanCheckNeeded).toBe("Verify the payment flow cannot double-charge");
+    expect(rec.estimatedReviewTime).toBe("15");
+    expect(rec.category).toBe("security");
+    expect(rec.suggestion).toBe("Add idempotency key header");
+  });
+
+  it("safeToIgnore groups computed from low-score files", async () => {
+    const agent = createReviewAgent(makeDeps());
+    const result = await agent.run(makeInput());
+    // src/utils.ts scores 2, should be in safeToIgnore
+    expect(result.safeToIgnore.length).toBeGreaterThan(0);
+    expect(result.safeToIgnore[0].count).toBe(1);
+  });
+
+  it("safeToIgnore grouped by top-level directory", async () => {
+    const files: FileScore[] = [
+      { path: "tests/a.test.ts", score: 1, riskLevel: "low", reasons: ["Test"] },
+      { path: "tests/b.test.ts", score: 2, riskLevel: "low", reasons: ["Test"] },
+      { path: "src/c.ts", score: 1, riskLevel: "low", reasons: ["Config"] },
+    ];
+    const groups = groupLowRiskFiles(files, {});
+    const testGroup = groups.find((g) => g.label === "tests/");
+    expect(testGroup).toBeDefined();
+    expect(testGroup!.count).toBe(2);
+  });
+
+  it("safeToIgnore sorted by count descending, label ascending", async () => {
+    const files: FileScore[] = [
+      { path: "tests/a.ts", score: 1, riskLevel: "low", reasons: ["Test"] },
+      { path: "tests/b.ts", score: 2, riskLevel: "low", reasons: ["Test"] },
+      { path: "tests/c.ts", score: 1, riskLevel: "low", reasons: ["Test"] },
+      { path: "src/d.ts", score: 1, riskLevel: "low", reasons: ["Config"] },
+    ];
+    const groups = groupLowRiskFiles(files, {});
+    expect(groups[0].label).toBe("tests/");
+    expect(groups[0].count).toBe(3);
+    expect(groups[1].label).toBe("src/");
+    expect(groups[1].count).toBe(1);
+  });
+
+  it("PR mode uses buildPRSystemPrompt", async () => {
+    const queryMock = vi.fn().mockResolvedValue(makeLLMResponse());
+    const agent = createReviewAgent(makeDeps(queryMock));
+    await agent.run(makeInput());
+    const call = queryMock.mock.calls[0][0];
+    expect(call.systemPrompt).toContain("principal engineer synthesizing a code review");
+  });
+
+  it("repo mode uses buildRepoSystemPrompt", async () => {
+    const queryMock = vi.fn().mockResolvedValue(makeLLMResponse());
+    const agent = createReviewAgent(makeDeps(queryMock));
+    await agent.run(
+      makeInput({ contextPassthrough: makeContext({ mode: "repo" as const }) }),
+    );
+    const call = queryMock.mock.calls[0][0];
+    expect(call.systemPrompt).toContain("architecture assessment");
+  });
+
+  it("missing contextPassthrough returns minimal output with warning log", async () => {
+    const deps = makeDeps();
+    const agent = createReviewAgent(deps);
+    const result = await agent.run(makeInput({ contextPassthrough: undefined }));
+    expect(result.recommendations).toEqual([]);
+    expect(result.coreDecision).toContain("missing context");
+    expect(deps.logger.warn).toHaveBeenCalled();
+    expect(deps.claude.query).not.toHaveBeenCalled();
+  });
+
+  it("coreDecision from LLM passed through to output", async () => {
+    const agent = createReviewAgent(makeDeps());
+    const result = await agent.run(makeInput());
+    expect(result.coreDecision).toBe("The migration adds a new payment provider");
+  });
+
+  it("focusAreas from LLM passed through to output", async () => {
+    const agent = createReviewAgent(makeDeps());
+    const result = await agent.run(makeInput());
+    expect(result.focusAreas).toEqual(["Payment security", "Error handling"]);
+  });
+
+  it("summary from LLM passed through to output", async () => {
+    const agent = createReviewAgent(makeDeps());
+    const result = await agent.run(makeInput());
+    expect(result.summary).toBe("This PR introduces a new payment provider");
+  });
+
+  it("output conforms to ReviewOutputSchema.parse()", async () => {
+    const agent = createReviewAgent(makeDeps());
+    const result = await agent.run(makeInput());
+    expect(() => ReviewOutputSchema.parse(result)).not.toThrow();
+  });
+
+  it("Claude client called with LLMReviewResponseSchema", async () => {
+    const queryMock = vi.fn().mockResolvedValue(makeLLMResponse());
+    const agent = createReviewAgent(makeDeps(queryMock));
+    await agent.run(makeInput());
+    expect(queryMock).toHaveBeenCalledWith(
+      expect.objectContaining({ schema: LLMReviewResponseSchema }),
+    );
+  });
+});
+
+describe("deriveSeverity", () => {
+  it("returns critical for 8-10", () => {
+    expect(deriveSeverity(8)).toBe("critical");
+    expect(deriveSeverity(9)).toBe("critical");
+    expect(deriveSeverity(10)).toBe("critical");
+  });
+
+  it("returns high for 5-7", () => {
+    expect(deriveSeverity(5)).toBe("high");
+    expect(deriveSeverity(6)).toBe("high");
+    expect(deriveSeverity(7)).toBe("high");
+  });
+
+  it("returns medium for 4", () => {
+    expect(deriveSeverity(4)).toBe("medium");
+  });
+
+  it("returns low for < 4", () => {
+    expect(deriveSeverity(3)).toBe("low");
+    expect(deriveSeverity(1)).toBe("low");
+  });
 });
