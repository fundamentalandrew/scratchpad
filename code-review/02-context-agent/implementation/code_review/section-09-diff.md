diff --git a/code-review/02-context-agent/src/integration.test.ts b/code-review/02-context-agent/src/integration.test.ts
new file mode 100644
index 0000000..c0475d1
--- /dev/null
+++ b/code-review/02-context-agent/src/integration.test.ts
@@ -0,0 +1,252 @@
+import { describe, it, expect, vi, beforeEach } from "vitest";
+import { ContextOutputSchema, AnalysisOutputSchema } from "@core/agents/schemas.js";
+import type { GitHubClient } from "@core/clients/github.js";
+import { defaultConfig } from "@core/config/schema.js";
+import { createLogger } from "@core/utils/logger.js";
+import { runPipeline } from "@core/pipeline/runner.js";
+import { createStubAnalysisAgent } from "@core/agents/stubs.js";
+import { createContextAgent } from "./context-agent.js";
+
+const logger = createLogger({ verbose: false });
+
+// Config with empty ignorePatterns so filtering doesn't interfere
+const testConfig = { ...defaultConfig, ignorePatterns: [] as string[] };
+
+function createFullPRMock(): GitHubClient {
+  const mock = {
+    getPR: vi.fn().mockResolvedValue({
+      title: "Add user authentication",
+      description: "Fixes #42\n\nAdds JWT-based auth to the API layer.",
+      author: "alice",
+      state: "open",
+      baseBranch: "main",
+      headBranch: "feature/auth",
+      headSha: "abc123def",
+      baseSha: "fed321cba",
+    }),
+    getPRFiles: vi.fn().mockResolvedValue([
+      { path: "src/auth.ts", status: "added", additions: 80, deletions: 0, patch: "@@ -0,0 +1,80 @@\n+export class Auth {}" },
+      { path: "src/middleware.ts", status: "modified", additions: 15, deletions: 3, patch: "@@ -10,3 +10,15 @@" },
+      { path: "src/routes.ts", status: "renamed", additions: 2, deletions: 1, patch: "@@ -1 +1,2 @@", previous_filename: "src/old-routes.ts" },
+    ]),
+    getPRDiff: vi.fn().mockResolvedValue(
+      "diff --git a/src/auth.ts b/src/auth.ts\n--- /dev/null\n+++ b/src/auth.ts\n@@ -0,0 +1 @@\n+export class Auth {}",
+    ),
+    getReviewComments: vi.fn().mockResolvedValue([
+      {
+        id: 101,
+        author: "bob",
+        body: "Consider using bcrypt for password hashing.",
+        path: "src/auth.ts",
+        line: 42,
+        createdAt: "2025-01-15T10:30:00Z",
+      },
+    ]),
+    getReferencedIssues: vi.fn().mockResolvedValue([
+      { number: 42, title: "Need user authentication", state: "open", body: "We need JWT auth." },
+    ]),
+    getFileContent: vi.fn().mockImplementation(
+      async (_owner: string, _repo: string, path: string, _ref?: string) => {
+        if (path === "DOMAIN_RULES.md") return "# Domain Rules\n\nAll auth must use JWT.";
+        if (path === "ARCHITECTURE.md") return "# Architecture\n\nMVC pattern.";
+        return null;
+      },
+    ),
+    getRepoTree: vi.fn().mockResolvedValue([]),
+    postPRComment: vi.fn().mockResolvedValue(undefined),
+  } as unknown as GitHubClient;
+  return mock;
+}
+
+function createFullRepoMock(): GitHubClient {
+  const mock = {
+    getPR: vi.fn(),
+    getPRFiles: vi.fn(),
+    getPRDiff: vi.fn(),
+    getReviewComments: vi.fn(),
+    getReferencedIssues: vi.fn(),
+    getRepoTree: vi.fn().mockResolvedValue([
+      "package.json",
+      "tsconfig.json",
+      "src/index.ts",
+      "src/utils.ts",
+      "README.md",
+    ]),
+    getFileContent: vi.fn().mockImplementation(
+      async (_owner: string, _repo: string, path: string, _ref?: string) => {
+        if (path === "package.json") {
+          return JSON.stringify({
+            name: "test-project",
+            dependencies: { react: "^18.0.0", express: "^4.18.0" },
+            devDependencies: { typescript: "^5.0.0", vitest: "^1.0.0" },
+          });
+        }
+        if (path === "DOMAIN_RULES.md") return "# Domain Rules\n\nUse functional components.";
+        if (path === "ARCHITECTURE.md") return "# Architecture\n\nComponent-based.";
+        return null;
+      },
+    ),
+    postPRComment: vi.fn().mockResolvedValue(undefined),
+  } as unknown as GitHubClient;
+  return mock;
+}
+
+describe("Integration: Context Agent", () => {
+  beforeEach(() => {
+    vi.restoreAllMocks();
+  });
+
+  it("full PR mode flow — output passes ContextOutputSchema.safeParse()", async () => {
+    const mockGitHub = createFullPRMock();
+    const agent = createContextAgent({ github: mockGitHub, logger });
+
+    const result = await agent.run({
+      mode: "pr",
+      owner: "test-org",
+      repo: "test-repo",
+      number: 99,
+      config: testConfig,
+    });
+
+    const parsed = ContextOutputSchema.safeParse(result);
+    expect(parsed.success).toBe(true);
+
+    // Verify key fields
+    expect(result.referencedIssues).toBeDefined();
+    expect(result.referencedIssues!.length).toBeGreaterThan(0);
+    expect(result.comments).toBeDefined();
+    expect(result.comments!.length).toBeGreaterThan(0);
+    expect(result.pr).toBeDefined();
+    expect(result.pr!.files).toHaveLength(3);
+    expect(result.domainRules).not.toBeNull();
+  });
+
+  it("full repo mode flow — output passes ContextOutputSchema.safeParse()", async () => {
+    const mockGitHub = createFullRepoMock();
+    const agent = createContextAgent({ github: mockGitHub, logger });
+
+    const result = await agent.run({
+      mode: "repo",
+      owner: "test-org",
+      repo: "test-repo",
+      config: testConfig,
+    });
+
+    const parsed = ContextOutputSchema.safeParse(result);
+    expect(parsed.success).toBe(true);
+
+    // Verify repo-specific fields
+    expect(result.repoFiles).toBeDefined();
+    expect(result.repoFiles!.length).toBeGreaterThan(0);
+    expect(result.techStack).toBeDefined();
+    expect(result.techStack!.languages).toContain("JavaScript");
+    expect(result.techStack!.languages).toContain("TypeScript");
+    expect(result.techStack!.frameworks).toContain("React");
+    expect(result.techStack!.frameworks).toContain("Express");
+    expect(result.domainRules).not.toBeNull();
+  });
+
+  it("PR mode with no domain rules, no linked issues, no comments — still valid output", async () => {
+    const mockGitHub = {
+      getPR: vi.fn().mockResolvedValue({
+        title: "Chore: update deps",
+        description: "",
+        author: "alice",
+        state: "open",
+        baseBranch: "main",
+        headBranch: "chore/deps",
+        headSha: "aaa111",
+        baseSha: "bbb222",
+      }),
+      getPRFiles: vi.fn().mockResolvedValue([
+        { path: "package.json", status: "modified", additions: 2, deletions: 2, patch: "@@ -1 +1 @@" },
+      ]),
+      getPRDiff: vi.fn().mockResolvedValue("diff --git a/package.json b/package.json"),
+      getReviewComments: vi.fn().mockResolvedValue([]),
+      getReferencedIssues: vi.fn().mockResolvedValue([]),
+      getFileContent: vi.fn().mockResolvedValue(null),
+      getRepoTree: vi.fn().mockResolvedValue([]),
+      postPRComment: vi.fn().mockResolvedValue(undefined),
+    } as unknown as GitHubClient;
+
+    const agent = createContextAgent({ github: mockGitHub, logger });
+
+    const result = await agent.run({
+      mode: "pr",
+      owner: "test-org",
+      repo: "test-repo",
+      number: 50,
+      config: testConfig,
+    });
+
+    const parsed = ContextOutputSchema.safeParse(result);
+    expect(parsed.success).toBe(true);
+
+    expect(result.referencedIssues).toEqual([]);
+    expect(result.comments).toEqual([]);
+    expect(result.domainRules).toBeNull();
+  });
+
+  it("repo mode with no manifests, no domain rules — still valid output with empty techStack", async () => {
+    const mockGitHub = {
+      getPR: vi.fn(),
+      getPRFiles: vi.fn(),
+      getPRDiff: vi.fn(),
+      getReviewComments: vi.fn(),
+      getReferencedIssues: vi.fn(),
+      getRepoTree: vi.fn().mockResolvedValue([
+        "docs/readme.txt",
+        "notes.md",
+        "data/report.csv",
+      ]),
+      getFileContent: vi.fn().mockResolvedValue(null),
+      postPRComment: vi.fn().mockResolvedValue(undefined),
+    } as unknown as GitHubClient;
+
+    const agent = createContextAgent({ github: mockGitHub, logger });
+
+    const result = await agent.run({
+      mode: "repo",
+      owner: "test-org",
+      repo: "test-repo",
+      config: testConfig,
+    });
+
+    const parsed = ContextOutputSchema.safeParse(result);
+    expect(parsed.success).toBe(true);
+
+    expect(result.techStack).toBeDefined();
+    expect(result.techStack!.languages).toEqual([]);
+    expect(result.techStack!.frameworks).toEqual([]);
+    expect(result.techStack!.dependencies).toEqual({});
+    expect(result.domainRules).toBeNull();
+    expect(result.architectureDoc).toBeNull();
+  });
+
+  it("pipeline integration — ContextAgent output feeds into StubAnalysisAgent", async () => {
+    const mockGitHub = createFullPRMock();
+    const contextAgent = createContextAgent({ github: mockGitHub, logger });
+    const analysisAgent = createStubAnalysisAgent(logger);
+
+    const result = await runPipeline(
+      [contextAgent, analysisAgent],
+      {
+        mode: "pr",
+        owner: "test-org",
+        repo: "test-repo",
+        number: 99,
+        config: testConfig,
+      },
+      { logger },
+    );
+
+    expect(result.stages).toHaveLength(2);
+    expect(result.stages[0].success).toBe(true);
+    expect(result.stages[0].agentName).toBe("ContextAgent");
+    expect(result.stages[1].success).toBe(true);
+    expect(result.stages[1].agentName).toBe("StubAnalysisAgent");
+
+    const analysisParsed = AnalysisOutputSchema.safeParse(result.output);
+    expect(analysisParsed.success).toBe(true);
+  });
+});
