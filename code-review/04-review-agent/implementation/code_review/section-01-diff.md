diff --git a/code-review/01-core-infrastructure/src/agents/schemas.review.test.ts b/code-review/01-core-infrastructure/src/agents/schemas.review.test.ts
new file mode 100644
index 0000000..4cd20aa
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/agents/schemas.review.test.ts
@@ -0,0 +1,126 @@
+import { describe, it, expect } from "vitest";
+import {
+  RecommendationSchema,
+  IgnoreGroupSchema,
+  ReviewOutputSchema,
+  AnalysisOutputSchema,
+  ContextOutputSchema,
+} from "./schemas.js";
+import { createStubReviewAgent } from "./stubs.js";
+
+describe("extended RecommendationSchema", () => {
+  it("accepts optional humanCheckNeeded, estimatedReviewTime, score", () => {
+    const result = RecommendationSchema.parse({
+      file: "src/index.ts",
+      severity: "medium",
+      category: "maintainability",
+      message: "Consider refactoring",
+      humanCheckNeeded: "Logic change in auth flow",
+      estimatedReviewTime: "15",
+      score: 7.5,
+    });
+    expect(result.humanCheckNeeded).toBe("Logic change in auth flow");
+    expect(result.estimatedReviewTime).toBe("15");
+    expect(result.score).toBe(7.5);
+  });
+
+  it("validates without new optional fields (backward compat)", () => {
+    expect(() =>
+      RecommendationSchema.parse({
+        file: "src/index.ts",
+        severity: "low",
+        category: "docs",
+        message: "Update readme",
+      }),
+    ).not.toThrow();
+  });
+
+  it("estimatedReviewTime only accepts enum values '5', '15', '30', '60'", () => {
+    const base = { file: "a.ts", severity: "low", category: "x", message: "m" };
+    expect(() => RecommendationSchema.parse({ ...base, estimatedReviewTime: "5" })).not.toThrow();
+    expect(() => RecommendationSchema.parse({ ...base, estimatedReviewTime: "10" })).toThrow();
+    expect(() => RecommendationSchema.parse({ ...base, estimatedReviewTime: "999" })).toThrow();
+  });
+});
+
+describe("IgnoreGroupSchema", () => {
+  it("validates label, count, description", () => {
+    const result = IgnoreGroupSchema.parse({
+      label: "tests/*",
+      count: 5,
+      description: "Standard mock updates",
+    });
+    expect(result.label).toBe("tests/*");
+    expect(result.count).toBe(5);
+    expect(result.description).toBe("Standard mock updates");
+  });
+
+  it("fails when missing required fields", () => {
+    expect(() => IgnoreGroupSchema.parse({ label: "tests/*", count: 5 })).toThrow();
+    expect(() => IgnoreGroupSchema.parse({ label: "tests/*", description: "x" })).toThrow();
+    expect(() => IgnoreGroupSchema.parse({ count: 5, description: "x" })).toThrow();
+  });
+});
+
+describe("extended ReviewOutputSchema", () => {
+  it("accepts safeToIgnore and summary fields", () => {
+    const result = ReviewOutputSchema.parse({
+      recommendations: [
+        { file: "a.ts", severity: "low", category: "style", message: "nit" },
+      ],
+      coreDecision: "Approve",
+      focusAreas: ["Error handling"],
+      safeToIgnore: [{ label: "tests/", count: 3, description: "Test boilerplate" }],
+      summary: "Looks good overall.",
+    });
+    expect(result.safeToIgnore).toHaveLength(1);
+    expect(result.summary).toBe("Looks good overall.");
+  });
+});
+
+describe("extended AnalysisOutputSchema", () => {
+  it("accepts optional contextPassthrough field", () => {
+    const result = AnalysisOutputSchema.parse({
+      scoredFiles: [{ path: "a.ts", score: 5, riskLevel: "medium", reasons: ["test"] }],
+      criticalFiles: [],
+      summary: { totalFiles: 1, criticalCount: 0, highCount: 0, categories: { source: 1 } },
+      contextPassthrough: {
+        mode: "pr",
+        repository: { owner: "test", repo: "test-repo", defaultBranch: "main" },
+        pr: {
+          number: 1,
+          title: "Test PR",
+          description: "desc",
+          author: "user",
+          baseBranch: "main",
+          headBranch: "feat",
+          files: [],
+          diff: "",
+        },
+        domainRules: null,
+        architectureDoc: null,
+      },
+    });
+    expect(result.contextPassthrough).toBeDefined();
+  });
+
+  it("validates without contextPassthrough (backward compat)", () => {
+    expect(() =>
+      AnalysisOutputSchema.parse({
+        scoredFiles: [],
+        criticalFiles: [],
+        summary: { totalFiles: 0, criticalCount: 0, highCount: 0, categories: {} },
+      }),
+    ).not.toThrow();
+  });
+});
+
+describe("updated stub review agent", () => {
+  it("output conforms to extended ReviewOutputSchema", async () => {
+    const agent = createStubReviewAgent();
+    const result = await agent.run({} as any);
+    const parsed = ReviewOutputSchema.parse(result);
+    expect(parsed.safeToIgnore).toBeInstanceOf(Array);
+    expect(parsed.summary).toBeTypeOf("string");
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/agents/schemas.test.ts b/code-review/01-core-infrastructure/src/agents/schemas.test.ts
index bdbfef3..d156ecd 100644
--- a/code-review/01-core-infrastructure/src/agents/schemas.test.ts
+++ b/code-review/01-core-infrastructure/src/agents/schemas.test.ts
@@ -157,6 +157,8 @@ describe("ReviewOutputSchema", () => {
       ],
       coreDecision: "Needs changes before merge",
       focusAreas: ["input validation", "error handling"],
+      safeToIgnore: [],
+      summary: "Needs changes due to XSS risk.",
     });
     expect(result.success).toBe(true);
   });
diff --git a/code-review/01-core-infrastructure/src/agents/schemas.ts b/code-review/01-core-infrastructure/src/agents/schemas.ts
index 4e373eb..5fea845 100644
--- a/code-review/01-core-infrastructure/src/agents/schemas.ts
+++ b/code-review/01-core-infrastructure/src/agents/schemas.ts
@@ -17,6 +17,15 @@ export const RecommendationSchema = z.object({
   category: z.string(),
   message: z.string(),
   suggestion: z.string().optional(),
+  humanCheckNeeded: z.string().optional(),
+  estimatedReviewTime: z.enum(["5", "15", "30", "60"]).optional(),
+  score: z.number().min(0).max(10).optional(),
+});
+
+export const IgnoreGroupSchema = z.object({
+  label: z.string(),
+  count: z.number(),
+  description: z.string(),
 });
 
 export const ReferencedIssueSchema = z.object({
@@ -94,16 +103,20 @@ export const AnalysisOutputSchema = z.object({
     highCount: z.number(),
     categories: z.record(z.string(), z.number()),
   }),
+  contextPassthrough: ContextOutputSchema.optional(),
 });
 
 export const ReviewOutputSchema = z.object({
   recommendations: z.array(RecommendationSchema),
   coreDecision: z.string(),
   focusAreas: z.array(z.string()),
+  safeToIgnore: z.array(IgnoreGroupSchema),
+  summary: z.string(),
 });
 
 export type FileScore = z.infer<typeof FileScoreSchema>;
 export type Recommendation = z.infer<typeof RecommendationSchema>;
+export type IgnoreGroup = z.infer<typeof IgnoreGroupSchema>;
 export type ContextOutput = z.infer<typeof ContextOutputSchema>;
 export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
 export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;
diff --git a/code-review/01-core-infrastructure/src/agents/stubs.ts b/code-review/01-core-infrastructure/src/agents/stubs.ts
index 956fe55..37f453b 100644
--- a/code-review/01-core-infrastructure/src/agents/stubs.ts
+++ b/code-review/01-core-infrastructure/src/agents/stubs.ts
@@ -88,6 +88,10 @@ export function createStubReviewAgent(logger?: Logger): Agent<AnalysisOutput, Re
         ],
         coreDecision: "Approve with minor suggestions",
         focusAreas: ["Error handling in entry point", "Documentation accuracy"],
+        safeToIgnore: [
+          { label: "tests/", count: 0, description: "No test files in stub" },
+        ],
+        summary: "Stub review: minor suggestions for error handling and documentation.",
       };
     },
   };
diff --git a/code-review/01-core-infrastructure/src/agents/types.ts b/code-review/01-core-infrastructure/src/agents/types.ts
index 70b1a2f..cb9bdc9 100644
--- a/code-review/01-core-infrastructure/src/agents/types.ts
+++ b/code-review/01-core-infrastructure/src/agents/types.ts
@@ -3,4 +3,5 @@ export type {
   ContextOutput,
   AnalysisOutput,
   ReviewOutput,
+  IgnoreGroup,
 } from "./schemas.js";
