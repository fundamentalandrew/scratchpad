diff --git a/code-review/05-interactive-output/src/interactive.ts b/code-review/05-interactive-output/src/interactive.ts
new file mode 100644
index 0000000..fb42057
--- /dev/null
+++ b/code-review/05-interactive-output/src/interactive.ts
@@ -0,0 +1,206 @@
+import { select, input } from "@inquirer/prompts";
+import chalk from "chalk";
+import type { Recommendation, ContextOutput, ReviewOutput } from "@core/agents/schemas.js";
+import type { Logger } from "@core/utils/logger.js";
+import type { AnnotatedRecommendation, OutputDestination, UserDecision } from "./types.js";
+
+const SEVERITY_RANK: Record<string, number> = {
+  critical: 0,
+  high: 1,
+  medium: 2,
+  low: 3,
+};
+
+const SEVERITY_COLOR: Record<string, (s: string) => string> = {
+  critical: chalk.red.bold,
+  high: chalk.red,
+  medium: chalk.yellow,
+  low: chalk.green,
+};
+
+function sortRecommendations(recs: Recommendation[]): Recommendation[] {
+  return [...recs].sort((a, b) => {
+    const sevDiff = (SEVERITY_RANK[a.severity] ?? 4) - (SEVERITY_RANK[b.severity] ?? 4);
+    if (sevDiff !== 0) return sevDiff;
+    const scoreA = a.score ?? -1;
+    const scoreB = b.score ?? -1;
+    return scoreB - scoreA;
+  });
+}
+
+function printSummaryHeader(
+  reviewOutput: ReviewOutput,
+  contextOutput: ContextOutput,
+  logger: Logger,
+): void {
+  const recCount = reviewOutput.recommendations.length;
+  const ignoreTotal = reviewOutput.safeToIgnore.reduce((sum, g) => sum + g.count, 0);
+
+  logger.info("");
+  logger.info(chalk.bold("═══ Code Review Summary ═══"));
+
+  if (contextOutput.mode === "pr" && contextOutput.pr) {
+    logger.info(`PR: ${chalk.cyan(contextOutput.pr.title)}`);
+    logger.info(`Files: ${contextOutput.pr.files.length}`);
+  } else if (contextOutput.repoFiles) {
+    logger.info(`Files analyzed: ${contextOutput.repoFiles.length}`);
+  }
+
+  logger.info(`Recommendations: ${recCount > 0 ? chalk.yellow(String(recCount)) : chalk.green("0")}`);
+  if (ignoreTotal > 0) {
+    logger.info(`Safe to ignore: ${chalk.green(String(ignoreTotal))} files`);
+  }
+
+  logger.info("");
+  logger.info(`Core decision: ${reviewOutput.coreDecision}`);
+
+  if (reviewOutput.focusAreas.length > 0) {
+    logger.info("Focus areas:");
+    for (const area of reviewOutput.focusAreas) {
+      logger.info(`  • ${area}`);
+    }
+  }
+  logger.info("");
+}
+
+function printRecommendation(
+  rec: Recommendation,
+  index: number,
+  total: number,
+  currentDecision: UserDecision | null,
+  logger: Logger,
+): void {
+  const colorFn = SEVERITY_COLOR[rec.severity] ?? chalk.white;
+  const severityBadge = colorFn(`[${rec.severity.toUpperCase()}]`);
+  const scoreStr = rec.score != null ? ` (${rec.score}/10)` : "";
+
+  logger.info(`Reviewing ${index + 1}/${total} recommendations`);
+  logger.info(`${rec.file}${rec.line ? `:${rec.line}` : ""}`);
+  logger.info(`${severityBadge}${scoreStr} | ${rec.category}`);
+  logger.info(rec.message);
+
+  if (rec.humanCheckNeeded) {
+    logger.info(chalk.yellow(`⚠ Human check: ${rec.humanCheckNeeded}`));
+  }
+  if (rec.suggestion) {
+    logger.info(chalk.dim(`Suggestion: ${rec.suggestion}`));
+  }
+
+  if (currentDecision) {
+    const label =
+      currentDecision.action === "annotate"
+        ? `Current: Note: ${currentDecision.note}`
+        : `Current: ${currentDecision.action.charAt(0).toUpperCase() + currentDecision.action.slice(1)}`;
+    logger.info(chalk.dim(label));
+  }
+}
+
+function printSafeToIgnore(reviewOutput: ReviewOutput, logger: Logger): void {
+  if (reviewOutput.safeToIgnore.length === 0) return;
+
+  const totalCount = reviewOutput.safeToIgnore.reduce((sum, g) => sum + g.count, 0);
+  logger.info("");
+  logger.info(chalk.bold(`Safely Ignore / Skim (${totalCount} Files)`));
+  for (const group of reviewOutput.safeToIgnore) {
+    logger.info(`  ${group.label} (${group.count} files) -- ${group.description}`);
+  }
+  logger.info("");
+}
+
+export async function runInteractiveReview(
+  reviewOutput: ReviewOutput,
+  contextOutput: ContextOutput,
+  logger: Logger,
+): Promise<{
+  approved: AnnotatedRecommendation[];
+  destination: OutputDestination;
+} | null> {
+  try {
+    printSummaryHeader(reviewOutput, contextOutput, logger);
+
+    const sorted = sortRecommendations(reviewOutput.recommendations);
+
+    if (sorted.length === 0) {
+      logger.info("No recommendations to post.");
+      return null;
+    }
+
+    // Review loop
+    const decisions: (UserDecision | null)[] = new Array(sorted.length).fill(null);
+    let currentIndex = 0;
+
+    while (currentIndex < sorted.length) {
+      const rec = sorted[currentIndex];
+      printRecommendation(rec, currentIndex, sorted.length, decisions[currentIndex], logger);
+
+      const choices: Array<{ name: string; value: string }> = [
+        { name: "Accept", value: "accept" },
+        { name: "Reject", value: "reject" },
+        { name: "Add note", value: "annotate" },
+      ];
+      if (currentIndex > 0) {
+        choices.push({ name: "Back", value: "back" });
+      }
+
+      const action = await select({ message: "Action:", choices });
+
+      switch (action) {
+        case "accept":
+          decisions[currentIndex] = { action: "accept" };
+          currentIndex++;
+          break;
+        case "reject":
+          decisions[currentIndex] = { action: "reject" };
+          currentIndex++;
+          break;
+        case "annotate": {
+          const note = await input({ message: "Enter note:" });
+          decisions[currentIndex] = { action: "annotate", note };
+          currentIndex++;
+          break;
+        }
+        case "back":
+          currentIndex--;
+          break;
+      }
+    }
+
+    // Safe-to-ignore display
+    printSafeToIgnore(reviewOutput, logger);
+
+    // Build approved list
+    const approved: AnnotatedRecommendation[] = [];
+    for (let i = 0; i < sorted.length; i++) {
+      const decision = decisions[i]!;
+      if (decision.action === "accept" || decision.action === "annotate") {
+        approved.push({ recommendation: sorted[i], decision });
+      }
+    }
+
+    if (approved.length === 0) {
+      logger.info("No recommendations to post.");
+      return null;
+    }
+
+    // Destination prompt
+    const destChoices: Array<{ name: string; value: string }> = [];
+    if (contextOutput.mode === "pr" && contextOutput.pr) {
+      destChoices.push({ name: "Post as PR comment", value: "pr-comment" });
+    }
+    destChoices.push({ name: "Save as markdown file", value: "markdown-file" });
+    destChoices.push({ name: "Cancel", value: "cancel" });
+
+    const destination = await select({ message: "Output destination:", choices: destChoices }) as OutputDestination;
+
+    if (destination === "cancel") {
+      return null;
+    }
+
+    return { approved, destination };
+  } catch (error: unknown) {
+    if (error instanceof Error && error.name === "ExitPromptError") {
+      return null;
+    }
+    throw error;
+  }
+}
diff --git a/code-review/05-interactive-output/tests/interactive.test.ts b/code-review/05-interactive-output/tests/interactive.test.ts
new file mode 100644
index 0000000..c7fed65
--- /dev/null
+++ b/code-review/05-interactive-output/tests/interactive.test.ts
@@ -0,0 +1,507 @@
+import { describe, it, expect, vi, beforeEach } from "vitest";
+import type { Recommendation, ContextOutput, ReviewOutput, IgnoreGroup } from "@core/agents/schemas.js";
+import type { Logger } from "@core/utils/logger.js";
+import type { AnnotatedRecommendation } from "../src/types.js";
+
+vi.mock("@inquirer/prompts", () => ({
+  select: vi.fn(),
+  input: vi.fn(),
+}));
+
+import { select, input } from "@inquirer/prompts";
+import { runInteractiveReview } from "../src/interactive.js";
+
+const mockedSelect = vi.mocked(select);
+const mockedInput = vi.mocked(input);
+
+function makeRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
+  return {
+    file: "src/example.ts",
+    severity: "medium",
+    category: "quality",
+    message: "Consider refactoring this function",
+    ...overrides,
+  };
+}
+
+function makeReviewOutput(overrides: Partial<ReviewOutput> = {}): ReviewOutput {
+  return {
+    recommendations: [
+      makeRecommendation({ file: "src/auth.ts", severity: "critical", score: 9, category: "security", message: "SQL injection risk" }),
+      makeRecommendation({ file: "src/utils.ts", severity: "low", score: 3, category: "style", message: "Unused variable" }),
+      makeRecommendation({ file: "src/api.ts", severity: "high", score: 7, category: "performance", message: "N+1 query" }),
+    ],
+    coreDecision: "Focus on security and performance issues",
+    focusAreas: ["Authentication module", "API layer"],
+    safeToIgnore: [
+      { label: "Generated files", count: 5, description: "Auto-generated code" },
+      { label: "Config files", count: 3, description: "Standard config" },
+    ],
+    summary: "Review summary text",
+    ...overrides,
+  };
+}
+
+function makeContextOutput(overrides: Partial<ContextOutput> = {}): ContextOutput {
+  return {
+    mode: "pr",
+    repository: { owner: "test-org", repo: "test-repo", defaultBranch: "main" },
+    pr: {
+      number: 42,
+      title: "Fix auth flow",
+      description: "Updates auth",
+      author: "dev",
+      baseBranch: "main",
+      headBranch: "fix-auth",
+      files: [
+        { path: "src/auth.ts", status: "modified", additions: 10, deletions: 5 },
+        { path: "src/utils.ts", status: "modified", additions: 2, deletions: 1 },
+      ],
+      diff: "diff content",
+    },
+    domainRules: null,
+    architectureDoc: null,
+    ...overrides,
+  };
+}
+
+function makeLogger(): Logger {
+  return {
+    info: vi.fn(),
+    warn: vi.fn(),
+    error: vi.fn(),
+    verbose: vi.fn(),
+    success: vi.fn(),
+  };
+}
+
+beforeEach(() => {
+  vi.clearAllMocks();
+});
+
+describe("runInteractiveReview", () => {
+  describe("Review Summary Header", () => {
+    it("displays PR title, file counts, recommendation count, core decision", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput();
+      const context = makeContextOutput();
+
+      // Accept all 3 recommendations, then choose destination
+      mockedSelect
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("pr-comment");
+
+      await runInteractiveReview(review, context, logger);
+
+      const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
+      const allOutput = infoCalls.join("\n");
+      expect(allOutput).toContain("Fix auth flow");
+      expect(allOutput).toContain("3"); // recommendation count
+      expect(allOutput).toContain("Focus on security and performance issues");
+    });
+
+    it("displays focus areas as bullet list", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput();
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("pr-comment");
+
+      await runInteractiveReview(review, context, logger);
+
+      const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
+      const allOutput = infoCalls.join("\n");
+      expect(allOutput).toContain("Authentication module");
+      expect(allOutput).toContain("API layer");
+    });
+  });
+
+  describe("Recommendation Review Loop", () => {
+    it("presents recommendations sorted by severity (critical first), then by score", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput();
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("pr-comment");
+
+      await runInteractiveReview(review, context, logger);
+
+      const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
+      const allOutput = infoCalls.join("\n");
+
+      // Critical should appear before high, high before low
+      const criticalIdx = allOutput.indexOf("SQL injection risk");
+      const highIdx = allOutput.indexOf("N+1 query");
+      const lowIdx = allOutput.indexOf("Unused variable");
+      expect(criticalIdx).toBeLessThan(highIdx);
+      expect(highIdx).toBeLessThan(lowIdx);
+    });
+
+    it("Accept sets decision and advances to next recommendation", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("pr-comment");
+
+      const result = await runInteractiveReview(review, context, logger);
+
+      expect(result).not.toBeNull();
+      expect(result!.approved).toHaveLength(1);
+      expect(result!.approved[0].decision.action).toBe("accept");
+    });
+
+    it("Reject sets decision and advances to next recommendation", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("reject");
+
+      const result = await runInteractiveReview(review, context, logger);
+
+      // Rejected = zero approved = returns null
+      expect(result).toBeNull();
+    });
+
+    it("Add note prompts for text input, sets annotate decision with note, advances", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("annotate")
+        .mockResolvedValueOnce("pr-comment");
+      mockedInput.mockResolvedValueOnce("my review note");
+
+      const result = await runInteractiveReview(review, context, logger);
+
+      expect(result).not.toBeNull();
+      expect(result!.approved).toHaveLength(1);
+      expect(result!.approved[0].decision).toEqual({ action: "annotate", note: "my review note" });
+    });
+
+    it("Back returns to previous recommendation with current decision displayed", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({
+        recommendations: [
+          makeRecommendation({ severity: "critical", message: "First" }),
+          makeRecommendation({ severity: "high", message: "Second" }),
+        ],
+      });
+      const context = makeContextOutput();
+
+      // Accept first, go back on second, then reject first, accept second
+      mockedSelect
+        .mockResolvedValueOnce("accept")   // first: accept
+        .mockResolvedValueOnce("back")      // second: go back
+        .mockResolvedValueOnce("reject")    // first again: reject
+        .mockResolvedValueOnce("accept")    // second: accept
+        .mockResolvedValueOnce("pr-comment");
+
+      const result = await runInteractiveReview(review, context, logger);
+
+      expect(result).not.toBeNull();
+      // Only second recommendation approved (first was overwritten to reject)
+      expect(result!.approved).toHaveLength(1);
+      expect(result!.approved[0].recommendation.message).toBe("Second");
+    });
+
+    it("Back option not shown on first recommendation (index 0)", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({
+        recommendations: [
+          makeRecommendation({ severity: "critical" }),
+          makeRecommendation({ severity: "high" }),
+        ],
+      });
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("pr-comment");
+
+      await runInteractiveReview(review, context, logger);
+
+      // First select call (index 0) should not have "back" choice
+      const firstCallChoices = mockedSelect.mock.calls[0][0].choices as Array<{ value: string }>;
+      expect(firstCallChoices.find((c) => c.value === "back")).toBeUndefined();
+
+      // Second select call (index 1) should have "back" choice
+      const secondCallChoices = mockedSelect.mock.calls[1][0].choices as Array<{ value: string }>;
+      expect(secondCallChoices.find((c) => c.value === "back")).toBeDefined();
+    });
+
+    it("navigating back to annotated item and adding note again overwrites previous note", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({
+        recommendations: [
+          makeRecommendation({ severity: "critical" }),
+          makeRecommendation({ severity: "high" }),
+        ],
+      });
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("annotate")  // first: annotate
+        .mockResolvedValueOnce("back")       // second: go back
+        .mockResolvedValueOnce("annotate")   // first again: re-annotate
+        .mockResolvedValueOnce("accept")     // second: accept
+        .mockResolvedValueOnce("pr-comment");
+      mockedInput
+        .mockResolvedValueOnce("original note")
+        .mockResolvedValueOnce("updated note");
+
+      const result = await runInteractiveReview(review, context, logger);
+
+      expect(result).not.toBeNull();
+      const firstApproved = result!.approved.find(
+        (a) => a.recommendation.severity === "critical"
+      );
+      expect(firstApproved!.decision).toEqual({ action: "annotate", note: "updated note" });
+    });
+
+    it("loop terminates when all recommendations have been reviewed", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({
+        recommendations: [makeRecommendation()],
+      });
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("pr-comment");
+
+      const result = await runInteractiveReview(review, context, logger);
+
+      expect(result).not.toBeNull();
+      expect(result!.approved).toHaveLength(1);
+    });
+
+    it("zero recommendations skips review loop entirely", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({ recommendations: [] });
+      const context = makeContextOutput();
+
+      const result = await runInteractiveReview(review, context, logger);
+
+      // Zero recommendations = zero approved = null
+      expect(result).toBeNull();
+      // select should not have been called for review (no recommendations)
+      expect(mockedSelect).not.toHaveBeenCalled();
+    });
+
+    it("prompt abort (Ctrl+C) returns null cleanly without throwing", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
+      const context = makeContextOutput();
+
+      const exitError = new Error("User cancelled");
+      exitError.name = "ExitPromptError";
+      mockedSelect.mockRejectedValueOnce(exitError);
+
+      const result = await runInteractiveReview(review, context, logger);
+
+      expect(result).toBeNull();
+    });
+  });
+
+  describe("Safe-to-Ignore Display", () => {
+    it("displays ignore groups with labels, counts, and descriptions", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput();
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("pr-comment");
+
+      await runInteractiveReview(review, context, logger);
+
+      const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
+      const allOutput = infoCalls.join("\n");
+      expect(allOutput).toContain("Generated files");
+      expect(allOutput).toContain("5");
+      expect(allOutput).toContain("Config files");
+      expect(allOutput).toContain("3");
+      expect(allOutput).toContain("8"); // total count
+    });
+
+    it("handles empty ignore groups array", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({ safeToIgnore: [] });
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("pr-comment");
+
+      await runInteractiveReview(review, context, logger);
+
+      const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
+      const allOutput = infoCalls.join("\n");
+      // Should not contain "Safely Ignore" header
+      expect(allOutput).not.toContain("Safely Ignore");
+    });
+  });
+
+  describe("Final Confirmation", () => {
+    it("counts accepted + annotated as approved, excludes rejected", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({
+        recommendations: [
+          makeRecommendation({ severity: "critical", message: "A" }),
+          makeRecommendation({ severity: "high", message: "B" }),
+          makeRecommendation({ severity: "medium", message: "C" }),
+        ],
+      });
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("accept")    // A: accept
+        .mockResolvedValueOnce("reject")     // B: reject
+        .mockResolvedValueOnce("annotate")   // C: annotate
+        .mockResolvedValueOnce("pr-comment");
+      mockedInput.mockResolvedValueOnce("note on C");
+
+      const result = await runInteractiveReview(review, context, logger);
+
+      expect(result).not.toBeNull();
+      expect(result!.approved).toHaveLength(2);
+      expect(result!.approved[0].decision.action).toBe("accept");
+      expect(result!.approved[1].decision.action).toBe("annotate");
+    });
+
+    it("zero approved recommendations prints message and returns null", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
+      const context = makeContextOutput();
+
+      mockedSelect.mockResolvedValueOnce("reject");
+
+      const result = await runInteractiveReview(review, context, logger);
+
+      expect(result).toBeNull();
+      const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);
+      const allOutput = infoCalls.join("\n");
+      expect(allOutput).toContain("No recommendations to post");
+    });
+
+    it("shows Post as PR comment only when context mode is pr with PR metadata", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("pr-comment");
+
+      await runInteractiveReview(review, context, logger);
+
+      // Last select call is the destination prompt
+      const lastCall = mockedSelect.mock.calls[mockedSelect.mock.calls.length - 1];
+      const choices = lastCall[0].choices as Array<{ value: string }>;
+      expect(choices.find((c) => c.value === "pr-comment")).toBeDefined();
+    });
+
+    it("hides Post as PR comment when context mode is repo", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
+      const context = makeContextOutput({ mode: "repo", pr: undefined });
+
+      mockedSelect
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("markdown-file");
+
+      await runInteractiveReview(review, context, logger);
+
+      const lastCall = mockedSelect.mock.calls[mockedSelect.mock.calls.length - 1];
+      const choices = lastCall[0].choices as Array<{ value: string }>;
+      expect(choices.find((c) => c.value === "pr-comment")).toBeUndefined();
+    });
+
+    it("Save as markdown file always shown", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
+      const context = makeContextOutput({ mode: "repo", pr: undefined });
+
+      mockedSelect
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("markdown-file");
+
+      await runInteractiveReview(review, context, logger);
+
+      const lastCall = mockedSelect.mock.calls[mockedSelect.mock.calls.length - 1];
+      const choices = lastCall[0].choices as Array<{ value: string }>;
+      expect(choices.find((c) => c.value === "markdown-file")).toBeDefined();
+    });
+
+    it("Cancel returns null", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("cancel");
+
+      const result = await runInteractiveReview(review, context, logger);
+
+      expect(result).toBeNull();
+    });
+  });
+
+  describe("Return value", () => {
+    it("returns { approved, destination } on successful flow", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
+      const context = makeContextOutput();
+
+      mockedSelect
+        .mockResolvedValueOnce("accept")
+        .mockResolvedValueOnce("pr-comment");
+
+      const result = await runInteractiveReview(review, context, logger);
+
+      expect(result).toEqual({
+        approved: [
+          {
+            recommendation: expect.objectContaining({ file: "src/example.ts" }),
+            decision: { action: "accept" },
+          },
+        ],
+        destination: "pr-comment",
+      });
+    });
+
+    it("returns null on cancellation or zero approvals", async () => {
+      const logger = makeLogger();
+      const review = makeReviewOutput({ recommendations: [makeRecommendation()] });
+      const context = makeContextOutput();
+
+      mockedSelect.mockResolvedValueOnce("reject");
+
+      const result = await runInteractiveReview(review, context, logger);
+
+      expect(result).toBeNull();
+    });
+  });
+});
