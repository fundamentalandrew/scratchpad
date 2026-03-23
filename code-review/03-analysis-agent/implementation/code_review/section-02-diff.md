diff --git a/code-review/03-analysis-agent/src/deterministic/pattern-filter.ts b/code-review/03-analysis-agent/src/deterministic/pattern-filter.ts
index bfe66d4..3769a06 100644
--- a/code-review/03-analysis-agent/src/deterministic/pattern-filter.ts
+++ b/code-review/03-analysis-agent/src/deterministic/pattern-filter.ts
@@ -1 +1,49 @@
-// Stub — implemented in section-02
+import { filterFiles } from "@core/utils/file-filter.js";
+import type { FileScore } from "@core/agents/schemas.js";
+import type { PRFile } from "./types.js";
+
+export const ANALYSIS_IGNORE_PATTERNS = [
+  "package-lock.json",
+  "yarn.lock",
+  "pnpm-lock.yaml",
+  "*.generated.*",
+  "*.gen.*",
+  "*.graphql",
+  "prisma/migrations/**",
+  "**/locales/**",
+  "**/translations/**",
+  "**/i18n/**",
+  "**/*.svg",
+  "**/__snapshots__/**",
+  "**/*.snap",
+];
+
+export interface PatternFilterResult {
+  passed: PRFile[];
+  ignored: PRFile[];
+  ignoredScores: FileScore[];
+}
+
+export function filterChangedFiles(
+  files: PRFile[],
+  corePatterns: string[],
+  analysisPatterns: string[] = ANALYSIS_IGNORE_PATTERNS,
+): PatternFilterResult {
+  const mergedPatterns = Array.from(
+    new Set([...corePatterns, ...analysisPatterns]),
+  );
+
+  const passed = filterFiles(files, mergedPatterns, (f) => f.path);
+
+  const passedPaths = new Set(passed.map((f) => f.path));
+  const ignored = files.filter((f) => !passedPaths.has(f.path));
+
+  const ignoredScores: FileScore[] = ignored.map((f) => ({
+    path: f.path,
+    score: 0,
+    riskLevel: "low" as const,
+    reasons: ["Filtered by ignore pattern"],
+  }));
+
+  return { passed, ignored, ignoredScores };
+}
diff --git a/code-review/03-analysis-agent/tests/unit/pattern-filter.test.ts b/code-review/03-analysis-agent/tests/unit/pattern-filter.test.ts
new file mode 100644
index 0000000..7de536f
--- /dev/null
+++ b/code-review/03-analysis-agent/tests/unit/pattern-filter.test.ts
@@ -0,0 +1,109 @@
+import { describe, it, expect } from "vitest";
+import {
+  filterChangedFiles,
+  ANALYSIS_IGNORE_PATTERNS,
+} from "../../src/deterministic/pattern-filter.js";
+import type { PRFile } from "../../src/index.js";
+
+function makePRFile(path: string): PRFile {
+  return { path, status: "modified", additions: 10, deletions: 5, patch: "..." };
+}
+
+describe("filterChangedFiles", () => {
+  it("files matching default analysis patterns are filtered", () => {
+    const files = [
+      makePRFile("package-lock.json"),
+      makePRFile("yarn.lock"),
+      makePRFile("pnpm-lock.yaml"),
+      makePRFile("src/schema.generated.ts"),
+      makePRFile("src/__snapshots__/app.snap"),
+      makePRFile("prisma/migrations/001_init/migration.sql"),
+      makePRFile("src/locales/en/common.json"),
+      makePRFile("assets/logo.svg"),
+      makePRFile("src/components/Button.tsx"),
+    ];
+
+    const result = filterChangedFiles(files, []);
+    const ignoredPaths = result.ignored.map((f) => f.path);
+
+    expect(ignoredPaths).toContain("package-lock.json");
+    expect(ignoredPaths).toContain("yarn.lock");
+    expect(ignoredPaths).toContain("pnpm-lock.yaml");
+    expect(ignoredPaths).toContain("src/schema.generated.ts");
+    expect(ignoredPaths).toContain("prisma/migrations/001_init/migration.sql");
+    expect(ignoredPaths).toContain("src/locales/en/common.json");
+    expect(ignoredPaths).toContain("assets/logo.svg");
+
+    const passedPaths = result.passed.map((f) => f.path);
+    expect(passedPaths).toEqual(["src/components/Button.tsx"]);
+  });
+
+  it("files matching core ignore patterns are filtered", () => {
+    const files = [
+      makePRFile("node_modules/foo/index.js"),
+      makePRFile("dist/bundle.js"),
+      makePRFile("src/app.ts"),
+    ];
+
+    const result = filterChangedFiles(files, ["node_modules/**", "dist/**"]);
+    expect(result.passed.map((f) => f.path)).toEqual(["src/app.ts"]);
+    expect(result.ignored).toHaveLength(2);
+  });
+
+  it("files not matching any pattern pass through", () => {
+    const files = [
+      makePRFile("src/components/Button.tsx"),
+      makePRFile("src/utils/helpers.ts"),
+    ];
+
+    const result = filterChangedFiles(files, []);
+    expect(result.passed).toHaveLength(2);
+    expect(result.ignored).toHaveLength(0);
+  });
+
+  it("pattern merging deduplicates", () => {
+    const files = [makePRFile("icon.svg")];
+    const corePatterns = ["**/*.svg"];
+
+    const result = filterChangedFiles(files, corePatterns);
+    expect(result.ignored).toHaveLength(1);
+    expect(result.ignored[0].path).toBe("icon.svg");
+  });
+
+  it("empty file list returns empty arrays", () => {
+    const result = filterChangedFiles([], ["**/*.ts"]);
+    expect(result.passed).toEqual([]);
+    expect(result.ignored).toEqual([]);
+    expect(result.ignoredScores).toEqual([]);
+  });
+
+  it("ignored files produce FileScore entries with score 0 and riskLevel low", () => {
+    const files = [makePRFile("package-lock.json")];
+    const result = filterChangedFiles(files, []);
+
+    expect(result.ignoredScores).toHaveLength(1);
+    const score = result.ignoredScores[0];
+    expect(score.path).toBe("package-lock.json");
+    expect(score.score).toBe(0);
+    expect(score.riskLevel).toBe("low");
+    expect(score.reasons).toContain("Filtered by ignore pattern");
+  });
+
+  it("glob patterns handle nested paths correctly", () => {
+    const files = [
+      makePRFile("prisma/migrations/001_init/migration.sql"),
+      makePRFile("src/locales/en/common.json"),
+      makePRFile("frontend/translations/fr.json"),
+      makePRFile("app/i18n/setup.ts"),
+    ];
+
+    const result = filterChangedFiles(files, []);
+    expect(result.ignored).toHaveLength(4);
+    expect(result.passed).toHaveLength(0);
+  });
+
+  it("ANALYSIS_IGNORE_PATTERNS is exported and non-empty", () => {
+    expect(Array.isArray(ANALYSIS_IGNORE_PATTERNS)).toBe(true);
+    expect(ANALYSIS_IGNORE_PATTERNS.length).toBeGreaterThan(0);
+  });
+});
