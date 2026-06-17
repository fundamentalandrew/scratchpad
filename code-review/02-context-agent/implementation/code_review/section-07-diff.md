diff --git a/code-review/02-context-agent/package.json b/code-review/02-context-agent/package.json
new file mode 100644
index 0000000..6ff04ed
--- /dev/null
+++ b/code-review/02-context-agent/package.json
@@ -0,0 +1,18 @@
+{
+  "name": "context-agent",
+  "version": "0.1.0",
+  "type": "module",
+  "scripts": {
+    "build": "tsc",
+    "test": "vitest run",
+    "test:watch": "vitest"
+  },
+  "dependencies": {
+    "zod": "^4.3.6"
+  },
+  "devDependencies": {
+    "@types/node": "^25.5.0",
+    "typescript": "^5.9.3",
+    "vitest": "^4.1.0"
+  }
+}
diff --git a/code-review/02-context-agent/src/context-agent.test.ts b/code-review/02-context-agent/src/context-agent.test.ts
new file mode 100644
index 0000000..9f5b523
--- /dev/null
+++ b/code-review/02-context-agent/src/context-agent.test.ts
@@ -0,0 +1,348 @@
+import { describe, it, expect, vi, beforeEach } from "vitest";
+import { ContextOutputSchema } from "@core/agents/schemas.js";
+import type { GitHubClient } from "@core/clients/github.js";
+import { GitHubAPIError } from "@core/utils/errors.js";
+import { defaultConfig } from "@core/config/schema.js";
+import { createContextAgent } from "./context-agent.js";
+
+// Mock utility modules
+vi.mock("@core/utils/file-filter.js", () => ({
+  filterFiles: vi.fn(<T>(files: T[]) => files),
+}));
+vi.mock("@core/utils/issue-parser.js", () => ({
+  parseClosingReferences: vi.fn(() => []),
+}));
+vi.mock("@core/context/domain-rules.js", () => ({
+  loadDomainRules: vi.fn().mockResolvedValue({ domainRules: null, architectureDoc: null }),
+}));
+
+import { filterFiles } from "@core/utils/file-filter.js";
+import { parseClosingReferences } from "@core/utils/issue-parser.js";
+import { loadDomainRules } from "@core/context/domain-rules.js";
+
+const mockedFilterFiles = vi.mocked(filterFiles);
+const mockedParseClosingReferences = vi.mocked(parseClosingReferences);
+const mockedLoadDomainRules = vi.mocked(loadDomainRules);
+
+function createMockGitHub() {
+  return {
+    getPR: vi.fn().mockResolvedValue({
+      title: "Test PR",
+      description: "Fixes #42",
+      author: "testuser",
+      state: "open",
+      baseBranch: "main",
+      headBranch: "feature/test",
+      headSha: "abc123",
+      baseSha: "def456",
+    }),
+    getPRFiles: vi.fn().mockResolvedValue([
+      { path: "src/index.ts", status: "modified", additions: 5, deletions: 2, patch: "@@ -1,2 +1,5 @@" },
+    ]),
+    getPRDiff: vi.fn().mockResolvedValue("diff content"),
+    getReviewComments: vi.fn().mockResolvedValue([]),
+    getReferencedIssues: vi.fn().mockResolvedValue([]),
+    getFileContent: vi.fn().mockResolvedValue(null),
+    getRepoTree: vi.fn().mockResolvedValue([]),
+  } as unknown as GitHubClient;
+}
+
+describe("createContextAgent — PR mode", () => {
+  let mockGitHub: ReturnType<typeof createMockGitHub>;
+
+  beforeEach(() => {
+    vi.clearAllMocks();
+    mockGitHub = createMockGitHub();
+    mockedFilterFiles.mockImplementation(<T>(files: T[]) => files);
+    mockedParseClosingReferences.mockReturnValue([]);
+    mockedLoadDomainRules.mockResolvedValue({ domainRules: null, architectureDoc: null });
+  });
+
+  it("produces valid ContextOutput for a standard PR", async () => {
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "pr",
+      owner: "testorg",
+      repo: "testrepo",
+      number: 1,
+      config: defaultConfig,
+    });
+
+    const parsed = ContextOutputSchema.safeParse(result);
+    expect(parsed.success).toBe(true);
+    expect(result.mode).toBe("pr");
+    expect(result.pr).toBeDefined();
+    expect(result.pr!.number).toBe(1);
+    expect(result.pr!.title).toBe("Test PR");
+  });
+
+  it("calls getPR first, then parallelizes remaining calls", async () => {
+    const callOrder: string[] = [];
+
+    (mockGitHub.getPR as ReturnType<typeof vi.fn>).mockImplementation(async () => {
+      callOrder.push("getPR");
+      return {
+        title: "Test PR",
+        description: "Fixes #42",
+        author: "testuser",
+        state: "open",
+        baseBranch: "main",
+        headBranch: "feature/test",
+        headSha: "abc123",
+        baseSha: "def456",
+      };
+    });
+
+    (mockGitHub.getPRFiles as ReturnType<typeof vi.fn>).mockImplementation(async () => {
+      callOrder.push("getPRFiles");
+      return [{ path: "src/index.ts", status: "modified", additions: 5, deletions: 2, patch: "..." }];
+    });
+
+    (mockGitHub.getPRDiff as ReturnType<typeof vi.fn>).mockImplementation(async () => {
+      callOrder.push("getPRDiff");
+      return "diff content";
+    });
+
+    (mockGitHub.getReviewComments as ReturnType<typeof vi.fn>).mockImplementation(async () => {
+      callOrder.push("getReviewComments");
+      return [];
+    });
+
+    const agent = createContextAgent({ github: mockGitHub });
+    await agent.run({
+      mode: "pr",
+      owner: "testorg",
+      repo: "testrepo",
+      number: 1,
+      config: defaultConfig,
+    });
+
+    // getPR must be called before all parallel calls
+    expect(callOrder[0]).toBe("getPR");
+    expect(callOrder.indexOf("getPR")).toBeLessThan(callOrder.indexOf("getPRFiles"));
+    expect(callOrder.indexOf("getPR")).toBeLessThan(callOrder.indexOf("getPRDiff"));
+    expect(callOrder.indexOf("getPR")).toBeLessThan(callOrder.indexOf("getReviewComments"));
+  });
+
+  it("passes baseSha as ref to domain rules loader", async () => {
+    const agent = createContextAgent({ github: mockGitHub });
+    await agent.run({
+      mode: "pr",
+      owner: "testorg",
+      repo: "testrepo",
+      number: 1,
+      config: defaultConfig,
+    });
+
+    expect(mockedLoadDomainRules).toHaveBeenCalledWith(
+      expect.objectContaining({ ref: "def456" }),
+    );
+  });
+
+  it("applies ignorePatterns to filter PR files", async () => {
+    const rawFiles = [
+      { path: "src/index.ts", status: "modified", additions: 5, deletions: 2, patch: "..." },
+      { path: "dist/bundle.js", status: "modified", additions: 100, deletions: 0, patch: "..." },
+    ];
+    (mockGitHub.getPRFiles as ReturnType<typeof vi.fn>).mockResolvedValue(rawFiles);
+
+    const filteredFiles = [rawFiles[0]];
+    mockedFilterFiles.mockReturnValue(filteredFiles);
+
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "pr",
+      owner: "testorg",
+      repo: "testrepo",
+      number: 1,
+      config: defaultConfig,
+    });
+
+    expect(mockedFilterFiles).toHaveBeenCalledWith(
+      rawFiles,
+      defaultConfig.ignorePatterns,
+      expect.any(Function),
+    );
+    expect(result.pr!.files).toHaveLength(1);
+    expect(result.pr!.files[0].path).toBe("src/index.ts");
+  });
+
+  it("includes previousPath for renamed files", async () => {
+    (mockGitHub.getPRFiles as ReturnType<typeof vi.fn>).mockResolvedValue([
+      {
+        path: "src/new-name.ts",
+        status: "renamed",
+        additions: 0,
+        deletions: 0,
+        patch: null,
+        previousPath: "src/old-name.ts",
+      },
+    ]);
+
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "pr",
+      owner: "testorg",
+      repo: "testrepo",
+      number: 1,
+      config: defaultConfig,
+    });
+
+    expect(result.pr!.files[0].previousPath).toBe("src/old-name.ts");
+  });
+
+  it("parses PR description for referenced issues and fetches them", async () => {
+    mockedParseClosingReferences.mockReturnValue([{ number: 42 }]);
+    (mockGitHub.getReferencedIssues as ReturnType<typeof vi.fn>).mockResolvedValue([
+      { number: 42, title: "Bug report", state: "open", body: "Description" },
+    ]);
+
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "pr",
+      owner: "testorg",
+      repo: "testrepo",
+      number: 1,
+      config: defaultConfig,
+    });
+
+    expect(mockedParseClosingReferences).toHaveBeenCalledWith("Fixes #42");
+    expect(mockGitHub.getReferencedIssues).toHaveBeenCalledWith(
+      "testorg",
+      "testrepo",
+      [42],
+      [],
+    );
+    expect(result.referencedIssues).toHaveLength(1);
+    expect(result.referencedIssues![0].number).toBe(42);
+  });
+
+  it("fetches review comments", async () => {
+    const comments = [
+      { id: 1, author: "reviewer", body: "LGTM", path: "src/index.ts", line: 5, createdAt: "2024-01-01T00:00:00Z" },
+    ];
+    (mockGitHub.getReviewComments as ReturnType<typeof vi.fn>).mockResolvedValue(comments);
+
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "pr",
+      owner: "testorg",
+      repo: "testrepo",
+      number: 1,
+      config: defaultConfig,
+    });
+
+    expect(result.comments).toHaveLength(1);
+    expect(result.comments![0].body).toBe("LGTM");
+  });
+
+  it("sets referencedIssues to empty array when no refs in description", async () => {
+    mockedParseClosingReferences.mockReturnValue([]);
+
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "pr",
+      owner: "testorg",
+      repo: "testrepo",
+      number: 1,
+      config: defaultConfig,
+    });
+
+    expect(result.referencedIssues).toEqual([]);
+  });
+
+  it("sets comments to empty array when no review comments exist", async () => {
+    (mockGitHub.getReviewComments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
+
+    const agent = createContextAgent({ github: mockGitHub });
+    const result = await agent.run({
+      mode: "pr",
+      owner: "testorg",
+      repo: "testrepo",
+      number: 1,
+      config: defaultConfig,
+    });
+
+    expect(result.comments).toEqual([]);
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
+      mode: "pr",
+      owner: "testorg",
+      repo: "testrepo",
+      number: 1,
+      config: defaultConfig,
+    });
+
+    expect(result.domainRules).toBe("rules content");
+    expect(result.architectureDoc).toBe("arch content");
+  });
+
+  it("throws when mode is pr but number is undefined", async () => {
+    const agent = createContextAgent({ github: mockGitHub });
+    await expect(
+      agent.run({
+        mode: "pr",
+        owner: "testorg",
+        repo: "testrepo",
+        config: defaultConfig,
+      }),
+    ).rejects.toThrow("PR number is required for pr mode");
+  });
+
+  it("throws when owner is empty", async () => {
+    const agent = createContextAgent({ github: mockGitHub });
+    await expect(
+      agent.run({
+        mode: "pr",
+        owner: "",
+        repo: "testrepo",
+        number: 1,
+        config: defaultConfig,
+      }),
+    ).rejects.toThrow(/owner/i);
+  });
+
+  it("throws when repo is empty", async () => {
+    const agent = createContextAgent({ github: mockGitHub });
+    await expect(
+      agent.run({
+        mode: "pr",
+        owner: "testorg",
+        repo: "",
+        number: 1,
+        config: defaultConfig,
+      }),
+    ).rejects.toThrow(/repo/i);
+  });
+
+  it("propagates GitHubAPIError from getPR", async () => {
+    (mockGitHub.getPR as ReturnType<typeof vi.fn>).mockRejectedValue(
+      new GitHubAPIError("getPR failed"),
+    );
+
+    const agent = createContextAgent({ github: mockGitHub });
+    await expect(
+      agent.run({
+        mode: "pr",
+        owner: "testorg",
+        repo: "testrepo",
+        number: 1,
+        config: defaultConfig,
+      }),
+    ).rejects.toThrow(GitHubAPIError);
+  });
+
+  it("has correct agent metadata", () => {
+    const agent = createContextAgent({ github: mockGitHub });
+    expect(agent.name).toBe("ContextAgent");
+    expect(agent.idempotent).toBe(true);
+  });
+});
diff --git a/code-review/02-context-agent/src/context-agent.ts b/code-review/02-context-agent/src/context-agent.ts
new file mode 100644
index 0000000..dfadb9e
--- /dev/null
+++ b/code-review/02-context-agent/src/context-agent.ts
@@ -0,0 +1,119 @@
+import type { Agent } from "@core/pipeline/types.js";
+import type { ContextOutput } from "@core/agents/schemas.js";
+import type { GitHubClient } from "@core/clients/github.js";
+import type { CodeReviewConfig } from "@core/config/schema.js";
+import type { Logger } from "@core/utils/logger.js";
+import { filterFiles } from "@core/utils/file-filter.js";
+import { parseClosingReferences } from "@core/utils/issue-parser.js";
+import { loadDomainRules } from "@core/context/domain-rules.js";
+
+export interface ContextAgentInput {
+  mode: "pr" | "repo";
+  owner: string;
+  repo: string;
+  number?: number;
+  config: CodeReviewConfig;
+}
+
+export function createContextAgent(options: {
+  github: GitHubClient;
+  logger?: Logger;
+}): Agent<ContextAgentInput, ContextOutput> {
+  const { github, logger } = options;
+
+  return {
+    name: "ContextAgent",
+    idempotent: true,
+
+    async run(input: ContextAgentInput): Promise<ContextOutput> {
+      const { mode, owner, repo, config } = input;
+
+      if (!owner) throw new Error("owner is required");
+      if (!repo) throw new Error("repo is required");
+
+      if (mode === "pr") {
+        return runPRMode({ github, logger, owner, repo, number: input.number, config });
+      }
+
+      throw new Error("Repo mode not yet implemented");
+    },
+  };
+}
+
+async function runPRMode(params: {
+  github: GitHubClient;
+  logger?: Logger;
+  owner: string;
+  repo: string;
+  number: number | undefined;
+  config: CodeReviewConfig;
+}): Promise<ContextOutput> {
+  const { github, logger, owner, repo, number, config } = params;
+
+  if (number === undefined) {
+    throw new Error("PR number is required for pr mode");
+  }
+
+  // Step 1: Fetch PR metadata (sequential — provides SHAs for subsequent calls)
+  logger?.verbose(`Fetching PR #${number} metadata...`);
+  const prMeta = await github.getPR(owner, repo, number);
+
+  // Step 2: Parallel fetch of files, diff, issues, comments, domain rules
+  logger?.verbose("Fetching PR files, diff, issues, comments, and domain rules in parallel...");
+  const [rawFiles, diff, issues, comments, domainResult] = await Promise.all([
+    github.getPRFiles(owner, repo, number),
+    github.getPRDiff(owner, repo, number),
+    fetchReferencedIssues(github, owner, repo, prMeta.description),
+    github.getReviewComments(owner, repo, number),
+    loadDomainRules({ github, owner, repo, ref: prMeta.baseSha, config, logger }),
+  ]);
+
+  // Apply file filtering
+  const filteredFiles = filterFiles(rawFiles, config.ignorePatterns, (f) => f.path);
+
+  // Map to output format
+  const files = filteredFiles.map((f) => ({
+    path: f.path,
+    status: f.status,
+    additions: f.additions,
+    deletions: f.deletions,
+    patch: f.patch ?? null,
+    ...(f.previousPath ? { previousPath: f.previousPath } : {}),
+  }));
+
+  return {
+    mode: "pr",
+    repository: { owner, repo, defaultBranch: prMeta.baseBranch },
+    pr: {
+      number,
+      title: prMeta.title,
+      description: prMeta.description ?? "",
+      author: prMeta.author,
+      baseBranch: prMeta.baseBranch,
+      headBranch: prMeta.headBranch,
+      files,
+      diff,
+    },
+    referencedIssues: issues,
+    comments,
+    domainRules: domainResult.domainRules,
+    architectureDoc: domainResult.architectureDoc,
+  };
+}
+
+async function fetchReferencedIssues(
+  github: GitHubClient,
+  owner: string,
+  repo: string,
+  description: string | null,
+): Promise<Array<{ number: number; title: string; state: string; body?: string; owner?: string; repo?: string }>> {
+  const refs = parseClosingReferences(description ?? "");
+  if (refs.length === 0) return [];
+
+  const sameRepoNumbers = refs.filter((r) => !r.owner).map((r) => r.number);
+  const crossRepoRefs = refs
+    .filter((r) => r.owner && r.repo)
+    .map((r) => ({ owner: r.owner!, repo: r.repo!, number: r.number }));
+
+  return github.getReferencedIssues(owner, repo, sameRepoNumbers, crossRepoRefs);
+}
diff --git a/code-review/02-context-agent/src/index.ts b/code-review/02-context-agent/src/index.ts
new file mode 100644
index 0000000..9ab093e
--- /dev/null
+++ b/code-review/02-context-agent/src/index.ts
@@ -0,0 +1,2 @@
+export { createContextAgent } from "./context-agent.js";
+export type { ContextAgentInput } from "./context-agent.js";
diff --git a/code-review/02-context-agent/tsconfig.json b/code-review/02-context-agent/tsconfig.json
new file mode 100644
index 0000000..9e98aad
--- /dev/null
+++ b/code-review/02-context-agent/tsconfig.json
@@ -0,0 +1,20 @@
+{
+  "compilerOptions": {
+    "target": "ES2022",
+    "module": "Node16",
+    "moduleResolution": "Node16",
+    "strict": true,
+    "outDir": "./dist",
+    "rootDir": "./src",
+    "declaration": true,
+    "esModuleInterop": true,
+    "skipLibCheck": true,
+    "forceConsistentCasingInFileNames": true,
+    "resolveJsonModule": true,
+    "paths": {
+      "@core/*": ["../01-core-infrastructure/src/*"]
+    }
+  },
+  "include": ["src"],
+  "exclude": ["node_modules", "dist"]
+}
diff --git a/code-review/02-context-agent/vitest.config.ts b/code-review/02-context-agent/vitest.config.ts
new file mode 100644
index 0000000..1a79ac0
--- /dev/null
+++ b/code-review/02-context-agent/vitest.config.ts
@@ -0,0 +1,15 @@
+import { defineConfig } from "vitest/config";
+import path from "path";
+
+export default defineConfig({
+  resolve: {
+    alias: {
+      "@core": path.resolve(__dirname, "../01-core-infrastructure/src"),
+    },
+  },
+  test: {
+    globals: false,
+    environment: "node",
+    include: ["src/**/*.test.ts"],
+  },
+});
