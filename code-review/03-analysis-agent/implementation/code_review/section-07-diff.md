diff --git a/code-review/03-analysis-agent/src/scoring/llm-scorer.ts b/code-review/03-analysis-agent/src/scoring/llm-scorer.ts
index b6a46b1..3629c44 100644
--- a/code-review/03-analysis-agent/src/scoring/llm-scorer.ts
+++ b/code-review/03-analysis-agent/src/scoring/llm-scorer.ts
@@ -1 +1,77 @@
-// Stub — implemented in section-07
+import { z } from "zod";
+import type { FileBatch, LLMScoringResult, ScoringContext } from "./types.js";
+import { buildSystemPrompt, buildBatchPrompt } from "./prompt-builder.js";
+import type { ClaudeClient } from "@core/clients/claude.js";
+import type { Logger } from "@core/utils/logger.js";
+
+export const LLMScoringResponseSchema = z.object({
+  scores: z.array(
+    z.object({
+      file: z.string(),
+      score: z.number().min(1).max(10),
+      reason: z.string(),
+      changeType: z.enum([
+        "logic-change",
+        "api-contract",
+        "schema-change",
+        "config-change",
+        "test-change",
+        "ui-change",
+        "security-change",
+        "other",
+      ]),
+    })
+  ),
+});
+
+export async function scoreFiles(
+  batches: FileBatch[],
+  context: ScoringContext,
+  claude: ClaudeClient,
+  logger?: Logger,
+): Promise<LLMScoringResult[]> {
+  if (batches.length === 0) {
+    return [];
+  }
+
+  const systemPrompt = buildSystemPrompt(context);
+  const regularBatches = batches.filter((b) => !b.isLargeFile);
+  const largeBatches = batches.filter((b) => b.isLargeFile);
+
+  const results: LLMScoringResult[] = [];
+
+  // Process regular batches sequentially to avoid rate limits
+  for (const batch of regularBatches) {
+    const userPrompt = buildBatchPrompt(batch);
+    logger?.verbose(`Scoring batch with ${batch.files.length} files (${batch.estimatedTokens} tokens)`);
+    const response = await claude.query({
+      messages: [{ role: "user", content: userPrompt }],
+      schema: LLMScoringResponseSchema,
+      systemPrompt,
+      maxTokens: 4096,
+    });
+    results.push(...response.data.scores);
+  }
+
+  // Process large-file batches in parallel
+  if (largeBatches.length > 0) {
+    const largeResults = await Promise.all(
+      largeBatches.map(async (batch) => {
+        const userPrompt = buildBatchPrompt(batch);
+        logger?.verbose(`Scoring large file: ${batch.files[0]?.path} (${batch.estimatedTokens} tokens)`);
+        const response = await claude.query({
+          messages: [{ role: "user", content: userPrompt }],
+          schema: LLMScoringResponseSchema,
+          systemPrompt,
+          maxTokens: 4096,
+        });
+        return response.data.scores;
+      })
+    );
+    for (const scores of largeResults) {
+      results.push(...scores);
+    }
+  }
+
+  return results;
+}
diff --git a/code-review/03-analysis-agent/tests/unit/llm-scorer.test.ts b/code-review/03-analysis-agent/tests/unit/llm-scorer.test.ts
new file mode 100644
index 0000000..0fe56e9
--- /dev/null
+++ b/code-review/03-analysis-agent/tests/unit/llm-scorer.test.ts
@@ -0,0 +1,213 @@
+import { describe, it, expect, vi, beforeEach } from "vitest";
+import { scoreFiles, LLMScoringResponseSchema } from "../../src/scoring/llm-scorer.js";
+import type { FileBatch, ScoringContext } from "../../src/scoring/types.js";
+
+// Minimal mock for ClaudeClient
+function createMockClaude() {
+  return {
+    query: vi.fn(),
+  };
+}
+
+function makeBatch(
+  files: Array<{ path: string; diff: string }>,
+  isLargeFile = false
+): FileBatch {
+  return {
+    files: files.map((f) => ({ ...f, status: "modified" as const })),
+    estimatedTokens: 1000,
+    isLargeFile,
+  };
+}
+
+const defaultContext: ScoringContext = {
+  domainRules: null,
+  architectureDoc: null,
+  techStack: { languages: ["TypeScript"], frameworks: [], dependencies: {} },
+  prTitle: "Test PR",
+  prDescription: "A test pull request",
+};
+
+function makeScoreResponse(files: Array<{ path: string; score: number }>) {
+  return {
+    data: {
+      scores: files.map((f) => ({
+        file: f.path,
+        score: f.score,
+        reason: `Reason for ${f.path}`,
+        changeType: "logic-change" as const,
+      })),
+    },
+    usage: { inputTokens: 1000, outputTokens: 200 },
+  };
+}
+
+describe("llm-scorer", () => {
+  let mockClaude: ReturnType<typeof createMockClaude>;
+
+  beforeEach(() => {
+    mockClaude = createMockClaude();
+  });
+
+  it("calls ClaudeClient.query() for each batch with correct Zod schema", async () => {
+    const batches = [
+      makeBatch([{ path: "src/a.ts", diff: "diff a" }]),
+      makeBatch([{ path: "src/b.ts", diff: "diff b" }]),
+    ];
+    mockClaude.query
+      .mockResolvedValueOnce(makeScoreResponse([{ path: "src/a.ts", score: 5 }]))
+      .mockResolvedValueOnce(makeScoreResponse([{ path: "src/b.ts", score: 3 }]));
+
+    await scoreFiles(batches, defaultContext, mockClaude as any);
+
+    expect(mockClaude.query).toHaveBeenCalledTimes(2);
+    // Each call should include the schema
+    for (const call of mockClaude.query.mock.calls) {
+      expect(call[0].schema).toBe(LLMScoringResponseSchema);
+    }
+  });
+
+  it("returns LLMScoringResult array with file, score, reason, changeType", async () => {
+    const batches = [
+      makeBatch([
+        { path: "src/a.ts", diff: "diff a" },
+        { path: "src/b.ts", diff: "diff b" },
+      ]),
+    ];
+    mockClaude.query.mockResolvedValueOnce(
+      makeScoreResponse([
+        { path: "src/a.ts", score: 5 },
+        { path: "src/b.ts", score: 8 },
+      ])
+    );
+
+    const results = await scoreFiles(batches, defaultContext, mockClaude as any);
+
+    expect(results).toHaveLength(2);
+    for (const r of results) {
+      expect(r).toHaveProperty("file");
+      expect(r).toHaveProperty("score");
+      expect(r).toHaveProperty("reason");
+      expect(r).toHaveProperty("changeType");
+      expect(typeof r.file).toBe("string");
+      expect(typeof r.score).toBe("number");
+      expect(typeof r.reason).toBe("string");
+      expect(typeof r.changeType).toBe("string");
+    }
+  });
+
+  it("response schema enforces score 1-10", () => {
+    const valid = LLMScoringResponseSchema.safeParse({
+      scores: [{ file: "a.ts", score: 5, reason: "ok", changeType: "logic-change" }],
+    });
+    expect(valid.success).toBe(true);
+
+    const tooLow = LLMScoringResponseSchema.safeParse({
+      scores: [{ file: "a.ts", score: 0, reason: "ok", changeType: "logic-change" }],
+    });
+    expect(tooLow.success).toBe(false);
+
+    const tooHigh = LLMScoringResponseSchema.safeParse({
+      scores: [{ file: "a.ts", score: 11, reason: "ok", changeType: "logic-change" }],
+    });
+    expect(tooHigh.success).toBe(false);
+  });
+
+  it("response schema enforces changeType enum values", () => {
+    const valid = LLMScoringResponseSchema.safeParse({
+      scores: [{ file: "a.ts", score: 5, reason: "ok", changeType: "api-contract" }],
+    });
+    expect(valid.success).toBe(true);
+
+    const invalid = LLMScoringResponseSchema.safeParse({
+      scores: [{ file: "a.ts", score: 5, reason: "ok", changeType: "invalid-type" }],
+    });
+    expect(invalid.success).toBe(false);
+  });
+
+  it("regular batches processed sequentially (verify call order)", async () => {
+    const callOrder: number[] = [];
+    const batches = [
+      makeBatch([{ path: "src/a.ts", diff: "a" }]),
+      makeBatch([{ path: "src/b.ts", diff: "b" }]),
+      makeBatch([{ path: "src/c.ts", diff: "c" }]),
+    ];
+
+    mockClaude.query.mockImplementation(async () => {
+      const idx = callOrder.length;
+      callOrder.push(idx);
+      // Small delay to detect parallelism
+      await new Promise((r) => setTimeout(r, 10));
+      return makeScoreResponse([{ path: `src/${["a", "b", "c"][idx]}.ts`, score: 5 }]);
+    });
+
+    await scoreFiles(batches, defaultContext, mockClaude as any);
+
+    // Calls should be in order
+    expect(callOrder).toEqual([0, 1, 2]);
+  });
+
+  it("large file batches can be processed in parallel", async () => {
+    const callTimestamps: number[] = [];
+    const resolveTimestamps: number[] = [];
+    const batches = [
+      makeBatch([{ path: "src/big1.ts", diff: "big1" }], true),
+      makeBatch([{ path: "src/big2.ts", diff: "big2" }], true),
+    ];
+
+    mockClaude.query.mockImplementation(async (_opts: any) => {
+      callTimestamps.push(Date.now());
+      await new Promise((r) => setTimeout(r, 50));
+      resolveTimestamps.push(Date.now());
+      const file = _opts.messages[0].content.includes("big1") ? "src/big1.ts" : "src/big2.ts";
+      return makeScoreResponse([{ path: file, score: 7 }]);
+    });
+
+    await scoreFiles(batches, defaultContext, mockClaude as any);
+
+    // Both calls should start before either resolves (parallel)
+    expect(callTimestamps).toHaveLength(2);
+    // Second call should start before first resolves
+    expect(callTimestamps[1]).toBeLessThan(resolveTimestamps[0]);
+  });
+
+  it("failed batch call propagates error", async () => {
+    const batches = [
+      makeBatch([{ path: "src/a.ts", diff: "a" }]),
+      makeBatch([{ path: "src/b.ts", diff: "b" }]),
+    ];
+    mockClaude.query
+      .mockResolvedValueOnce(makeScoreResponse([{ path: "src/a.ts", score: 5 }]))
+      .mockRejectedValueOnce(new Error("API rate limit exceeded"));
+
+    await expect(scoreFiles(batches, defaultContext, mockClaude as any)).rejects.toThrow(
+      "API rate limit exceeded"
+    );
+  });
+
+  it("system prompt passed from ScoringContext to each API call", async () => {
+    const ctx: ScoringContext = {
+      ...defaultContext,
+      domainRules: "Always check for SQL injection",
+    };
+    const batches = [
+      makeBatch([{ path: "src/a.ts", diff: "a" }]),
+      makeBatch([{ path: "src/b.ts", diff: "b" }]),
+    ];
+    mockClaude.query
+      .mockResolvedValueOnce(makeScoreResponse([{ path: "src/a.ts", score: 5 }]))
+      .mockResolvedValueOnce(makeScoreResponse([{ path: "src/b.ts", score: 3 }]));
+
+    await scoreFiles(batches, ctx, mockClaude as any);
+
+    for (const call of mockClaude.query.mock.calls) {
+      expect(call[0].systemPrompt).toContain("SQL injection");
+    }
+  });
+
+  it("returns empty array when no batches provided", async () => {
+    const results = await scoreFiles([], defaultContext, mockClaude as any);
+    expect(results).toEqual([]);
+    expect(mockClaude.query).not.toHaveBeenCalled();
+  });
+});
