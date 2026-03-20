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
const mockPullsListReviewComments = vi.hoisted(() => vi.fn());
const mockIssuesCreateComment = vi.hoisted(() => vi.fn());
const mockIssuesGet = vi.hoisted(() => vi.fn());
const mockReposGetContent = vi.hoisted(() => vi.fn());
const mockGitGetTree = vi.hoisted(() => vi.fn());
const mockPaginate = vi.hoisted(() => vi.fn());

vi.mock("@octokit/rest", () => {
  class MockOctokit {
    rest = {
      pulls: { get: mockPullsGet, listFiles: mockPullsListFiles, listReviewComments: mockPullsListReviewComments },
      issues: { createComment: mockIssuesCreateComment, get: mockIssuesGet },
      repos: { getContent: mockReposGetContent },
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

  it("getPR returns typed PR metadata object with headSha and baseSha", async () => {
    mockPullsGet.mockResolvedValueOnce({
      data: {
        title: "Fix bug",
        body: "Fixes #123",
        user: { login: "alice" },
        state: "open",
        base: { ref: "main", sha: "base-sha-abc" },
        head: { ref: "fix-bug", sha: "head-sha-def" },
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
      headSha: "head-sha-def",
      baseSha: "base-sha-abc",
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

  it("getPRFiles includes previousPath for renamed files", async () => {
    mockPaginate.mockResolvedValueOnce([
      { filename: "new/path.ts", status: "renamed", additions: 0, deletions: 0, patch: null, previous_filename: "old/path.ts" },
    ]);

    const files = await client.getPRFiles("owner", "repo", 1);
    expect(files[0].previousPath).toBe("old/path.ts");
  });

  describe("getFileContent", () => {
    it("fetches and base64-decodes file content", async () => {
      mockReposGetContent.mockResolvedValueOnce({
        data: { type: "file", content: Buffer.from("hello").toString("base64"), encoding: "base64" },
      });
      const result = await client.getFileContent("owner", "repo", "src/index.ts");
      expect(result).toBe("hello");
    });

    it("returns null for 404 (file not found)", async () => {
      const err = new Error("Not Found");
      (err as unknown as Record<string, unknown>).status = 404;
      mockReposGetContent.mockRejectedValueOnce(err);
      const result = await client.getFileContent("owner", "repo", "missing.ts");
      expect(result).toBeNull();
    });

    it("returns null when response is array (directory listing)", async () => {
      mockReposGetContent.mockResolvedValueOnce({
        data: [{ path: "subdir/file.ts" }],
      });
      const result = await client.getFileContent("owner", "repo", "subdir");
      expect(result).toBeNull();
    });

    it("returns null for symlink type responses", async () => {
      mockReposGetContent.mockResolvedValueOnce({
        data: { type: "symlink", content: "", encoding: "base64" },
      });
      const result = await client.getFileContent("owner", "repo", "link.ts");
      expect(result).toBeNull();
    });

    it("returns null for submodule type responses", async () => {
      mockReposGetContent.mockResolvedValueOnce({
        data: { type: "submodule", content: "", encoding: "base64" },
      });
      const result = await client.getFileContent("owner", "repo", "vendor/lib");
      expect(result).toBeNull();
    });

    it("returns null and logs warning for sensitive file paths", async () => {
      const sensitiveFiles = [".env", "certs/server.pem", "keys/id_rsa", "secrets.json", "app.key", ".credentials", "production.env"];
      for (const path of sensitiveFiles) {
        const result = await client.getFileContent("owner", "repo", path);
        expect(result).toBeNull();
      }
      expect(mockReposGetContent).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledTimes(sensitiveFiles.length);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("sensitive"));
    });

    it("passes ref parameter when provided", async () => {
      mockReposGetContent.mockResolvedValueOnce({
        data: { type: "file", content: Buffer.from("content").toString("base64"), encoding: "base64" },
      });
      await client.getFileContent("owner", "repo", "file.ts", "abc123");
      expect(mockReposGetContent).toHaveBeenCalledWith({ owner: "owner", repo: "repo", path: "file.ts", ref: "abc123" });
    });

    it("throws GitHubAPIError for non-404 errors", async () => {
      const err = new Error("Internal Server Error");
      (err as unknown as Record<string, unknown>).status = 500;
      mockReposGetContent.mockRejectedValueOnce(err);
      await expect(client.getFileContent("owner", "repo", "file.ts")).rejects.toThrow(GitHubAPIError);
    });
  });

  describe("getReviewComments", () => {
    it("fetches and maps review comments", async () => {
      mockPaginate.mockResolvedValueOnce([
        { id: 1, user: { login: "bob" }, body: "Fix this", path: "src/a.ts", original_line: 10, created_at: "2024-01-01T00:00:00Z" },
      ]);
      const comments = await client.getReviewComments("owner", "repo", 1);
      expect(comments).toEqual([
        { id: 1, author: "bob", body: "Fix this", path: "src/a.ts", line: 10, createdAt: "2024-01-01T00:00:00Z" },
      ]);
    });

    it("paginates correctly", async () => {
      mockPaginate.mockResolvedValueOnce([]);
      await client.getReviewComments("owner", "repo", 1);
      expect(mockPaginate).toHaveBeenCalledWith(
        mockPullsListReviewComments,
        { owner: "owner", repo: "repo", pull_number: 1, per_page: 100 },
      );
    });

    it("handles comments without path/line", async () => {
      mockPaginate.mockResolvedValueOnce([
        { id: 2, user: { login: "alice" }, body: "General note", path: undefined, original_line: undefined, line: undefined, created_at: "2024-01-01T00:00:00Z" },
      ]);
      const comments = await client.getReviewComments("owner", "repo", 1);
      expect(comments[0].path).toBeUndefined();
      expect(comments[0].line).toBeUndefined();
    });

    it("returns empty array on 403", async () => {
      const err = new Error("Forbidden");
      (err as unknown as Record<string, unknown>).status = 403;
      mockPaginate.mockRejectedValueOnce(err);
      const result = await client.getReviewComments("owner", "repo", 1);
      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalled();
    });

    it("returns empty array when no comments exist", async () => {
      mockPaginate.mockResolvedValueOnce([]);
      const result = await client.getReviewComments("owner", "repo", 1);
      expect(result).toEqual([]);
    });

    it("throws GitHubAPIError for non-403 errors", async () => {
      const err = new Error("Internal Server Error");
      (err as unknown as Record<string, unknown>).status = 500;
      mockPaginate.mockRejectedValueOnce(err);
      await expect(client.getReviewComments("owner", "repo", 1)).rejects.toThrow(GitHubAPIError);
    });
  });

  describe("getReferencedIssues", () => {
    it("fetches same-repo issues by number", async () => {
      mockIssuesGet
        .mockResolvedValueOnce({ data: { number: 1, title: "Bug A", state: "open", body: "desc A" } })
        .mockResolvedValueOnce({ data: { number: 2, title: "Bug B", state: "closed", body: "desc B" } });
      const issues = await client.getReferencedIssues("owner", "repo", [1, 2]);
      expect(issues).toEqual([
        { number: 1, title: "Bug A", state: "open", body: "desc A" },
        { number: 2, title: "Bug B", state: "closed", body: "desc B" },
      ]);
    });

    it("fetches cross-repo issues using provided owner/repo", async () => {
      mockIssuesGet.mockResolvedValueOnce({ data: { number: 5, title: "Lib issue", state: "open", body: "lib desc" } });
      const issues = await client.getReferencedIssues("owner", "repo", [], [{ owner: "other", repo: "lib", number: 5 }]);
      expect(mockIssuesGet).toHaveBeenCalledWith({ owner: "other", repo: "lib", issue_number: 5 });
      expect(issues[0].owner).toBe("other");
      expect(issues[0].repo).toBe("lib");
    });

    it("skips issues that return 404", async () => {
      mockIssuesGet.mockResolvedValueOnce({ data: { number: 1, title: "Bug A", state: "open", body: "desc" } });
      const err = new Error("Not Found");
      (err as unknown as Record<string, unknown>).status = 404;
      mockIssuesGet.mockRejectedValueOnce(err);
      const issues = await client.getReferencedIssues("owner", "repo", [1, 2]);
      expect(issues).toHaveLength(1);
      expect(logger.warn).toHaveBeenCalled();
    });

    it("skips issues that return 403", async () => {
      const err = new Error("Forbidden");
      (err as unknown as Record<string, unknown>).status = 403;
      mockIssuesGet.mockRejectedValueOnce(err);
      const issues = await client.getReferencedIssues("owner", "repo", [1]);
      expect(issues).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    it("returns empty array when given empty issue list", async () => {
      const issues = await client.getReferencedIssues("owner", "repo", []);
      expect(issues).toEqual([]);
    });
  });
});
