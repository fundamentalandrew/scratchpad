import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger } from "./logger.js";

describe("createLogger", () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a logger instance", () => {
    const logger = createLogger({ verbose: false });
    expect(logger).toHaveProperty("info");
    expect(logger).toHaveProperty("verbose");
    expect(logger).toHaveProperty("error");
    expect(logger).toHaveProperty("warn");
    expect(logger).toHaveProperty("success");
  });

  it("info writes to stdout", () => {
    const logger = createLogger({ verbose: false });
    logger.info("hello");
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("hello"));
  });

  it("error writes to stderr", () => {
    const logger = createLogger({ verbose: false });
    logger.error("something broke");
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("something broke"));
  });

  it("verbose suppressed when verbose=false", () => {
    const logger = createLogger({ verbose: false });
    logger.verbose("debug info");
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it("verbose outputs when verbose=true", () => {
    const logger = createLogger({ verbose: true });
    logger.verbose("debug info");
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("debug info"));
  });

  it("warn outputs with warning styling", () => {
    const logger = createLogger({ verbose: false });
    logger.warn("careful");
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining("careful"));
  });

  it("multiple logger instances are independent", () => {
    const quiet = createLogger({ verbose: false });
    const loud = createLogger({ verbose: true });
    quiet.verbose("should not appear");
    expect(stdoutSpy).not.toHaveBeenCalled();
    loud.verbose("should appear");
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("should appear"));
  });

  it("success writes to stdout", () => {
    const logger = createLogger({ verbose: false });
    logger.success("done");
    expect(stdoutSpy).toHaveBeenCalledWith(expect.stringContaining("done"));
  });
});
