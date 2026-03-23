import { describe, it, expect } from "vitest";
import {
  formatRecommendationBlock,
  formatSafeToIgnoreSection,
  formatSummaryHeader,
  sanitizeForGitHub,
} from "../../src/formatters/shared.js";
import type { AnnotatedRecommendation } from "../../src/types.js";

describe("formatRecommendationBlock", () => {
  it("formats recommendation with all fields present", () => {
    const rec: AnnotatedRecommendation = {
      recommendation: {
        file: "src/auth.ts",
        line: 42,
        severity: "critical",
        score: 8,
        category: "security",
        message: "SQL injection vulnerability in query builder",
        humanCheckNeeded: "Verify parameterized queries are used",
        suggestion: "Use prepared statements instead of string concatenation",
      },
      decision: { action: "accept" },
    };
    const output = formatRecommendationBlock(rec);
    expect(output).toContain("src/auth.ts:42");
    expect(output).toContain("critical");
    expect(output).toContain("8/10");
    expect(output).toContain("security");
    expect(output).toContain("SQL injection vulnerability in query builder");
    expect(output).toContain("Verify parameterized queries are used");
    expect(output).toContain(
      "Use prepared statements instead of string concatenation"
    );
  });

  it("formats recommendation with minimal fields only", () => {
    const rec: AnnotatedRecommendation = {
      recommendation: {
        file: "src/utils.ts",
        severity: "low",
        category: "style",
        message: "Consider renaming variable",
      },
      decision: { action: "accept" },
    };
    const output = formatRecommendationBlock(rec);
    expect(output).toContain("src/utils.ts");
    expect(output).toContain("low");
    expect(output).toContain("style");
    expect(output).toContain("Consider renaming variable");
    expect(output).not.toContain("humanCheckNeeded");
    expect(output).not.toContain("Suggestion");
  });

  it("includes user note with pencil emoji prefix when decision is annotate", () => {
    const rec: AnnotatedRecommendation = {
      recommendation: {
        file: "src/api.ts",
        severity: "medium",
        category: "performance",
        message: "N+1 query detected",
      },
      decision: { action: "annotate", note: "Check this carefully" },
    };
    const output = formatRecommendationBlock(rec);
    expect(output).toContain("📝");
    expect(output).toContain("Check this carefully");
  });

  it("omits note section when decision is accept with no note", () => {
    const rec: AnnotatedRecommendation = {
      recommendation: {
        file: "src/api.ts",
        severity: "medium",
        category: "performance",
        message: "N+1 query detected",
      },
      decision: { action: "accept" },
    };
    const output = formatRecommendationBlock(rec);
    expect(output).not.toContain("📝");
  });
});

describe("formatSafeToIgnoreSection", () => {
  it("formats multiple ignore groups with labels and counts", () => {
    const groups = [
      { label: "Formatting", count: 12, description: "Whitespace-only changes" },
      { label: "Generated", count: 5, description: "Auto-generated files" },
      { label: "Config", count: 3, description: "Configuration boilerplate" },
    ];
    const output = formatSafeToIgnoreSection(groups);
    expect(output).toContain("Formatting");
    expect(output).toContain("12");
    expect(output).toContain("Whitespace-only changes");
    expect(output).toContain("Generated");
    expect(output).toContain("5");
    expect(output).toContain("Auto-generated files");
    expect(output).toContain("Config");
    expect(output).toContain("3");
    expect(output).toContain("Configuration boilerplate");
  });

  it("returns empty string for empty groups array", () => {
    expect(formatSafeToIgnoreSection([])).toBe("");
  });
});

describe("formatSummaryHeader", () => {
  it("includes total files reviewed count, approved count, core decision", () => {
    const reviewOutput = {
      recommendations: [
        { file: "a.ts", severity: "high" as const, category: "bug", message: "msg1" },
        { file: "b.ts", severity: "low" as const, category: "style", message: "msg2" },
      ],
      coreDecision: "Approve with minor changes",
      focusAreas: ["Error handling", "Input validation"],
      safeToIgnore: [],
      summary: "Overall looks good",
    };
    const output = formatSummaryHeader(reviewOutput, 3, 15);
    expect(output).toContain("3");
    expect(output).toContain("15");
    expect(output).toContain("2");
    expect(output).toContain("Approve with minor changes");
  });

  it("uses totalFilesReviewed parameter not hardcoded value", () => {
    const reviewOutput = {
      recommendations: [],
      coreDecision: "LGTM",
      focusAreas: [],
      safeToIgnore: [],
      summary: "Clean",
    };
    const output = formatSummaryHeader(reviewOutput, 0, 42);
    expect(output).toContain("42");
    expect(output).not.toContain("Focus Areas");
  });
});

describe("sanitizeForGitHub", () => {
  it("neutralizes @mentions by inserting zero-width space", () => {
    const output = sanitizeForGitHub("Contact @orgname for help");
    expect(output).toContain("@\u200borgname");
  });

  it("handles multiple @mentions in same string", () => {
    const output = sanitizeForGitHub("@alice and @bob should review");
    expect(output).toContain("@\u200balice");
    expect(output).toContain("@\u200bbob");
  });

  it("leaves non-mention @ symbols alone (email addresses)", () => {
    const output = sanitizeForGitHub("user@example.com");
    expect(output).toBe("user@example.com");
  });

  it("returns unchanged string when no @mentions present", () => {
    const input = "No mentions here";
    expect(sanitizeForGitHub(input)).toBe(input);
  });
});
