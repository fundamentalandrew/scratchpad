import { describe, it, expect, vi, beforeEach } from "vitest";
import { reviewRepo } from "./review-repo.js";

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
import { parseRepoUrl } from "../utils/url-parser.js";
import { resolveGitHubToken } from "../clients/github.js";
import { runPipeline } from "../pipeline/runner.js";
import { URLParseError } from "../utils/errors.js";

const mockLoadConfig = loadConfig as ReturnType<typeof vi.fn>;
const mockParseRepoUrl = parseRepoUrl as ReturnType<typeof vi.fn>;
const mockResolveGitHubToken = resolveGitHubToken as ReturnType<typeof vi.fn>;
const mockRunPipeline = runPipeline as ReturnType<typeof vi.fn>;

describe("reviewRepo", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockLoadConfig.mockReturnValue({
      apiKey: "test-key",
      maxRetries: 3,
      output: { console: true, markdown: false, githubComment: false },
    });
    mockParseRepoUrl.mockReturnValue({ owner: "test", repo: "repo" });
    mockResolveGitHubToken.mockReturnValue("gh-token");
    mockRunPipeline.mockResolvedValue({
      output: {},
      stages: [],
      totalDuration: 100,
    });
  });

  it("rejects missing URL argument", async () => {
    mockParseRepoUrl.mockImplementation(() => {
      throw new URLParseError("Invalid repository URL");
    });

    await expect(reviewRepo("", { verbose: false })).rejects.toThrow(URLParseError);
  });

  it("passes mode 'repo' to pipeline", async () => {
    await reviewRepo("https://github.com/o/r", { verbose: false });

    expect(mockParseRepoUrl).toHaveBeenCalledWith("https://github.com/o/r");
    expect(mockRunPipeline).toHaveBeenCalledOnce();
    const pipelineInput = mockRunPipeline.mock.calls[0][1];
    expect(pipelineInput.mode).toBe("repo");
  });
});
