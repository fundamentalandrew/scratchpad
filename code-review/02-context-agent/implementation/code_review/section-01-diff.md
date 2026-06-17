diff --git a/code-review/01-core-infrastructure/src/agents/schemas.test.ts b/code-review/01-core-infrastructure/src/agents/schemas.test.ts
index 07cf64c..0c09c02 100644
--- a/code-review/01-core-infrastructure/src/agents/schemas.test.ts
+++ b/code-review/01-core-infrastructure/src/agents/schemas.test.ts
@@ -5,6 +5,10 @@ import {
   ContextOutputSchema,
   AnalysisOutputSchema,
   ReviewOutputSchema,
+  ReferencedIssueSchema,
+  ReviewCommentSchema,
+  TechStackSchema,
+  PRFileSchema,
 } from "./schemas.js";
 
 describe("FileScoreSchema", () => {
@@ -158,6 +162,160 @@ describe("ReviewOutputSchema", () => {
   });
 });
 
+describe("ReferencedIssueSchema", () => {
+  it("validates a complete issue with all fields", () => {
+    const result = ReferencedIssueSchema.safeParse({
+      number: 42,
+      title: "Fix login bug",
+      state: "open",
+      body: "The login page crashes",
+      owner: "octocat",
+      repo: "hello-world",
+    });
+    expect(result.success).toBe(true);
+  });
+
+  it("validates a same-repo issue without owner/repo", () => {
+    const result = ReferencedIssueSchema.safeParse({
+      number: 10,
+      title: "Add tests",
+      state: "closed",
+    });
+    expect(result.success).toBe(true);
+  });
+
+  it("rejects missing required fields", () => {
+    expect(ReferencedIssueSchema.safeParse({ number: 1, title: "X" }).success).toBe(false);
+    expect(ReferencedIssueSchema.safeParse({ number: 1, state: "open" }).success).toBe(false);
+    expect(ReferencedIssueSchema.safeParse({ title: "X", state: "open" }).success).toBe(false);
+  });
+});
+
+describe("ReviewCommentSchema", () => {
+  it("validates a complete comment with all fields", () => {
+    const result = ReviewCommentSchema.safeParse({
+      id: 1001,
+      author: "reviewer",
+      body: "Looks good",
+      path: "src/index.ts",
+      line: 42,
+      createdAt: "2024-01-15T10:00:00Z",
+    });
+    expect(result.success).toBe(true);
+  });
+
+  it("validates a comment without optional path/line", () => {
+    const result = ReviewCommentSchema.safeParse({
+      id: 1002,
+      author: "reviewer",
+      body: "General comment",
+      createdAt: "2024-01-15T10:00:00Z",
+    });
+    expect(result.success).toBe(true);
+  });
+
+  it("requires id field", () => {
+    const result = ReviewCommentSchema.safeParse({
+      author: "reviewer",
+      body: "Missing id",
+      createdAt: "2024-01-15T10:00:00Z",
+    });
+    expect(result.success).toBe(false);
+  });
+});
+
+describe("TechStackSchema", () => {
+  it("validates with populated arrays and dependencies record", () => {
+    const result = TechStackSchema.safeParse({
+      languages: ["TypeScript"],
+      frameworks: ["React"],
+      dependencies: { react: "^18.0.0" },
+    });
+    expect(result.success).toBe(true);
+  });
+
+  it("validates with empty arrays and empty dependencies record", () => {
+    const result = TechStackSchema.safeParse({
+      languages: [],
+      frameworks: [],
+      dependencies: {},
+    });
+    expect(result.success).toBe(true);
+  });
+});
+
+describe("PRFileSchema (extended)", () => {
+  it("accepts previousPath for renamed files", () => {
+    const result = PRFileSchema.safeParse({
+      path: "new/path.ts",
+      status: "renamed",
+      additions: 0,
+      deletions: 0,
+      previousPath: "old/path.ts",
+    });
+    expect(result.success).toBe(true);
+  });
+
+  it("works without previousPath (backward compat)", () => {
+    const result = PRFileSchema.safeParse({
+      path: "src/index.ts",
+      status: "modified",
+      additions: 5,
+      deletions: 2,
+    });
+    expect(result.success).toBe(true);
+  });
+});
+
+describe("ContextOutputSchema (extended)", () => {
+  const baseData = {
+    mode: "pr" as const,
+    repository: { owner: "octocat", repo: "hello", defaultBranch: "main" },
+    domainRules: null,
+    architectureDoc: null,
+  };
+
+  const validPR = {
+    number: 1,
+    title: "Fix bug",
+    description: "Fixes #1",
+    author: "octocat",
+    baseBranch: "main",
+    headBranch: "fix-bug",
+    files: [{ path: "src/index.ts", status: "modified", additions: 5, deletions: 2 }],
+    diff: "diff --git ...",
+  };
+
+  it("accepts referencedIssues, comments, and techStack as optional fields", () => {
+    const result = ContextOutputSchema.safeParse({
+      ...baseData,
+      pr: validPR,
+      referencedIssues: [{ number: 1, title: "Bug", state: "open" }],
+      comments: [{ id: 1, author: "user", body: "Fix this", createdAt: "2024-01-01T00:00:00Z" }],
+      techStack: { languages: ["TypeScript"], frameworks: [], dependencies: {} },
+    });
+    expect(result.success).toBe(true);
+  });
+
+  it("validates without new optional fields (backward compat)", () => {
+    const result = ContextOutputSchema.safeParse({
+      ...baseData,
+      pr: validPR,
+    });
+    expect(result.success).toBe(true);
+  });
+
+  it("still requires either pr or repoFiles with new fields present", () => {
+    const result = ContextOutputSchema.safeParse({
+      ...baseData,
+      referencedIssues: [],
+      comments: [],
+      techStack: { languages: [], frameworks: [], dependencies: {} },
+    });
+    expect(result.success).toBe(false);
+  });
+});
+
 describe("JSON Schema generation", () => {
   it("all schemas produce valid JSON Schema", () => {
     const schemas = [
diff --git a/code-review/01-core-infrastructure/src/agents/schemas.ts b/code-review/01-core-infrastructure/src/agents/schemas.ts
index 7935132..4e373eb 100644
--- a/code-review/01-core-infrastructure/src/agents/schemas.ts
+++ b/code-review/01-core-infrastructure/src/agents/schemas.ts
@@ -19,12 +19,37 @@ export const RecommendationSchema = z.object({
   suggestion: z.string().optional(),
 });
 
-const PRFileSchema = z.object({
+export const ReferencedIssueSchema = z.object({
+  number: z.number(),
+  title: z.string(),
+  state: z.string(),
+  body: z.string().optional(),
+  owner: z.string().optional(),
+  repo: z.string().optional(),
+});
+
+export const ReviewCommentSchema = z.object({
+  id: z.number(),
+  author: z.string(),
+  body: z.string(),
+  path: z.string().optional(),
+  line: z.number().optional(),
+  createdAt: z.string(),
+});
+
+export const TechStackSchema = z.object({
+  languages: z.array(z.string()),
+  frameworks: z.array(z.string()),
+  dependencies: z.record(z.string(), z.string()),
+});
+
+export const PRFileSchema = z.object({
   path: z.string(),
   status: z.string(),
   additions: z.number(),
   deletions: z.number(),
   patch: z.string().nullable().optional(),
+  previousPath: z.string().optional(),
 });
 
 const PRSchema = z.object({
@@ -52,6 +77,9 @@ export const ContextOutputSchema = z
     repoFiles: z.array(z.object({ path: z.string() })).optional(),
     domainRules: z.string().nullable(),
     architectureDoc: z.string().nullable(),
+    referencedIssues: z.array(ReferencedIssueSchema).optional(),
+    comments: z.array(ReviewCommentSchema).optional(),
+    techStack: TechStackSchema.optional(),
   })
   .refine((data) => data.pr !== undefined || data.repoFiles !== undefined, {
     message: "Either pr or repoFiles must be provided",
@@ -79,3 +107,6 @@ export type Recommendation = z.infer<typeof RecommendationSchema>;
 export type ContextOutput = z.infer<typeof ContextOutputSchema>;
 export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
 export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;
+export type ReferencedIssue = z.infer<typeof ReferencedIssueSchema>;
+export type ReviewComment = z.infer<typeof ReviewCommentSchema>;
+export type TechStack = z.infer<typeof TechStackSchema>;
diff --git a/code-review/01-core-infrastructure/src/agents/stubs.ts b/code-review/01-core-infrastructure/src/agents/stubs.ts
index ff56e30..956fe55 100644
--- a/code-review/01-core-infrastructure/src/agents/stubs.ts
+++ b/code-review/01-core-infrastructure/src/agents/stubs.ts
@@ -28,6 +28,9 @@ export function createStubContextAgent(logger?: Logger): Agent<unknown, ContextO
         },
         domainRules: null,
         architectureDoc: null,
+        referencedIssues: [],
+        comments: [],
+        techStack: { languages: ["TypeScript"], frameworks: [], dependencies: {} },
       };
     },
   };
