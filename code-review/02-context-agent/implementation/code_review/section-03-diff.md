diff --git a/code-review/01-core-infrastructure/src/utils/file-filter.test.ts b/code-review/01-core-infrastructure/src/utils/file-filter.test.ts
new file mode 100644
index 0000000..f7779d4
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/utils/file-filter.test.ts
@@ -0,0 +1,75 @@
+import { describe, it, expect } from "vitest";
+import { filterFiles } from "./file-filter.js";
+
+describe("filterFiles", () => {
+  it("filters out files matching a single glob pattern", () => {
+    const files = ["node_modules/foo/bar.js", "src/index.ts", "node_modules/baz/qux.js"];
+    const result = filterFiles(files, ["node_modules/**"], (f) => f);
+    expect(result).toEqual(["src/index.ts"]);
+  });
+
+  it("filters out files matching multiple patterns", () => {
+    const files = [
+      "node_modules/foo/bar.js",
+      "src/index.ts",
+      "dist/bundle.js",
+      "yarn.lock",
+      "src/app.ts",
+    ];
+    const result = filterFiles(files, ["node_modules/**", "*.lock", "dist/**"], (f) => f);
+    expect(result).toEqual(["src/index.ts", "src/app.ts"]);
+  });
+
+  it("keeps files that don't match any pattern", () => {
+    const files = ["src/index.ts", "src/utils/helper.ts", "lib/core.ts"];
+    const result = filterFiles(files, ["node_modules/**", "dist/**"], (f) => f);
+    expect(result).toEqual(files);
+  });
+
+  it("works with PR file objects using getPath accessor", () => {
+    const files = [
+      { path: "node_modules/foo.js", status: "modified", additions: 1, deletions: 0 },
+      { path: "src/index.ts", status: "added", additions: 10, deletions: 0 },
+      { path: "dist/bundle.js", status: "modified", additions: 5, deletions: 3 },
+    ];
+    const result = filterFiles(files, ["node_modules/**", "dist/**"], (f) => f.path);
+    expect(result).toEqual([
+      { path: "src/index.ts", status: "added", additions: 10, deletions: 0 },
+    ]);
+  });
+
+  it("works with simple path strings", () => {
+    const files = ["src/a.ts", "src/b.ts", "dist/out.js"];
+    const result = filterFiles(files, ["dist/**"], (f) => f);
+    expect(result).toEqual(["src/a.ts", "src/b.ts"]);
+  });
+
+  it("handles empty file list", () => {
+    const result = filterFiles([], ["node_modules/**"], (f) => f);
+    expect(result).toEqual([]);
+  });
+
+  it("handles empty pattern list", () => {
+    const files = ["src/a.ts", "src/b.ts"];
+    const result = filterFiles(files, [], (f) => f);
+    expect(result).toEqual(files);
+  });
+
+  it("matches nested paths correctly", () => {
+    const files = ["dist/index.js", "dist/sub/deep.js", "src/main.ts"];
+    const result = filterFiles(files, ["dist/**"], (f) => f);
+    expect(result).toEqual(["src/main.ts"]);
+  });
+
+  it("does not match partial directory names", () => {
+    const files = ["dist/index.js", "redistribution/file.js", "src/main.ts"];
+    const result = filterFiles(files, ["dist/**"], (f) => f);
+    expect(result).toEqual(["redistribution/file.js", "src/main.ts"]);
+  });
+
+  it("matches bare globs against nested paths with matchBase", () => {
+    const files = ["yarn.lock", "subdir/pnpm-lock.yaml", "src/app.min.js", "src/index.ts"];
+    const result = filterFiles(files, ["*.lock", "*.min.*", "*.yaml"], (f) => f);
+    expect(result).toEqual(["src/index.ts"]);
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/utils/file-filter.ts b/code-review/01-core-infrastructure/src/utils/file-filter.ts
new file mode 100644
index 0000000..f901789
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/utils/file-filter.ts
@@ -0,0 +1,30 @@
+import picomatch from "picomatch";
+
+export function filterFiles<T>(
+  files: T[],
+  patterns: string[],
+  getPath: (file: T) => string,
+): T[] {
+  if (patterns.length === 0) {
+    return files;
+  }
+
+  // Separate bare globs (no path separator) from path-based patterns.
+  // Bare globs like "*.lock" need matchBase to match nested files.
+  // Path globs like "dist/**" break with matchBase, so use default mode.
+  const barePatterns = patterns.filter((p) => !p.includes("/"));
+  const pathPatterns = patterns.filter((p) => p.includes("/"));
+
+  const matchers: picomatch.Matcher[] = [];
+  if (barePatterns.length > 0) {
+    matchers.push(picomatch(barePatterns, { matchBase: true }));
+  }
+  if (pathPatterns.length > 0) {
+    matchers.push(picomatch(pathPatterns));
+  }
+
+  return files.filter((file) => {
+    const path = getPath(file);
+    return !matchers.some((m) => m(path));
+  });
+}
