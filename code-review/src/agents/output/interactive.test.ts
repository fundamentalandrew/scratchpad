import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Recommendation, ContextOutput, ReviewOutput, IgnoreGroup } from "../../agents/schemas.js";
import type { Logger } from "../../utils/logger.js";
import type { AnnotatedRecommendation } from "./types.js";

vi.mock("@inquirer/prompts", () => ({
  select: vi.fn(),
  input: vi.fn(),
}));

import { select, input } from "@inquirer/prompts";
import { runInteractiveReview } from "./interactive.js";

const mockedSelect = vi.mocked(select);
const mockedInput = vi.mocked(input);

function makeRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    file: "src/example.ts",
    severity: "medium",
    category: "quality",
    message: "Consider refactoring this function",
    ...overrides,
  };
}

function makeReviewOutput(overrides: Partial<ReviewOutput> = {}): ReviewOutput {
  return {
    recommendations: [
      makeRecommendation({ file: "src/auth.ts", severity: "critical", score: 9, category: "security", message: "SQL injection risk" }),
      makeRecommendation({ file: "src/utils.ts", severity: "low", score: 3, category: "style", message: "Unused variable" }),
      makeRecommendation({ file: "src/api.ts", severity: "high", score: 7, category: "performance", message: "N+1 query" }),
    ],
    coreDecision: "Focus on security and performance issues",
    focusAreas: ["Authentication module", "API layer"],
    safeToIgnore: [
      { label: "Generated files", count: 5, description: "Auto-generated code" },
      { label: "Config files", count: 3, description: "Standard config" },
    ],
    summary: "Review summary text",
    ...overrides,
  };
}

function makeContextOutput(overrides: Partial<ContextOutput> = {}): ContextOutput {
  return {
    mode: "pr",
    repository: { owner: "test-org", repo: "test-repo", defaultBranch: "main" },
    pr: {
      number: 42,
      title: "Fix auth flow",
      description: "Updates auth",
      author: "dev",
      baseBranch: "main",
      headBranch: "fix-auth",
      files: [
        { path: "src/auth.ts", status: "modified", additions: 10, deletions: 5 },
        { path: "src/utils.ts", status: "modified", additions: 2, deletions: 1 },
      ],
      diff: "diff content",
    },
    domainRules: null,
    architectureDoc: null,
    ...overrides,
  };
}

function makeLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    success: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runInteractiveReview", () => {
  describe("Review Summary Header", () => {
    it("displays PR title, file counts, recommendation count, core decision", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput();
      const context = makeContextOutput();

      // Accept all 3 recommendations, then choose destination
      mockedSelect
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("pr-comment");

      await runInteractiveReview(review, context, logger);

      const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
      const allOutput = infoCalls.join("\n");
      expect(allOutput).toContain("Fix auth flow");
      expect(allOutput).toContain("3"); // recommendation count
      expect(allOutput).toContain("Focus on security and performance issues");
    });

    it("displays focus areas as bullet list", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput();
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("pr-comment");

      await runInteractiveReview(review, context, logger);

      const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
      const allOutput = infoCalls.join("\n");
      expect(allOutput).toContain("Authentication module");
      expect(allOutput).toContain("API layer");
    });
  });

  describe("Recommendation Review Loop", () => {
    it("presents recommendations sorted by severity (critical first), then by score", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput();
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("pr-comment");

      await runInteractiveReview(review, context, logger);

      const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
      const allOutput = infoCalls.join("\n");

      // Critical should appear before high, high before low
      const criticalIdx = allOutput.indexOf("SQL injection risk");
      const highIdx = allOutput.indexOf("N+1 query");
      const lowIdx = allOutput.indexOf("Unused variable");
      expect(criticalIdx).toBeLessThan(highIdx);
      expect(highIdx).toBeLessThan(lowIdx);
    });

    it("Accept sets decision and advances to next recommendation", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("pr-comment");

      const result = await runInteractiveReview(review, context, logger);

      expect(result).not.toBeNull();
      expect(result!.approved).toHaveLength(1);
      expect(result!.approved[0].decision.action).toBe("accept");
    });

    it("Reject sets decision and advances to next recommendation", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("reject");

      const result = await runInteractiveReview(review, context, logger);

      // Rejected = zero approved = returns null
      expect(result).toBeNull();
    });

    it("Add note prompts for text input, sets annotate decision with note, advances", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("annotate")
        .mockResolvedValueOnce("pr-comment");
      mockedInput.mockResolvedValueOnce("my review note");

      const result = await runInteractiveReview(review, context, logger);

      expect(result).not.toBeNull();
      expect(result!.approved).toHaveLength(1);
      expect(result!.approved[0].decision).toEqual({ action: "annotate", note: "my review note" });
    });

    it("Back returns to previous recommendation with current decision displayed", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({
        recommendations: [
          makeRecommendation({ severity: "critical", message: "First" }),
          makeRecommendation({ severity: "high", message: "Second" }),
        ],
      });
      const context = makeContextOutput();

      // Accept first, go back on second, then reject first, accept second
      mockedSelect
        .mockResolvedValueOnce("accept")   // first: accept
        .mockResolvedValueOnce("back")      // second: go back
        .mockResolvedValueOnce("reject")    // first again: reject
        .mockResolvedValueOnce("accept")    // second: accept
        .mockResolvedValueOnce("pr-comment");

      const result = await runInteractiveReview(review, context, logger);

      expect(result).not.toBeNull();
      // Only second recommendation approved (first was overwritten to reject)
      expect(result!.approved).toHaveLength(1);
      expect(result!.approved[0].recommendation.message).toBe("Second");
    });

    it("Back option not shown on first recommendation (index 0)", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({
        recommendations: [
          makeRecommendation({ severity: "critical" }),
          makeRecommendation({ severity: "high" }),
        ],
      });
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("pr-comment");

      await runInteractiveReview(review, context, logger);

      // First select call (index 0) should not have "back" choice
      const firstCallChoices = mockedSelect.mock.calls[0][0].choices as Array<{ value: string }>;
      expect(firstCallChoices.find((c) => c.value === "back")).toBeUndefined();

      // Second select call (index 1) should have "back" choice
      const secondCallChoices = mockedSelect.mock.calls[1][0].choices as Array<{ value: string }>;
      expect(secondCallChoices.find((c) => c.value === "back")).toBeDefined();
    });

    it("navigating back to annotated item and adding note again overwrites previous note", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({
        recommendations: [
          makeRecommendation({ severity: "critical" }),
          makeRecommendation({ severity: "high" }),
        ],
      });
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("annotate")  // first: annotate
        .mockResolvedValueOnce("back")       // second: go back
        .mockResolvedValueOnce("annotate")   // first again: re-annotate
        .mockResolvedValueOnce("accept")     // second: accept
        .mockResolvedValueOnce("pr-comment");
      mockedInput
        .mockResolvedValueOnce("original note")
        .mockResolvedValueOnce("updated note");

      const result = await runInteractiveReview(review, context, logger);

      expect(result).not.toBeNull();
      const firstApproved = result!.approved.find(
        (a) => a.recommendation.severity === "critical"
      );
      expect(firstApproved!.decision).toEqual({ action: "annotate", note: "updated note" });
    });

    it("loop terminates when all recommendations have been reviewed", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({
        recommendations: [makeRecommendation()],
      });
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("pr-comment");

      const result = await runInteractiveReview(review, context, logger);

      expect(result).not.toBeNull();
      expect(result!.approved).toHaveLength(1);
    });

    it("zero recommendations skips review loop entirely", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({ recommendations: [] });
      const context = makeContextOutput();

      const result = await runInteractiveReview(review, context, logger);

      // Zero recommendations = zero approved = null
      expect(result).toBeNull();
      // select should not have been called for review (no recommendations)
      expect(mockedSelect).not.toHaveBeenCalled();
    });

    it("prompt abort (Ctrl+C) returns null cleanly without throwing", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
      const context = makeContextOutput();

      const exitError = new Error("User cancelled");
      exitError.name = "ExitPromptError";
      mockedSelect.mockRejectedValueOnce(exitError);

      const result = await runInteractiveReview(review, context, logger);

      expect(result).toBeNull();
    });
  });

  describe("Safe-to-Ignore Display", () => {
    it("displays ignore groups with labels, counts, and descriptions", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput();
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("pr-comment");

      await runInteractiveReview(review, context, logger);

      const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
      const allOutput = infoCalls.join("\n");
      expect(allOutput).toContain("Generated files");
      expect(allOutput).toContain("5");
      expect(allOutput).toContain("Config files");
      expect(allOutput).toContain("3");
      expect(allOutput).toContain("8"); // total count
    });

    it("handles empty ignore groups array", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({ safeToIgnore: [] });
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("pr-comment");

      await runInteractiveReview(review, context, logger);

      const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
      const allOutput = infoCalls.join("\n");
      // Should not contain "Safely Ignore" header
      expect(allOutput).not.toContain("Safely Ignore");
    });
  });

  describe("Final Confirmation", () => {
    it("counts accepted + annotated as approved, excludes rejected", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({
        recommendations: [
          makeRecommendation({ severity: "critical", message: "A" }),
          makeRecommendation({ severity: "high", message: "B" }),
          makeRecommendation({ severity: "medium", message: "C" }),
        ],
      });
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("accept")    // A: accept
        .mockResolvedValueOnce("reject")     // B: reject
        .mockResolvedValueOnce("annotate")   // C: annotate
        .mockResolvedValueOnce("pr-comment");
      mockedInput.mockResolvedValueOnce("note on C");

      const result = await runInteractiveReview(review, context, logger);

      expect(result).not.toBeNull();
      expect(result!.approved).toHaveLength(2);
      expect(result!.approved[0].decision.action).toBe("accept");
      expect(result!.approved[1].decision.action).toBe("annotate");
    });

    it("zero approved recommendations prints message and returns null", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
      const context = makeContextOutput();

      mockedSelect.mockResolvedValueOnce("reject");

      const result = await runInteractiveReview(review, context, logger);

      expect(result).toBeNull();
      const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
      const allOutput = infoCalls.join("\n");
      expect(allOutput).toContain("No recommendations to post");
    });

    it("shows Post as PR comment only when context mode is pr with PR metadata", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("pr-comment");

      await runInteractiveReview(review, context, logger);

      // Last select call is the destination prompt
      const lastCall = mockedSelect.mock.calls[mockedSelect.mock.calls.length - 1];
      const choices = lastCall[0].choices as Array<{ value: string }>;
      expect(choices.find((c) => c.value === "pr-comment")).toBeDefined();
    });

    it("hides Post as PR comment when context mode is repo", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
      const context = makeContextOutput({ mode: "repo", pr: undefined });

      mockedSelect
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("markdown-file");

      await runInteractiveReview(review, context, logger);

      const lastCall = mockedSelect.mock.calls[mockedSelect.mock.calls.length - 1];
      const choices = lastCall[0].choices as Array<{ value: string }>;
      expect(choices.find((c) => c.value === "pr-comment")).toBeUndefined();
    });

    it("Save as markdown file always shown", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
      const context = makeContextOutput({ mode: "repo", pr: undefined });

      mockedSelect
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("markdown-file");

      await runInteractiveReview(review, context, logger);

      const lastCall = mockedSelect.mock.calls[mockedSelect.mock.calls.length - 1];
      const choices = lastCall[0].choices as Array<{ value: string }>;
      expect(choices.find((c) => c.value === "markdown-file")).toBeDefined();
    });

    it("Cancel returns null", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("cancel");

      const result = await runInteractiveReview(review, context, logger);

      expect(result).toBeNull();
    });
  });

  describe("Return value", () => {
    it("returns { approved, destination } on successful flow", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
      const context = makeContextOutput();

      mockedSelect
        .mockResolvedValueOnce("accept")
        .mockResolvedValueOnce("pr-comment");

      const result = await runInteractiveReview(review, context, logger);

      expect(result).toEqual({
        approved: [
          {
            recommendation: expect.objectContaining({ file: "src/example.ts" }),
            decision: { action: "accept" },
          },
        ],
        destination: "pr-comment",
      });
    });

    it("returns null on cancellation or zero approvals", async () => {
      const logger = makeLogger();
      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
      const context = makeContextOutput();

      mockedSelect.mockResolvedValueOnce("reject");

      const result = await runInteractiveReview(review, context, logger);

      expect(result).toBeNull();
    });
  });
});
