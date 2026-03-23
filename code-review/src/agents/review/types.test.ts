import { describe, it, expect } from "vitest";
import { LLMReviewResponseSchema } from "./types.js";

describe("LLMReviewResponseSchema", () => {
  const validResponse = {
    coreDecision: "Approve with minor suggestions",
    recommendations: [
      {
        file: "src/index.ts",
        category: "maintainability",
        message: "Consider adding error handling",
        suggestion: "Wrap in try/catch",
        humanCheckNeeded: "Logic change in auth flow",
        estimatedReviewTime: "15" as const,
      },
    ],
    focusAreas: ["Error handling", "Input validation", "Testing"],
    summary: "Overall the changes look good with minor suggestions.",
  };

  it("parses a valid response object", () => {
    expect(() => LLMReviewResponseSchema.parse(validResponse)).not.toThrow();
  });

  it("rejects invalid estimatedReviewTime value", () => {
    const invalid = {
      ...validResponse,
      recommendations: [
        { ...validResponse.recommendations[0], estimatedReviewTime: "10" },
      ],
    };
    expect(() => LLMReviewResponseSchema.parse(invalid)).toThrow();
  });

  it("requires all non-optional fields", () => {
    const { coreDecision, ...missing } = validResponse;
    expect(() => LLMReviewResponseSchema.parse(missing)).toThrow();
  });
});
