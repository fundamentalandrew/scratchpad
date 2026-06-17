diff --git a/code-review/03-analysis-agent/src/scoring/batch-builder.ts b/code-review/03-analysis-agent/src/scoring/batch-builder.ts
index e023385..63b554a 100644
--- a/code-review/03-analysis-agent/src/scoring/batch-builder.ts
+++ b/code-review/03-analysis-agent/src/scoring/batch-builder.ts
@@ -1 +1,102 @@
-// Stub — implemented in section-06
+import type { ScoringFile, FileBatch, LowRiskSummary } from "./types.js";
+
+const OUTPUT_RESERVE = 4000;
+const LARGE_FILE_THRESHOLD = 0.5;
+const CONTEXT_UTILIZATION = 0.75;
+const DEFAULT_MAX_CONTEXT_TOKENS = 200_000;
+
+export function estimateTokens(text: string): number {
+  if (text.length === 0) return 0;
+  return Math.ceil(text.length / 4);
+}
+
+export function buildBatches(
+  files: ScoringFile[],
+  systemPromptTokens: number,
+  maxContextTokens: number = DEFAULT_MAX_CONTEXT_TOKENS,
+  lowRiskSummaries?: LowRiskSummary[]
+): FileBatch[] {
+  if (files.length === 0 && (!lowRiskSummaries || lowRiskSummaries.length === 0)) {
+    return [];
+  }
+
+  const budget = Math.max(
+    1,
+    maxContextTokens * CONTEXT_UTILIZATION - systemPromptTokens - OUTPUT_RESERVE
+  );
+  const largeThreshold = budget * LARGE_FILE_THRESHOLD;
+
+  // Sort files by path for directory grouping
+  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
+
+  // Separate large files from normal files
+  const largeBatches: FileBatch[] = [];
+  const normalFiles: Array<{ file: ScoringFile; tokens: number }> = [];
+
+  for (const file of sorted) {
+    const tokens = estimateTokens(file.diff);
+    if (tokens > largeThreshold) {
+      largeBatches.push({
+        files: [file],
+        estimatedTokens: tokens,
+        isLargeFile: true,
+      });
+    } else {
+      normalFiles.push({ file, tokens });
+    }
+  }
+
+  // Greedily pack normal files into batches
+  const normalBatches: FileBatch[] = [];
+  let currentFiles: ScoringFile[] = [];
+  let currentTokens = 0;
+
+  for (const { file, tokens } of normalFiles) {
+    if (currentFiles.length > 0 && currentTokens + tokens > budget) {
+      normalBatches.push({
+        files: currentFiles,
+        estimatedTokens: currentTokens,
+        isLargeFile: false,
+      });
+      currentFiles = [];
+      currentTokens = 0;
+    }
+    currentFiles.push(file);
+    currentTokens += tokens;
+  }
+  if (currentFiles.length > 0) {
+    normalBatches.push({
+      files: currentFiles,
+      estimatedTokens: currentTokens,
+      isLargeFile: false,
+    });
+  }
+
+  // Append low-risk summaries to the smallest non-large batch
+  if (lowRiskSummaries && lowRiskSummaries.length > 0) {
+    const summaryText = lowRiskSummaries
+      .map((s) => `- ${s.path} — ${s.changeType} (score: ${s.suggestedScore})`)
+      .join("\n");
+    const summaryTokens = estimateTokens(summaryText);
+
+    if (normalBatches.length > 0) {
+      // Find batch with fewest tokens
+      let minIdx = 0;
+      for (let i = 1; i < normalBatches.length; i++) {
+        if (normalBatches[i].estimatedTokens < normalBatches[minIdx].estimatedTokens) {
+          minIdx = i;
+        }
+      }
+      normalBatches[minIdx].estimatedTokens += summaryTokens;
+    } else {
+      // All files were large; create a dedicated batch for summaries
+      normalBatches.push({
+        files: [],
+        estimatedTokens: summaryTokens,
+        isLargeFile: false,
+      });
+    }
+  }
+
+  return [...largeBatches, ...normalBatches];
+}
diff --git a/code-review/03-analysis-agent/tests/unit/batch-builder.test.ts b/code-review/03-analysis-agent/tests/unit/batch-builder.test.ts
new file mode 100644
index 0000000..06be032
--- /dev/null
+++ b/code-review/03-analysis-agent/tests/unit/batch-builder.test.ts
@@ -0,0 +1,148 @@
+import { describe, it, expect } from "vitest";
+import { buildBatches, estimateTokens } from "../../src/scoring/batch-builder.js";
+import type { ScoringFile, LowRiskSummary } from "../../src/scoring/types.js";
+
+function makeFile(path: string, tokenCount: number): ScoringFile {
+  // chars/4 heuristic: tokenCount * 4 chars = tokenCount tokens
+  return {
+    path,
+    diff: "x".repeat(tokenCount * 4),
+    status: "modified",
+  };
+}
+
+describe("estimateTokens", () => {
+  it("uses character/4 heuristic", () => {
+    expect(estimateTokens("a".repeat(400))).toBe(100);
+    expect(estimateTokens("a".repeat(401))).toBe(101); // ceil
+    expect(estimateTokens("")).toBe(0);
+  });
+});
+
+describe("buildBatches", () => {
+  it("returns empty batch array for empty file list", () => {
+    expect(buildBatches([], 1000)).toEqual([]);
+  });
+
+  it("places a single small file in one batch", () => {
+    const files = [makeFile("src/a.ts", 100)];
+    const batches = buildBatches(files, 1000);
+    expect(batches).toHaveLength(1);
+    expect(batches[0].files).toHaveLength(1);
+    expect(batches[0].isLargeFile).toBe(false);
+  });
+
+  it("groups multiple small files into one batch", () => {
+    const files = [
+      makeFile("src/a.ts", 100),
+      makeFile("src/b.ts", 100),
+      makeFile("src/c.ts", 100),
+    ];
+    const batches = buildBatches(files, 1000);
+    expect(batches).toHaveLength(1);
+    expect(batches[0].files).toHaveLength(3);
+  });
+
+  it("splits files across multiple batches when exceeding budget", () => {
+    // budget = 200000 * 0.75 - 1000 - 4000 = 145000
+    // Each file 80000 tokens -> 2 files can't fit in one batch
+    const files = [
+      makeFile("src/a.ts", 80000),
+      makeFile("src/b.ts", 80000),
+    ];
+    const batches = buildBatches(files, 1000);
+    // Both exceed 50% of budget (72500) so they become large-file batches
+    expect(batches).toHaveLength(2);
+  });
+
+  it("creates dedicated isLargeFile batch for file exceeding 50% of budget", () => {
+    // budget = 200000 * 0.75 - 1000 - 4000 = 145000
+    // 50% threshold = 72500
+    const files = [
+      makeFile("src/big.ts", 80000), // > 72500 -> large
+      makeFile("src/small.ts", 100),
+    ];
+    const batches = buildBatches(files, 1000);
+    const largeBatch = batches.find((b) => b.isLargeFile);
+    const normalBatch = batches.find((b) => !b.isLargeFile);
+    expect(largeBatch).toBeDefined();
+    expect(largeBatch!.files).toHaveLength(1);
+    expect(largeBatch!.files[0].path).toBe("src/big.ts");
+    expect(normalBatch).toBeDefined();
+    expect(normalBatch!.files).toHaveLength(1);
+  });
+
+  it("sorts files by directory path within batches", () => {
+    const files = [
+      makeFile("src/z/file.ts", 100),
+      makeFile("src/a/file.ts", 100),
+      makeFile("src/m/file.ts", 100),
+    ];
+    const batches = buildBatches(files, 1000);
+    expect(batches).toHaveLength(1);
+    const paths = batches[0].files.map((f) => f.path);
+    expect(paths).toEqual([
+      "src/a/file.ts",
+      "src/m/file.ts",
+      "src/z/file.ts",
+    ]);
+  });
+
+  it("subtracts output reserve (4000 tokens) from available budget", () => {
+    // maxContext = 20000, utilization = 0.75 -> 15000
+    // systemPrompt = 0, outputReserve = 4000 -> budget = 11000
+    // 50% threshold = 5500
+    // File with 6000 tokens > 5500 -> should be large file
+    const files = [makeFile("src/a.ts", 6000)];
+    const batches = buildBatches(files, 0, 20000);
+    expect(batches).toHaveLength(1);
+    expect(batches[0].isLargeFile).toBe(true);
+  });
+
+  it("subtracts system prompt tokens from available budget", () => {
+    // maxContext = 20000, utilization = 0.75 -> 15000
+    // systemPrompt = 10000, outputReserve = 4000 -> budget = 1000
+    // 50% threshold = 500
+    // File with 600 tokens > 500 -> should be large file
+    const files = [makeFile("src/a.ts", 600)];
+    const batches = buildBatches(files, 10000, 20000);
+    expect(batches).toHaveLength(1);
+    expect(batches[0].isLargeFile).toBe(true);
+  });
+
+  it("appends low-risk summaries to the smallest batch", () => {
+    // Two batches: one with more tokens, one with fewer
+    // budget = 200000 * 0.75 - 100 - 4000 = 145900
+    // 50% = 72950
+    const files = [
+      makeFile("src/a.ts", 50000),
+      makeFile("src/b.ts", 50000),
+      makeFile("src/c.ts", 100),
+    ];
+    const summaries: LowRiskSummary[] = [
+      { path: "src/fmt.ts", changeType: "format-only", suggestedScore: 1 },
+    ];
+    const batches = buildBatches(files, 100, 200000, summaries);
+    // The smallest non-large batch should have the summaries accounted for
+    // Find the batch with src/c.ts (smallest)
+    const smallBatch = batches.find((b) =>
+      b.files.some((f) => f.path === "src/c.ts")
+    );
+    expect(smallBatch).toBeDefined();
+    // The estimated tokens should include the summary tokens
+    expect(smallBatch!.estimatedTokens).toBeGreaterThan(100);
+  });
+
+  it("handles case where all files are large", () => {
+    // budget = 200000 * 0.75 - 1000 - 4000 = 145000
+    // 50% = 72500
+    const files = [
+      makeFile("src/a.ts", 80000),
+      makeFile("src/b.ts", 80000),
+      makeFile("src/c.ts", 80000),
+    ];
+    const batches = buildBatches(files, 1000);
+    expect(batches).toHaveLength(3);
+    expect(batches.every((b) => b.isLargeFile)).toBe(true);
+  });
+});
diff --git a/code-review/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json b/code-review/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json
index 45bc097..76c73f4 100644
--- a/code-review/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json
+++ b/code-review/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json
@@ -1 +1 @@
-{"version":"4.1.0","results":[[":01-core-infrastructure/src/smoke.test.ts",{"duration":1.6604399999999941,"failed":false}],[":01-core-infrastructure/src/utils/errors.test.ts",{"duration":3.0783780000000007,"failed":false}],[":01-core-infrastructure/src/agents/schemas.test.ts",{"duration":14.516725000000008,"failed":false}],[":01-core-infrastructure/dist/smoke.test.js",{"duration":1.7578340000000026,"failed":false}],[":01-core-infrastructure/src/clients/claude.test.ts",{"duration":11.335864,"failed":false}],[":01-core-infrastructure/src/clients/github.test.ts",{"duration":12.969054,"failed":false}],[":01-core-infrastructure/src/config/schema.test.ts",{"duration":3.741562000000002,"failed":false}],[":01-core-infrastructure/src/config/loader.test.ts",{"duration":10.260351,"failed":false}],[":01-core-infrastructure/src/utils/url-parser.test.ts",{"duration":4.503275000000002,"failed":false}],[":01-core-infrastructure/src/utils/logger.test.ts",{"duration":5.948343000000008,"failed":false}],[":01-core-infrastructure/src/utils/redact.test.ts",{"duration":3.004926999999995,"failed":false}],[":01-core-infrastructure/src/agents/stubs.test.ts",{"duration":1519.154792,"failed":false}],[":01-core-infrastructure/src/pipeline/runner.test.ts",{"duration":14.319499000000008,"failed":false}],[":01-core-infrastructure/src/commands/review-pr.test.ts",{"duration":4.304197000000002,"failed":false}],[":01-core-infrastructure/src/commands/review-repo.test.ts",{"duration":3.754421999999991,"failed":false}],[":01-core-infrastructure/src/commands/init.test.ts",{"duration":5.860861,"failed":false}],[":01-core-infrastructure/src/utils/file-filter.test.ts",{"duration":5.8489430000000056,"failed":false}],[":01-core-infrastructure/src/utils/issue-parser.test.ts",{"duration":4.567320999999993,"failed":false}],[":01-core-infrastructure/src/integration.test.ts",{"duration":4244.600252,"failed":false}],[":01-core-infrastructure/src/context/tech-stack.test.ts",{"duration":7.944977999999992,"failed":false}],[":02-context-agent/src/context-agent.test.ts",{"duration":0,"failed":true}],[":01-core-infrastructure/src/context/domain-rules.test.ts",{"duration":5.360060000000004,"failed":false}],[":03-analysis-agent/tests/unit/ast-analyzer.test.ts",{"duration":9.697016000000005,"failed":false}],[":02-context-agent/src/integration.test.ts",{"duration":0,"failed":true}],[":03-analysis-agent/tests/unit/pattern-filter.test.ts",{"duration":0,"failed":true}],[":03-analysis-agent/tests/unit/foundation.test.ts",{"duration":0,"failed":true}],[":03-analysis-agent/tests/unit/ast-classifier.test.ts",{"duration":14.903374999999983,"failed":false}],[":03-analysis-agent/tests/unit/subtree-hash.test.ts",{"duration":10.362392999999997,"failed":false}],[":03-analysis-agent/tests/unit/prompt-builder.test.ts",{"duration":3.884716999999995,"failed":false}]]}
\ No newline at end of file
+{"version":"4.1.0","results":[[":01-core-infrastructure/src/smoke.test.ts",{"duration":1.6604399999999941,"failed":false}],[":01-core-infrastructure/src/utils/errors.test.ts",{"duration":3.0783780000000007,"failed":false}],[":01-core-infrastructure/src/agents/schemas.test.ts",{"duration":14.516725000000008,"failed":false}],[":01-core-infrastructure/dist/smoke.test.js",{"duration":1.7578340000000026,"failed":false}],[":01-core-infrastructure/src/clients/claude.test.ts",{"duration":11.335864,"failed":false}],[":01-core-infrastructure/src/clients/github.test.ts",{"duration":12.969054,"failed":false}],[":01-core-infrastructure/src/config/schema.test.ts",{"duration":3.741562000000002,"failed":false}],[":01-core-infrastructure/src/config/loader.test.ts",{"duration":10.260351,"failed":false}],[":01-core-infrastructure/src/utils/url-parser.test.ts",{"duration":4.503275000000002,"failed":false}],[":01-core-infrastructure/src/utils/logger.test.ts",{"duration":5.948343000000008,"failed":false}],[":01-core-infrastructure/src/utils/redact.test.ts",{"duration":3.004926999999995,"failed":false}],[":01-core-infrastructure/src/agents/stubs.test.ts",{"duration":1519.154792,"failed":false}],[":01-core-infrastructure/src/pipeline/runner.test.ts",{"duration":14.319499000000008,"failed":false}],[":01-core-infrastructure/src/commands/review-pr.test.ts",{"duration":4.304197000000002,"failed":false}],[":01-core-infrastructure/src/commands/review-repo.test.ts",{"duration":3.754421999999991,"failed":false}],[":01-core-infrastructure/src/commands/init.test.ts",{"duration":5.860861,"failed":false}],[":01-core-infrastructure/src/utils/file-filter.test.ts",{"duration":5.8489430000000056,"failed":false}],[":01-core-infrastructure/src/utils/issue-parser.test.ts",{"duration":4.567320999999993,"failed":false}],[":01-core-infrastructure/src/integration.test.ts",{"duration":4244.600252,"failed":false}],[":01-core-infrastructure/src/context/tech-stack.test.ts",{"duration":7.944977999999992,"failed":false}],[":02-context-agent/src/context-agent.test.ts",{"duration":0,"failed":true}],[":01-core-infrastructure/src/context/domain-rules.test.ts",{"duration":5.360060000000004,"failed":false}],[":03-analysis-agent/tests/unit/ast-analyzer.test.ts",{"duration":9.697016000000005,"failed":false}],[":02-context-agent/src/integration.test.ts",{"duration":0,"failed":true}],[":03-analysis-agent/tests/unit/pattern-filter.test.ts",{"duration":0,"failed":true}],[":03-analysis-agent/tests/unit/foundation.test.ts",{"duration":0,"failed":true}],[":03-analysis-agent/tests/unit/ast-classifier.test.ts",{"duration":14.903374999999983,"failed":false}],[":03-analysis-agent/tests/unit/subtree-hash.test.ts",{"duration":10.362392999999997,"failed":false}],[":03-analysis-agent/tests/unit/prompt-builder.test.ts",{"duration":4.193610000000007,"failed":false}],[":03-analysis-agent/tests/unit/batch-builder.test.ts",{"duration":9.508122,"failed":false}]]}
\ No newline at end of file
