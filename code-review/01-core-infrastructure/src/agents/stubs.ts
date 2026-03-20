import type { Logger } from "../utils/logger.js";
import type { Agent } from "../pipeline/types.js";
import type { ContextOutput, AnalysisOutput, ReviewOutput } from "./types.js";

export function createStubContextAgent(logger?: Logger): Agent<unknown, ContextOutput> {
  return {
    name: "StubContextAgent",
    idempotent: true,
    async run(_input: unknown): Promise<ContextOutput> {
      logger?.verbose("[STUB] StubContextAgent running");
      await new Promise((r) => setTimeout(r, 100));
      return {
        mode: "pr",
        repository: { owner: "test", repo: "test-repo", defaultBranch: "main" },
        pr: {
          number: 1,
          title: "Stub PR",
          description: "A stub pull request for testing",
          author: "test-user",
          baseBranch: "main",
          headBranch: "feature/stub",
          files: [
            { path: "src/index.ts", status: "modified", additions: 10, deletions: 2, patch: null },
            { path: "src/utils.ts", status: "added", additions: 25, deletions: 0, patch: null },
            { path: "README.md", status: "modified", additions: 3, deletions: 1, patch: null },
          ],
          diff: "diff --git a/src/index.ts b/src/index.ts\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1 +1 @@\n-old\n+new",
        },
        domainRules: null,
        architectureDoc: null,
        referencedIssues: [],
        comments: [],
        techStack: { languages: ["TypeScript"], frameworks: [], dependencies: {} },
      };
    },
  };
}

export function createStubAnalysisAgent(logger?: Logger): Agent<ContextOutput, AnalysisOutput> {
  return {
    name: "StubAnalysisAgent",
    idempotent: true,
    async run(_input: ContextOutput): Promise<AnalysisOutput> {
      logger?.verbose("[STUB] StubAnalysisAgent running");
      await new Promise((r) => setTimeout(r, 100));
      const scoredFiles = [
        { path: "src/index.ts", score: 6, riskLevel: "medium" as const, reasons: ["Core entry point modified"] },
        { path: "src/utils.ts", score: 3, riskLevel: "low" as const, reasons: ["New utility file"] },
        { path: "README.md", score: 4, riskLevel: "low" as const, reasons: ["Minor documentation update"] },
      ];
      return {
        scoredFiles,
        criticalFiles: scoredFiles.filter((f) => f.score >= 8),
        summary: {
          totalFiles: 3,
          criticalCount: 0,
          highCount: 0,
          categories: { documentation: 1, source: 2 },
        },
      };
    },
  };
}

export function createStubReviewAgent(logger?: Logger): Agent<AnalysisOutput, ReviewOutput> {
  return {
    name: "StubReviewAgent",
    idempotent: true,
    async run(_input: AnalysisOutput): Promise<ReviewOutput> {
      logger?.verbose("[STUB] StubReviewAgent running");
      await new Promise((r) => setTimeout(r, 100));
      return {
        recommendations: [
          {
            file: "src/index.ts",
            line: 5,
            severity: "medium",
            category: "maintainability",
            message: "Consider adding error handling",
            suggestion: "Wrap in try/catch block",
          },
          {
            file: "README.md",
            severity: "low",
            category: "documentation",
            message: "Update API section to match new changes",
          },
        ],
        coreDecision: "Approve with minor suggestions",
        focusAreas: ["Error handling in entry point", "Documentation accuracy"],
      };
    },
  };
}

export function createStubOutputAgent(logger?: Logger): Agent<ReviewOutput, ReviewOutput> {
  return {
    name: "StubOutputAgent",
    idempotent: false,
    async run(input: ReviewOutput): Promise<ReviewOutput> {
      logger?.verbose("[STUB] StubOutputAgent running");
      await new Promise((r) => setTimeout(r, 100));
      return input;
    },
  };
}
