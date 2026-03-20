import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reviewPR } from "./review-pr.js";

vi.mock("../config/loader.js", () => ({
  loadConfig: vi.fn(),
}));

vi.mock("../utils/url-parser.js", () => ({
  parsePRUrl: vi.fn(),
  parseRepoUrl: vi.fn(),
}));

vi.mock("../clients/github.js", () => ({
  resolveGitHubToken: vi.fn(),
  GitHubClient: vi.fn(),
}));

vi.mock("../pipeline/runner.js", () => ({
  runPipeline: vi.fn(),
}));

vi.mock("../agents/stubs.js", () => ({
  createStubContextAgent: vi.fn(() => ({ name: "StubContext", idempotent: true, run: vi.fn() })),
  createStubAnalysisAgent: vi.fn(() => ({ name: "StubAnalysis", idempotent: true, run: vi.fn() })),
  createStubReviewAgent: vi.fn(() => ({ name: "StubReview", idempotent: true, run: vi.fn() })),
  createStubOutputAgent: vi.fn(() => ({ name: "StubOutput", idempotent: false, run: vi.fn() })),
}));

import { loadConfig } from "../config/loader.js";
import { parsePRUrl } from "../utils/url-parser.js";
import { resolveGitHubToken } from "../clients/github.js";
import { runPipeline } from "../pipeline/runner.js";
import { URLParseError, AuthError } from "../utils/errors.js";

const mockLoadConfig = loadConfig as ReturnType<typeof vi.fn>;
const mockParsePRUrl = parsePRUrl as ReturnType<typeof vi.fn>;
const mockResolveGitHubToken = resolveGitHubToken as ReturnType<typeof vi.fn>;
const mockRunPipeline = runPipeline as ReturnType<typeof vi.fn>;

describe("reviewPR", () => {
  let savedApiKey: string | undefined;

  beforeEach(() => {
    vi.resetAllMocks();
    savedApiKey = process.env.ANTHROPIC_API_KEY;
    mockLoadConfig.mockReturnValue({
      apiKey: "test-key",
      maxRetries: 3,
      output: { console: true, markdown: false, githubComment: false },
    });
    mockParsePRUrl.mockReturnValue({ owner: "test", repo: "repo", number: 1 });
    mockResolveGitHubToken.mockReturnValue("gh-token");
    mockRunPipeline.mockResolvedValue({
      output: {},
      stages: [],
      totalDuration: 100,
    });
  });

  afterEach(() => {
    if (savedApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = savedApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it("rejects missing URL argument", async () => {
    mockParsePRUrl.mockImplementation(() => {
      throw new URLParseError("Invalid PR URL. Expected format: https://github.com/owner/repo/pull/123");
    });

    await expect(reviewPR("", { verbose: false })).rejects.toThrow(URLParseError);
  });

  it("rejects invalid URL format", async () => {
    mockParsePRUrl.mockImplementation(() => {
      throw new URLParseError("Invalid PR URL");
    });

    await expect(reviewPR("not-a-url", { verbose: false })).rejects.toThrow(URLParseError);
  });

  it("loads config before running pipeline", async () => {
    const callOrder: string[] = [];
    mockLoadConfig.mockImplementation(() => {
      callOrder.push("loadConfig");
      return {
        apiKey: "test-key",
        maxRetries: 3,
        output: { console: true, markdown: false, githubComment: false },
      };
    });
    mockRunPipeline.mockImplementation(async () => {
      callOrder.push("runPipeline");
      return { output: {}, stages: [], totalDuration: 100 };
    });

    await reviewPR("https://github.com/o/r/pull/1", { verbose: false });

    expect(callOrder).toEqual(["loadConfig", "runPipeline"]);
  });

  it("fails with clear message when no API key configured", async () => {
    mockLoadConfig.mockReturnValue({
      maxRetries: 3,
      output: { console: true, markdown: false, githubComment: false },
    });
    delete process.env.ANTHROPIC_API_KEY;

    await expect(
      reviewPR("https://github.com/o/r/pull/1", { verbose: false }),
    ).rejects.toThrow(AuthError);
  });
});
