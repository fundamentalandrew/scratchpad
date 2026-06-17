import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { runPipeline } from "./runner.js";
import type { Agent, PipelineResult } from "./types.js";
import { PipelineError } from "../utils/errors.js";

function createAgent<TIn, TOut>(
  name: string,
  fn: (input: TIn) => TOut,
  idempotent = true,
): Agent<TIn, TOut> {
  return {
    name,
    idempotent,
    run: async (input: TIn) => fn(input),
  };
}

describe("runPipeline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs agents sequentially, passing output as next input", async () => {
    const double = createAgent<number, number>("Double", (n) => n * 2);
    const addTen = createAgent<number, number>("AddTen", (n) => n + 10);

    const promise = runPipeline<number>([double, addTen], 5);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.output).toBe(20); // (5 * 2) + 10
  });

  it("returns PipelineResult with final output and timing metadata", async () => {
    const identity = createAgent<number, number>("Identity", (n) => n);

    const promise = runPipeline<number>([identity], 42);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.output).toBe(42);
    expect(result.totalDuration).toBeTypeOf("number");
    expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    expect(result.stages).toHaveLength(1);
  });

  it("records per-stage duration in StageResult", async () => {
    const slow = {
      name: "SlowAgent",
      idempotent: true,
      run: async (input: number) => {
        await new Promise((r) => setTimeout(r, 100));
        return input;
      },
    };

    const promise = runPipeline<number>([slow], 1);
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;

    expect(result.stages[0].duration).toBeGreaterThanOrEqual(0);
    expect(result.stages[0].agentName).toBe("SlowAgent");
  });

  it("retries idempotent agent on failure (up to maxRetries)", async () => {
    let callCount = 0;
    const flaky: Agent<number, number> = {
      name: "FlakyAgent",
      idempotent: true,
      run: async (input: number) => {
        callCount++;
        if (callCount < 3) throw new Error("transient");
        return input;
      },
    };

    const promise = runPipeline<number>([flaky], 7, { maxRetries: 3 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.output).toBe(7);
    expect(callCount).toBe(3);
    expect(result.stages[0].attempts).toBe(3);
  });

  it("uses exponential backoff between retries (1s, 2s, 4s)", async () => {
    const timestamps: number[] = [];
    let callCount = 0;
    const flaky: Agent<number, number> = {
      name: "BackoffAgent",
      idempotent: true,
      run: async () => {
        timestamps.push(Date.now());
        callCount++;
        if (callCount <= 3) throw new Error("fail");
        return 1;
      },
    };

    const promise = runPipeline<number>([flaky], 0, { maxRetries: 4 });

    // Initial call happens immediately
    await vi.advanceTimersByTimeAsync(0);
    expect(callCount).toBe(1);

    // After 1s backoff: retry 1
    await vi.advanceTimersByTimeAsync(1000);
    expect(callCount).toBe(2);

    // After 2s backoff: retry 2
    await vi.advanceTimersByTimeAsync(2000);
    expect(callCount).toBe(3);

    // After 4s backoff: retry 3
    await vi.advanceTimersByTimeAsync(4000);
    expect(callCount).toBe(4);

    const result = await promise;
    expect(result.output).toBe(1);

    // Verify backoff intervals
    expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(1000);
    expect(timestamps[2] - timestamps[1]).toBeGreaterThanOrEqual(2000);
    expect(timestamps[3] - timestamps[2]).toBeGreaterThanOrEqual(4000);
  });

  it("does NOT retry non-idempotent agent (fails immediately)", async () => {
    let callCount = 0;
    const nonRetryable: Agent<number, number> = {
      name: "OutputAgent",
      idempotent: false,
      run: async () => {
        callCount++;
        throw new Error("side effect failed");
      },
    };

    const promise = runPipeline<number>([nonRetryable], 1);
    const assertion = expect(promise).rejects.toThrow(PipelineError);
    await vi.runAllTimersAsync();

    await assertion;
    expect(callCount).toBe(1);
  });

  it("halts pipeline on agent failure after retries exhausted", async () => {
    const alwaysFails: Agent<number, number> = {
      name: "FailAgent",
      idempotent: true,
      run: async () => {
        throw new Error("permanent failure");
      },
    };
    const neverReached = createAgent<number, number>("NeverReached", (n) => n);

    const promise = runPipeline<number>([alwaysFails, neverReached], 1, {
      maxRetries: 2,
    });
    const assertion = expect(promise).rejects.toThrow(PipelineError);
    await vi.runAllTimersAsync();

    await assertion;
  });

  it("PipelineError includes agent name, attempt count, and original error", async () => {
    const originalError = new Error("root cause");
    const failing: Agent<number, number> = {
      name: "ContextAgent",
      idempotent: true,
      run: async () => {
        throw originalError;
      },
    };

    const promise = runPipeline<number>([failing], 1, { maxRetries: 3 });
    promise.catch(() => {}); // prevent unhandled rejection before timers run
    await vi.runAllTimersAsync();

    try {
      await promise;
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PipelineError);
      const pe = err as PipelineError;
      expect(pe.agentName).toBe("ContextAgent");
      expect(pe.attempts).toBe(3);
      expect(pe.cause).toBe(originalError);
      expect(pe.message).toContain("Agent 'ContextAgent' failed after 3 attempt(s)");
      expect(pe.message).toContain("root cause");
    }
  });

  it("successful pipeline returns all stage results", async () => {
    const a = createAgent<number, number>("A", (n) => n + 1);
    const b = createAgent<number, string>("B", (n) => `value:${n}`);

    const promise = runPipeline<string>([a, b], 5);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.stages).toHaveLength(2);
    expect(result.stages[0].agentName).toBe("A");
    expect(result.stages[0].success).toBe(true);
    expect(result.stages[0].data).toBe(6);
    expect(result.stages[0].attempts).toBe(1);
    expect(result.stages[1].agentName).toBe("B");
    expect(result.stages[1].success).toBe(true);
    expect(result.stages[1].data).toBe("value:6");
  });

  it("pipeline with 4 stages chains outputs correctly (A->B->C->D)", async () => {
    const a = createAgent<number, number>("A", (n) => n * 2);
    const b = createAgent<number, number>("B", (n) => n + 3);
    const c = createAgent<number, string>("C", (n) => `result:${n}`);
    const d = createAgent<string, string>("D", (s) => s.toUpperCase());

    const promise = runPipeline<string>([a, b, c, d], 5);
    await vi.runAllTimersAsync();
    const result = await promise;

    // 5 * 2 = 10, + 3 = 13, "result:13", "RESULT:13"
    expect(result.output).toBe("RESULT:13");
    expect(result.stages).toHaveLength(4);
    expect(result.stages.every((s) => s.success)).toBe(true);
  });
});
