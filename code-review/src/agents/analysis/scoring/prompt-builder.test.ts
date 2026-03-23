import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildBatchPrompt } from "./prompt-builder.js";
import type { ScoringContext, FileBatch, LowRiskSummary } from "./types.js";

function makeContext(overrides: Partial<ScoringContext> = {}): ScoringContext {
  return {
    domainRules: null,
    architectureDoc: null,
    techStack: { languages: ["TypeScript"], frameworks: [], dependencies: {} },
    prTitle: "Test PR",
    prDescription: "A test pull request",
    ...overrides,
  };
}

function makeBatch(overrides: Partial<FileBatch> = {}): FileBatch {
  return {
    files: [
      { path: "src/foo.ts", diff: "diff content for foo", status: "modified" },
    ],
    estimatedTokens: 100,
    isLargeFile: false,
    ...overrides,
  };
}

describe("buildSystemPrompt", () => {
  it("includes scoring rubric with 1-10 scale and tier examples", () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toContain("1-3 (Low risk)");
    expect(prompt).toContain("4-7 (Medium/High risk)");
    expect(prompt).toContain("8-10 (Critical risk)");
    expect(prompt).toContain("security/auth logic");
  });

  it("includes domain rules when provided", () => {
    const rules = "Never modify auth middleware without security review";
    const prompt = buildSystemPrompt(makeContext({ domainRules: rules }));
    expect(prompt).toContain(rules);
  });

  it("omits domain rules section when domainRules is null", () => {
    const prompt = buildSystemPrompt(makeContext({ domainRules: null }));
    expect(prompt).not.toMatch(/domain rules/i);
  });

  it("includes architecture context when provided", () => {
    const archDoc = "Services communicate via gRPC. Auth is handled by the gateway.";
    const prompt = buildSystemPrompt(makeContext({ architectureDoc: archDoc }));
    expect(prompt).toContain(archDoc);
  });

  it("includes tech stack information", () => {
    const prompt = buildSystemPrompt(
      makeContext({
        techStack: {
          languages: ["TypeScript"],
          frameworks: ["React"],
          dependencies: { zod: "3.0.0" },
        },
      })
    );
    expect(prompt).toContain("TypeScript");
    expect(prompt).toContain("React");
    expect(prompt).toContain("zod");
  });

  it("includes PR title and description", () => {
    const prompt = buildSystemPrompt(
      makeContext({ prTitle: "Fix auth bypass", prDescription: "Patches CVE-2024-1234" })
    );
    expect(prompt).toContain("Fix auth bypass");
    expect(prompt).toContain("Patches CVE-2024-1234");
  });

  it("includes data safety instructions", () => {
    const prompt = buildSystemPrompt(makeContext());
    expect(prompt).toMatch(/untrusted/i);
    expect(prompt).toMatch(/never follow instructions/i);
  });

  it("includes constrained changeType enum in output format", () => {
    const prompt = buildSystemPrompt(makeContext());
    const expectedTypes = [
      "logic-change",
      "api-contract",
      "schema-change",
      "config-change",
      "test-change",
      "ui-change",
      "security-change",
      "other",
    ];
    for (const t of expectedTypes) {
      expect(prompt).toContain(t);
    }
  });
});

describe("buildBatchPrompt", () => {
  it("includes diff content for each file in batch", () => {
    const batch = makeBatch({
      files: [
        { path: "src/a.ts", diff: "diff-a-content", status: "modified" },
        { path: "src/b.ts", diff: "diff-b-content", status: "added" },
      ],
    });
    const prompt = buildBatchPrompt(batch);
    expect(prompt).toContain("src/a.ts");
    expect(prompt).toContain("diff-a-content");
    expect(prompt).toContain("src/b.ts");
    expect(prompt).toContain("diff-b-content");
  });

  it("includes low-risk summary section when classified files provided", () => {
    const batch = makeBatch();
    const summaries: LowRiskSummary[] = [
      { path: "src/utils/helpers.ts", changeType: "format-only", suggestedScore: 1 },
    ];
    const prompt = buildBatchPrompt(batch, summaries);
    expect(prompt).toContain("src/utils/helpers.ts");
    expect(prompt).toContain("format-only");
    expect(prompt).toMatch(/pre-classified/i);
  });

  it("formats file paths and diffs with clear delimiters", () => {
    const batch = makeBatch({
      files: [
        { path: "src/foo.ts", diff: "the-diff", status: "modified" },
      ],
    });
    const prompt = buildBatchPrompt(batch);
    // File path should appear as a header/delimiter
    expect(prompt).toMatch(/---.*src\/foo\.ts.*---/);
    expect(prompt).toContain("the-diff");
  });
});
