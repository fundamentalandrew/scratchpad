diff --git a/code-review/01-core-infrastructure/src/clients/github.test.ts b/code-review/01-core-infrastructure/src/clients/github.test.ts
index 02bd7e7..6c01ba0 100644
--- a/code-review/01-core-infrastructure/src/clients/github.test.ts
+++ b/code-review/01-core-infrastructure/src/clients/github.test.ts
@@ -10,15 +10,19 @@ vi.mock("child_process", () => ({ execSync: mockExecSync }));
 // Mock Octokit with plugins
 const mockPullsGet = vi.hoisted(() => vi.fn());
 const mockPullsListFiles = vi.hoisted(() => vi.fn());
+const mockPullsListReviewComments = vi.hoisted(() => vi.fn());
 const mockIssuesCreateComment = vi.hoisted(() => vi.fn());
+const mockIssuesGet = vi.hoisted(() => vi.fn());
+const mockReposGetContent = vi.hoisted(() => vi.fn());
 const mockGitGetTree = vi.hoisted(() => vi.fn());
 const mockPaginate = vi.hoisted(() => vi.fn());
 
 vi.mock("@octokit/rest", () => {
   class MockOctokit {
     rest = {
-      pulls: { get: mockPullsGet, listFiles: mockPullsListFiles },
-      issues: { createComment: mockIssuesCreateComment },
+      pulls: { get: mockPullsGet, listFiles: mockPullsListFiles, listReviewComments: mockPullsListReviewComments },
+      issues: { createComment: mockIssuesCreateComment, get: mockIssuesGet },
+      repos: { getContent: mockReposGetContent },
       git: { getTree: mockGitGetTree },
     };
     paginate = mockPaginate;
@@ -108,15 +112,15 @@ describe("GitHubClient", () => {
     client = new GitHubClient({ token: "ghp_test", logger });
   });
 
-  it("getPR returns typed PR metadata object", async () => {
+  it("getPR returns typed PR metadata object with headSha and baseSha", async () => {
     mockPullsGet.mockResolvedValueOnce({
       data: {
         title: "Fix bug",
         body: "Fixes #123",
         user: { login: "alice" },
         state: "open",
-        base: { ref: "main" },
-        head: { ref: "fix-bug" },
+        base: { ref: "main", sha: "base-sha-abc" },
+        head: { ref: "fix-bug", sha: "head-sha-def" },
       },
     });
 
@@ -128,6 +132,8 @@ describe("GitHubClient", () => {
       state: "open",
       baseBranch: "main",
       headBranch: "fix-bug",
+      headSha: "head-sha-def",
+      baseSha: "base-sha-abc",
     });
   });
 
@@ -216,4 +222,162 @@ describe("GitHubClient", () => {
       body: "LGTM!",
     });
   });
+
+  it("getPRFiles includes previousPath for renamed files", async () => {
+    mockPaginate.mockResolvedValueOnce([
+      { filename: "new/path.ts", status: "renamed", additions: 0, deletions: 0, patch: null, previous_filename: "old/path.ts" },
+    ]);
+
+    const files = await client.getPRFiles("owner", "repo", 1);
+    expect(files[0].previousPath).toBe("old/path.ts");
+  });
+
+  describe("getFileContent", () => {
+    it("fetches and base64-decodes file content", async () => {
+      mockReposGetContent.mockResolvedValueOnce({
+        data: { type: "file", content: Buffer.from("hello").toString("base64"), encoding: "base64" },
+      });
+      const result = await client.getFileContent("owner", "repo", "src/index.ts");
+      expect(result).toBe("hello");
+    });
+
+    it("returns null for 404 (file not found)", async () => {
+      const err = new Error("Not Found");
+      (err as unknown as Record<string, unknown>).status = 404;
+      mockReposGetContent.mockRejectedValueOnce(err);
+      const result = await client.getFileContent("owner", "repo", "missing.ts");
+      expect(result).toBeNull();
+    });
+
+    it("returns null when response is array (directory listing)", async () => {
+      mockReposGetContent.mockResolvedValueOnce({
+        data: [{ path: "subdir/file.ts" }],
+      });
+      const result = await client.getFileContent("owner", "repo", "subdir");
+      expect(result).toBeNull();
+    });
+
+    it("returns null for symlink type responses", async () => {
+      mockReposGetContent.mockResolvedValueOnce({
+        data: { type: "symlink", content: "", encoding: "base64" },
+      });
+      const result = await client.getFileContent("owner", "repo", "link.ts");
+      expect(result).toBeNull();
+    });
+
+    it("returns null and logs warning for sensitive file paths", async () => {
+      const sensitiveFiles = [".env", "certs/server.pem", "keys/id_rsa", "secrets.json", "app.key", ".credentials"];
+      for (const path of sensitiveFiles) {
+        const result = await client.getFileContent("owner", "repo", path);
+        expect(result).toBeNull();
+      }
+      expect(mockReposGetContent).not.toHaveBeenCalled();
+      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("sensitive"));
+    });
+
+    it("passes ref parameter when provided", async () => {
+      mockReposGetContent.mockResolvedValueOnce({
+        data: { type: "file", content: Buffer.from("content").toString("base64"), encoding: "base64" },
+      });
+      await client.getFileContent("owner", "repo", "file.ts", "abc123");
+      expect(mockReposGetContent).toHaveBeenCalledWith({ owner: "owner", repo: "repo", path: "file.ts", ref: "abc123" });
+    });
+
+    it("throws GitHubAPIError for non-404 errors", async () => {
+      const err = new Error("Internal Server Error");
+      (err as unknown as Record<string, unknown>).status = 500;
+      mockReposGetContent.mockRejectedValueOnce(err);
+      await expect(client.getFileContent("owner", "repo", "file.ts")).rejects.toThrow(GitHubAPIError);
+    });
+  });
+
+  describe("getReviewComments", () => {
+    it("fetches and maps review comments", async () => {
+      mockPaginate.mockResolvedValueOnce([
+        { id: 1, user: { login: "bob" }, body: "Fix this", path: "src/a.ts", original_line: 10, created_at: "2024-01-01T00:00:00Z" },
+      ]);
+      const comments = await client.getReviewComments("owner", "repo", 1);
+      expect(comments).toEqual([
+        { id: 1, author: "bob", body: "Fix this", path: "src/a.ts", line: 10, createdAt: "2024-01-01T00:00:00Z" },
+      ]);
+    });
+
+    it("paginates correctly", async () => {
+      mockPaginate.mockResolvedValueOnce([]);
+      await client.getReviewComments("owner", "repo", 1);
+      expect(mockPaginate).toHaveBeenCalledWith(
+        mockPullsListReviewComments,
+        { owner: "owner", repo: "repo", pull_number: 1, per_page: 100 },
+      );
+    });
+
+    it("handles comments without path/line", async () => {
+      mockPaginate.mockResolvedValueOnce([
+        { id: 2, user: { login: "alice" }, body: "General note", path: undefined, original_line: undefined, line: undefined, created_at: "2024-01-01T00:00:00Z" },
+      ]);
+      const comments = await client.getReviewComments("owner", "repo", 1);
+      expect(comments[0].path).toBeUndefined();
+      expect(comments[0].line).toBeUndefined();
+    });
+
+    it("returns empty array on 403", async () => {
+      const err = new Error("Forbidden");
+      (err as unknown as Record<string, unknown>).status = 403;
+      mockPaginate.mockRejectedValueOnce(err);
+      const result = await client.getReviewComments("owner", "repo", 1);
+      expect(result).toEqual([]);
+      expect(logger.warn).toHaveBeenCalled();
+    });
+
+    it("returns empty array when no comments exist", async () => {
+      mockPaginate.mockResolvedValueOnce([]);
+      const result = await client.getReviewComments("owner", "repo", 1);
+      expect(result).toEqual([]);
+    });
+  });
+
+  describe("getReferencedIssues", () => {
+    it("fetches same-repo issues by number", async () => {
+      mockIssuesGet
+        .mockResolvedValueOnce({ data: { number: 1, title: "Bug A", state: "open", body: "desc A" } })
+        .mockResolvedValueOnce({ data: { number: 2, title: "Bug B", state: "closed", body: "desc B" } });
+      const issues = await client.getReferencedIssues("owner", "repo", [1, 2]);
+      expect(issues).toEqual([
+        { number: 1, title: "Bug A", state: "open", body: "desc A" },
+        { number: 2, title: "Bug B", state: "closed", body: "desc B" },
+      ]);
+    });
+
+    it("fetches cross-repo issues using provided owner/repo", async () => {
+      mockIssuesGet.mockResolvedValueOnce({ data: { number: 5, title: "Lib issue", state: "open", body: "lib desc" } });
+      const issues = await client.getReferencedIssues("owner", "repo", [], [{ owner: "other", repo: "lib", number: 5 }]);
+      expect(mockIssuesGet).toHaveBeenCalledWith({ owner: "other", repo: "lib", issue_number: 5 });
+      expect(issues[0].owner).toBe("other");
+      expect(issues[0].repo).toBe("lib");
+    });
+
+    it("skips issues that return 404", async () => {
+      mockIssuesGet.mockResolvedValueOnce({ data: { number: 1, title: "Bug A", state: "open", body: "desc" } });
+      const err = new Error("Not Found");
+      (err as unknown as Record<string, unknown>).status = 404;
+      mockIssuesGet.mockRejectedValueOnce(err);
+      const issues = await client.getReferencedIssues("owner", "repo", [1, 2]);
+      expect(issues).toHaveLength(1);
+      expect(logger.warn).toHaveBeenCalled();
+    });
+
+    it("skips issues that return 403", async () => {
+      const err = new Error("Forbidden");
+      (err as unknown as Record<string, unknown>).status = 403;
+      mockIssuesGet.mockRejectedValueOnce(err);
+      const issues = await client.getReferencedIssues("owner", "repo", [1]);
+      expect(issues).toHaveLength(0);
+      expect(logger.warn).toHaveBeenCalled();
+    });
+
+    it("returns empty array when given empty issue list", async () => {
+      const issues = await client.getReferencedIssues("owner", "repo", []);
+      expect(issues).toEqual([]);
+    });
+  });
 });
