diff --git a/code-review/01-core-infrastructure/src/agents/stubs.test.ts b/code-review/01-core-infrastructure/src/agents/stubs.test.ts
new file mode 100644
index 0000000..8bbf8d8
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/agents/stubs.test.ts
@@ -0,0 +1,96 @@
+import { describe, it, expect, vi } from "vitest";
+import {
+  createStubContextAgent,
+  createStubAnalysisAgent,
+  createStubReviewAgent,
+  createStubOutputAgent,
+} from "./stubs.js";
+import {
+  ContextOutputSchema,
+  AnalysisOutputSchema,
+  ReviewOutputSchema,
+} from "./schemas.js";
+import { runPipeline } from "../pipeline/runner.js";
+import type { Logger } from "../utils/logger.js";
+
+function createMockLogger(): Logger {
+  return {
+    info: vi.fn(),
+    verbose: vi.fn(),
+    error: vi.fn(),
+    warn: vi.fn(),
+    success: vi.fn(),
+  };
+}
+
+describe("stub agents", () => {
+  it("each stub agent returns valid typed output matching its contract", async () => {
+    const ctx = createStubContextAgent();
+    const analysis = createStubAnalysisAgent();
+    const review = createStubReviewAgent();
+    const output = createStubOutputAgent();
+
+    const ctxResult = await ctx.run({});
+    expect(ctxResult.mode).toBe("pr");
+    expect(ctxResult.repository.owner).toBe("test");
+
+    const analysisResult = await analysis.run(ctxResult);
+    expect(analysisResult.scoredFiles.length).toBeGreaterThan(0);
+
+    const reviewResult = await review.run(analysisResult);
+    expect(reviewResult.recommendations.length).toBeGreaterThan(0);
+    expect(reviewResult.coreDecision).toBeTypeOf("string");
+
+    const outputResult = await output.run(reviewResult);
+    expect(outputResult).toEqual(reviewResult);
+  });
+
+  it("stub output passes Zod schema validation", async () => {
+    const ctx = createStubContextAgent();
+    const analysis = createStubAnalysisAgent();
+    const review = createStubReviewAgent();
+
+    const ctxResult = await ctx.run({});
+    expect(() => ContextOutputSchema.parse(ctxResult)).not.toThrow();
+
+    const analysisResult = await analysis.run(ctxResult);
+    expect(() => AnalysisOutputSchema.parse(analysisResult)).not.toThrow();
+
+    const reviewResult = await review.run(analysisResult);
+    expect(() => ReviewOutputSchema.parse(reviewResult)).not.toThrow();
+  });
+
+  it("stubs log their stub status in verbose mode", async () => {
+    const logger = createMockLogger();
+
+    const ctx = createStubContextAgent(logger);
+    const analysis = createStubAnalysisAgent(logger);
+    const review = createStubReviewAgent(logger);
+    const output = createStubOutputAgent(logger);
+
+    await ctx.run({});
+    await analysis.run({} as any);
+    await review.run({} as any);
+    await output.run({} as any);
+
+    expect(logger.verbose).toHaveBeenCalledTimes(4);
+    for (const call of (logger.verbose as ReturnType<typeof vi.fn>).mock.calls) {
+      expect(call[0].toLowerCase()).toContain("stub");
+    }
+  });
+
+  it("full pipeline with all stubs runs end-to-end without errors", async () => {
+    const agents = [
+      createStubContextAgent(),
+      createStubAnalysisAgent(),
+      createStubReviewAgent(),
+      createStubOutputAgent(),
+    ];
+
+    const result = await runPipeline(agents, {});
+
+    expect(result.stages).toHaveLength(4);
+    expect(result.stages.every((s) => s.success)).toBe(true);
+    expect(result.output).toBeDefined();
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/agents/stubs.ts b/code-review/01-core-infrastructure/src/agents/stubs.ts
new file mode 100644
index 0000000..7709ce4
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/agents/stubs.ts
@@ -0,0 +1,103 @@
+import type { Logger } from "../utils/logger.js";
+import type { Agent } from "../pipeline/types.js";
+import type { ContextOutput, AnalysisOutput, ReviewOutput } from "./types.js";
+
+export function createStubContextAgent(logger?: Logger): Agent<unknown, ContextOutput> {
+  return {
+    name: "StubContextAgent",
+    idempotent: true,
+    async run(_input: unknown): Promise<ContextOutput> {
+      logger?.verbose("[STUB] StubContextAgent running");
+      await new Promise((r) => setTimeout(r, 100));
+      return {
+        mode: "pr",
+        repository: { owner: "test", repo: "test-repo", defaultBranch: "main" },
+        pr: {
+          number: 1,
+          title: "Stub PR",
+          description: "A stub pull request for testing",
+          author: "test-user",
+          baseBranch: "main",
+          headBranch: "feature/stub",
+          files: [
+            { path: "src/index.ts", status: "modified", additions: 10, deletions: 2, patch: null },
+            { path: "src/utils.ts", status: "added", additions: 25, deletions: 0, patch: null },
+            { path: "README.md", status: "modified", additions: 3, deletions: 1, patch: null },
+          ],
+          diff: "diff --git a/src/index.ts b/src/index.ts\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1 +1 @@\n-old\n+new",
+        },
+        domainRules: null,
+        architectureDoc: null,
+      };
+    },
+  };
+}
+
+export function createStubAnalysisAgent(logger?: Logger): Agent<ContextOutput, AnalysisOutput> {
+  return {
+    name: "StubAnalysisAgent",
+    idempotent: true,
+    async run(_input: ContextOutput): Promise<AnalysisOutput> {
+      logger?.verbose("[STUB] StubAnalysisAgent running");
+      await new Promise((r) => setTimeout(r, 100));
+      const scoredFiles = [
+        { path: "src/index.ts", score: 6, riskLevel: "medium" as const, reasons: ["Core entry point modified"] },
+        { path: "src/utils.ts", score: 3, riskLevel: "low" as const, reasons: ["New utility file"] },
+        { path: "README.md", score: 9, riskLevel: "critical" as const, reasons: ["Documentation with potential API changes"] },
+      ];
+      return {
+        scoredFiles,
+        criticalFiles: scoredFiles.filter((f) => f.score >= 8),
+        summary: {
+          totalFiles: 3,
+          criticalCount: 1,
+          highCount: 0,
+          categories: { documentation: 1, source: 2 },
+        },
+      };
+    },
+  };
+}
+
+export function createStubReviewAgent(logger?: Logger): Agent<AnalysisOutput, ReviewOutput> {
+  return {
+    name: "StubReviewAgent",
+    idempotent: true,
+    async run(_input: AnalysisOutput): Promise<ReviewOutput> {
+      logger?.verbose("[STUB] StubReviewAgent running");
+      await new Promise((r) => setTimeout(r, 100));
+      return {
+        recommendations: [
+          {
+            file: "src/index.ts",
+            line: 5,
+            severity: "medium",
+            category: "maintainability",
+            message: "Consider adding error handling",
+            suggestion: "Wrap in try/catch block",
+          },
+          {
+            file: "README.md",
+            severity: "low",
+            category: "documentation",
+            message: "Update API section to match new changes",
+          },
+        ],
+        coreDecision: "Approve with minor suggestions",
+        focusAreas: ["Error handling in entry point", "Documentation accuracy"],
+      };
+    },
+  };
+}
+
+export function createStubOutputAgent(logger?: Logger): Agent<ReviewOutput, ReviewOutput> {
+  return {
+    name: "StubOutputAgent",
+    idempotent: false,
+    async run(input: ReviewOutput): Promise<ReviewOutput> {
+      logger?.verbose("[STUB] StubOutputAgent running");
+      await new Promise((r) => setTimeout(r, 100));
+      return input;
+    },
+  };
+}
diff --git a/code-review/01-core-infrastructure/src/pipeline/runner.test.ts b/code-review/01-core-infrastructure/src/pipeline/runner.test.ts
new file mode 100644
index 0000000..ebd70ce
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/pipeline/runner.test.ts
@@ -0,0 +1,227 @@
+import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
+import { runPipeline } from "./runner.js";
+import type { Agent, PipelineResult } from "./types.js";
+import { PipelineError } from "../utils/errors.js";
+
+function createAgent<TIn, TOut>(
+  name: string,
+  fn: (input: TIn) => TOut,
+  idempotent = true,
+): Agent<TIn, TOut> {
+  return {
+    name,
+    idempotent,
+    run: async (input: TIn) => fn(input),
+  };
+}
+
+describe("runPipeline", () => {
+  beforeEach(() => {
+    vi.useFakeTimers();
+  });
+
+  afterEach(() => {
+    vi.useRealTimers();
+  });
+
+  it("runs agents sequentially, passing output as next input", async () => {
+    const double = createAgent<number, number>("Double", (n) => n * 2);
+    const addTen = createAgent<number, number>("AddTen", (n) => n + 10);
+
+    const promise = runPipeline<number>([double, addTen], 5);
+    await vi.runAllTimersAsync();
+    const result = await promise;
+
+    expect(result.output).toBe(20); // (5 * 2) + 10
+  });
+
+  it("returns PipelineResult with final output and timing metadata", async () => {
+    const identity = createAgent<number, number>("Identity", (n) => n);
+
+    const promise = runPipeline<number>([identity], 42);
+    await vi.runAllTimersAsync();
+    const result = await promise;
+
+    expect(result.output).toBe(42);
+    expect(result.totalDuration).toBeTypeOf("number");
+    expect(result.totalDuration).toBeGreaterThanOrEqual(0);
+    expect(result.stages).toHaveLength(1);
+  });
+
+  it("records per-stage duration in StageResult", async () => {
+    const slow = {
+      name: "SlowAgent",
+      idempotent: true,
+      run: async (input: number) => {
+        await new Promise((r) => setTimeout(r, 100));
+        return input;
+      },
+    };
+
+    const promise = runPipeline<number>([slow], 1);
+    await vi.advanceTimersByTimeAsync(200);
+    const result = await promise;
+
+    expect(result.stages[0].duration).toBeGreaterThanOrEqual(0);
+    expect(result.stages[0].agentName).toBe("SlowAgent");
+  });
+
+  it("retries idempotent agent on failure (up to maxRetries)", async () => {
+    let callCount = 0;
+    const flaky: Agent<number, number> = {
+      name: "FlakyAgent",
+      idempotent: true,
+      run: async (input: number) => {
+        callCount++;
+        if (callCount < 3) throw new Error("transient");
+        return input;
+      },
+    };
+
+    const promise = runPipeline<number>([flaky], 7, { maxRetries: 3 });
+    await vi.runAllTimersAsync();
+    const result = await promise;
+
+    expect(result.output).toBe(7);
+    expect(callCount).toBe(3);
+    expect(result.stages[0].attempts).toBe(3);
+  });
+
+  it("uses exponential backoff between retries (1s, 2s, 4s)", async () => {
+    const timestamps: number[] = [];
+    let callCount = 0;
+    const flaky: Agent<number, number> = {
+      name: "BackoffAgent",
+      idempotent: true,
+      run: async () => {
+        timestamps.push(Date.now());
+        callCount++;
+        if (callCount <= 3) throw new Error("fail");
+        return 1;
+      },
+    };
+
+    const promise = runPipeline<number>([flaky], 0, { maxRetries: 4 });
+
+    // Initial call happens immediately
+    await vi.advanceTimersByTimeAsync(0);
+    expect(callCount).toBe(1);
+
+    // After 1s backoff: retry 1
+    await vi.advanceTimersByTimeAsync(1000);
+    expect(callCount).toBe(2);
+
+    // After 2s backoff: retry 2
+    await vi.advanceTimersByTimeAsync(2000);
+    expect(callCount).toBe(3);
+
+    // After 4s backoff: retry 3
+    await vi.advanceTimersByTimeAsync(4000);
+    expect(callCount).toBe(4);
+
+    const result = await promise;
+    expect(result.output).toBe(1);
+
+    // Verify backoff intervals
+    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(1000);
+    expect(timestamps[2] - timestamps[1]).toBeGreaterThanOrEqual(2000);
+    expect(timestamps[3] - timestamps[2]).toBeGreaterThanOrEqual(4000);
+  });
+
+  it("does NOT retry non-idempotent agent (fails immediately)", async () => {
+    let callCount = 0;
+    const nonRetryable: Agent<number, number> = {
+      name: "OutputAgent",
+      idempotent: false,
+      run: async () => {
+        callCount++;
+        throw new Error("side effect failed");
+      },
+    };
+
+    const promise = runPipeline<number>([nonRetryable], 1);
+    await vi.runAllTimersAsync();
+
+    await expect(promise).rejects.toThrow(PipelineError);
+    expect(callCount).toBe(1);
+  });
+
+  it("halts pipeline on agent failure after retries exhausted", async () => {
+    const alwaysFails: Agent<number, number> = {
+      name: "FailAgent",
+      idempotent: true,
+      run: async () => {
+        throw new Error("permanent failure");
+      },
+    };
+    const neverReached = createAgent<number, number>("NeverReached", (n) => n);
+
+    const promise = runPipeline<number>([alwaysFails, neverReached], 1, {
+      maxRetries: 2,
+    });
+    await vi.runAllTimersAsync();
+
+    await expect(promise).rejects.toThrow(PipelineError);
+  });
+
+  it("PipelineError includes agent name, attempt count, and original error", async () => {
+    const originalError = new Error("root cause");
+    const failing: Agent<number, number> = {
+      name: "ContextAgent",
+      idempotent: true,
+      run: async () => {
+        throw originalError;
+      },
+    };
+
+    const promise = runPipeline<number>([failing], 1, { maxRetries: 3 });
+    await vi.runAllTimersAsync();
+
+    try {
+      await promise;
+      expect.fail("Should have thrown");
+    } catch (err) {
+      expect(err).toBeInstanceOf(PipelineError);
+      const pe = err as PipelineError;
+      expect(pe.agentName).toBe("ContextAgent");
+      expect(pe.attempts).toBe(3);
+      expect(pe.cause).toBe(originalError);
+      expect(pe.message).toContain("Agent 'ContextAgent' failed after 3 attempt(s)");
+      expect(pe.message).toContain("root cause");
+    }
+  });
+
+  it("successful pipeline returns all stage results", async () => {
+    const a = createAgent<number, number>("A", (n) => n + 1);
+    const b = createAgent<number, string>("B", (n) => `value:${n}`);
+
+    const promise = runPipeline<string>([a, b], 5);
+    await vi.runAllTimersAsync();
+    const result = await promise;
+
+    expect(result.stages).toHaveLength(2);
+    expect(result.stages[0].agentName).toBe("A");
+    expect(result.stages[0].success).toBe(true);
+    expect(result.stages[0].data).toBe(6);
+    expect(result.stages[0].attempts).toBe(1);
+    expect(result.stages[1].agentName).toBe("B");
+    expect(result.stages[1].success).toBe(true);
+    expect(result.stages[1].data).toBe("value:6");
+  });
+
+  it("pipeline with 4 stages chains outputs correctly (A->B->C->D)", async () => {
+    const a = createAgent<number, number>("A", (n) => n * 2);
+    const b = createAgent<number, number>("B", (n) => n + 3);
+    const c = createAgent<number, string>("C", (n) => `result:${n}`);
+    const d = createAgent<string, string>("D", (s) => s.toUpperCase());
+
+    const promise = runPipeline<string>([a, b, c, d], 5);
+    await vi.runAllTimersAsync();
+    const result = await promise;
+
+    // 5 * 2 = 10, + 3 = 13, "result:13", "RESULT:13"
+    expect(result.output).toBe("RESULT:13");
+    expect(result.stages).toHaveLength(4);
+    expect(result.stages.every((s) => s.success)).toBe(true);
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/pipeline/runner.ts b/code-review/01-core-infrastructure/src/pipeline/runner.ts
new file mode 100644
index 0000000..cb05315
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/pipeline/runner.ts
@@ -0,0 +1,63 @@
+import type { Agent, PipelineOptions, PipelineResult, StageResult } from "./types.js";
+import { PipelineError } from "../utils/errors.js";
+
+export async function runPipeline<TFinal>(
+  agents: Agent<any, any>[],
+  initialInput: unknown,
+  options?: PipelineOptions,
+): Promise<PipelineResult<TFinal>> {
+  const maxRetries = options?.maxRetries ?? 3;
+  const logger = options?.logger;
+  const pipelineStart = Date.now();
+  const stages: StageResult<unknown>[] = [];
+  let currentInput: unknown = initialInput;
+
+  for (const agent of agents) {
+    logger?.info(`Running ${agent.name}...`);
+    const stageStart = Date.now();
+    let lastError: Error | undefined;
+    let attempts = 0;
+    let data: unknown;
+    let success = false;
+
+    for (let attempt = 0; attempt < maxRetries; attempt++) {
+      attempts = attempt + 1;
+      try {
+        data = await agent.run(currentInput);
+        success = true;
+        break;
+      } catch (err) {
+        lastError = err instanceof Error ? err : new Error(String(err));
+
+        if (!agent.idempotent) {
+          throw new PipelineError(agent.name, 1, lastError);
+        }
+
+        if (attempt < maxRetries) {
+          const delay = 1000 * Math.pow(2, attempt);
+          await new Promise((resolve) => setTimeout(resolve, delay));
+        }
+      }
+    }
+
+    if (!success) {
+      throw new PipelineError(agent.name, attempts, lastError!);
+    }
+
+    stages.push({
+      agentName: agent.name,
+      success: true,
+      data,
+      duration: Date.now() - stageStart,
+      attempts,
+    });
+
+    currentInput = data;
+  }
+
+  return {
+    output: currentInput as TFinal,
+    stages,
+    totalDuration: Date.now() - pipelineStart,
+  };
+}
diff --git a/code-review/01-core-infrastructure/src/pipeline/types.ts b/code-review/01-core-infrastructure/src/pipeline/types.ts
new file mode 100644
index 0000000..3dd5fb2
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/pipeline/types.ts
@@ -0,0 +1,27 @@
+import type { Logger } from "../utils/logger.js";
+
+export interface Agent<TInput, TOutput> {
+  name: string;
+  idempotent: boolean;
+  run(input: TInput): Promise<TOutput>;
+}
+
+export interface StageResult<T> {
+  agentName: string;
+  success: boolean;
+  data?: T;
+  error?: Error;
+  duration: number;
+  attempts: number;
+}
+
+export interface PipelineResult<T> {
+  output: T;
+  stages: StageResult<unknown>[];
+  totalDuration: number;
+}
+
+export interface PipelineOptions {
+  maxRetries?: number;
+  logger?: Logger;
+}
