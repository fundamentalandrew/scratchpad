diff --git a/code-review/05-interactive-output/implementation/deep_implement_config.json b/code-review/05-interactive-output/implementation/deep_implement_config.json
index c19e70e..d814466 100644
--- a/code-review/05-interactive-output/implementation/deep_implement_config.json
+++ b/code-review/05-interactive-output/implementation/deep_implement_config.json
@@ -31,6 +31,10 @@
     "section-04-output-formatters": {
       "status": "complete",
       "commit_hash": "079a8ce"
+    },
+    "section-05-interactive": {
+      "status": "complete",
+      "commit_hash": "a2fbbe9"
     }
   },
   "pre_commit": {
diff --git a/code-review/05-interactive-output/src/index.ts b/code-review/05-interactive-output/src/index.ts
index 98fe3bc..419531e 100644
--- a/code-review/05-interactive-output/src/index.ts
+++ b/code-review/05-interactive-output/src/index.ts
@@ -10,4 +10,8 @@ export type {
 export { formatPRComment } from "./formatters/pr-comment.js";
 export { formatMarkdownFile } from "./formatters/markdown-file.js";
 
+export { runInteractiveReview } from "./interactive.js";
+export { publishPRComment, PR_COMMENT_MARKER } from "./publishers/github.js";
+export { publishMarkdownFile } from "./publishers/file.js";
+
 // TODO: export { createOutputAgent } from "./output-agent.js"; (section-07)
diff --git a/code-review/05-interactive-output/src/publishers/file.ts b/code-review/05-interactive-output/src/publishers/file.ts
new file mode 100644
index 0000000..826afec
--- /dev/null
+++ b/code-review/05-interactive-output/src/publishers/file.ts
@@ -0,0 +1,13 @@
+import { writeFile, mkdir } from "node:fs/promises";
+import path from "node:path";
+import type { Logger } from "@core/utils/logger.js";
+
+export async function publishMarkdownFile(
+  content: string,
+  filePath: string,
+  logger: Logger,
+): Promise<void> {
+  await mkdir(path.dirname(filePath), { recursive: true });
+  await writeFile(filePath, content, "utf8");
+  logger.info(`Report written to ${filePath}`);
+}
diff --git a/code-review/05-interactive-output/src/publishers/github.ts b/code-review/05-interactive-output/src/publishers/github.ts
new file mode 100644
index 0000000..b9cc626
--- /dev/null
+++ b/code-review/05-interactive-output/src/publishers/github.ts
@@ -0,0 +1,43 @@
+import type { GitHubClient } from "@core/clients/github.js";
+import type { Logger } from "@core/utils/logger.js";
+
+export const PR_COMMENT_MARKER = "<!-- code-review-cli:report:v1 -->";
+const GITHUB_COMMENT_SIZE_LIMIT = 60_000;
+const TRUNCATION_NOTICE =
+  "\n\n> ⚠️ Report truncated due to GitHub comment size limits. Run with markdown output for the full report.";
+
+function truncateBody(body: string): string {
+  if (body.length <= GITHUB_COMMENT_SIZE_LIMIT) return body;
+
+  // Truncate from the end, leaving room for the notice
+  const maxContent = GITHUB_COMMENT_SIZE_LIMIT - TRUNCATION_NOTICE.length;
+  const truncated = body.slice(0, maxContent);
+
+  // Try to break at a line boundary
+  const lastNewline = truncated.lastIndexOf("\n");
+  const cleanTruncated = lastNewline > maxContent * 0.8 ? truncated.slice(0, lastNewline) : truncated;
+
+  return cleanTruncated + TRUNCATION_NOTICE;
+}
+
+export async function publishPRComment(
+  githubClient: GitHubClient,
+  owner: string,
+  repo: string,
+  prNumber: number,
+  body: string,
+  logger: Logger,
+): Promise<void> {
+  const finalBody = truncateBody(body);
+
+  const result = await githubClient.createOrUpdatePRComment(
+    owner,
+    repo,
+    prNumber,
+    finalBody,
+    PR_COMMENT_MARKER,
+  );
+
+  const action = result.updated ? "updated" : "created";
+  logger.info(`PR comment ${action} (ID: ${result.commentId})`);
+}
diff --git a/code-review/05-interactive-output/tests/publishers/file.test.ts b/code-review/05-interactive-output/tests/publishers/file.test.ts
new file mode 100644
index 0000000..69da8cc
--- /dev/null
+++ b/code-review/05-interactive-output/tests/publishers/file.test.ts
@@ -0,0 +1,63 @@
+import { describe, it, expect, vi, beforeEach } from "vitest";
+import type { Logger } from "@core/utils/logger.js";
+
+vi.mock("node:fs/promises", () => ({
+  writeFile: vi.fn().mockResolvedValue(undefined),
+  mkdir: vi.fn().mockResolvedValue(undefined),
+}));
+
+import { writeFile, mkdir } from "node:fs/promises";
+import { publishMarkdownFile } from "../../src/publishers/file.js";
+
+const mockedWriteFile = vi.mocked(writeFile);
+const mockedMkdir = vi.mocked(mkdir);
+
+function makeLogger(): Logger {
+  return {
+    info: vi.fn(),
+    warn: vi.fn(),
+    error: vi.fn(),
+    verbose: vi.fn(),
+    success: vi.fn(),
+  };
+}
+
+describe("publishMarkdownFile", () => {
+  let logger: Logger;
+
+  beforeEach(() => {
+    vi.clearAllMocks();
+    logger = makeLogger();
+  });
+
+  it("writes content to specified file path with utf8 encoding", async () => {
+    await publishMarkdownFile("# Report\nContent here", "/tmp/report.md", logger);
+
+    expect(mockedWriteFile).toHaveBeenCalledWith(
+      "/tmp/report.md",
+      "# Report\nContent here",
+      "utf8",
+    );
+  });
+
+  it("creates parent directories recursively when they don't exist", async () => {
+    await publishMarkdownFile("content", "/some/deep/path/report.md", logger);
+
+    expect(mockedMkdir).toHaveBeenCalledWith("/some/deep/path", { recursive: true });
+  });
+
+  it("logs output path on success", async () => {
+    await publishMarkdownFile("content", "/tmp/out.md", logger);
+
+    const msg = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
+    expect(msg).toContain("/tmp/out.md");
+  });
+
+  it("throws on write failure", async () => {
+    mockedWriteFile.mockRejectedValueOnce(new Error("disk full"));
+
+    await expect(
+      publishMarkdownFile("content", "/tmp/out.md", logger),
+    ).rejects.toThrow("disk full");
+  });
+});
diff --git a/code-review/05-interactive-output/tests/publishers/github.test.ts b/code-review/05-interactive-output/tests/publishers/github.test.ts
new file mode 100644
index 0000000..11e9bcd
--- /dev/null
+++ b/code-review/05-interactive-output/tests/publishers/github.test.ts
@@ -0,0 +1,100 @@
+import { describe, it, expect, vi, beforeEach } from "vitest";
+import type { Logger } from "@core/utils/logger.js";
+import type { GitHubClient } from "@core/clients/github.js";
+
+function makeLogger(): Logger {
+  return {
+    info: vi.fn(),
+    warn: vi.fn(),
+    error: vi.fn(),
+    verbose: vi.fn(),
+    success: vi.fn(),
+  };
+}
+
+function makeMockGitHubClient(
+  overrides: Partial<{
+    createOrUpdatePRComment: ReturnType<typeof vi.fn>;
+  }> = {},
+) {
+  return {
+    createOrUpdatePRComment:
+      overrides.createOrUpdatePRComment ??
+      vi.fn().mockResolvedValue({ commentId: 123, updated: false }),
+  } as unknown as GitHubClient;
+}
+
+import { publishPRComment, PR_COMMENT_MARKER } from "../../src/publishers/github.js";
+
+describe("publishPRComment", () => {
+  let logger: Logger;
+
+  beforeEach(() => {
+    logger = makeLogger();
+  });
+
+  it("calls createOrUpdatePRComment with correct arguments", async () => {
+    const mockClient = makeMockGitHubClient();
+    await publishPRComment(mockClient, "owner", "repo", 42, "body text", logger);
+
+    expect(mockClient.createOrUpdatePRComment).toHaveBeenCalledWith(
+      "owner",
+      "repo",
+      42,
+      "body text",
+      PR_COMMENT_MARKER,
+    );
+  });
+
+  it("logs success message on successful post", async () => {
+    const mockClient = makeMockGitHubClient();
+    await publishPRComment(mockClient, "owner", "repo", 42, "body", logger);
+
+    expect(logger.info).toHaveBeenCalled();
+    const msg = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0][0];
+    expect(msg).toContain("123");
+  });
+
+  it("logs 'created' when comment is new", async () => {
+    const mockClient = makeMockGitHubClient({
+      createOrUpdatePRComment: vi.fn().mockResolvedValue({ commentId: 10, updated: false }),
+    });
+    await publishPRComment(mockClient, "owner", "repo", 1, "body", logger);
+
+    const msg = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
+    expect(msg.toLowerCase()).toContain("created");
+  });
+
+  it("logs 'updated' when comment already existed", async () => {
+    const mockClient = makeMockGitHubClient({
+      createOrUpdatePRComment: vi.fn().mockResolvedValue({ commentId: 10, updated: true }),
+    });
+    await publishPRComment(mockClient, "owner", "repo", 1, "body", logger);
+
+    const msg = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
+    expect(msg.toLowerCase()).toContain("updated");
+  });
+
+  it("throws on GitHub API failure", async () => {
+    const mockClient = makeMockGitHubClient({
+      createOrUpdatePRComment: vi.fn().mockRejectedValue(new Error("API error")),
+    });
+
+    await expect(
+      publishPRComment(mockClient, "owner", "repo", 1, "body", logger),
+    ).rejects.toThrow("API error");
+  });
+
+  it("truncates body when exceeding 60k chars, appending truncation notice", async () => {
+    const longBody = "A".repeat(70_000);
+    const mockFn = vi.fn().mockResolvedValue({ commentId: 1, updated: false });
+    const mockClient = makeMockGitHubClient({ createOrUpdatePRComment: mockFn });
+
+    await publishPRComment(mockClient, "owner", "repo", 1, longBody, logger);
+
+    const postedBody = mockFn.mock.calls[0][3] as string;
+    expect(postedBody.length).toBeLessThanOrEqual(60_000);
+    expect(postedBody).toContain("truncated");
+    expect(postedBody).toContain("markdown");
+  });
+});
