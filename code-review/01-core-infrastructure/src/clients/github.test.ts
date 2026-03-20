import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveGitHubToken, GitHubClient } from "./github.js";
import { AuthError, GitHubAPIError } from "../utils/errors.js";
import type { Logger } from "../utils/logger.js";

// Mock child_process for token resolution
const mockExecSync = vi.hoisted(() => vi.fn());
vi.mock("child_process", () => ({ execSync: mockExecSync }));

// Mock Octokit with plugins
const mockPullsGet = vi.hoisted(() => vi.fn());
const mockPullsListFiles = vi.hoisted(() => vi.fn());
const mockIssuesCreateComment = vi.hoisted(() => vi.fn());
const mockGitGetTree = vi.hoisted(() => vi.fn());
const mockPaginate = vi.hoisted(() => vi.fn());

vi.mock("@octokit/rest", () => {
  class MockOctokit {
    rest = {
      pulls: { get: mockPullsGet, listFiles: mockPullsListFiles },
      issues: { createComment: mockIssuesCreateComment },
      git: { getTree: mockGitGetTree },
    };
    paginate = mockPaginate;
    static plugin() {
      return MockOctokit;
    }
  }
  return { Octokit: MockOctokit };
});

vi.mock("@octokit/plugin-throttling", () => ({ throttling: {} }));
vi.mock("@octokit/plugin-retry", () => ({ retry: {} }));

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    verbose: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
  };
}

describe("resolveGitHubToken", () => {
  const originalEnv = process.env.GITHUB_TOKEN;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.GITHUB_TOKEN = originalEnv;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
    vi.clearAllMocks();
  });

  it("returns GITHUB_TOKEN env var when set", () => {
    process.env.GITHUB_TOKEN = "ghp_env_token";
    const logger = createMockLogger();
    expect(resolveGitHubToken({}, logger)).toBe("ghp_env_token");
  });

  it("falls back to gh auth token when env var missing", () => {
    delete process.env.GITHUB_TOKEN;
    mockExecSync.mockReturnValueOnce(Buffer.from("ghp_cli_token\n"));
    const logger = createMockLogger();
    expect(resolveGitHubToken({}, logger)).toBe("ghp_cli_token");
  });

  it("falls back to config when gh not installed", () => {
    delete process.env.GITHUB_TOKEN;
    mockExecSync.mockImplementationOnce(() => {
      throw new Error("command not found: gh");
    });
    const logger = createMockLogger();
    expect(resolveGitHubToken({ githubToken: "ghp_config_token" }, logger)).toBe("ghp_config_token");
  });

  it("throws AuthError when no token found", () => {
    delete process.env.GITHUB_TOKEN;
    mockExecSync.mockImplementationOnce(() => {
      throw new Error("command not found: gh");
    });
    const logger = createMockLogger();
    expect(() => resolveGitHubToken({}, logger)).toThrow(AuthError);
  });

  it("warns when token found in config file", () => {
    delete process.env.GITHUB_TOKEN;
    mockExecSync.mockImplementationOnce(() => {
      throw new Error("command not found: gh");
    });
    const logger = createMockLogger();
    resolveGitHubToken({ githubToken: "ghp_config_token" }, logger);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("security risk"),
    );
  });
});

describe("GitHubClient", () => {
  let client: GitHubClient;
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = createMockLogger();
    client = new GitHubClient({ token: "ghp_test", logger });
  });

  it("getPR returns typed PR metadata object", async () => {
    mockPullsGet.mockResolvedValueOnce({
      data: {
        title: "Fix bug",
        body: "Fixes #123",
        user: { login: "alice" },
        state: "open",
        base: { ref: "main" },
        head: { ref: "fix-bug" },
      },
    });

    const pr = await client.getPR("owner", "repo", 1);
    expect(pr).toEqual({
      title: "Fix bug",
      description: "Fixes #123",
      author: "alice",
      state: "open",
      baseBranch: "main",
      headBranch: "fix-bug",
    });
  });

  it("getPRFiles paginates and returns all files", async () => {
    mockPaginate.mockResolvedValueOnce([
      { filename: "a.ts", status: "added", additions: 10, deletions: 0, patch: "@@ ..." },
      { filename: "b.ts", status: "modified", additions: 5, deletions: 3, patch: "@@ ..." },
    ]);

    const files = await client.getPRFiles("owner", "repo", 1);
    expect(files).toHaveLength(2);
    expect(files[0].path).toBe("a.ts");
    expect(files[1].status).toBe("modified");
  });

  it("getPRFiles preserves null patch field", async () => {
    mockPaginate.mockResolvedValueOnce([
      { filename: "image.png", status: "added", additions: 0, deletions: 0, patch: null },
    ]);

    const files = await client.getPRFiles("owner", "repo", 1);
    expect(files[0].patch).toBeNull();
  });

  it("getPRDiff returns unified diff string", async () => {
    mockPullsGet.mockResolvedValueOnce({
      data: "diff --git a/file.ts b/file.ts\n--- a/file.ts\n+++ b/file.ts\n@@ ...",
    });

    const diff = await client.getPRDiff("owner", "repo", 1);
    expect(diff).toContain("diff --git");
  });

  it("getRepoTree returns array of file paths", async () => {
    mockGitGetTree.mockResolvedValueOnce({
      data: {
        tree: [
          { path: "src/index.ts", type: "blob" },
          { path: "src", type: "tree" },
          { path: "src/utils.ts", type: "blob" },
        ],
        truncated: false,
      },
    });

    const paths = await client.getRepoTree("owner", "repo", "main");
    expect(paths).toEqual(["src/index.ts", "src/utils.ts"]);
  });

  it("getRepoTree warns on truncated response", async () => {
    mockGitGetTree.mockResolvedValueOnce({
      data: {
        tree: [{ path: "src/index.ts", type: "blob" }],
        truncated: true,
      },
    });

    await client.getRepoTree("owner", "repo");
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("truncated"),
    );
  });

  it("getPR throws GitHubAPIError with cause on API failure", async () => {
    const originalError = new Error("Not Found");
    mockPullsGet.mockRejectedValueOnce(originalError);

    try {
      await client.getPR("owner", "repo", 999);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(GitHubAPIError);
      expect((e as GitHubAPIError).message).toContain("getPR");
      expect((e as GitHubAPIError).cause).toBe(originalError);
    }
  });

  it("postPRComment posts body to correct PR", async () => {
    mockIssuesCreateComment.mockResolvedValueOnce({ data: {} });

    await client.postPRComment("owner", "repo", 42, "LGTM!");
    expect(mockIssuesCreateComment).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      issue_number: 42,
      body: "LGTM!",
    });
  });
});
