diff --git a/code-review/02-context-agent/src/context-agent.test.ts b/code-review/02-context-agent/src/context-agent.test.ts
index 9f5b523..6caca39 100644
--- a/code-review/02-context-agent/src/context-agent.test.ts
+++ b/code-review/02-context-agent/src/context-agent.test.ts
@@ -15,14 +15,19 @@ vi.mock("@core/utils/issue-parser.js", () => ({
 vi.mock("@core/context/domain-rules.js", () => ({
   loadDomainRules: vi.fn().mockResolvedValue({ domainRules: null, architectureDoc: null }),
 }));
+vi.mock("@core/context/tech-stack.js", () => ({
+  detectTechStack: vi.fn().mockResolvedValue({ languages: [], frameworks: [], dependencies: {} }),
+}));
 
 import { filterFiles } from "@core/utils/file-filter.js";
 import { parseClosingReferences } from "@core/utils/issue-parser.js";
 import { loadDomainRules } from "@core/context/domain-rules.js";
+import { detectTechStack } from "@core/context/tech-stack.js";
 
 const mockedFilterFiles = vi.mocked(filterFiles);
 const mockedParseClosingReferences = vi.mocked(parseClosingReferences);
 const mockedLoadDomainRules = vi.mocked(loadDomainRules);
+const mockedDetectTechStack = vi.mocked(detectTechStack);
 
 function createMockGitHub() {
   return {
@@ -346,3 +351,202 @@ describe("createContextAgent — PR mode", () => {
     expect(agent.idempotent).toBe(true);
   });
 });
+
+describe("createContextAgent — Repo mode", () => {
+  let mockGitHub: ReturnType<typeof createMockGitHub>;
+
+  beforeEach(() => {
+    vi.clearAllMocks();
+    mockGitHub = createMockGitHub();
+    (mockGitHub.getRepoTree as ReturnType<typeof vi.fn>).mockResolvedValue([
+      "src/index.ts",
+      "src/utils.ts",
+      "package.json",
+      "README.md",
+    ]);
+    mockedFilterFiles.mockImplementation(<T>(files: T[]) => files);
+    mockedLoadDomainRules.mockResolvedValue({ domainRules: null, architectureDoc: null });
+    mockedDetectTechStack.mockResolvedValue({ languages: [], frameworks: [], dependencies: {} });
+  });
+
+  it("produces valid ContextOutput for a repo (passes schema validation)", async () => {
+    mockedLoadDomainRules.mockResolvedValue({ domainRules: "some rules", architectureDoc: null });
+    mockedDetectTechStack.mockResolvedValue({
+      languages: ["TypeScript"],
+      frameworks: ["React"],
+      dependencies: { react: "^18.0.0" },
+    });
+
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "repo",
+      owner: "testorg",
+      repo: "testrepo",
+      config: defaultConfig,
+    });
+
+    const parsed = ContextOutputSchema.safeParse(result);
+    expect(parsed.success).toBe(true);
+    expect(result.mode).toBe("repo");
+    expect(result.repoFiles).toBeDefined();
+    expect(result.techStack).toBeDefined();
+  });
+
+  it("fetches file tree and applies ignorePatterns", async () => {
+    (mockGitHub.getRepoTree as ReturnType<typeof vi.fn>).mockResolvedValue([
+      "node_modules/foo.js",
+      "src/index.ts",
+      "dist/bundle.js",
+    ]);
+    mockedFilterFiles.mockReturnValue(["src/index.ts"]);
+
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "repo",
+      owner: "testorg",
+      repo: "testrepo",
+      config: defaultConfig,
+    });
+
+    expect(mockedFilterFiles).toHaveBeenCalledWith(
+      ["node_modules/foo.js", "src/index.ts", "dist/bundle.js"],
+      defaultConfig.ignorePatterns,
+      expect.any(Function),
+    );
+    expect(result.repoFiles).toHaveLength(1);
+    expect(result.repoFiles![0].path).toBe("src/index.ts");
+  });
+
+  it("detects tech stack from manifest files", async () => {
+    const techStack = {
+      languages: ["TypeScript"],
+      frameworks: ["React"],
+      dependencies: { react: "^18.0.0" },
+    };
+    mockedDetectTechStack.mockResolvedValue(techStack);
+
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "repo",
+      owner: "testorg",
+      repo: "testrepo",
+      config: defaultConfig,
+    });
+
+    expect(mockedDetectTechStack).toHaveBeenCalledWith(
+      expect.objectContaining({
+        owner: "testorg",
+        repo: "testrepo",
+        filePaths: expect.any(Array),
+      }),
+    );
+    expect(result.techStack).toEqual(techStack);
+  });
+
+  it("loads domain rules and architecture doc", async () => {
+    mockedLoadDomainRules.mockResolvedValue({
+      domainRules: "rules content",
+      architectureDoc: "arch content",
+    });
+
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "repo",
+      owner: "testorg",
+      repo: "testrepo",
+      config: defaultConfig,
+    });
+
+    expect(result.domainRules).toBe("rules content");
+    expect(result.architectureDoc).toBe("arch content");
+  });
+
+  it("sets repoFiles array from filtered tree", async () => {
+    (mockGitHub.getRepoTree as ReturnType<typeof vi.fn>).mockResolvedValue([
+      "src/a.ts",
+      "src/b.ts",
+      "README.md",
+    ]);
+
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "repo",
+      owner: "testorg",
+      repo: "testrepo",
+      config: defaultConfig,
+    });
+
+    expect(result.repoFiles).toHaveLength(3);
+    expect(result.repoFiles!.map((f) => f.path)).toEqual(["src/a.ts", "src/b.ts", "README.md"]);
+  });
+
+  it("does not include pr field in output", async () => {
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "repo",
+      owner: "testorg",
+      repo: "testrepo",
+      config: defaultConfig,
+    });
+
+    expect(result.pr).toBeUndefined();
+  });
+
+  it("throws when owner is empty", async () => {
+    const agent = createContextAgent({ github: mockGitHub });
+    await expect(
+      agent.run({
+        mode: "repo",
+        owner: "",
+        repo: "testrepo",
+        config: defaultConfig,
+      }),
+    ).rejects.toThrow(/owner/i);
+  });
+
+  it("throws when repo is empty", async () => {
+    const agent = createContextAgent({ github: mockGitHub });
+    await expect(
+      agent.run({
+        mode: "repo",
+        owner: "testorg",
+        repo: "",
+        config: defaultConfig,
+      }),
+    ).rejects.toThrow(/repo/i);
+  });
+
+  it("propagates GitHubAPIError from getRepoTree", async () => {
+    (mockGitHub.getRepoTree as ReturnType<typeof vi.fn>).mockRejectedValue(
+      new GitHubAPIError("getRepoTree failed"),
+    );
+
+    const agent = createContextAgent({ github: mockGitHub });
+    await expect(
+      agent.run({
+        mode: "repo",
+        owner: "testorg",
+        repo: "testrepo",
+        config: defaultConfig,
+      }),
+    ).rejects.toThrow(GitHubAPIError);
+  });
+
+  it("handles truncated tree (still produces valid output)", async () => {
+    // getRepoTree handles truncation internally (logs warning)
+    // Agent should still produce valid output with partial results
+    (mockGitHub.getRepoTree as ReturnType<typeof vi.fn>).mockResolvedValue(["src/partial.ts"]);
+
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "repo",
+      owner: "testorg",
+      repo: "testrepo",
+      config: defaultConfig,
+    });
+
+    const parsed = ContextOutputSchema.safeParse(result);
+    expect(parsed.success).toBe(true);
+    expect(result.repoFiles).toHaveLength(1);
+  });
+});
diff --git a/code-review/02-context-agent/src/context-agent.ts b/code-review/02-context-agent/src/context-agent.ts
index 2b40784..9175b4d 100644
--- a/code-review/02-context-agent/src/context-agent.ts
+++ b/code-review/02-context-agent/src/context-agent.ts
@@ -6,6 +6,7 @@ import type { Logger } from "@core/utils/logger.js";
 import { filterFiles } from "@core/utils/file-filter.js";
 import { parseClosingReferences } from "@core/utils/issue-parser.js";
 import { loadDomainRules } from "@core/context/domain-rules.js";
