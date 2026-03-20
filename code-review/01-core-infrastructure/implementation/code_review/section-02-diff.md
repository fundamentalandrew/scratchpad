diff --git a/code-review/01-core-infrastructure/src/agents/schemas.test.ts b/code-review/01-core-infrastructure/src/agents/schemas.test.ts
new file mode 100644
index 0000000..d6d0653
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/agents/schemas.test.ts
@@ -0,0 +1,169 @@
+import { describe, it, expect } from "vitest";
+import {
+  FileScoreSchema,
+  RecommendationSchema,
+  ContextOutputSchema,
+  AnalysisOutputSchema,
+  ReviewOutputSchema,
+} from "./schemas.js";
+
+describe("FileScoreSchema", () => {
+  it("accepts valid data with all fields populated", () => {
+    const result = FileScoreSchema.safeParse({
+      path: "src/index.ts",
+      score: 7,
+      riskLevel: "high",
+      reasons: ["complex logic", "no tests"],
+    });
+    expect(result.success).toBe(true);
+  });
+
+  it("rejects score outside 0-10 range", () => {
+    const tooHigh = FileScoreSchema.safeParse({
+      path: "src/index.ts",
+      score: 11,
+      riskLevel: "low",
+      reasons: [],
+    });
+    expect(tooHigh.success).toBe(false);
+
+    const tooLow = FileScoreSchema.safeParse({
+      path: "src/index.ts",
+      score: -1,
+      riskLevel: "low",
+      reasons: [],
+    });
+    expect(tooLow.success).toBe(false);
+  });
+
+  it("rejects invalid RiskLevel value", () => {
+    const result = FileScoreSchema.safeParse({
+      path: "src/index.ts",
+      score: 5,
+      riskLevel: "extreme",
+      reasons: [],
+    });
+    expect(result.success).toBe(false);
+  });
+});
+
+describe("RecommendationSchema", () => {
+  it("accepts minimal valid data without optional fields", () => {
+    const result = RecommendationSchema.safeParse({
+      file: "src/index.ts",
+      severity: "medium",
+      category: "logic",
+      message: "Potential null reference",
+    });
+    expect(result.success).toBe(true);
+  });
+
+  it("accepts full data with line and suggestion", () => {
+    const result = RecommendationSchema.safeParse({
+      file: "src/index.ts",
+      line: 42,
+      severity: "high",
+      category: "security",
+      message: "SQL injection risk",
+      suggestion: "Use parameterized queries",
+    });
+    expect(result.success).toBe(true);
+  });
+});
+
+describe("ContextOutputSchema", () => {
+  const baseData = {
+    mode: "pr" as const,
+    repository: { owner: "octocat", repo: "hello", defaultBranch: "main" },
+    domainRules: null,
+    architectureDoc: null,
+  };
+
+  it("accepts valid PR-mode data", () => {
+    const result = ContextOutputSchema.safeParse({
+      ...baseData,
+      mode: "pr",
+      pr: {
+        number: 1,
+        title: "Fix bug",
+        description: "Fixes #1",
+        author: "octocat",
+        baseBranch: "main",
+        headBranch: "fix-bug",
+        files: [
+          { path: "src/index.ts", status: "modified", additions: 5, deletions: 2, patch: "@@ -1,3 +1,5 @@" },
+        ],
+        diff: "diff --git ...",
+      },
+    });
+    expect(result.success).toBe(true);
+  });
+
+  it("accepts valid repo-mode data with repoFiles", () => {
+    const result = ContextOutputSchema.safeParse({
+      ...baseData,
+      mode: "repo",
+      repoFiles: [{ path: "src/index.ts" }],
+    });
+    expect(result.success).toBe(true);
+  });
+
+  it("rejects data with both pr.files and repoFiles missing", () => {
+    const result = ContextOutputSchema.safeParse({
+      ...baseData,
+      mode: "pr",
+    });
+    expect(result.success).toBe(false);
+  });
+});
+
+describe("AnalysisOutputSchema", () => {
+  it("accepts valid data with summary counts", () => {
+    const result = AnalysisOutputSchema.safeParse({
+      scoredFiles: [
+        { path: "src/a.ts", score: 8, riskLevel: "critical", reasons: ["complex"] },
+      ],
+      criticalFiles: [
+        { path: "src/a.ts", score: 8, riskLevel: "critical", reasons: ["complex"] },
+      ],
+      summary: {
+        totalFiles: 1,
+        criticalCount: 1,
+        highCount: 0,
+        categories: { complexity: 1 },
+      },
+    });
+    expect(result.success).toBe(true);
+  });
+});
+
+describe("ReviewOutputSchema", () => {
+  it("accepts valid data with recommendations array", () => {
+    const result = ReviewOutputSchema.safeParse({
+      recommendations: [
+        { file: "src/a.ts", severity: "high", category: "security", message: "XSS risk" },
+      ],
+      coreDecision: "Needs changes before merge",
+      focusAreas: ["input validation", "error handling"],
+    });
+    expect(result.success).toBe(true);
+  });
+});
+
+describe("JSON Schema generation", () => {
+  it("all schemas produce valid JSON Schema", () => {
+    const schemas = [
+      FileScoreSchema,
+      RecommendationSchema,
+      ContextOutputSchema,
+      AnalysisOutputSchema,
+      ReviewOutputSchema,
+    ];
+    for (const schema of schemas) {
+      const jsonSchema = schema.toJSONSchema();
+      expect(jsonSchema).toBeDefined();
+      expect(typeof jsonSchema).toBe("object");
+      expect(jsonSchema).toHaveProperty("type");
+    }
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/agents/schemas.ts b/code-review/01-core-infrastructure/src/agents/schemas.ts
new file mode 100644
index 0000000..97cf26a
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/agents/schemas.ts
@@ -0,0 +1,80 @@
+import { z } from "zod";
+
+export const RiskLevelSchema = z.enum(["critical", "high", "medium", "low"]);
+
+export const FileScoreSchema = z.object({
+  path: z.string(),
+  score: z.number().min(0).max(10),
+  riskLevel: RiskLevelSchema,
+  reasons: z.array(z.string()),
+});
+
+export const RecommendationSchema = z.object({
+  file: z.string(),
+  line: z.number().optional(),
+  severity: RiskLevelSchema,
+  category: z.string(),
+  message: z.string(),
+  suggestion: z.string().optional(),
+});
+
+const PRFileSchema = z.object({
+  path: z.string(),
+  status: z.string(),
+  additions: z.number(),
+  deletions: z.number(),
+  patch: z.string().nullable().optional(),
+});
+
+const PRSchema = z.object({
+  number: z.number(),
+  title: z.string(),
+  description: z.string(),
+  author: z.string(),
+  baseBranch: z.string(),
+  headBranch: z.string(),
+  files: z.array(PRFileSchema),
+  diff: z.string(),
+});
+
+const RepositorySchema = z.object({
+  owner: z.string(),
+  repo: z.string(),
+  defaultBranch: z.string(),
+});
+
+export const ContextOutputSchema = z
+  .object({
+    mode: z.enum(["pr", "repo"]),
+    repository: RepositorySchema,
+    pr: PRSchema.optional(),
+    repoFiles: z.array(z.object({ path: z.string() })).optional(),
+    domainRules: z.string().nullable(),
+    architectureDoc: z.string().nullable(),
+  })
+  .refine((data) => data.pr !== undefined || data.repoFiles !== undefined, {
+    message: "Either pr or repoFiles must be provided",
+  });
+
+export const AnalysisOutputSchema = z.object({
+  scoredFiles: z.array(FileScoreSchema),
+  criticalFiles: z.array(FileScoreSchema),
+  summary: z.object({
+    totalFiles: z.number(),
+    criticalCount: z.number(),
+    highCount: z.number(),
+    categories: z.record(z.string(), z.number()),
+  }),
+});
+
+export const ReviewOutputSchema = z.object({
+  recommendations: z.array(RecommendationSchema),
+  coreDecision: z.string(),
+  focusAreas: z.array(z.string()),
+});
+
+export type FileScore = z.infer<typeof FileScoreSchema>;
+export type Recommendation = z.infer<typeof RecommendationSchema>;
+export type ContextOutput = z.infer<typeof ContextOutputSchema>;
+export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
+export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;
diff --git a/code-review/01-core-infrastructure/src/agents/types.ts b/code-review/01-core-infrastructure/src/agents/types.ts
new file mode 100644
index 0000000..aa3b57a
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/agents/types.ts
@@ -0,0 +1,46 @@
+import type { ReviewMode, FileScore, Recommendation } from "../types/common.js";
+
+export interface ContextOutput {
+  mode: ReviewMode;
+  repository: {
+    owner: string;
+    repo: string;
+    defaultBranch: string;
+  };
+  pr?: {
+    number: number;
+    title: string;
+    description: string;
+    author: string;
+    baseBranch: string;
+    headBranch: string;
+    files: Array<{
+      path: string;
+      status: string;
+      additions: number;
+      deletions: number;
+      patch?: string | null;
+    }>;
+    diff: string;
+  };
+  repoFiles?: Array<{ path: string }>;
+  domainRules: string | null;
+  architectureDoc: string | null;
+}
+
+export interface AnalysisOutput {
+  scoredFiles: FileScore[];
+  criticalFiles: FileScore[];
+  summary: {
+    totalFiles: number;
+    criticalCount: number;
+    highCount: number;
+    categories: Record<string, number>;
+  };
+}
+
+export interface ReviewOutput {
+  recommendations: Recommendation[];
+  coreDecision: string;
+  focusAreas: string[];
+}
diff --git a/code-review/01-core-infrastructure/src/types/common.ts b/code-review/01-core-infrastructure/src/types/common.ts
new file mode 100644
index 0000000..1e28136
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/types/common.ts
@@ -0,0 +1,18 @@
+export type ReviewMode = "pr" | "repo";
+export type RiskLevel = "critical" | "high" | "medium" | "low";
+
+export interface FileScore {
+  path: string;
+  score: number; // 0-10
+  riskLevel: RiskLevel;
+  reasons: string[];
+}
+
+export interface Recommendation {
+  file: string;
+  line?: number;
+  severity: RiskLevel;
+  category: string;
+  message: string;
+  suggestion?: string;
+}
diff --git a/code-review/01-core-infrastructure/src/utils/errors.test.ts b/code-review/01-core-infrastructure/src/utils/errors.test.ts
new file mode 100644
index 0000000..b71997c
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/utils/errors.test.ts
@@ -0,0 +1,79 @@
+import { describe, it, expect } from "vitest";
+import {
+  ConfigError,
+  AuthError,
+  PipelineError,
+  GitHubAPIError,
+  ClaudeAPIError,
+  URLParseError,
+} from "./errors.js";
+
+describe("ConfigError", () => {
+  it("has user-friendly message", () => {
+    const err = new ConfigError("Missing required field: model");
+    expect(err).toBeInstanceOf(Error);
+    expect(err.name).toBe("ConfigError");
+    expect(err.message).toContain("Missing required field");
+  });
+});
+
+describe("PipelineError", () => {
+  it("includes agent name and attempt count", () => {
+    const cause = new Error("timeout");
+    const err = new PipelineError("ContextAgent", 3, cause);
+    expect(err).toBeInstanceOf(Error);
+    expect(err.name).toBe("PipelineError");
+    expect(err.agentName).toBe("ContextAgent");
+    expect(err.attempts).toBe(3);
+    expect(err.message).toContain("ContextAgent");
+    expect(err.message).toContain("3");
+    expect(err.message).toContain("timeout");
+  });
+});
+
+describe("AuthError", () => {
+  it("suggests remediation steps in message", () => {
+    const err = new AuthError("GitHub token not found");
+    expect(err).toBeInstanceOf(Error);
+    expect(err.name).toBe("AuthError");
+    expect(err.message).toContain("GitHub token not found");
+  });
+});
+
+describe("URLParseError", () => {
+  it("includes expected format", () => {
+    const err = new URLParseError("Invalid URL: foo/bar");
+    expect(err).toBeInstanceOf(Error);
+    expect(err.name).toBe("URLParseError");
+    expect(err.message).toContain("Invalid URL");
+    expect(err.message).toContain("https://github.com/owner/repo/pull/123");
+  });
+});
+
+describe("ClaudeAPIError", () => {
+  it("includes retryable flag", () => {
+    const retryable = new ClaudeAPIError("Validation failed", true);
+    expect(retryable).toBeInstanceOf(Error);
+    expect(retryable.name).toBe("ClaudeAPIError");
+    expect(retryable.retryable).toBe(true);
+
+    const notRetryable = new ClaudeAPIError("Content refused", false);
+    expect(notRetryable.retryable).toBe(false);
+  });
+});
+
+describe("All error types extend Error", () => {
+  it("proper prototype chain for all errors", () => {
+    const errors = [
+      new ConfigError("test"),
+      new AuthError("test"),
+      new PipelineError("agent", 1, new Error("cause")),
+      new GitHubAPIError("test"),
+      new ClaudeAPIError("test", false),
+      new URLParseError("test"),
+    ];
+    for (const err of errors) {
+      expect(err).toBeInstanceOf(Error);
+    }
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/utils/errors.ts b/code-review/01-core-infrastructure/src/utils/errors.ts
new file mode 100644
index 0000000..a2f8f08
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/utils/errors.ts
@@ -0,0 +1,56 @@
+export class ConfigError extends Error {
+  constructor(message: string) {
+    super(message);
+    this.name = "ConfigError";
+    Object.setPrototypeOf(this, ConfigError.prototype);
+  }
+}
+
+export class AuthError extends Error {
+  constructor(message: string) {
+    super(message);
+    this.name = "AuthError";
+    Object.setPrototypeOf(this, AuthError.prototype);
+  }
+}
+
+export class PipelineError extends Error {
+  public readonly agentName: string;
+  public readonly attempts: number;
+
+  constructor(agentName: string, attempts: number, cause: Error) {
+    super(`Agent '${agentName}' failed after ${attempts} attempt(s): ${cause.message}`);
+    this.name = "PipelineError";
+    this.agentName = agentName;
+    this.attempts = attempts;
+    this.cause = cause;
+    Object.setPrototypeOf(this, PipelineError.prototype);
+  }
+}
+
+export class GitHubAPIError extends Error {
+  constructor(message: string) {
+    super(message);
+    this.name = "GitHubAPIError";
+    Object.setPrototypeOf(this, GitHubAPIError.prototype);
+  }
+}
+
+export class ClaudeAPIError extends Error {
+  public readonly retryable: boolean;
+
+  constructor(message: string, retryable: boolean) {
+    super(message);
+    this.name = "ClaudeAPIError";
+    this.retryable = retryable;
+    Object.setPrototypeOf(this, ClaudeAPIError.prototype);
+  }
+}
+
+export class URLParseError extends Error {
+  constructor(message: string) {
+    super(`${message}. Expected: https://github.com/owner/repo/pull/123`);
+    this.name = "URLParseError";
+    Object.setPrototypeOf(this, URLParseError.prototype);
+  }
+}
