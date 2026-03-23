import { describe, it, expect } from "vitest";
import { formatMarkdownFile } from "../../src/formatters/markdown-file.js";
import type { AnnotatedRecommendation } from "../../src/types.js";
import type { ReviewOutput } from "@core/agents/schemas.js";

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

describe("formatMarkdownFile", () => {
  it("starts with YAML frontmatter containing timestamp, reviewMode", () => {
    const output = formatMarkdownFile(makeReviewOutput(), [], 5, {
      timestamp: "2026-01-15T10:00:00Z",
      reviewMode: "pr",
    });
    expect(output.startsWith("---\n")).toBe(true);
    const frontmatter = output.split("---\n")[1];
    expect(frontmatter).toContain('timestamp: "2026-01-15T10:00:00Z"');
    expect(frontmatter).toContain('reviewMode: "pr"');
  });

  it("includes prUrl in frontmatter when provided (PR mode)", () => {
    const output = formatMarkdownFile(makeReviewOutput(), [], 5, {
      timestamp: "2026-01-15T10:00:00Z",
      reviewMode: "pr",
      prUrl: "https://github.com/owner/repo/pull/42",
    });
    const frontmatter = output.split("---\n")[1];
    expect(frontmatter).toContain(
      'prUrl: "https://github.com/owner/repo/pull/42"'
    );
  });

  it("omits prUrl from frontmatter when not provided (repo mode)", () => {
    const output = formatMarkdownFile(makeReviewOutput(), [], 5, {
      timestamp: "2026-01-15T10:00:00Z",
      reviewMode: "repo",
    });
    const frontmatter = output.split("---\n")[1];
    expect(frontmatter).not.toContain("prUrl");
  });

  it("body content matches PR comment format (same sections)", () => {
    const review = makeReviewOutput({
      coreDecision: "Fix critical bug first",
      safeToIgnore: [
        { label: "Tests", count: 5, description: "Test file changes" },
      ],
    });
    const output = formatMarkdownFile(review, [], 10, {
      timestamp: "2026-01-15T10:00:00Z",
      reviewMode: "pr",
    });
    expect(output).toContain("Strategic PR Review Guide");
    expect(output).toContain("Fix critical bug first");
    expect(output).toContain("Safe to Ignore");
  });

  it("body includes recommendations section when approved recs provided", () => {
    const approved: AnnotatedRecommendation[] = [
      {
        recommendation: {
          file: "src/foo.ts",
          severity: "high",
          category: "bug",
          message: "Null check missing",
        },
        decision: { action: "accept" },
      },
    ];
    const output = formatMarkdownFile(makeReviewOutput(), approved, 10, {
      timestamp: "2026-01-15T10:00:00Z",
      reviewMode: "pr",
    });
    expect(output).toContain("Files Requiring Human Verification");
    expect(output).toContain("Null check missing");
  });
});
