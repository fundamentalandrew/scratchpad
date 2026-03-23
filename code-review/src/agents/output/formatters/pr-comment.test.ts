import { describe, it, expect } from "vitest";
import { formatPRComment } from "./pr-comment.js";
import type { AnnotatedRecommendation } from "../types.js";
import type { ReviewOutput } from "../../../agents/schemas.js";

function makeReviewOutput(overrides: Partial<ReviewOutput> = {}): ReviewOutput {
  return {
    recommendations: [],
    coreDecision: "Approve with minor changes",
    focusAreas: ["Error handling"],
    safeToIgnore: [],
    summary: "Looks good overall",
    ...overrides,
  };
}

function makeApproved(
  file: string,
  severity: "critical" | "high" | "medium" | "low",
  message: string,
  score?: number
): AnnotatedRecommendation {
  return {
    recommendation: { file, severity, category: "bug", message, score },
    decision: { action: "accept" },
  };
}

describe("formatPRComment", () => {
  it("output starts with hidden marker <!-- code-review-cli:report:v1 -->", () => {
    const output = formatPRComment(makeReviewOutput(), [], 5);
    expect(output.startsWith("<!-- code-review-cli:report:v1 -->")).toBe(true);
  });

  it("includes summary header, core decision, recommendations, safe-to-ignore sections", () => {
    const review = makeReviewOutput({
      coreDecision: "Ship it with one fix",
      safeToIgnore: [
        { label: "Config files", count: 3, description: "Boilerplate" },
      ],
    });
    const approved = [makeApproved("src/a.ts", "high", "Fix null check")];
    const output = formatPRComment(review, approved, 10);
    expect(output).toContain("Strategic PR Review Guide");
    expect(output).toContain("Ship it with one fix");
    expect(output).toContain("Fix null check");
    expect(output).toContain("Safe to Ignore");
    expect(output).toContain("Config files");
  });

  it("uses <details> blocks when more than 5 safe-to-ignore groups", () => {
    const groups = Array.from({ length: 6 }, (_, i) => ({
      label: `Group ${i}`,
      count: i + 1,
      description: `Description ${i}`,
    }));
    const review = makeReviewOutput({ safeToIgnore: groups });
    const output = formatPRComment(review, [], 5);
    expect(output).toContain("<details>");
    expect(output).toContain("</details>");
  });

  it("does not use <details> when 5 or fewer groups", () => {
    const groups = Array.from({ length: 3 }, (_, i) => ({
      label: `Group ${i}`,
      count: i + 1,
      description: `Description ${i}`,
    }));
    const review = makeReviewOutput({ safeToIgnore: groups });
    const output = formatPRComment(review, [], 5);
    expect(output).not.toContain("<details>");
  });

  it("does not use <details> for exactly 5 groups (boundary)", () => {
    const groups = Array.from({ length: 5 }, (_, i) => ({
      label: `Group ${i}`,
      count: i + 1,
      description: `Description ${i}`,
    }));
    const review = makeReviewOutput({ safeToIgnore: groups });
    const output = formatPRComment(review, [], 5);
    expect(output).not.toContain("<details>");
  });

  it("approved recommendations appear in severity order", () => {
    const approved = [
      makeApproved("low.ts", "low", "Low issue"),
      makeApproved("crit.ts", "critical", "Critical issue"),
      makeApproved("med.ts", "medium", "Medium issue"),
    ];
    const output = formatPRComment(makeReviewOutput(), approved, 10);
    const critIdx = output.indexOf("Critical issue");
    const medIdx = output.indexOf("Medium issue");
    const lowIdx = output.indexOf("Low issue");
    expect(critIdx).toBeLessThan(medIdx);
    expect(medIdx).toBeLessThan(lowIdx);
  });

  it("annotated recommendations include user notes", () => {
    const approved: AnnotatedRecommendation[] = [
      {
        recommendation: {
          file: "src/b.ts",
          severity: "high",
          category: "security",
          message: "Check injection",
        },
        decision: { action: "annotate", note: "Verified safe in context" },
      },
    ];
    const output = formatPRComment(makeReviewOutput(), approved, 5);
    expect(output).toContain("Verified safe in context");
  });
});