diff --git a/code-review/01-core-infrastructure/src/clients/github.ts b/code-review/01-core-infrastructure/src/clients/github.ts
index 2363bb8..dcef724 100644
--- a/code-review/01-core-infrastructure/src/clients/github.ts
+++ b/code-review/01-core-infrastructure/src/clients/github.ts
@@ -7,6 +7,20 @@ import type { Logger } from "../utils/logger.js";
 
 const ThrottledOctokit = Octokit.plugin(throttling, retry);
 
+const SENSITIVE_EXTENSIONS = [".pem", ".key", ".p12", ".pfx"];
+const SENSITIVE_NAMES = ["id_rsa", "id_ed25519", ".credentials", "credentials.json"];
+
+function isSensitivePath(filePath: string): boolean {
+  const basename = filePath.split("/").pop() ?? filePath;
+  if (basename === ".env" || basename.startsWith(".env.")) return true;
+  if (basename.startsWith("secrets.")) return true;
+  if (SENSITIVE_NAMES.includes(basename)) return true;
+  for (const ext of SENSITIVE_EXTENSIONS) {
+    if (basename.endsWith(ext)) return true;
+  }
+  return false;
+}
+
 export function resolveGitHubToken(config: { githubToken?: string }, logger: Logger): string {
   if (process.env.GITHUB_TOKEN) {
     return process.env.GITHUB_TOKEN;
@@ -61,6 +75,8 @@ export class GitHubClient {
     state: string;
     baseBranch: string;
     headBranch: string;
+    headSha: string;
+    baseSha: string;
   }> {
     this.logger.verbose(`GitHub API: getPR(${owner}/${repo}#${number})`);
     try {
@@ -72,6 +88,8 @@ export class GitHubClient {
         state: data.state,
         baseBranch: data.base.ref,
         headBranch: data.head.ref,
+        headSha: data.head.sha,
+        baseSha: data.base.sha,
       };
     } catch (e) {
       throw new GitHubAPIError(`getPR(${owner}/${repo}#${number}) failed: ${(e as Error).message}`, { cause: e as Error });
@@ -84,6 +102,7 @@ export class GitHubClient {
     additions: number;
     deletions: number;
     patch?: string | null;
+    previousPath?: string;
   }>> {
     this.logger.verbose(`GitHub API: getPRFiles(${owner}/${repo}#${number})`);
     try {
@@ -99,6 +118,7 @@ export class GitHubClient {
         additions: f.additions as number,
         deletions: f.deletions as number,
         patch: f.patch as string | null | undefined,
+        previousPath: f.previous_filename as string | undefined,
       }));
     } catch (e) {
       throw new GitHubAPIError(`getPRFiles(${owner}/${repo}#${number}) failed: ${(e as Error).message}`, { cause: e as Error });
@@ -134,6 +154,107 @@ export class GitHubClient {
     }
   }
 
+  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string | null> {
+    if (isSensitivePath(path)) {
+      this.logger.warn(`Skipping sensitive file: ${path}`);
+      return null;
+    }
+    this.logger.verbose(`GitHub API: getFileContent(${owner}/${repo}/${path}${ref ? `@${ref}` : ""})`);
+    try {
+      const { data } = await this.octokit.rest.repos.getContent({
+        owner,
+        repo,
+        path,
+        ...(ref ? { ref } : {}),
+      });
+      if (Array.isArray(data)) return null;
+      if ((data as { type: string }).type !== "file") return null;
+      const content = (data as { content: string }).content;
+      return Buffer.from(content, "base64").toString("utf-8");
+    } catch (e) {
+      if ((e as { status?: number }).status === 404) return null;
+      throw new GitHubAPIError(`getFileContent(${owner}/${repo}/${path}) failed: ${(e as Error).message}`, { cause: e as Error });
+    }
+  }
+
+  async getReviewComments(owner: string, repo: string, prNumber: number): Promise<Array<{
+    id: number;
+    author: string;
+    body: string;
+    path?: string;
+    line?: number;
+    createdAt: string;
+  }>> {
+    this.logger.verbose(`GitHub API: getReviewComments(${owner}/${repo}#${prNumber})`);
+    try {
+      const comments = await this.octokit.paginate(this.octokit.rest.pulls.listReviewComments, {
+        owner,
+        repo,
+        pull_number: prNumber,
+        per_page: 100,
+      });
+      return (comments as Array<Record<string, unknown>>).map((c) => ({
+        id: c.id as number,
+        author: (c.user as { login: string })?.login ?? "unknown",
+        body: c.body as string,
+        path: c.path as string | undefined,
+        line: (c.original_line ?? c.line) as number | undefined,
+        createdAt: c.created_at as string,
+      }));
+    } catch (e) {
+      if ((e as { status?: number }).status === 403) {
+        this.logger.warn(`Insufficient permissions to fetch review comments for ${owner}/${repo}#${prNumber}`);
+        return [];
+      }
+      throw new GitHubAPIError(`getReviewComments(${owner}/${repo}#${prNumber}) failed: ${(e as Error).message}`, { cause: e as Error });
+    }
+  }
+
+  async getReferencedIssues(
+    owner: string,
+    repo: string,
+    issueNumbers: number[],
+    crossRepoRefs?: Array<{ owner: string; repo: string; number: number }>,
+  ): Promise<Array<{ number: number; title: string; state: string; body?: string; owner?: string; repo?: string }>> {
+    const tasks: Array<{ owner: string; repo: string; number: number; isCrossRepo: boolean }> = [
+      ...issueNumbers.map((n) => ({ owner, repo, number: n, isCrossRepo: false })),
+      ...(crossRepoRefs ?? []).map((r) => ({ owner: r.owner, repo: r.repo, number: r.number, isCrossRepo: true })),
+    ];
+
+    if (tasks.length === 0) return [];
+
+    this.logger.verbose(`GitHub API: getReferencedIssues(${tasks.length} issues)`);
+
+    const results = await Promise.allSettled(
+      tasks.map(async (t) => {
+        const { data } = await this.octokit.rest.issues.get({
+          owner: t.owner,
+          repo: t.repo,
+          issue_number: t.number,
+        });
+        return {
+          number: data.number as number,
+          title: data.title as string,
+          state: data.state as string,
+          body: data.body as string | undefined,
+          ...(t.isCrossRepo ? { owner: t.owner, repo: t.repo } : {}),
+        };
+      }),
+    );
+
+    const issues: Array<{ number: number; title: string; state: string; body?: string; owner?: string; repo?: string }> = [];
+    for (const result of results) {
+      if (result.status === "fulfilled") {
+        issues.push(result.value);
+      } else {
+        const status = (result.reason as { status?: number }).status;
+        this.logger.warn(`Failed to fetch issue: ${result.reason?.message ?? "unknown error"} (status: ${status})`);
+      }
+    }
+
+    return issues;
+  }
+
   async getRepoTree(owner: string, repo: string, branch?: string): Promise<string[]> {
     this.logger.verbose(`GitHub API: getRepoTree(${owner}/${repo}@${branch ?? "HEAD"})`);
     try {
