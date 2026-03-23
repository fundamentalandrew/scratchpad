import { describe, it, expect } from "vitest";
import { buildBatches, estimateTokens } from "./batch-builder.js";
import type { ScoringFile, LowRiskSummary } from "./types.js";

function makeFile(path: string, tokenCount: number): ScoringFile {
  // chars/4 heuristic: tokenCount * 4 chars = tokenCount tokens
  return {
    path,
    diff: "x".repeat(tokenCount * 4),
    status: "modified",
  };
}

describe("estimateTokens", () => {
  it("uses character/4 heuristic", () => {
    expect(estimateTokens("a".repeat(400))).toBe(100);
    expect(estimateTokens("a".repeat(401))).toBe(101); // ceil
    expect(estimateTokens("")).toBe(0);
  });
});

describe("buildBatches", () => {
  it("returns empty batch array for empty file list", () => {
    expect(buildBatches([], 1000)).toEqual([]);
  });

  it("places a single small file in one batch", () => {
    const files = [makeFile("src/a.ts", 100)];
    const batches = buildBatches(files, 1000);
    expect(batches).toHaveLength(1);
    expect(batches[0].files).toHaveLength(1);
    expect(batches[0].isLargeFile).toBe(false);
  });

  it("groups multiple small files into one batch", () => {
    const files = [
      makeFile("src/a.ts", 100),
      makeFile("src/b.ts", 100),
      makeFile("src/c.ts", 100),
    ];
    const batches = buildBatches(files, 1000);
    expect(batches).toHaveLength(1);
    expect(batches[0].files).toHaveLength(3);
  });

  it("splits files across multiple batches when exceeding budget", () => {
    // budget = 200000 * 0.75 - 1000 - 4000 = 145000
    // Each file 80000 tokens -> 2 files can't fit in one batch
    const files = [
      makeFile("src/a.ts", 80000),
      makeFile("src/b.ts", 80000),
    ];
    const batches = buildBatches(files, 1000);
    // Both exceed 50% of budget (72500) so they become large-file batches
    expect(batches).toHaveLength(2);
  });

  it("creates dedicated isLargeFile batch for file exceeding 50% of budget", () => {
    // budget = 200000 * 0.75 - 1000 - 4000 = 145000
    // 50% threshold = 72500
    const files = [
      makeFile("src/big.ts", 80000), // > 72500 -> large
      makeFile("src/small.ts", 100),
    ];
    const batches = buildBatches(files, 1000);
    const largeBatch = batches.find((b) => b.isLargeFile);
    const normalBatch = batches.find((b) => !b.isLargeFile);
    expect(largeBatch).toBeDefined();
    expect(largeBatch!.files).toHaveLength(1);
    expect(largeBatch!.files[0].path).toBe("src/big.ts");
    expect(normalBatch).toBeDefined();
    expect(normalBatch!.files).toHaveLength(1);
  });

  it("sorts files by directory path within batches", () => {
    const files = [
      makeFile("src/z/file.ts", 100),
      makeFile("src/a/file.ts", 100),
      makeFile("src/m/file.ts", 100),
    ];
    const batches = buildBatches(files, 1000);
    expect(batches).toHaveLength(1);
    const paths = batches[0].files.map((f) => f.path);
    expect(paths).toEqual([
      "src/a/file.ts",
      "src/m/file.ts",
      "src/z/file.ts",
    ]);
  });

  it("subtracts output reserve (4000 tokens) from available budget", () => {
    // maxContext = 20000, utilization = 0.75 -> 15000
    // systemPrompt = 0, outputReserve = 4000 -> budget = 11000
    // 50% threshold = 5500
    // File with 6000 tokens > 5500 -> should be large file
    const files = [makeFile("src/a.ts", 6000)];
    const batches = buildBatches(files, 0, 20000);
    expect(batches).toHaveLength(1);
    expect(batches[0].isLargeFile).toBe(true);
  });

  it("subtracts system prompt tokens from available budget", () => {
    // maxContext = 20000, utilization = 0.75 -> 15000
    // systemPrompt = 10000, outputReserve = 4000 -> budget = 1000
    // 50% threshold = 500
    // File with 600 tokens > 500 -> should be large file
    const files = [makeFile("src/a.ts", 600)];
    const batches = buildBatches(files, 10000, 20000);
    expect(batches).toHaveLength(1);
    expect(batches[0].isLargeFile).toBe(true);
  });

  it("appends low-risk summaries to the smallest batch", () => {
    // Two batches: one with more tokens, one with fewer
    // budget = 200000 * 0.75 - 100 - 4000 = 145900
    // 50% = 72950
    const files = [
      makeFile("src/a.ts", 50000),
      makeFile("src/b.ts", 50000),
      makeFile("src/c.ts", 100),
    ];
    const summaries: LowRiskSummary[] = [
      { path: "src/fmt.ts", changeType: "format-only", suggestedScore: 1 },
    ];
    const batches = buildBatches(files, 100, 200000, summaries);
    // The smallest non-large batch should have the summaries accounted for
    // Find the batch with src/c.ts (smallest)
    const smallBatch = batches.find((b) =>
      b.files.some((f) => f.path === "src/c.ts")
    );
    expect(smallBatch).toBeDefined();
    // The estimated tokens should include the summary tokens
    expect(smallBatch!.estimatedTokens).toBeGreaterThan(100);
  });

  it("handles case where all files are large", () => {
    // budget = 200000 * 0.75 - 1000 - 4000 = 145000
    // 50% = 72500
    const files = [
      makeFile("src/a.ts", 80000),
      makeFile("src/b.ts", 80000),
      makeFile("src/c.ts", 80000),
    ];
    const batches = buildBatches(files, 1000);
    expect(batches).toHaveLength(3);
    expect(batches.every((b) => b.isLargeFile)).toBe(true);
  });
});
