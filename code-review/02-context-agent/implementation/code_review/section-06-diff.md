diff --git a/code-review/01-core-infrastructure/src/context/tech-stack.test.ts b/code-review/01-core-infrastructure/src/context/tech-stack.test.ts
new file mode 100644
index 0000000..9768589
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/context/tech-stack.test.ts
@@ -0,0 +1,194 @@
+import { describe, it, expect, vi, beforeEach } from "vitest";
+import { detectTechStack } from "./tech-stack.js";
+import type { GitHubClient } from "../clients/github.js";
+
+function createMockGitHub() {
+  return {
+    getFileContent: vi.fn<(owner: string, repo: string, path: string, ref?: string) => Promise<string | null>>(),
+  } as unknown as GitHubClient & { getFileContent: ReturnType<typeof vi.fn> };
+}
+
+const mockLogger = {
+  info: vi.fn(),
+  verbose: vi.fn(),
+  error: vi.fn(),
+  warn: vi.fn(),
+  success: vi.fn(),
+};
+
+function makeOptions(overrides?: {
+  github?: ReturnType<typeof createMockGitHub>;
+  filePaths?: string[];
+  ref?: string;
+}) {
+  const github = overrides?.github ?? createMockGitHub();
+  return {
+    github: github as unknown as GitHubClient,
+    owner: "test-owner",
+    repo: "test-repo",
+    ref: overrides?.ref,
+    filePaths: overrides?.filePaths ?? [],
+    logger: mockLogger,
+  };
+}
+
+describe("detectTechStack", () => {
+  let github: ReturnType<typeof createMockGitHub>;
+
+  beforeEach(() => {
+    github = createMockGitHub();
+    vi.clearAllMocks();
+  });
+
+  it("detects Node.js/TypeScript from package.json presence", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "package.json") {
+        return JSON.stringify({
+          dependencies: { express: "^4.18.0" },
+          devDependencies: { typescript: "^5.0.0" },
+        });
+      }
+      return null;
+    });
+    const opts = makeOptions({ github, filePaths: ["package.json", "tsconfig.json", "src/index.ts"] });
+    const result = await detectTechStack(opts);
+    expect(result.languages).toContain("JavaScript");
+    expect(result.languages).toContain("TypeScript");
+  });
+
+  it("parses package.json dependencies and devDependencies", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "package.json") {
+        return JSON.stringify({
+          dependencies: { express: "^4.18.0" },
+          devDependencies: { vitest: "^1.0.0" },
+        });
+      }
+      return null;
+    });
+    const opts = makeOptions({ github, filePaths: ["package.json"] });
+    const result = await detectTechStack(opts);
+    expect(result.dependencies["express"]).toBe("^4.18.0");
+    expect(result.dependencies["vitest"]).toBe("^1.0.0");
+  });
+
+  it("detects React framework from react dependency", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "package.json") {
+        return JSON.stringify({ dependencies: { react: "^18.0.0" } });
+      }
+      return null;
+    });
+    const opts = makeOptions({ github, filePaths: ["package.json"] });
+    const result = await detectTechStack(opts);
+    expect(result.frameworks).toContain("React");
+  });
+
+  it("detects Express framework from express dependency", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "package.json") {
+        return JSON.stringify({ dependencies: { express: "^4.18.0" } });
+      }
+      return null;
+    });
+    const opts = makeOptions({ github, filePaths: ["package.json"] });
+    const result = await detectTechStack(opts);
+    expect(result.frameworks).toContain("Express");
+  });
+
+  it("detects Next.js from next dependency", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "package.json") {
+        return JSON.stringify({ dependencies: { next: "^14.0.0" } });
+      }
+      return null;
+    });
+    const opts = makeOptions({ github, filePaths: ["package.json"] });
+    const result = await detectTechStack(opts);
+    expect(result.frameworks).toContain("Next.js");
+  });
+
+  it("detects Go from go.mod presence", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "go.mod") {
+        return `module example.com/myproject\n\ngo 1.21\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.1\n)`;
+      }
+      return null;
+    });
+    const opts = makeOptions({ github, filePaths: ["go.mod", "main.go"] });
+    const result = await detectTechStack(opts);
+    expect(result.languages).toContain("Go");
+  });
+
+  it("detects Python from requirements.txt presence", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "requirements.txt") {
+        return "flask==2.0.0\nrequests>=2.28";
+      }
+      return null;
+    });
+    const opts = makeOptions({ github, filePaths: ["requirements.txt"] });
+    const result = await detectTechStack(opts);
+    expect(result.languages).toContain("Python");
+  });
+
+  it("detects Rust from Cargo.toml presence", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "Cargo.toml") {
+        return `[package]\nname = "myproject"\nversion = "0.1.0"\n\n[dependencies]\nserde = "1.0"`;
+      }
+      return null;
+    });
+    const opts = makeOptions({ github, filePaths: ["Cargo.toml", "src/main.rs"] });
+    const result = await detectTechStack(opts);
+    expect(result.languages).toContain("Rust");
+  });
+
+  it("returns empty languages/frameworks/dependencies when no manifests found", async () => {
+    const opts = makeOptions({ github, filePaths: ["src/index.ts", "README.md"] });
+    const result = await detectTechStack(opts);
+    expect(result.languages).toEqual([]);
+    expect(result.frameworks).toEqual([]);
+    expect(result.dependencies).toEqual({});
+  });
+
+  it("skips manifests that fail to parse (logs warning)", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "package.json") return "not json";
+      return null;
+    });
+    const opts = makeOptions({ github, filePaths: ["package.json"] });
+    const result = await detectTechStack(opts);
+    expect(() => result).not.toThrow();
+    expect(result.dependencies).toEqual({});
+    expect(mockLogger.warn).toHaveBeenCalled();
+  });
+
+  it("only checks root-level manifests (not nested in subdirectories)", async () => {
+    const opts = makeOptions({ github, filePaths: ["packages/sub/package.json"] });
+    const result = await detectTechStack(opts);
+    expect(github.getFileContent).not.toHaveBeenCalled();
+    expect(result.languages).toEqual([]);
+  });
+
+  it("treats dependency versions as raw strings", async () => {
+    github.getFileContent.mockImplementation(async (_o, _r, path) => {
+      if (path === "package.json") {
+        return JSON.stringify({ dependencies: { express: "^4.18.0" } });
+      }
+      return null;
+    });
+    const opts = makeOptions({ github, filePaths: ["package.json"] });
+    const result = await detectTechStack(opts);
+    expect(result.dependencies["express"]).toBe("^4.18.0");
+  });
+
+  it("passes ref parameter to getFileContent calls", async () => {
+    github.getFileContent.mockResolvedValue(null);
+    const opts = makeOptions({ github, filePaths: ["package.json"], ref: "abc123" });
+    await detectTechStack(opts);
+    for (const call of github.getFileContent.mock.calls) {
+      expect(call[3]).toBe("abc123");
+    }
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/context/tech-stack.ts b/code-review/01-core-infrastructure/src/context/tech-stack.ts
new file mode 100644
index 0000000..ce442e5
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/context/tech-stack.ts
@@ -0,0 +1,193 @@
+import type { GitHubClient } from "../clients/github.js";
+import type { TechStack } from "../agents/schemas.js";
+import type { Logger } from "../utils/logger.js";
+
+const FRAMEWORK_MAP: Record<string, string> = {
+  react: "React",
+  vue: "Vue",
+  express: "Express",
+  next: "Next.js",
+  "@angular/core": "Angular",
+  svelte: "Svelte",
+  fastify: "Fastify",
+  "@nestjs/core": "NestJS",
+};
+
+const PYTHON_FRAMEWORK_MAP: Record<string, string> = {
+  flask: "Flask",
+  django: "Django",
+  fastapi: "FastAPI",
+};
+
+const MANIFEST_LANGUAGES: Record<string, string> = {
+  "package.json": "JavaScript",
+  "go.mod": "Go",
+  "requirements.txt": "Python",
+  "pyproject.toml": "Python",
+  "setup.py": "Python",
+  "Cargo.toml": "Rust",
+  "pom.xml": "Java",
+  "build.gradle": "Java",
+  "Gemfile": "Ruby",
+};
+
+function isRootLevel(path: string): boolean {
+  return !path.includes("/");
+}
+
+function parsePackageJson(
+  content: string,
+  languages: Set<string>,
+  frameworks: Set<string>,
+  dependencies: Record<string, string>,
+): void {
+  const pkg = JSON.parse(content);
+  const deps = pkg.dependencies ?? {};
+  const devDeps = pkg.devDependencies ?? {};
+
+  for (const [name, version] of Object.entries(deps)) {
+    dependencies[name] = version as string;
+  }
+  for (const [name, version] of Object.entries(devDeps)) {
+    dependencies[name] = version as string;
+  }
+
+  languages.add("JavaScript");
+  if (devDeps.typescript) {
+    languages.add("TypeScript");
+  }
+
+  for (const name of [...Object.keys(deps), ...Object.keys(devDeps)]) {
+    if (FRAMEWORK_MAP[name]) {
+      frameworks.add(FRAMEWORK_MAP[name]);
+    }
+  }
+}
+
+function parseGoMod(
+  content: string,
+  dependencies: Record<string, string>,
+): void {
+  const requireBlockRe = /require\s*\(([\s\S]*?)\)/g;
+  let match;
+  while ((match = requireBlockRe.exec(content)) !== null) {
+    const block = match[1];
+    for (const line of block.split("\n")) {
+      const trimmed = line.trim();
+      if (!trimmed || trimmed.startsWith("//")) continue;
+      const parts = trimmed.split(/\s+/);
+      if (parts.length >= 2) {
+        dependencies[parts[0]] = parts[1];
+      }
+    }
+  }
+
+  const singleRequireRe = /^require\s+(\S+)\s+(\S+)/gm;
+  while ((match = singleRequireRe.exec(content)) !== null) {
+    dependencies[match[1]] = match[2];
+  }
+}
+
+function parseRequirementsTxt(
+  content: string,
+  frameworks: Set<string>,
+  dependencies: Record<string, string>,
+): void {
+  for (const line of content.split("\n")) {
+    const trimmed = line.trim();
+    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;
+
+    const splitMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*(?:[=!<>~]=?.*)?$/);
+    if (!splitMatch) continue;
+
+    const name = splitMatch[1];
+    const versionMatch = trimmed.match(/[=!<>~]=?\s*(.*)/);
+    const version = versionMatch ? versionMatch[1].replace(/^=/, "") : "*";
+    dependencies[name] = version;
+
+    const lower = name.toLowerCase();
+    if (PYTHON_FRAMEWORK_MAP[lower]) {
+      frameworks.add(PYTHON_FRAMEWORK_MAP[lower]);
+    }
+  }
+}
+
+function parseCargoToml(
+  content: string,
+  dependencies: Record<string, string>,
+): void {
+  const lines = content.split("\n");
+  let inDeps = false;
+
+  for (const line of lines) {
+    const trimmed = line.trim();
+    if (trimmed.startsWith("[")) {
+      inDeps = trimmed === "[dependencies]";
+      continue;
+    }
+    if (!inDeps || !trimmed || trimmed.startsWith("#")) continue;
+
+    const simpleMatch = trimmed.match(/^(\S+)\s*=\s*"([^"]+)"/);
+    if (simpleMatch) {
+      dependencies[simpleMatch[1]] = simpleMatch[2];
+      continue;
+    }
+    const tableMatch = trimmed.match(/^(\S+)\s*=\s*\{.*version\s*=\s*"([^"]+)"/);
+    if (tableMatch) {
+      dependencies[tableMatch[1]] = tableMatch[2];
+    }
+  }
+}
+
+export async function detectTechStack(options: {
+  github: GitHubClient;
+  owner: string;
+  repo: string;
+  ref?: string;
+  filePaths: string[];
+  logger?: Logger;
+}): Promise<TechStack> {
+  const { github, owner, repo, ref, filePaths, logger } = options;
+
+  const languages = new Set<string>();
+  const frameworks = new Set<string>();
+  const dependencies: Record<string, string> = {};
+
+  const rootManifests = filePaths.filter(
+    (p) => isRootLevel(p) && MANIFEST_LANGUAGES[p] !== undefined,
+  );
+
+  for (const manifest of rootManifests) {
+    const content = await github.getFileContent(owner, repo, manifest, ref);
+    if (content === null) continue;
+
+    const language = MANIFEST_LANGUAGES[manifest];
+    languages.add(language);
+
+    try {
+      switch (manifest) {
+        case "package.json":
+          parsePackageJson(content, languages, frameworks, dependencies);
+          break;
+        case "go.mod":
+          parseGoMod(content, dependencies);
+          break;
+        case "requirements.txt":
+          parseRequirementsTxt(content, frameworks, dependencies);
+          break;
+        case "Cargo.toml":
+          parseCargoToml(content, dependencies);
+          break;
+        // Other manifests: just detect language presence
+      }
+    } catch (e) {
+      logger?.warn(`Failed to parse ${manifest}: ${(e as Error).message}`);
+    }
+  }
+
+  return {
+    languages: [...languages],
+    frameworks: [...frameworks],
+    dependencies,
+  };
+}
diff --git a/code-review/02-context-agent/implementation/deep_implement_config.json b/code-review/02-context-agent/implementation/deep_implement_config.json
index 21e088b..93c14c0 100644
--- a/code-review/02-context-agent/implementation/deep_implement_config.json
+++ b/code-review/02-context-agent/implementation/deep_implement_config.json
@@ -33,6 +33,10 @@
     "section-04-issue-parser": {
       "status": "complete",
       "commit_hash": "24f286d"
+    },
+    "section-05-domain-rules-loader": {
+      "status": "complete",
+      "commit_hash": "85b0acd"
     }
   },
   "pre_commit": {
