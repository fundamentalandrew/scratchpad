import { describe, it, expect } from "vitest";
import {
  filterChangedFiles,
  ANALYSIS_IGNORE_PATTERNS,
} from "../../src/deterministic/pattern-filter.js";
import type { PRFile } from "../../src/index.js";

function makePRFile(path: string): PRFile {
  return { path, status: "modified", additions: 10, deletions: 5, patch: "..." };
}

describe("filterChangedFiles", () => {
  it("files matching default analysis patterns are filtered", () => {
    const files = [
      makePRFile("package-lock.json"),
      makePRFile("yarn.lock"),
      makePRFile("pnpm-lock.yaml"),
      makePRFile("src/schema.generated.ts"),
      makePRFile("src/__snapshots__/app.snap"),
      makePRFile("prisma/migrations/001_init/migration.sql"),
      makePRFile("src/locales/en/common.json"),
      makePRFile("assets/logo.svg"),
      makePRFile("src/components/Button.tsx"),
    ];

    const result = filterChangedFiles(files, []);
    const ignoredPaths = result.ignored.map((f) => f.path);

    expect(ignoredPaths).toContain("package-lock.json");
    expect(ignoredPaths).toContain("yarn.lock");
    expect(ignoredPaths).toContain("pnpm-lock.yaml");
    expect(ignoredPaths).toContain("src/schema.generated.ts");
    expect(ignoredPaths).toContain("prisma/migrations/001_init/migration.sql");
    expect(ignoredPaths).toContain("src/locales/en/common.json");
    expect(ignoredPaths).toContain("assets/logo.svg");

    const passedPaths = result.passed.map((f) => f.path);
    expect(passedPaths).toEqual(["src/components/Button.tsx"]);
  });

  it("files matching core ignore patterns are filtered", () => {
    const files = [
      makePRFile("node_modules/foo/index.js"),
      makePRFile("dist/bundle.js"),
      makePRFile("src/app.ts"),
    ];

    const result = filterChangedFiles(files, ["node_modules/**", "dist/**"]);
    expect(result.passed.map((f) => f.path)).toEqual(["src/app.ts"]);
    expect(result.ignored).toHaveLength(2);
  });

  it("files not matching any pattern pass through", () => {
    const files = [
      makePRFile("src/components/Button.tsx"),
      makePRFile("src/utils/helpers.ts"),
    ];

    const result = filterChangedFiles(files, []);
    expect(result.passed).toHaveLength(2);
    expect(result.ignored).toHaveLength(0);
  });

  it("pattern merging deduplicates", () => {
    const files = [makePRFile("icon.svg")];
    const corePatterns = ["**/*.svg"];

    const result = filterChangedFiles(files, corePatterns);
    expect(result.ignored).toHaveLength(1);
    expect(result.ignored[0].path).toBe("icon.svg");
  });

  it("empty file list returns empty arrays", () => {
    const result = filterChangedFiles([], ["**/*.ts"]);
    expect(result.passed).toEqual([]);
    expect(result.ignored).toEqual([]);
    expect(result.ignoredScores).toEqual([]);
  });

  it("ignored files produce FileScore entries with score 0 and riskLevel low", () => {
    const files = [makePRFile("package-lock.json")];
    const result = filterChangedFiles(files, []);

    expect(result.ignoredScores).toHaveLength(1);
    const score = result.ignoredScores[0];
    expect(score.path).toBe("package-lock.json");
    expect(score.score).toBe(0);
    expect(score.riskLevel).toBe("low");
    expect(score.reasons).toContain("Filtered by ignore pattern");
  });

  it("glob patterns handle nested paths correctly", () => {
    const files = [
      makePRFile("prisma/migrations/001_init/migration.sql"),
      makePRFile("src/locales/en/common.json"),
      makePRFile("frontend/translations/fr.json"),
      makePRFile("app/i18n/setup.ts"),
    ];

    const result = filterChangedFiles(files, []);
    expect(result.ignored).toHaveLength(4);
    expect(result.passed).toHaveLength(0);
  });

  it("__snapshots__ directory pattern catches non-snap files", () => {
    const files = [makePRFile("src/__snapshots__/output.txt")];
    const result = filterChangedFiles(files, []);
    expect(result.ignored).toHaveLength(1);
    expect(result.passed).toHaveLength(0);
  });

  it("ANALYSIS_IGNORE_PATTERNS is exported and non-empty", () => {
    expect(Array.isArray(ANALYSIS_IGNORE_PATTERNS)).toBe(true);
    expect(ANALYSIS_IGNORE_PATTERNS.length).toBeGreaterThan(0);
  });
});
