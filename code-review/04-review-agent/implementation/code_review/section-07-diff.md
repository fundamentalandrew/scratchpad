diff --git a/code-review/03-analysis-agent/src/analysis-agent.ts b/code-review/03-analysis-agent/src/analysis-agent.ts
index 318b4c0..0a4e8c0 100644
--- a/code-review/03-analysis-agent/src/analysis-agent.ts
+++ b/code-review/03-analysis-agent/src/analysis-agent.ts
@@ -21,11 +21,12 @@ function mapRiskLevel(score: number): RiskLevel {
   return "low";
 }
 
-function emptyOutput(): AnalysisOutput {
+function emptyOutput(input?: ContextOutput): AnalysisOutput {
   return {
     scoredFiles: [],
     criticalFiles: [],
     summary: { totalFiles: 0, criticalCount: 0, highCount: 0, categories: {} },
+    ...(input ? { contextPassthrough: input } : {}),
   };
 }
 
@@ -40,12 +41,12 @@ export function createAnalysisAgent(deps: {
     async run(input: ContextOutput): Promise<AnalysisOutput> {
       // Step 1: Extract file list — PR mode only
       if (!input.pr) {
-        return emptyOutput();
+        return emptyOutput(input);
       }
 
       const prFiles = input.pr.files;
       if (prFiles.length === 0) {
-        return emptyOutput();
+        return emptyOutput(input);
       }
 
       // Step 2: Triage files
@@ -201,6 +202,7 @@ export function createAnalysisAgent(deps: {
           highCount: scoredFiles.filter((f) => f.riskLevel === "high").length,
           categories,
         },
+        contextPassthrough: input,
       };
     },
   };
diff --git a/code-review/03-analysis-agent/tests/integration/analysis-agent.test.ts b/code-review/03-analysis-agent/tests/integration/analysis-agent.test.ts
index cfccbac..7e3593f 100644
--- a/code-review/03-analysis-agent/tests/integration/analysis-agent.test.ts
+++ b/code-review/03-analysis-agent/tests/integration/analysis-agent.test.ts
@@ -480,6 +480,37 @@ describe("Analysis Agent Integration", () => {
     });
   });
 
+  describe("Context Passthrough", () => {
+    it("analysis agent output includes contextPassthrough matching input ContextOutput", async () => {
+      const mockClaude = buildMockClaudeClient([
+        { file: "src/handler.py", score: 5, changeType: "logic-change" },
+      ]);
+
+      const input = buildContextOutput([
+        { path: "src/handler.py", status: "modified" },
+      ]);
+
+      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
+      const result = await agent.run(input);
+
+      expect(result.contextPassthrough).toBeDefined();
+      expect(result.contextPassthrough!.mode).toBe(input.mode);
+      expect(result.contextPassthrough!.pr!.title).toBe(input.pr.title);
+      expect(() => AnalysisOutputSchema.parse(result)).not.toThrow();
+    });
+
+    it("contextPassthrough is set even when PR has zero files (empty output path)", async () => {
+      const mockClaude = buildMockClaudeClient([]);
+      const input = buildContextOutput([]);
+
+      const agent = createAnalysisAgent({ claude: mockClaude as any, config: defaultConfig() });
+      const result = await agent.run(input);
+
+      expect(result.contextPassthrough).toBeDefined();
+      expect(result.contextPassthrough).toEqual(input);
+    });
+  });
+
   describe("Configuration", () => {
     it("default analysis ignore patterns applied", async () => {
       const mockClaude = buildMockClaudeClient([]);
diff --git a/code-review/03-analysis-agent/tests/unit/analysis-agent-orchestration.test.ts b/code-review/03-analysis-agent/tests/unit/analysis-agent-orchestration.test.ts
index a7a6226..93114c6 100644
--- a/code-review/03-analysis-agent/tests/unit/analysis-agent-orchestration.test.ts
+++ b/code-review/03-analysis-agent/tests/unit/analysis-agent-orchestration.test.ts
@@ -508,6 +508,44 @@ describe("analysis-agent orchestration", () => {
     expect(result.summary.totalFiles).toBe(0);
   });
 
+  // --- Context Passthrough ---
+
+  it("analysis agent output includes contextPassthrough with the input ContextOutput", async () => {
+    const input = makeInput([{ path: "src/index.ts" }]);
+    const prFiles = input.pr!.files;
+    mockFilterChangedFiles.mockReturnValue({
+      passed: prFiles,
+      ignored: [],
+      ignoredScores: [],
+    });
+    mockBuildBatches.mockReturnValue([{
+      files: [{ path: "src/index.ts", diff: "diff", status: "modified" }],
+      estimatedTokens: 100,
+      isLargeFile: false,
+    }]);
+    mockScoreFiles.mockResolvedValue([{
+      file: "src/index.ts",
+      score: 5,
+      reason: "Logic change",
+      changeType: "logic-change",
+    }]);
+
+    const agent = createAnalysisAgent(makeDeps());
+    const result = await agent.run(input);
+
+    expect(result.contextPassthrough).toEqual(input);
+  });
+
+  it("contextPassthrough is set even when PR has zero files (empty output path)", async () => {
+    const input = makeInput([]);
+    mockFilterChangedFiles.mockReturnValue({ passed: [], ignored: [], ignoredScores: [] });
+
+    const agent = createAnalysisAgent(makeDeps());
+    const result = await agent.run(input);
+
+    expect(result.contextPassthrough).toEqual(input);
+  });
+
   // --- Edge: no pr in repo mode ---
 
   it("returns empty output when pr is undefined (repo mode)", async () => {