+import { detectTechStack } from "@core/context/tech-stack.js";
 
 export interface ContextAgentInput {
   mode: "pr" | "repo";
@@ -41,7 +42,7 @@ export function createContextAgent(options: {
         return runPRMode({ github, logger, owner, repo, number: input.number, config });
       }
 
-      throw new Error("Repo mode not yet implemented");
+      return runRepoMode({ github, logger, owner, repo, config });
     },
   };
 }
@@ -107,6 +108,39 @@ async function runPRMode(params: {
   };
 }
 
+async function runRepoMode(params: {
+  github: GitHubClient;
+  logger?: Logger;
+  owner: string;
+  repo: string;
+  config: CodeReviewConfig;
+}): Promise<ContextOutput> {
+  const { github, logger, owner, repo, config } = params;
+
+  // Step 1: Fetch file tree
+  logger?.verbose(`Fetching repository file tree for ${owner}/${repo}...`);
+  const filePaths = await github.getRepoTree(owner, repo);
+
+  // Step 2: Filter files
+  const filtered = filterFiles(filePaths, config.ignorePatterns, (p) => p);
+
+  // Step 3: Parallel fetch of tech stack and domain rules
+  logger?.verbose("Detecting tech stack and loading domain rules in parallel...");
+  const [techStack, domainResult] = await Promise.all([
+    detectTechStack({ github, owner, repo, filePaths: filtered, logger }),
+    loadDomainRules({ github, owner, repo, config, logger }),
+  ]);
+
+  return {
+    mode: "repo",
+    repository: { owner, repo, defaultBranch: "main" },
+    repoFiles: filtered.map((p) => ({ path: p })),
+    domainRules: domainResult.domainRules,
+    architectureDoc: domainResult.architectureDoc,
+    techStack,
+  };
+}
+
 async function fetchReferencedIssues(
   github: GitHubClient,
   owner: string,
