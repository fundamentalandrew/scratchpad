import { describe, it, expect } from "vitest";
import {
  RecommendationSchema,
  IgnoreGroupSchema,
  ReviewOutputSchema,
  AnalysisOutputSchema,
  ContextOutputSchema,
} from "./schemas.js";
import { createStubReviewAgent } from "./stubs.js";

describe("extended RecommendationSchema", () => {
  it("accepts optional humanCheckNeeded, estimatedReviewTime, score", () => {
    const result = RecommendationSchema.parse({
      file: "src/index.ts",
      severity: "medium",
      category: "maintainability",
      message: "Consider refactoring",
      humanCheckNeeded: "Logic change in auth flow",
      estimatedReviewTime: "15",
      score: 7.5,
    });
    expect(result.humanCheckNeeded).toBe("Logic change in auth flow");
    expect(result.estimatedReviewTime).toBe("15");
    expect(result.score).toBe(7.5);
  });

  it("validates without new optional fields (backward compat)", () => {
    expect(() =>
      RecommendationSchema.parse({
        file: "src/index.ts",
        severity: "low",
        category: "docs",
        message: "Update readme",
      }),
    ).not.toThrow();
  });

  it("estimatedReviewTime only accepts enum values '5', '15', '30', '60'", () => {
    const base = { file: "a.ts", severity: "low", category: "x", message: "m" };
    expect(() => RecommendationSchema.parse({ ...base, estimatedReviewTime: "5" })).not.toThrow();
    expect(() => RecommendationSchema.parse({ ...base, estimatedReviewTime: "10" })).toThrow();
    expect(() => RecommendationSchema.parse({ ...base, estimatedReviewTime: "999" })).toThrow();
  });

  it("rejects score outside 0-10 bounds", () => {
    const base = { file: "a.ts", severity: "low", category: "x", message: "m" };
    expect(() => RecommendationSchema.parse({ ...base, score: -1 })).toThrow();
    expect(() => RecommendationSchema.parse({ ...base, score: 11 })).toThrow();
    expect(() => RecommendationSchema.parse({ ...base, score: 0 })).not.toThrow();
    expect(() => RecommendationSchema.parse({ ...base, score: 10 })).not.toThrow();
  });
});

describe("IgnoreGroupSchema", () => {
  it("validates label, count, description", () => {
    const result = IgnoreGroupSchema.parse({
      label: "tests/*",
      count: 5,
      description: "Standard mock updates",
    });
    expect(result.label).toBe("tests/*");
    expect(result.count).toBe(5);
    expect(result.description).toBe("Standard mock updates");
  });

  it("fails when missing required fields", () => {
    expect(() => IgnoreGroupSchema.parse({ label: "tests/*", count: 5 })).toThrow();
    expect(() => IgnoreGroupSchema.parse({ label: "tests/*", description: "x" })).toThrow();
    expect(() => IgnoreGroupSchema.parse({ count: 5, description: "x" })).toThrow();
  });
});

describe("extended ReviewOutputSchema", () => {
  it("rejects input missing safeToIgnore or summary", () => {
    const base = {
      recommendations: [{ file: "a.ts", severity: "low", category: "style", message: "nit" }],
      coreDecision: "Approve",
      focusAreas: ["Error handling"],
    };
    expect(() => ReviewOutputSchema.parse(base)).toThrow();
    expect(() => ReviewOutputSchema.parse({ ...base, safeToIgnore: [] })).toThrow();
    expect(() => ReviewOutputSchema.parse({ ...base, summary: "ok" })).toThrow();
  });

  it("accepts safeToIgnore and summary fields", () => {
    const result = ReviewOutputSchema.parse({
      recommendations: [
        { file: "a.ts", severity: "low", category: "style", message: "nit" },
      ],
      coreDecision: "Approve",
      focusAreas: ["Error handling"],
      safeToIgnore: [{ label: "tests/", count: 3, description: "Test boilerplate" }],
      summary: "Looks good overall.",
    });
    expect(result.safeToIgnore).toHaveLength(1);
    expect(result.summary).toBe("Looks good overall.");
  });
});

describe("extended AnalysisOutputSchema", () => {
  it("accepts optional contextPassthrough field", () => {
    const result = AnalysisOutputSchema.parse({
      scoredFiles: [{ path: "a.ts", score: 5, riskLevel: "medium", reasons: ["test"] }],
      criticalFiles: [],
      summary: { totalFiles: 1, criticalCount: 0, highCount: 0, categories: { source: 1 } },
      contextPassthrough: {
        mode: "pr",
        repository: { owner: "test", repo: "test-repo", defaultBranch: "main" },
        pr: {
          number: 1,
          title: "Test PR",
          description: "desc",
          author: "user",
          baseBranch: "main",
          headBranch: "feat",
          files: [],
          diff: "",
        },
        domainRules: null,
        architectureDoc: null,
      },
    });
    expect(result.contextPassthrough).toBeDefined();
  });

  it("validates without contextPassthrough (backward compat)", () => {
    expect(() =>
      AnalysisOutputSchema.parse({
        scoredFiles: [],
        criticalFiles: [],
        summary: { totalFiles: 0, criticalCount: 0, highCount: 0, categories: {} },
      }),
    ).not.toThrow();
  });
});

describe("updated stub review agent", () => {
  it("output conforms to extended ReviewOutputSchema", async () => {
    const agent = createStubReviewAgent();
    const result = await agent.run({} as any);
    const parsed = ReviewOutputSchema.parse(result);
    expect(parsed.safeToIgnore).toBeInstanceOf(Array);
    expect(parsed.summary).toBeTypeOf("string");
  });
});
