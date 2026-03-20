import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadDomainRules } from "./domain-rules.js";
import { GitHubAPIError } from "../utils/errors.js";
import type { GitHubClient } from "../clients/github.js";
import type { CodeReviewConfig } from "../config/schema.js";
import { defaultConfig } from "../config/schema.js";

function createMockGitHub() {
  return {
    getFileContent: vi.fn<(owner: string, repo: string, path: string, ref?: string) => Promise<string | null>>(),
  } as unknown as GitHubClient & { getFileContent: ReturnType<typeof vi.fn> };
}

function makeOptions(overrides?: {
  github?: ReturnType<typeof createMockGitHub>;
  config?: Partial<CodeReviewConfig>;
  ref?: string;
}) {
  const github = overrides?.github ?? createMockGitHub();
  return {
    github: github as unknown as GitHubClient,
    owner: "test-owner",
    repo: "test-repo",
    ref: overrides?.ref,
    config: { ...defaultConfig, ...overrides?.config } as CodeReviewConfig,
  };
}

describe("loadDomainRules", () => {
  let github: ReturnType<typeof createMockGitHub>;

  beforeEach(() => {
    github = createMockGitHub();
  });

  // --- Domain Rules Loading ---

  it("loads domain rules from config.domainRulesPath when found", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "custom/RULES.md") return "# Domain Rules Content";
      return null;
    });
    const opts = makeOptions({ github, config: { domainRulesPath: "./custom/RULES.md" } });
    const result = await loadDomainRules(opts);
    expect(result.domainRules).toBe("# Domain Rules Content");
  });

  it("falls back to DOMAIN_RULES.md when config path not found", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "DOMAIN_RULES.md") return "# Fallback Domain Rules";
      return null;
    });
    const opts = makeOptions({ github, config: { domainRulesPath: "./custom/RULES.md" } });
    const result = await loadDomainRules(opts);
    expect(result.domainRules).toBe("# Fallback Domain Rules");
  });

  it("falls back to .github/DOMAIN_RULES.md when root not found", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === ".github/DOMAIN_RULES.md") return "# GitHub Domain Rules";
      return null;
    });
    const opts = makeOptions({ github });
    const result = await loadDomainRules(opts);
    expect(result.domainRules).toBe("# GitHub Domain Rules");
  });

  it("falls back to docs/DOMAIN_RULES.md when .github not found", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "docs/DOMAIN_RULES.md") return "# Docs Domain Rules";
      return null;
    });
    const opts = makeOptions({ github });
    const result = await loadDomainRules(opts);
    expect(result.domainRules).toBe("# Docs Domain Rules");
  });

  it("returns null when no domain rules file found anywhere", async () => {
    github.getFileContent.mockResolvedValue(null);
    const opts = makeOptions({ github });
    const result = await loadDomainRules(opts);
    expect(result.domainRules).toBeNull();
  });

  // --- Architecture Doc Loading ---

  it("loads architecture doc from config.architecturePath when found", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "custom/ARCH.md") return "# Architecture Doc";
      return null;
    });
    const opts = makeOptions({ github, config: { architecturePath: "./custom/ARCH.md" } });
    const result = await loadDomainRules(opts);
    expect(result.architectureDoc).toBe("# Architecture Doc");
  });

  it("falls back to ARCHITECTURE.md when config path not found", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "ARCHITECTURE.md") return "# Fallback Architecture";
      return null;
    });
    const opts = makeOptions({ github, config: { architecturePath: "./custom/ARCH.md" } });
    const result = await loadDomainRules(opts);
    expect(result.architectureDoc).toBe("# Fallback Architecture");
  });

  it("falls back to .github/ARCHITECTURE.md when root not found", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === ".github/ARCHITECTURE.md") return "# GitHub Architecture";
      return null;
    });
    const opts = makeOptions({ github });
    const result = await loadDomainRules(opts);
    expect(result.architectureDoc).toBe("# GitHub Architecture");
  });

  it("falls back to docs/architecture.md when .github not found", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "docs/architecture.md") return "# Docs Architecture";
      return null;
    });
    const opts = makeOptions({ github });
    const result = await loadDomainRules(opts);
    expect(result.architectureDoc).toBe("# Docs Architecture");
  });

  it("returns null when no architecture doc found anywhere", async () => {
    github.getFileContent.mockResolvedValue(null);
    const opts = makeOptions({ github });
    const result = await loadDomainRules(opts);
    expect(result.architectureDoc).toBeNull();
  });

  // --- Combined Behavior ---

  it("loads both domain rules and architecture doc independently", async () => {
    github.getFileContent.mockImplementation(async (_o, _r, path) => {
      if (path === "DOMAIN_RULES.md") return "# Rules";
      if (path === ".github/ARCHITECTURE.md") return "# Arch";
      return null;
    });
    const opts = makeOptions({ github });
    const result = await loadDomainRules(opts);
    expect(result.domainRules).toBe("# Rules");
    expect(result.architectureDoc).toBe("# Arch");
  });

  it("returns both null when neither found", async () => {
    github.getFileContent.mockResolvedValue(null);
    const opts = makeOptions({ github });
    const result = await loadDomainRules(opts);
    expect(result.domainRules).toBeNull();
    expect(result.architectureDoc).toBeNull();
  });

  it("passes ref parameter to getFileContent calls", async () => {
    github.getFileContent.mockResolvedValue(null);
    const opts = makeOptions({ github, ref: "abc123" });
    await loadDomainRules(opts);
    for (const call of github.getFileContent.mock.calls) {
      expect(call[3]).toBe("abc123");
    }
  });

  it("propagates non-404 errors (fail fast)", async () => {
    github.getFileContent.mockRejectedValue(
      new GitHubAPIError("getFileContent failed: Internal Server Error"),
    );
    const opts = makeOptions({ github });
    await expect(loadDomainRules(opts)).rejects.toThrow(GitHubAPIError);
  });
});
