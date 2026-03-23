import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectTechStack } from "./tech-stack.js";
import type { GitHubClient } from "../clients/github.js";

function createMockGitHub() {
  return {
    getFileContent: vi.fn<(owner: string, repo: string, path: string, ref?: string) => Promise<string | null>>(),
  } as unknown as GitHubClient & { getFileContent: ReturnType<typeof vi.fn> };
}

const mockLogger = {
  info: vi.fn(),
  verbose: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  success: vi.fn(),
};

function makeOptions(overrides?: {
  github?: ReturnType<typeof createMockGitHub>;
  filePaths?: string[];
  ref?: string;
}) {
  const github = overrides?.github ?? createMockGitHub();
  return {
    github: github as unknown as GitHubClient,
    owner: "test-owner",
    repo: "test-repo",
    ref: overrides?.ref,
    filePaths: overrides?.filePaths ?? [],
    logger: mockLogger,
  };
}

describe("detectTechStack", () => {
  let github: ReturnType<typeof createMockGitHub>;

  beforeEach(() => {
    github = createMockGitHub();
    vi.clearAllMocks();
  });

  it("detects Node.js/TypeScript from package.json presence", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "package.json") {
        return JSON.stringify({
          dependencies: { express: "^4.18.0" },
          devDependencies: { typescript: "^5.0.0" },
        });
      }
      return null;
    });
    const opts = makeOptions({ github, filePaths: ["package.json", "tsconfig.json", "src/index.ts"] });
    const result = await detectTechStack(opts);
    expect(result.languages).toContain("JavaScript");
    expect(result.languages).toContain("TypeScript");
  });

  it("parses package.json dependencies and devDependencies", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "package.json") {
        return JSON.stringify({
          dependencies: { express: "^4.18.0" },
          devDependencies: { vitest: "^1.0.0" },
        });
      }
      return null;
    });
    const opts = makeOptions({ github, filePaths: ["package.json"] });
    const result = await detectTechStack(opts);
    expect(result.dependencies["express"]).toBe("^4.18.0");
    expect(result.dependencies["vitest"]).toBe("^1.0.0");
  });

  it("detects React framework from react dependency", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "package.json") {
        return JSON.stringify({ dependencies: { react: "^18.0.0" } });
      }
      return null;
    });
    const opts = makeOptions({ github, filePaths: ["package.json"] });
    const result = await detectTechStack(opts);
    expect(result.frameworks).toContain("React");
  });

  it("detects Express framework from express dependency", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "package.json") {
        return JSON.stringify({ dependencies: { express: "^4.18.0" } });
      }
      return null;
    });
    const opts = makeOptions({ github, filePaths: ["package.json"] });
    const result = await detectTechStack(opts);
    expect(result.frameworks).toContain("Express");
  });

  it("detects Next.js from next dependency", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "package.json") {
        return JSON.stringify({ dependencies: { next: "^14.0.0" } });
      }
      return null;
    });
    const opts = makeOptions({ github, filePaths: ["package.json"] });
    const result = await detectTechStack(opts);
    expect(result.frameworks).toContain("Next.js");
  });

  it("detects Go from go.mod presence", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "go.mod") {
        return `module example.com/myproject\n\ngo 1.21\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.1\n)`;
      }
      return null;
    });
    const opts = makeOptions({ github, filePaths: ["go.mod", "main.go"] });
    const result = await detectTechStack(opts);
    expect(result.languages).toContain("Go");
  });

  it("detects Python from requirements.txt presence", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "requirements.txt") {
        return "flask==2.0.0\nrequests>=2.28";
      }
      return null;
    });
    const opts = makeOptions({ github, filePaths: ["requirements.txt"] });
    const result = await detectTechStack(opts);
    expect(result.languages).toContain("Python");
  });

  it("detects Rust from Cargo.toml presence", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "Cargo.toml") {
        return `[package]\nname = "myproject"\nversion = "0.1.0"\n\n[dependencies]\nserde = "1.0"`;
      }
      return null;
    });
    const opts = makeOptions({ github, filePaths: ["Cargo.toml", "src/main.rs"] });
    const result = await detectTechStack(opts);
    expect(result.languages).toContain("Rust");
  });

  it("returns empty languages/frameworks/dependencies when no manifests found", async () => {
    const opts = makeOptions({ github, filePaths: ["src/index.ts", "README.md"] });
    const result = await detectTechStack(opts);
    expect(result.languages).toEqual([]);
    expect(result.frameworks).toEqual([]);
    expect(result.dependencies).toEqual({});
  });

  it("skips manifests that fail to parse (logs warning)", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "package.json") return "not json";
      return null;
    });
    const opts = makeOptions({ github, filePaths: ["package.json"] });
    const result = await detectTechStack(opts);
    expect(result.dependencies).toEqual({});
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it("only checks root-level manifests (not nested in subdirectories)", async () => {
    const opts = makeOptions({ github, filePaths: ["packages/sub/package.json"] });
    const result = await detectTechStack(opts);
    expect(github.getFileContent).not.toHaveBeenCalled();
    expect(result.languages).toEqual([]);
  });

  it("treats dependency versions as raw strings", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "package.json") {
        return JSON.stringify({ dependencies: { express: "^4.18.0" } });
      }
      return null;
    });
    const opts = makeOptions({ github, filePaths: ["package.json"] });
    const result = await detectTechStack(opts);
    expect(result.dependencies["express"]).toBe("^4.18.0");
  });

  it("passes ref parameter to getFileContent calls", async () => {
    github.getFileContent.mockResolvedValue(null);
    const opts = makeOptions({ github, filePaths: ["package.json"], ref: "abc123" });
    await detectTechStack(opts);
    for (const call of github.getFileContent.mock.calls) {
      expect(call[3]).toBe("abc123");
    }
  });
});
