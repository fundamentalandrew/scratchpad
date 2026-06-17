import { describe, it, expect, vi } from "vitest";
import {
  createStubContextAgent,
  createStubAnalysisAgent,
  createStubReviewAgent,
  createStubOutputAgent,
} from "./stubs.js";
import {
  ContextOutputSchema,
  AnalysisOutputSchema,
  ReviewOutputSchema,
} from "./schemas.js";
import { runPipeline } from "../pipeline/runner.js";
import type { Logger } from "../utils/logger.js";

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    verbose: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
  };
}

describe("stub agents", () => {
  it("each stub agent returns valid typed output matching its contract", async () => {
    const ctx = createStubContextAgent();
    const analysis = createStubAnalysisAgent();
    const review = createStubReviewAgent();
    const output = createStubOutputAgent();

    const ctxResult = await ctx.run({});
    expect(ctxResult.mode).toBe("pr");
    expect(ctxResult.repository.owner).toBe("test");

    const analysisResult = await analysis.run(ctxResult);
    expect(analysisResult.scoredFiles.length).toBeGreaterThan(0);

    const reviewResult = await review.run(analysisResult);
    expect(reviewResult.recommendations.length).toBeGreaterThan(0);
    expect(reviewResult.coreDecision).toBeTypeOf("string");

    const outputResult = await output.run(reviewResult);
    expect(outputResult).toEqual(reviewResult);
  });

  it("stub output passes Zod schema validation", async () => {
    const ctx = createStubContextAgent();
    const analysis = createStubAnalysisAgent();
    const review = createStubReviewAgent();

    const ctxResult = await ctx.run({});
    expect(() => ContextOutputSchema.parse(ctxResult)).not.toThrow();

    const analysisResult = await analysis.run(ctxResult);
    expect(() => AnalysisOutputSchema.parse(analysisResult)).not.toThrow();

    const reviewResult = await review.run(analysisResult);
    expect(() => ReviewOutputSchema.parse(reviewResult)).not.toThrow();
  });

  it("stubs log their stub status in verbose mode", async () => {
    const logger = createMockLogger();

    const ctx = createStubContextAgent(logger);
    const analysis = createStubAnalysisAgent(logger);
    const review = createStubReviewAgent(logger);
    const output = createStubOutputAgent(logger);

    await ctx.run({});
    await analysis.run({} as any);
    await review.run({} as any);
    await output.run({} as any);

    expect(logger.verbose).toHaveBeenCalledTimes(4);
    for (const call of (logger.verbose as ReturnType<typeof vi.fn>).mock.calls) {
      expect(call[0].toLowerCase()).toContain("stub");
    }
  });

  it("full pipeline with all stubs runs end-to-end without errors", async () => {
    const agents = [
      createStubContextAgent(),
      createStubAnalysisAgent(),
      createStubReviewAgent(),
      createStubOutputAgent(),
    ];

    const result = await runPipeline(agents, {});

    expect(result.stages).toHaveLength(4);
    expect(result.stages.every((s) => s.success)).toBe(true);
    expect(result.output).toBeDefined();
  });
});
