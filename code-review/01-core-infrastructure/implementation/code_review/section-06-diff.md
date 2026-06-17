diff --git a/code-review/01-core-infrastructure/src/clients/github.test.ts b/code-review/01-core-infrastructure/src/clients/github.test.ts
new file mode 100644
index 0000000..ed0b104
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/clients/github.test.ts
@@ -0,0 +1,205 @@
+import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
+import { resolveGitHubToken, GitHubClient } from "./github.js";
+import { AuthError, GitHubAPIError } from "../utils/errors.js";
+import type { Logger } from "../utils/logger.js";
+
+// Mock child_process for token resolution
+const mockExecSync = vi.hoisted(() => vi.fn());
+vi.mock("child_process", () => ({ execSync: mockExecSync }));
+
+// Mock Octokit with plugins
+const mockPullsGet = vi.hoisted(() => vi.fn());
+const mockPullsListFiles = vi.hoisted(() => vi.fn());
+const mockIssuesCreateComment = vi.hoisted(() => vi.fn());
+const mockGitGetTree = vi.hoisted(() => vi.fn());
+const mockPaginate = vi.hoisted(() => vi.fn());
+
+vi.mock("@octokit/rest", () => {
+  class MockOctokit {
+    rest = {
+      pulls: { get: mockPullsGet, listFiles: mockPullsListFiles },
+      issues: { createComment: mockIssuesCreateComment },
+      git: { getTree: mockGitGetTree },
+    };
+    paginate = mockPaginate;
+    static plugin() {
+      return MockOctokit;
+    }
+  }
+  return { Octokit: MockOctokit };
+});
+
+vi.mock("@octokit/plugin-throttling", () => ({ throttling: {} }));
+vi.mock("@octokit/plugin-retry", () => ({ retry: {} }));
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
+describe("resolveGitHubToken", () => {
+  const originalEnv = process.env.GITHUB_TOKEN;
+
+  afterEach(() => {
+    if (originalEnv !== undefined) {
+      process.env.GITHUB_TOKEN = originalEnv;
+    } else {
+      delete process.env.GITHUB_TOKEN;
+    }
+    vi.clearAllMocks();
+  });
+
+  it("returns GITHUB_TOKEN env var when set", () => {
+    process.env.GITHUB_TOKEN = "ghp_env_token";
+    const logger = createMockLogger();
+    expect(resolveGitHubToken({}, logger)).toBe("ghp_env_token");
+  });
+
+  it("falls back to gh auth token when env var missing", () => {
+    delete process.env.GITHUB_TOKEN;
+    mockExecSync.mockReturnValueOnce(Buffer.from("ghp_cli_token\n"));
+    const logger = createMockLogger();
+    expect(resolveGitHubToken({}, logger)).toBe("ghp_cli_token");
+  });
+
+  it("falls back to config when gh not installed", () => {
+    delete process.env.GITHUB_TOKEN;
+    mockExecSync.mockImplementationOnce(() => {
+      throw new Error("command not found: gh");
+    });
+    const logger = createMockLogger();
+    expect(resolveGitHubToken({ githubToken: "ghp_config_token" }, logger)).toBe("ghp_config_token");
+  });
+
+  it("throws AuthError when no token found", () => {
+    delete process.env.GITHUB_TOKEN;
+    mockExecSync.mockImplementationOnce(() => {
+      throw new Error("command not found: gh");
+    });
+    const logger = createMockLogger();
+    expect(() => resolveGitHubToken({}, logger)).toThrow(AuthError);
+  });
+
+  it("warns when token found in config file", () => {
+    delete process.env.GITHUB_TOKEN;
+    mockExecSync.mockImplementationOnce(() => {
+      throw new Error("command not found: gh");
+    });
+    const logger = createMockLogger();
+    resolveGitHubToken({ githubToken: "ghp_config_token" }, logger);
+    expect(logger.warn).toHaveBeenCalledWith(
+      expect.stringContaining("security risk"),
+    );
+  });
+});
+
+describe("GitHubClient", () => {
+  let client: GitHubClient;
+  let logger: Logger;
+
+  beforeEach(() => {
+    vi.clearAllMocks();
+    logger = createMockLogger();
+    client = new GitHubClient({ token: "ghp_test", logger });
+  });
+
+  it("getPR returns typed PR metadata object", async () => {
+    mockPullsGet.mockResolvedValueOnce({
+      data: {
+        title: "Fix bug",
+        body: "Fixes #123",
+        user: { login: "alice" },
+        state: "open",
+        base: { ref: "main" },
+        head: { ref: "fix-bug" },
+      },
+    });
+
+    const pr = await client.getPR("owner", "repo", 1);
+    expect(pr).toEqual({
+      title: "Fix bug",
+      description: "Fixes #123",
+      author: "alice",
+      state: "open",
+      baseBranch: "main",
+      headBranch: "fix-bug",
+    });
+  });
+
+  it("getPRFiles paginates and returns all files", async () => {
+    mockPaginate.mockResolvedValueOnce([
+      { filename: "a.ts", status: "added", additions: 10, deletions: 0, patch: "@@ ..." },
+      { filename: "b.ts", status: "modified", additions: 5, deletions: 3, patch: "@@ ..." },
+    ]);
+
+    const files = await client.getPRFiles("owner", "repo", 1);
+    expect(files).toHaveLength(2);
+    expect(files[0].path).toBe("a.ts");
+    expect(files[1].status).toBe("modified");
+  });
+
+  it("getPRFiles preserves null patch field", async () => {
+    mockPaginate.mockResolvedValueOnce([
+      { filename: "image.png", status: "added", additions: 0, deletions: 0, patch: null },
+    ]);
+
+    const files = await client.getPRFiles("owner", "repo", 1);
+    expect(files[0].patch).toBeNull();
+  });
+
+  it("getPRDiff returns unified diff string", async () => {
+    mockPullsGet.mockResolvedValueOnce({
+      data: "diff --git a/file.ts b/file.ts\n--- a/file.ts\n+++ b/file.ts\n@@ ...",
+    });
+
+    const diff = await client.getPRDiff("owner", "repo", 1);
+    expect(diff).toContain("diff --git");
+  });
+
+  it("getRepoTree returns array of file paths", async () => {
+    mockGitGetTree.mockResolvedValueOnce({
+      data: {
+        tree: [
+          { path: "src/index.ts", type: "blob" },
+          { path: "src", type: "tree" },
+          { path: "src/utils.ts", type: "blob" },
+        ],
+        truncated: false,
+      },
+    });
+
+    const paths = await client.getRepoTree("owner", "repo", "main");
+    expect(paths).toEqual(["src/index.ts", "src/utils.ts"]);
+  });
+
+  it("getRepoTree warns on truncated response", async () => {
+    mockGitGetTree.mockResolvedValueOnce({
+      data: {
+        tree: [{ path: "src/index.ts", type: "blob" }],
+        truncated: true,
+      },
+    });
+
+    await client.getRepoTree("owner", "repo");
+    expect(logger.warn).toHaveBeenCalledWith(
+      expect.stringContaining("truncated"),
+    );
+  });
+
+  it("postPRComment posts body to correct PR", async () => {
+    mockIssuesCreateComment.mockResolvedValueOnce({ data: {} });
+
+    await client.postPRComment("owner", "repo", 42, "LGTM!");
+    expect(mockIssuesCreateComment).toHaveBeenCalledWith({
+      owner: "owner",
+      repo: "repo",
+      issue_number: 42,
+      body: "LGTM!",
+    });
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/clients/github.ts b/code-review/01-core-infrastructure/src/clients/github.ts
new file mode 100644
index 0000000..7f82489
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/clients/github.ts
@@ -0,0 +1,161 @@
+import { execSync } from "child_process";
+import { Octokit } from "@octokit/rest";
+import { throttling } from "@octokit/plugin-throttling";
+import { retry } from "@octokit/plugin-retry";
+import { AuthError, GitHubAPIError } from "../utils/errors.js";
+import type { Logger } from "../utils/logger.js";
+
+const ThrottledOctokit = Octokit.plugin(throttling, retry);
+
+export function resolveGitHubToken(config: { githubToken?: string }, logger: Logger): string {
+  if (process.env.GITHUB_TOKEN) {
+    return process.env.GITHUB_TOKEN;
+  }
+
+  try {
+    const result = execSync("gh auth token", {
+      stdio: ["ignore", "pipe", "ignore"],
+      timeout: 5000,
+    });
+    const token = result.toString().trim();
+    if (token) return token;
+  } catch {
+    // gh not installed or not authenticated — fall through
+  }
+
+  if (config.githubToken) {
+    logger.warn("Using token from config file — storing tokens in config files is a security risk");
+    return config.githubToken;
+  }
+
+  throw new AuthError("No GitHub authentication found");
+}
+
+export class GitHubClient {
+  private octokit: InstanceType<typeof ThrottledOctokit>;
+  private logger: Logger;
+
+  constructor(options: { token: string; logger: Logger }) {
+    this.logger = options.logger;
+    this.octokit = new ThrottledOctokit({
+      auth: options.token,
+      throttle: {
+        onRateLimit: (retryAfter: number, opts: Record<string, unknown>) => {
+          const request = opts.request as { retryCount?: number } | undefined;
+          this.logger.warn(`Rate limited, retrying after ${retryAfter}s`);
+          return (request?.retryCount ?? 0) < 2;
+        },
+        onSecondaryRateLimit: (retryAfter: number, opts: Record<string, unknown>) => {
+          const request = opts.request as { retryCount?: number } | undefined;
+          this.logger.warn(`Secondary rate limit, retrying after ${retryAfter}s`);
+          return (request?.retryCount ?? 0) < 2;
+        },
+      },
+    });
+  }
+
+  async getPR(owner: string, repo: string, number: number): Promise<{
+    title: string;
+    description: string | null;
+    author: string;
+    state: string;
+    baseBranch: string;
+    headBranch: string;
+  }> {
+    this.logger.verbose(`GitHub API: getPR(${owner}/${repo}#${number})`);
+    try {
+      const { data } = await this.octokit.rest.pulls.get({ owner, repo, pull_number: number });
+      return {
+        title: data.title,
+        description: data.body ?? null,
+        author: data.user?.login ?? "unknown",
+        state: data.state,
+        baseBranch: data.base.ref,
+        headBranch: data.head.ref,
+      };
+    } catch (e) {
+      throw new GitHubAPIError(`getPR(${owner}/${repo}#${number}) failed: ${(e as Error).message}`);
+    }
+  }
+
+  async getPRFiles(owner: string, repo: string, number: number): Promise<Array<{
+    path: string;
+    status: string;
+    additions: number;
+    deletions: number;
+    patch?: string | null;
+  }>> {
+    this.logger.verbose(`GitHub API: getPRFiles(${owner}/${repo}#${number})`);
+    try {
+      const files = await this.octokit.paginate(this.octokit.rest.pulls.listFiles, {
+        owner,
+        repo,
+        pull_number: number,
+        per_page: 100,
+      });
+      return files.map((f: Record<string, unknown>) => ({
+        path: f.filename as string,
+        status: f.status as string,
+        additions: f.additions as number,
+        deletions: f.deletions as number,
+        patch: f.patch as string | null | undefined,
+      }));
+    } catch (e) {
+      throw new GitHubAPIError(`getPRFiles(${owner}/${repo}#${number}) failed: ${(e as Error).message}`);
+    }
+  }
+
+  async getPRDiff(owner: string, repo: string, number: number): Promise<string> {
+    this.logger.verbose(`GitHub API: getPRDiff(${owner}/${repo}#${number})`);
+    try {
+      const response = await this.octokit.rest.pulls.get({
+        owner,
+        repo,
+        pull_number: number,
+        mediaType: { format: "diff" },
+      });
+      return response.data as unknown as string;
+    } catch (e) {
+      throw new GitHubAPIError(`getPRDiff(${owner}/${repo}#${number}) failed: ${(e as Error).message}`);
+    }
+  }
+
+  async postPRComment(owner: string, repo: string, number: number, body: string): Promise<void> {
+    this.logger.verbose(`GitHub API: postPRComment(${owner}/${repo}#${number})`);
+    try {
+      await this.octokit.rest.issues.createComment({
+        owner,
+        repo,
+        issue_number: number,
+        body,
+      });
+    } catch (e) {
+      throw new GitHubAPIError(`postPRComment(${owner}/${repo}#${number}) failed: ${(e as Error).message}`);
+    }
+  }
+
+  async getRepoTree(owner: string, repo: string, branch?: string): Promise<string[]> {
+    this.logger.verbose(`GitHub API: getRepoTree(${owner}/${repo}@${branch ?? "HEAD"})`);
+    try {
+      const response = await this.octokit.rest.git.getTree({
+        owner,
+        repo,
+        tree_sha: branch ?? "HEAD",
+        recursive: "true",
+      });
+      const paths = response.data.tree
+        .filter((item: { type?: string }) => item.type === "blob")
+        .map((item: { path?: string }) => item.path as string);
+
+      if (response.data.truncated) {
+        this.logger.warn(
+          `Repository tree is truncated (${paths.length} files returned). Results may be incomplete for large repositories.`,
+        );
+      }
+
+      return paths;
+    } catch (e) {
+      throw new GitHubAPIError(`getRepoTree(${owner}/${repo}) failed: ${(e as Error).message}`);
+    }
+  }
+}
