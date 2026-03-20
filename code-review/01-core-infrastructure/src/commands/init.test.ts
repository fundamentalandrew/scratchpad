import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { initProject } from "./init.js";
import type { Logger } from "../utils/logger.js";

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    verbose: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
  };
}

describe("initProject", () => {
  let tmpDir: string;
  let logger: Logger;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "init-test-"));
    logger = createMockLogger();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates DOMAIN_RULES.md when it doesn't exist", async () => {
    await initProject(tmpDir, logger);

    const filePath = path.join(tmpDir, "DOMAIN_RULES.md");
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("# Domain Rules");
  });

  it("creates ARCHITECTURE.md when it doesn't exist", async () => {
    await initProject(tmpDir, logger);

    const filePath = path.join(tmpDir, "ARCHITECTURE.md");
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("# Architecture");
  });

  it("skips DOMAIN_RULES.md when it already exists (no overwrite)", async () => {
    const filePath = path.join(tmpDir, "DOMAIN_RULES.md");
    fs.writeFileSync(filePath, "custom content");

    await initProject(tmpDir, logger);

    expect(fs.readFileSync(filePath, "utf-8")).toBe("custom content");
  });

  it("skips ARCHITECTURE.md when it already exists (no overwrite)", async () => {
    const filePath = path.join(tmpDir, "ARCHITECTURE.md");
    fs.writeFileSync(filePath, "custom architecture");

    await initProject(tmpDir, logger);

    expect(fs.readFileSync(filePath, "utf-8")).toBe("custom architecture");
  });

  it("reports which files were created vs skipped", async () => {
    // Pre-create one file
    fs.writeFileSync(path.join(tmpDir, "DOMAIN_RULES.md"), "existing");

    await initProject(tmpDir, logger);

    const infoCalls = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(infoCalls.some((msg: string) => msg.includes("Skipped") && msg.includes("DOMAIN_RULES.md"))).toBe(true);
    expect(infoCalls.some((msg: string) => msg.includes("Created") && msg.includes("ARCHITECTURE.md"))).toBe(true);
  });

  it("created files contain expected template sections", async () => {
    await initProject(tmpDir, logger);

    const domain = fs.readFileSync(path.join(tmpDir, "DOMAIN_RULES.md"), "utf-8");
    expect(domain).toContain("## Business Rules");
    expect(domain).toContain("## Naming Conventions");
    expect(domain).toContain("## Review Criteria");

    const arch = fs.readFileSync(path.join(tmpDir, "ARCHITECTURE.md"), "utf-8");
    expect(arch).toContain("## System Overview");
    expect(arch).toContain("## Key Patterns");
    expect(arch).toContain("## Architectural Decisions");
  });
});
