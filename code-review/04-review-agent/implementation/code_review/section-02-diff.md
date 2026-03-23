diff --git a/code-review/04-review-agent/package.json b/code-review/04-review-agent/package.json
new file mode 100644
index 0000000..a790678
--- /dev/null
+++ b/code-review/04-review-agent/package.json
@@ -0,0 +1,18 @@
+{
+  "name": "review-agent",
+  "version": "0.1.0",
+  "type": "module",
+  "scripts": {
+    "build": "tsc",
+    "test": "vitest run",
+    "test:watch": "vitest"
+  },
+  "dependencies": {
+    "zod": "^4.3.6"
+  },
+  "devDependencies": {
+    "@types/node": "^25.5.0",
+    "typescript": "^5.9.3",
+    "vitest": "^4.1.0"
+  }
+}
diff --git a/code-review/04-review-agent/src/index.ts b/code-review/04-review-agent/src/index.ts
new file mode 100644
index 0000000..d3c97aa
--- /dev/null
+++ b/code-review/04-review-agent/src/index.ts
@@ -0,0 +1,11 @@
+export { createReviewAgent } from "./review-agent.js";
+export { buildPRSystemPrompt, buildRepoSystemPrompt, buildUserPrompt } from "./prompt-builder.js";
+export {
+  LLMReviewResponseSchema,
+  type LLMReviewResponse,
+  type ContextOutput,
+  type AnalysisOutput,
+  type ReviewOutput,
+  type FileScore,
+  type Recommendation,
+} from "./types.js";
diff --git a/code-review/04-review-agent/src/prompt-builder.ts b/code-review/04-review-agent/src/prompt-builder.ts
new file mode 100644
index 0000000..c5870d4
--- /dev/null
+++ b/code-review/04-review-agent/src/prompt-builder.ts
@@ -0,0 +1,12 @@
+/** Prompt builders. Implemented in section-03. */
+export function buildPRSystemPrompt(context: any): string {
+  throw new Error("Not implemented - see section-03");
+}
+
+export function buildRepoSystemPrompt(context: any): string {
+  throw new Error("Not implemented - see section-03");
+}
+
+export function buildUserPrompt(files: any[], context: any, summary: any): string {
+  throw new Error("Not implemented - see section-03");
+}
diff --git a/code-review/04-review-agent/src/review-agent.ts b/code-review/04-review-agent/src/review-agent.ts
new file mode 100644
index 0000000..74099b0
--- /dev/null
+++ b/code-review/04-review-agent/src/review-agent.ts
@@ -0,0 +1,4 @@
+/** Review agent factory. Implemented in section-04. */
+export function createReviewAgent(deps: any): any {
+  throw new Error("Not implemented - see section-04");
+}
diff --git a/code-review/04-review-agent/src/types.ts b/code-review/04-review-agent/src/types.ts
new file mode 100644
index 0000000..54380ca
--- /dev/null
+++ b/code-review/04-review-agent/src/types.ts
@@ -0,0 +1,33 @@
+import { z } from "zod";
+
+export const LLMReviewResponseSchema = z.object({
+  coreDecision: z.string(),
+  recommendations: z.array(
+    z.object({
+      file: z.string(),
+      category: z.string(),
+      message: z.string(),
+      suggestion: z.string().optional(),
+      humanCheckNeeded: z.string(),
+      estimatedReviewTime: z.enum(["5", "15", "30", "60"]),
+    }),
+  ),
+  focusAreas: z.array(z.string()),
+  summary: z.string(),
+});
+
+export type LLMReviewResponse = z.infer<typeof LLMReviewResponseSchema>;
+
+// Re-exports from core
+export type {
+  ContextOutput,
+  AnalysisOutput,
+  ReviewOutput,
+  FileScore,
+  Recommendation,
+} from "@core/agents/schemas.js";
+
+export {
+  ReviewOutputSchema,
+  AnalysisOutputSchema,
+} from "@core/agents/schemas.js";
diff --git a/code-review/04-review-agent/tests/integration/review-agent.test.ts b/code-review/04-review-agent/tests/integration/review-agent.test.ts
new file mode 100644
index 0000000..81d8eb2
--- /dev/null
+++ b/code-review/04-review-agent/tests/integration/review-agent.test.ts
@@ -0,0 +1,5 @@
+import { describe, it } from "vitest";
+
+describe("review agent integration", () => {
+  it.todo("implemented in section-06");
+});
diff --git a/code-review/04-review-agent/tests/unit/prompt-builder.test.ts b/code-review/04-review-agent/tests/unit/prompt-builder.test.ts
new file mode 100644
index 0000000..fc8f030
--- /dev/null
+++ b/code-review/04-review-agent/tests/unit/prompt-builder.test.ts
@@ -0,0 +1,5 @@
+import { describe, it } from "vitest";
+
+describe("prompt builder", () => {
+  it.todo("implemented in section-05");
+});
diff --git a/code-review/04-review-agent/tests/unit/review-agent.test.ts b/code-review/04-review-agent/tests/unit/review-agent.test.ts
new file mode 100644
index 0000000..9ecf781
--- /dev/null
+++ b/code-review/04-review-agent/tests/unit/review-agent.test.ts
@@ -0,0 +1,5 @@
+import { describe, it } from "vitest";
+
+describe("review agent", () => {
+  it.todo("implemented in section-05");
+});
diff --git a/code-review/04-review-agent/tests/unit/types.test.ts b/code-review/04-review-agent/tests/unit/types.test.ts
new file mode 100644
index 0000000..248c78d
--- /dev/null
+++ b/code-review/04-review-agent/tests/unit/types.test.ts
@@ -0,0 +1,39 @@
+import { describe, it, expect } from "vitest";
+import { LLMReviewResponseSchema } from "../../src/types.js";
+
+describe("LLMReviewResponseSchema", () => {
+  const validResponse = {
+    coreDecision: "Approve with minor suggestions",
+    recommendations: [
+      {
+        file: "src/index.ts",
+        category: "maintainability",
+        message: "Consider adding error handling",
+        suggestion: "Wrap in try/catch",
+        humanCheckNeeded: "Logic change in auth flow",
+        estimatedReviewTime: "15" as const,
+      },
+    ],
+    focusAreas: ["Error handling", "Input validation", "Testing"],
+    summary: "Overall the changes look good with minor suggestions.",
+  };
+
+  it("parses a valid response object", () => {
+    expect(() => LLMReviewResponseSchema.parse(validResponse)).not.toThrow();
+  });
+
+  it("rejects invalid estimatedReviewTime value", () => {
+    const invalid = {
+      ...validResponse,
+      recommendations: [
+        { ...validResponse.recommendations[0], estimatedReviewTime: "10" },
+      ],
+    };
+    expect(() => LLMReviewResponseSchema.parse(invalid)).toThrow();
+  });
+
+  it("requires all non-optional fields", () => {
+    const { coreDecision, ...missing } = validResponse;
+    expect(() => LLMReviewResponseSchema.parse(missing)).toThrow();
+  });
+});
diff --git a/code-review/04-review-agent/tsconfig.json b/code-review/04-review-agent/tsconfig.json
new file mode 100644
index 0000000..9e98aad
--- /dev/null
+++ b/code-review/04-review-agent/tsconfig.json
@@ -0,0 +1,20 @@
+{
+  "compilerOptions": {
+    "target": "ES2022",
+    "module": "Node16",
+    "moduleResolution": "Node16",
+    "strict": true,
+    "outDir": "./dist",
+    "rootDir": "./src",
+    "declaration": true,
+    "esModuleInterop": true,
+    "skipLibCheck": true,
+    "forceConsistentCasingInFileNames": true,
+    "resolveJsonModule": true,
+    "paths": {
+      "@core/*": ["../01-core-infrastructure/src/*"]
+    }
+  },
+  "include": ["src"],
+  "exclude": ["node_modules", "dist"]
+}
diff --git a/code-review/04-review-agent/vitest.config.ts b/code-review/04-review-agent/vitest.config.ts
new file mode 100644
index 0000000..ceacfec
--- /dev/null
+++ b/code-review/04-review-agent/vitest.config.ts
@@ -0,0 +1,15 @@
+import { defineConfig } from "vitest/config";
+import path from "path";
+
+export default defineConfig({
+  resolve: {
+    alias: {
+      "@core": path.resolve(__dirname, "../01-core-infrastructure/src"),
+    },
+  },
+  test: {
+    globals: false,
+    environment: "node",
+    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
+  },
+});
