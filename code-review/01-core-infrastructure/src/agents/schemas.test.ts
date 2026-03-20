import { describe, it, expect } from "vitest";
import {
  FileScoreSchema,
  RecommendationSchema,
  ContextOutputSchema,
  AnalysisOutputSchema,
  ReviewOutputSchema,
  ReferencedIssueSchema,
  ReviewCommentSchema,
  TechStackSchema,
  PRFileSchema,
} from "./schemas.js";

describe("FileScoreSchema", () => {
  it("accepts valid data with all fields populated", () => {
    const result = FileScoreSchema.safeParse({
      path: "src/index.ts",
      score: 7,
      riskLevel: "high",
      reasons: ["complex logic", "no tests"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects score outside 0-10 range", () => {
    const tooHigh = FileScoreSchema.safeParse({
      path: "src/index.ts",
      score: 11,
      riskLevel: "low",
      reasons: [],
    });
    expect(tooHigh.success).toBe(false);

    const tooLow = FileScoreSchema.safeParse({
      path: "src/index.ts",
      score: -1,
      riskLevel: "low",
      reasons: [],
    });
    expect(tooLow.success).toBe(false);
  });

  it("rejects invalid RiskLevel value", () => {
    const result = FileScoreSchema.safeParse({
      path: "src/index.ts",
      score: 5,
      riskLevel: "extreme",
      reasons: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("RecommendationSchema", () => {
  it("accepts minimal valid data without optional fields", () => {
    const result = RecommendationSchema.safeParse({
      file: "src/index.ts",
      severity: "medium",
      category: "logic",
      message: "Potential null reference",
    });
    expect(result.success).toBe(true);
  });

  it("accepts full data with line and suggestion", () => {
    const result = RecommendationSchema.safeParse({
      file: "src/index.ts",
      line: 42,
      severity: "high",
      category: "security",
      message: "SQL injection risk",
      suggestion: "Use parameterized queries",
    });
    expect(result.success).toBe(true);
  });
});

describe("ContextOutputSchema", () => {
  const baseData = {
    mode: "pr" as const,
    repository: { owner: "octocat", repo: "hello", defaultBranch: "main" },
    domainRules: null,
    architectureDoc: null,
  };

  it("accepts valid PR-mode data", () => {
    const result = ContextOutputSchema.safeParse({
      ...baseData,
      mode: "pr",
      pr: {
        number: 1,
        title: "Fix bug",
        description: "Fixes #1",
        author: "octocat",
        baseBranch: "main",
        headBranch: "fix-bug",
        files: [
          { path: "src/index.ts", status: "modified", additions: 5, deletions: 2, patch: "@@ -1,3 +1,5 @@" },
        ],
        diff: "diff --git ...",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid repo-mode data with repoFiles", () => {
    const result = ContextOutputSchema.safeParse({
      ...baseData,
      mode: "repo",
      repoFiles: [{ path: "src/index.ts" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects data with both pr and repoFiles missing (pr mode)", () => {
    const result = ContextOutputSchema.safeParse({
      ...baseData,
      mode: "pr",
    });
    expect(result.success).toBe(false);
  });

  it("rejects data with both pr and repoFiles missing (repo mode)", () => {
    const result = ContextOutputSchema.safeParse({
      ...baseData,
      mode: "repo",
    });
    expect(result.success).toBe(false);
  });
});

describe("AnalysisOutputSchema", () => {
  it("accepts valid data with summary counts", () => {
    const result = AnalysisOutputSchema.safeParse({
      scoredFiles: [
        { path: "src/a.ts", score: 8, riskLevel: "critical", reasons: ["complex"] },
      ],
      criticalFiles: [
        { path: "src/a.ts", score: 8, riskLevel: "critical", reasons: ["complex"] },
      ],
      summary: {
        totalFiles: 1,
        criticalCount: 1,
        highCount: 0,
        categories: { complexity: 1 },
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("ReviewOutputSchema", () => {
  it("accepts valid data with recommendations array", () => {
    const result = ReviewOutputSchema.safeParse({
      recommendations: [
        { file: "src/a.ts", severity: "high", category: "security", message: "XSS risk" },
      ],
      coreDecision: "Needs changes before merge",
      focusAreas: ["input validation", "error handling"],
    });
    expect(result.success).toBe(true);
  });
});

describe("ReferencedIssueSchema", () => {
  it("validates a complete issue with all fields", () => {
    const result = ReferencedIssueSchema.safeParse({
      number: 42,
      title: "Fix login bug",
      state: "open",
      body: "The login page crashes",
      owner: "octocat",
      repo: "hello-world",
    });
    expect(result.success).toBe(true);
  });

  it("validates a same-repo issue without owner/repo", () => {
    const result = ReferencedIssueSchema.safeParse({
      number: 10,
      title: "Add tests",
      state: "closed",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(ReferencedIssueSchema.safeParse({ number: 1, title: "X" }).success).toBe(false);
    expect(ReferencedIssueSchema.safeParse({ number: 1, state: "open" }).success).toBe(false);
    expect(ReferencedIssueSchema.safeParse({ title: "X", state: "open" }).success).toBe(false);
  });
});

describe("ReviewCommentSchema", () => {
  it("validates a complete comment with all fields", () => {
    const result = ReviewCommentSchema.safeParse({
      id: 1001,
      author: "reviewer",
      body: "Looks good",
      path: "src/index.ts",
      line: 42,
      createdAt: "2024-01-15T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("validates a comment without optional path/line", () => {
    const result = ReviewCommentSchema.safeParse({
      id: 1002,
      author: "reviewer",
      body: "General comment",
      createdAt: "2024-01-15T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("requires id field", () => {
    const result = ReviewCommentSchema.safeParse({
      author: "reviewer",
      body: "Missing id",
      createdAt: "2024-01-15T10:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("TechStackSchema", () => {
  it("validates with populated arrays and dependencies record", () => {
    const result = TechStackSchema.safeParse({
      languages: ["TypeScript"],
      frameworks: ["React"],
      dependencies: { react: "^18.0.0" },
    });
    expect(result.success).toBe(true);
  });

  it("validates with empty arrays and empty dependencies record", () => {
    const result = TechStackSchema.safeParse({
      languages: [],
      frameworks: [],
      dependencies: {},
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(TechStackSchema.safeParse({ languages: ["TS"] }).success).toBe(false);
    expect(TechStackSchema.safeParse({ frameworks: [] }).success).toBe(false);
    expect(TechStackSchema.safeParse({}).success).toBe(false);
  });
});

describe("PRFileSchema (extended)", () => {
  it("accepts previousPath for renamed files", () => {
    const result = PRFileSchema.safeParse({
      path: "new/path.ts",
      status: "renamed",
      additions: 0,
      deletions: 0,
      previousPath: "old/path.ts",
    });
    expect(result.success).toBe(true);
  });

  it("works without previousPath (backward compat)", () => {
    const result = PRFileSchema.safeParse({
      path: "src/index.ts",
      status: "modified",
      additions: 5,
      deletions: 2,
    });
    expect(result.success).toBe(true);
  });
});

describe("ContextOutputSchema (extended)", () => {
  const baseData = {
    mode: "pr" as const,
    repository: { owner: "octocat", repo: "hello", defaultBranch: "main" },
    domainRules: null,
    architectureDoc: null,
  };

  const validPR = {
    number: 1,
    title: "Fix bug",
    description: "Fixes #1",
    author: "octocat",
    baseBranch: "main",
    headBranch: "fix-bug",
    files: [{ path: "src/index.ts", status: "modified", additions: 5, deletions: 2 }],
    diff: "diff --git ...",
  };

  it("accepts referencedIssues, comments, and techStack as optional fields", () => {
    const result = ContextOutputSchema.safeParse({
      ...baseData,
      pr: validPR,
      referencedIssues: [{ number: 1, title: "Bug", state: "open" }],
      comments: [{ id: 1, author: "user", body: "Fix this", createdAt: "2024-01-01T00:00:00Z" }],
      techStack: { languages: ["TypeScript"], frameworks: [], dependencies: {} },
    });
    expect(result.success).toBe(true);
  });

  it("validates without new optional fields (backward compat)", () => {
    const result = ContextOutputSchema.safeParse({
      ...baseData,
      pr: validPR,
    });
    expect(result.success).toBe(true);
  });

  it("still requires either pr or repoFiles with new fields present", () => {
    const result = ContextOutputSchema.safeParse({
      ...baseData,
      referencedIssues: [],
      comments: [],
      techStack: { languages: [], frameworks: [], dependencies: {} },
    });
    expect(result.success).toBe(false);
  });
});

describe("JSON Schema generation", () => {
  it("all schemas produce valid JSON Schema", () => {
    const schemas = [
      FileScoreSchema,
      RecommendationSchema,
      ContextOutputSchema,
      AnalysisOutputSchema,
      ReviewOutputSchema,
      ReferencedIssueSchema,
      ReviewCommentSchema,
      TechStackSchema,
      PRFileSchema,
    ];
    for (const schema of schemas) {
      const jsonSchema = schema.toJSONSchema();
      expect(jsonSchema).toBeDefined();
      expect(typeof jsonSchema).toBe("object");
      expect(jsonSchema).toHaveProperty("type");
    }
  });
});
