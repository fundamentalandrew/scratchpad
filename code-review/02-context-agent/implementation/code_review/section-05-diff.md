diff --git a/code-review/01-core-infrastructure/src/context/domain-rules.test.ts b/code-review/01-core-infrastructure/src/context/domain-rules.test.ts
new file mode 100644
index 0000000..77f120b
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/context/domain-rules.test.ts
@@ -0,0 +1,172 @@
+import { describe, it, expect, vi, beforeEach } from "vitest";
+import { loadDomainRules } from "./domain-rules.js";
+import { GitHubAPIError } from "../utils/errors.js";
+import type { GitHubClient } from "../clients/github.js";
+import type { CodeReviewConfig } from "../config/schema.js";
+import { defaultConfig } from "../config/schema.js";
+
+function createMockGitHub() {
+  return {
+    getFileContent: vi.fn<(owner: string, repo: string, path: string, ref?: string) => Promise<string | null>>(),
+  } as unknown as GitHubClient & { getFileContent: ReturnType<typeof vi.fn> };
+}
+
+function makeOptions(overrides?: {
+  github?: ReturnType<typeof createMockGitHub>;
+  config?: Partial<CodeReviewConfig>;
+  ref?: string;
+}) {
+  const github = overrides?.github ?? createMockGitHub();
+  return {
+    github: github as unknown as GitHubClient,
+    owner: "test-owner",
+    repo: "test-repo",
+    ref: overrides?.ref,
+    config: { ...defaultConfig, ...overrides?.config } as CodeReviewConfig,
+  };
+}
+
+describe("loadDomainRules", () => {
+  let github: ReturnType<typeof createMockGitHub>;
+
+  beforeEach(() => {
+    github = createMockGitHub();
+  });
+
+  // --- Domain Rules Loading ---
+
+  it("loads domain rules from config.domainRulesPath when found", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "DOMAIN_RULES.md") return "# Domain Rules Content";
+      return null;
+    });
+    const opts = makeOptions({ github });
+    const result = await loadDomainRules(opts);
+    expect(result.domainRules).toBe("# Domain Rules Content");
+  });
+
+  it("falls back to DOMAIN_RULES.md when config path not found", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "DOMAIN_RULES.md") return "# Fallback Domain Rules";
+      return null;
+    });
+    const opts = makeOptions({ github, config: { domainRulesPath: "./custom/RULES.md" } });
+    const result = await loadDomainRules(opts);
+    expect(result.domainRules).toBe("# Fallback Domain Rules");
+  });
+
+  it("falls back to .github/DOMAIN_RULES.md when root not found", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === ".github/DOMAIN_RULES.md") return "# GitHub Domain Rules";
+      return null;
+    });
+    const opts = makeOptions({ github });
+    const result = await loadDomainRules(opts);
+    expect(result.domainRules).toBe("# GitHub Domain Rules");
+  });
+
+  it("falls back to docs/DOMAIN_RULES.md when .github not found", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "docs/DOMAIN_RULES.md") return "# Docs Domain Rules";
+      return null;
+    });
+    const opts = makeOptions({ github });
+    const result = await loadDomainRules(opts);
+    expect(result.domainRules).toBe("# Docs Domain Rules");
+  });
+
+  it("returns null when no domain rules file found anywhere", async () => {
+    github.getFileContent.mockResolvedValue(null);
+    const opts = makeOptions({ github });
+    const result = await loadDomainRules(opts);
+    expect(result.domainRules).toBeNull();
+  });
+
+  // --- Architecture Doc Loading ---
+
+  it("loads architecture doc from config.architecturePath when found", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "ARCHITECTURE.md") return "# Architecture Doc";
+      return null;
+    });
+    const opts = makeOptions({ github });
+    const result = await loadDomainRules(opts);
+    expect(result.architectureDoc).toBe("# Architecture Doc");
+  });
+
+  it("falls back to ARCHITECTURE.md when config path not found", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "ARCHITECTURE.md") return "# Fallback Architecture";
+      return null;
+    });
+    const opts = makeOptions({ github, config: { architecturePath: "./custom/ARCH.md" } });
+    const result = await loadDomainRules(opts);
+    expect(result.architectureDoc).toBe("# Fallback Architecture");
+  });
+
+  it("falls back to .github/ARCHITECTURE.md when root not found", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === ".github/ARCHITECTURE.md") return "# GitHub Architecture";
+      return null;
+    });
+    const opts = makeOptions({ github });
+    const result = await loadDomainRules(opts);
+    expect(result.architectureDoc).toBe("# GitHub Architecture");
+  });
+
+  it("falls back to docs/architecture.md when .github not found", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "docs/architecture.md") return "# Docs Architecture";
+      return null;
+    });
+    const opts = makeOptions({ github });
+    const result = await loadDomainRules(opts);
+    expect(result.architectureDoc).toBe("# Docs Architecture");
+  });
+
+  it("returns null when no architecture doc found anywhere", async () => {
+    github.getFileContent.mockResolvedValue(null);
+    const opts = makeOptions({ github });
+    const result = await loadDomainRules(opts);
+    expect(result.architectureDoc).toBeNull();
+  });
+
+  // --- Combined Behavior ---
+
+  it("loads both domain rules and architecture doc independently", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "DOMAIN_RULES.md") return "# Rules";
+      if (path === ".github/ARCHITECTURE.md") return "# Arch";
+      return null;
+    });
+    const opts = makeOptions({ github });
+    const result = await loadDomainRules(opts);
+    expect(result.domainRules).toBe("# Rules");
+    expect(result.architectureDoc).toBe("# Arch");
+  });
+
+  it("returns both null when neither found", async () => {
+    github.getFileContent.mockResolvedValue(null);
+    const opts = makeOptions({ github });
+    const result = await loadDomainRules(opts);
+    expect(result.domainRules).toBeNull();
+    expect(result.architectureDoc).toBeNull();
+  });
+
+  it("passes ref parameter to getFileContent calls", async () => {
+    github.getFileContent.mockResolvedValue(null);
+    const opts = makeOptions({ github, ref: "abc123" });
+    await loadDomainRules(opts);
+    for (const call of github.getFileContent.mock.calls) {
+      expect(call[3]).toBe("abc123");
+    }
+  });
+
+  it("propagates non-404 errors (fail fast)", async () => {
+    github.getFileContent.mockRejectedValue(
+      new GitHubAPIError("getFileContent failed: Internal Server Error"),
+    );
+    const opts = makeOptions({ github });
+    await expect(loadDomainRules(opts)).rejects.toThrow(GitHubAPIError);
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/context/domain-rules.ts b/code-review/01-core-infrastructure/src/context/domain-rules.ts
new file mode 100644
index 0000000..2986b15
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/context/domain-rules.ts
@@ -0,0 +1,58 @@
+import type { GitHubClient } from "../clients/github.js";
+import type { CodeReviewConfig } from "../config/schema.js";
+import type { Logger } from "../utils/logger.js";
+
+const DOMAIN_RULES_FALLBACKS = [
+  "DOMAIN_RULES.md",
+  ".github/DOMAIN_RULES.md",
+  "docs/DOMAIN_RULES.md",
+];
+
+const ARCHITECTURE_FALLBACKS = [
+  "ARCHITECTURE.md",
+  ".github/ARCHITECTURE.md",
+  "docs/architecture.md",
+];
+
+function stripDotSlash(path: string): string {
+  return path.startsWith("./") ? path.slice(2) : path;
+}
+
+async function findFile(
+  github: GitHubClient,
+  owner: string,
+  repo: string,
+  ref: string | undefined,
+  configPath: string,
+  fallbackPaths: string[],
+): Promise<string | null> {
+  const normalizedConfig = stripDotSlash(configPath);
+  const content = await github.getFileContent(owner, repo, normalizedConfig, ref);
+  if (content !== null) return content;
+
+  for (const path of fallbackPaths) {
+    if (path === normalizedConfig) continue;
+    const result = await github.getFileContent(owner, repo, path, ref);
+    if (result !== null) return result;
+  }
+
+  return null;
+}
+
+export async function loadDomainRules(options: {
+  github: GitHubClient;
+  owner: string;
+  repo: string;
+  ref?: string;
+  config: CodeReviewConfig;
+  logger?: Logger;
+}): Promise<{ domainRules: string | null; architectureDoc: string | null }> {
+  const { github, owner, repo, ref, config } = options;
+
+  const [domainRules, architectureDoc] = await Promise.all([
+    findFile(github, owner, repo, ref, config.domainRulesPath, DOMAIN_RULES_FALLBACKS),
+    findFile(github, owner, repo, ref, config.architecturePath, ARCHITECTURE_FALLBACKS),
+  ]);
+
+  return { domainRules, architectureDoc };
+}
diff --git a/code-review/02-context-agent/implementation/deep_implement_config.json b/code-review/02-context-agent/implementation/deep_implement_config.json
index 24115bf..21e088b 100644
--- a/code-review/02-context-agent/implementation/deep_implement_config.json
+++ b/code-review/02-context-agent/implementation/deep_implement_config.json
@@ -17,7 +17,24 @@
     "section-08-context-agent-repo-mode",
     "section-09-integration-tests"
   ],
-  "sections_state": {},
+  "sections_state": {
+    "section-01-schema-extensions": {
+      "status": "complete",
+      "commit_hash": "bb16dd2"
+    },
+    "section-02-github-client-extensions": {
+      "status": "complete",
+      "commit_hash": "24aa224"
+    },
+    "section-03-file-filter": {
+      "status": "complete",
+      "commit_hash": "89888cf"
+    },
+    "section-04-issue-parser": {
+      "status": "complete",
+      "commit_hash": "24f286d"
+    }
+  },
   "pre_commit": {
     "present": false,
     "type": "none",
diff --git a/code-review/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json b/code-review/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json
index eb582d8..1611fba 100644
--- a/code-review/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json
+++ b/code-review/node_modules/.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json
@@ -1 +1 @@
-{"version":"4.1.0","results":[[":01-core-infrastructure/src/smoke.test.ts",{"duration":1.654361999999992,"failed":false}],[":01-core-infrastructure/src/utils/errors.test.ts",{"duration":3.618167999999997,"failed":false}],[":01-core-infrastructure/src/agents/schemas.test.ts",{"duration":13.341352,"failed":false}],[":01-core-infrastructure/dist/smoke.test.js",{"duration":1.7578340000000026,"failed":false}],[":01-core-infrastructure/src/clients/claude.test.ts",{"duration":14.136395000000022,"failed":false}],[":01-core-infrastructure/src/clients/github.test.ts",{"duration":7.841763,"failed":false}],[":01-core-infrastructure/src/config/schema.test.ts",{"duration":3.576995999999994,"failed":false}],[":01-core-infrastructure/src/config/loader.test.ts",{"duration":9.842963999999995,"failed":false}],[":01-core-infrastructure/src/utils/url-parser.test.ts",{"duration":5.4180669999999935,"failed":false}],[":01-core-infrastructure/src/utils/logger.test.ts",{"duration":6.867981999999998,"failed":false}],[":01-core-infrastructure/src/utils/redact.test.ts",{"duration":4.24771100000001,"failed":false}],[":01-core-infrastructure/src/agents/stubs.test.ts",{"duration":1512.993538,"failed":false}],[":01-core-infrastructure/src/pipeline/runner.test.ts",{"duration":20.364846999999997,"failed":false}],[":01-core-infrastructure/src/commands/review-pr.test.ts",{"duration":5.276204000000007,"failed":false}],[":01-core-infrastructure/src/commands/review-repo.test.ts",{"duration":4.415073000000007,"failed":false}],[":01-core-infrastructure/src/commands/init.test.ts",{"duration":5.74615,"failed":false}]]}
\ No newline at end of file
+{"version":"4.1.0","results":[[":01-core-infrastructure/src/smoke.test.ts",{"duration":1.7591290000000015,"failed":false}],[":01-core-infrastructure/src/utils/errors.test.ts",{"duration":3.720911000000001,"failed":false}],[":01-core-infrastructure/src/agents/schemas.test.ts",{"duration":14.493870999999999,"failed":false}],[":01-core-infrastructure/dist/smoke.test.js",{"duration":1.7578340000000026,"failed":false}],[":01-core-infrastructure/src/clients/claude.test.ts",{"duration":9.223214999999996,"failed":false}],[":01-core-infrastructure/src/clients/github.test.ts",{"duration":13.167180000000002,"failed":false}],[":01-core-infrastructure/src/config/schema.test.ts",{"duration":3.6108660000000015,"failed":false}],[":01-core-infrastructure/src/config/loader.test.ts",{"duration":10.990486000000004,"failed":false}],[":01-core-infrastructure/src/utils/url-parser.test.ts",{"duration":5.0081830000000025,"failed":false}],[":01-core-infrastructure/src/utils/logger.test.ts",{"duration":5.765268000000006,"failed":false}],[":01-core-infrastructure/src/utils/redact.test.ts",{"duration":2.8128790000000095,"failed":false}],[":01-core-infrastructure/src/agents/stubs.test.ts",{"duration":1516.538725,"failed":false}],[":01-core-infrastructure/src/pipeline/runner.test.ts",{"duration":16.712399000000005,"failed":false}],[":01-core-infrastructure/src/commands/review-pr.test.ts",{"duration":4.36703,"failed":false}],[":01-core-infrastructure/src/commands/review-repo.test.ts",{"duration":4.150876000000011,"failed":false}],[":01-core-infrastructure/src/commands/init.test.ts",{"duration":5.68633899999999,"failed":false}],[":01-core-infrastructure/src/utils/file-filter.test.ts",{"duration":5.806238999999991,"failed":false}],[":01-core-infrastructure/src/utils/issue-parser.test.ts",{"duration":5.392358999999999,"failed":false}],[":01-core-infrastructure/src/integration.test.ts",{"duration":4236.954261,"failed":false}]]}
\ No newline at end of file
