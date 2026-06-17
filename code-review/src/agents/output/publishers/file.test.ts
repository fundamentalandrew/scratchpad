import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Logger } from "../../../utils/logger.js";

vi.mock("node:fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

import { writeFile, mkdir } from "node:fs/promises";
import { publishMarkdownFile } from "./file.js";

const mockedWriteFile = vi.mocked(writeFile);
const mockedMkdir = vi.mocked(mkdir);

function makeLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    success: vi.fn(),
  };
}

describe("publishMarkdownFile", () => {
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = makeLogger();
  });

  it("writes content to specified file path with utf8 encoding", async () => {
    await publishMarkdownFile("# Report\nContent here", "/tmp/report.md", logger);

    expect(mockedWriteFile).toHaveBeenCalledWith(
      "/tmp/report.md",
      "# Report\nContent here",
      "utf8",
    );
  });

  it("creates parent directories recursively when they don't exist", async () => {
    await publishMarkdownFile("content", "/some/deep/path/report.md", logger);

    expect(mockedMkdir).toHaveBeenCalledWith("/some/deep/path", { recursive: true });
  });

  it("logs output path on success", async () => {
    await publishMarkdownFile("content", "/tmp/out.md", logger);

    const msg = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(msg).toContain("/tmp/out.md");
  });

  it("throws on write failure", async () => {
    mockedWriteFile.mockRejectedValueOnce(new Error("disk full"));

    await expect(
      publishMarkdownFile("content", "/tmp/out.md", logger),
    ).rejects.toThrow("disk full");
  });
});
