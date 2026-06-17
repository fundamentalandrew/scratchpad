diff --git a/code-review/05-interactive-output/src/index.ts b/code-review/05-interactive-output/src/index.ts
index 419531e..f14d38b 100644
--- a/code-review/05-interactive-output/src/index.ts
+++ b/code-review/05-interactive-output/src/index.ts
@@ -14,4 +14,4 @@ export { runInteractiveReview } from "./interactive.js";
 export { publishPRComment, PR_COMMENT_MARKER } from "./publishers/github.js";
 export { publishMarkdownFile } from "./publishers/file.js";
 
-// TODO: export { createOutputAgent } from "./output-agent.js"; (section-07)
+export { createOutputAgent } from "./output-agent.js";
diff --git a/code-review/05-interactive-output/src/output-agent.ts b/code-review/05-interactive-output/src/output-agent.ts
new file mode 100644
index 0000000..4b9ffc5
--- /dev/null
+++ b/code-review/05-interactive-output/src/output-agent.ts
@@ -0,0 +1,65 @@
+import type { Agent } from "@core/pipeline/types.js";
+import type { ContextOutput, ReviewOutput } from "@core/agents/schemas.js";
+import type { OutputAgentDependencies } from "./types.js";
+import { runInteractiveReview } from "./interactive.js";
+import { formatPRComment } from "./formatters/pr-comment.js";
+import { formatMarkdownFile } from "./formatters/markdown-file.js";
+import { publishPRComment } from "./publishers/github.js";
+import { publishMarkdownFile } from "./publishers/file.js";
+
+function getTotalFilesReviewed(contextOutput: ContextOutput): number {
+  if (contextOutput.mode === "pr" && contextOutput.pr) {
+    return contextOutput.pr.files.length;
+  }
+  if (contextOutput.repoFiles) {
+    return contextOutput.repoFiles.length;
+  }
+  return 0;
+}
+
+function buildPrUrl(contextOutput: ContextOutput): string | undefined {
+  if (contextOutput.mode === "pr" && contextOutput.pr) {
+    const { owner, repo } = contextOutput.repository;
+    return `https://github.com/${owner}/${repo}/pull/${contextOutput.pr.number}`;
+  }
+  return undefined;
+}
+
+export function createOutputAgent(deps: OutputAgentDependencies): Agent<ReviewOutput, ReviewOutput> {
+  return {
+    name: "output",
+    idempotent: false,
+    async run(input: ReviewOutput): Promise<ReviewOutput> {
+      const result = await runInteractiveReview(input, deps.contextOutput, deps.logger);
+
+      if (result === null) {
+        return input;
+      }
+
+      if (result.destination === "cancel") {
+        deps.logger.info("Output cancelled.");
+        return input;
+      }
+
+      const totalFilesReviewed = getTotalFilesReviewed(deps.contextOutput);
+
+      if (result.destination === "pr-comment") {
+        const body = formatPRComment(input, result.approved, totalFilesReviewed);
+        const { owner, repo } = deps.contextOutput.repository;
+        const prNumber = deps.contextOutput.pr!.number;
+        await publishPRComment(deps.githubClient, owner, repo, prNumber, body, deps.logger);
+      } else if (result.destination === "markdown-file") {
+        const prUrl = buildPrUrl(deps.contextOutput);
+        const metadata = {
+          timestamp: new Date().toISOString(),
+          prUrl,
+          reviewMode: deps.contextOutput.mode,
+        };
+        const content = formatMarkdownFile(input, result.approved, totalFilesReviewed, metadata);
+        await publishMarkdownFile(content, deps.config.markdownPath, deps.logger);
+      }
+
+      return input;
+    },
+  };
+}
diff --git a/code-review/05-interactive-output/tests/output-agent.test.ts b/code-review/05-interactive-output/tests/output-agent.test.ts
new file mode 100644
index 0000000..7d2bc8e
--- /dev/null
+++ b/code-review/05-interactive-output/tests/output-agent.test.ts
@@ -0,0 +1,275 @@
+import { describe, it, expect, vi, beforeEach } from "vitest";
+import type { ContextOutput, ReviewOutput, Recommendation } from "@core/agents/schemas.js";
+import type { Logger } from "@core/utils/logger.js";
+import type { GitHubClient } from "@core/clients/github.js";
+import type { AnnotatedRecommendation, OutputConfig, OutputAgentDependencies } from "../src/types.js";
+
+vi.mock("../src/interactive.js", () => ({
+  runInteractiveReview: vi.fn(),
+}));
+
+vi.mock("../src/formatters/pr-comment.js", () => ({
+  formatPRComment: vi.fn(),
+}));
+
+vi.mock("../src/formatters/markdown-file.js", () => ({
+  formatMarkdownFile: vi.fn(),
+}));
+
+vi.mock("../src/publishers/github.js", () => ({
+  publishPRComment: vi.fn(),
+}));
+
+vi.mock("../src/publishers/file.js", () => ({
+  publishMarkdownFile: vi.fn(),
+}));
+
+import { runInteractiveReview } from "../src/interactive.js";
+import { formatPRComment } from "../src/formatters/pr-comment.js";
+import { formatMarkdownFile } from "../src/formatters/markdown-file.js";
+import { publishPRComment } from "../src/publishers/github.js";
+import { publishMarkdownFile } from "../src/publishers/file.js";
+import { createOutputAgent } from "../src/output-agent.js";
+
+const mockedRunInteractiveReview = vi.mocked(runInteractiveReview);
+const mockedFormatPRComment = vi.mocked(formatPRComment);
+const mockedFormatMarkdownFile = vi.mocked(formatMarkdownFile);
+const mockedPublishPRComment = vi.mocked(publishPRComment);
+const mockedPublishMarkdownFile = vi.mocked(publishMarkdownFile);
+
+function makeRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
+  return {
+    file: "src/example.ts",
+    severity: "medium",
+    category: "quality",
+    message: "Consider refactoring",
+    ...overrides,
+  };
+}
+
+function makeReviewOutput(overrides: Partial<ReviewOutput> = {}): ReviewOutput {
+  return {
+    recommendations: [
+      makeRecommendation({ file: "src/auth.ts", severity: "critical", score: 9 }),
+      makeRecommendation({ file: "src/utils.ts", severity: "low", score: 3 }),
+    ],
+    coreDecision: "Focus on security",
+    focusAreas: ["Auth module"],
+    safeToIgnore: [],
+    summary: "Review summary",
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
+      title: "Fix auth",
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
+function makeDeps(overrides: Partial<OutputAgentDependencies> = {}): OutputAgentDependencies {
+  return {
+    logger: makeLogger(),
+    githubClient: {} as GitHubClient,
+    config: { markdown: true, markdownPath: "./review.md", githubComment: true },
+    contextOutput: makeContextOutput(),
+    ...overrides,
+  };
+}
+
+beforeEach(() => {
+  vi.clearAllMocks();
+});
+
+describe("createOutputAgent", () => {
+  it("returns agent with correct name and idempotent flag", () => {
+    const agent = createOutputAgent(makeDeps());
+    expect(agent.name).toBe("output");
+    expect(agent.idempotent).toBe(false);
+  });
+
+  describe("run()", () => {
+    it("calls runInteractiveReview with reviewOutput, contextOutput, logger", async () => {
+      const deps = makeDeps();
+      const agent = createOutputAgent(deps);
+      const reviewOutput = makeReviewOutput();
+
+      mockedRunInteractiveReview.mockResolvedValue(null);
+
+      await agent.run(reviewOutput);
+
+      expect(mockedRunInteractiveReview).toHaveBeenCalledWith(
+        reviewOutput,
+        deps.contextOutput,
+        deps.logger,
+      );
+    });
+
+    it("returns input unchanged when interactive returns null", async () => {
+      const agent = createOutputAgent(makeDeps());
+      const reviewOutput = makeReviewOutput();
+
+      mockedRunInteractiveReview.mockResolvedValue(null);
+
+      const result = await agent.run(reviewOutput);
+
+      expect(result).toBe(reviewOutput);
+      expect(mockedFormatPRComment).not.toHaveBeenCalled();
+      expect(mockedFormatMarkdownFile).not.toHaveBeenCalled();
+      expect(mockedPublishPRComment).not.toHaveBeenCalled();
+      expect(mockedPublishMarkdownFile).not.toHaveBeenCalled();
+    });
+
+    it("formats and publishes PR comment on pr-comment destination", async () => {
+      const deps = makeDeps();
+      const agent = createOutputAgent(deps);
+      const reviewOutput = makeReviewOutput();
+      const approved: AnnotatedRecommendation[] = [
+        { recommendation: reviewOutput.recommendations[0], decision: { action: "accept" } },
+      ];
+
+      mockedRunInteractiveReview.mockResolvedValue({ approved, destination: "pr-comment" });
+      mockedFormatPRComment.mockReturnValue("formatted PR comment body");
+      mockedPublishPRComment.mockResolvedValue(undefined);
+
+      const result = await agent.run(reviewOutput);
+
+      expect(mockedFormatPRComment).toHaveBeenCalledWith(reviewOutput, approved, 2);
+      expect(mockedPublishPRComment).toHaveBeenCalledWith(
+        deps.githubClient,
+        "test-org",
+        "test-repo",
+        42,
+        "formatted PR comment body",
+        deps.logger,
+      );
+      expect(result).toBe(reviewOutput);
+    });
+
+    it("formats and publishes markdown file on markdown-file destination", async () => {
+      const deps = makeDeps();
+      const agent = createOutputAgent(deps);
+      const reviewOutput = makeReviewOutput();
+      const approved: AnnotatedRecommendation[] = [
+        { recommendation: reviewOutput.recommendations[0], decision: { action: "accept" } },
+      ];
+
+      mockedRunInteractiveReview.mockResolvedValue({ approved, destination: "markdown-file" });
+      mockedFormatMarkdownFile.mockReturnValue("formatted markdown content");
+      mockedPublishMarkdownFile.mockResolvedValue(undefined);
+
+      const result = await agent.run(reviewOutput);
+
+      expect(mockedFormatMarkdownFile).toHaveBeenCalledWith(
+        reviewOutput,
+        approved,
+        2,
+        expect.objectContaining({
+          timestamp: expect.any(String),
+          prUrl: expect.any(String),
+          reviewMode: "pr",
+        }),
+      );
+      expect(mockedPublishMarkdownFile).toHaveBeenCalledWith(
+        "formatted markdown content",
+        "./review.md",
+        deps.logger,
+      );
+      expect(result).toBe(reviewOutput);
+    });
+
+    it("returns input unchanged on cancel destination", async () => {
+      const deps = makeDeps();
+      const agent = createOutputAgent(deps);
+      const reviewOutput = makeReviewOutput();
+
+      mockedRunInteractiveReview.mockResolvedValue({
+        approved: [{ recommendation: reviewOutput.recommendations[0], decision: { action: "accept" } }],
+        destination: "cancel",
+      });
+
+      const result = await agent.run(reviewOutput);
+
+      expect(result).toBe(reviewOutput);
+      expect(mockedFormatPRComment).not.toHaveBeenCalled();
+      expect(mockedFormatMarkdownFile).not.toHaveBeenCalled();
+      expect(mockedPublishPRComment).not.toHaveBeenCalled();
+      expect(mockedPublishMarkdownFile).not.toHaveBeenCalled();
+    });
+
+    it("passes only approved recommendations to formatters", async () => {
+      const deps = makeDeps();
+      const agent = createOutputAgent(deps);
+      const reviewOutput = makeReviewOutput();
+      // Only the first recommendation is approved
+      const approved: AnnotatedRecommendation[] = [
+        { recommendation: reviewOutput.recommendations[0], decision: { action: "accept" } },
+      ];
+
+      mockedRunInteractiveReview.mockResolvedValue({ approved, destination: "pr-comment" });
+      mockedFormatPRComment.mockReturnValue("body");
+      mockedPublishPRComment.mockResolvedValue(undefined);
+
+      await agent.run(reviewOutput);
+
+      // Formatter receives the approved list (1 item), not all recommendations (2 items)
+      const passedApproved = mockedFormatPRComment.mock.calls[0][1];
+      expect(passedApproved).toHaveLength(1);
+      expect(passedApproved[0].recommendation.file).toBe("src/auth.ts");
+    });
+
+    it("uses repoFiles length for totalFilesReviewed in repo mode", async () => {
+      const contextOutput = makeContextOutput({
+        mode: "repo",
+        pr: undefined,
+        repoFiles: [{ path: "a.ts" }, { path: "b.ts" }, { path: "c.ts" }],
+      });
+      const deps = makeDeps({ contextOutput });
+      const agent = createOutputAgent(deps);
+      const reviewOutput = makeReviewOutput();
+      const approved: AnnotatedRecommendation[] = [
+        { recommendation: reviewOutput.recommendations[0], decision: { action: "accept" } },
+      ];
+
+      mockedRunInteractiveReview.mockResolvedValue({ approved, destination: "markdown-file" });
+      mockedFormatMarkdownFile.mockReturnValue("body");
+      mockedPublishMarkdownFile.mockResolvedValue(undefined);
+
+      await agent.run(reviewOutput);
+
+      expect(mockedFormatMarkdownFile).toHaveBeenCalledWith(
+        reviewOutput,
+        approved,
+        3,
+        expect.objectContaining({ reviewMode: "repo" }),
+      );
+    });
+  });
+});
