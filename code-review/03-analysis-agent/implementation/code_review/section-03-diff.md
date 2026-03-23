diff --git a/code-review/03-analysis-agent/src/deterministic/ast-analyzer.ts b/code-review/03-analysis-agent/src/deterministic/ast-analyzer.ts
index 7b53c46..fe9b18e 100644
--- a/code-review/03-analysis-agent/src/deterministic/ast-analyzer.ts
+++ b/code-review/03-analysis-agent/src/deterministic/ast-analyzer.ts
@@ -1 +1,49 @@
-// Stub — implemented in section-03
+import Parser from "tree-sitter";
+import TypeScript from "tree-sitter-typescript";
+import JavaScript from "tree-sitter-javascript";
+
+type Language = "typescript" | "javascript";
+
+const EXTENSION_MAP: Record<string, Language> = {
+  ".ts": "typescript",
+  ".tsx": "typescript",
+  ".js": "javascript",
+  ".jsx": "javascript",
+  ".mjs": "javascript",
+  ".cjs": "javascript",
+};
+
+let tsParser: Parser | null = null;
+let jsParser: Parser | null = null;
+
+function getParser(language: Language): Parser {
+  if (language === "typescript") {
+    if (!tsParser) {
+      tsParser = new Parser();
+      tsParser.setLanguage(TypeScript.typescript);
+    }
+    return tsParser;
+  }
+
+  if (!jsParser) {
+    jsParser = new Parser();
+    jsParser.setLanguage(JavaScript);
+  }
+  return jsParser;
+}
+
+export function detectLanguage(filePath: string): Language | null {
+  const lastDot = filePath.lastIndexOf(".");
+  if (lastDot === -1) return null;
+  const ext = filePath.slice(lastDot);
+  return EXTENSION_MAP[ext] ?? null;
+}
+
+export function isSupportedLanguage(filePath: string): boolean {
+  return detectLanguage(filePath) !== null;
+}
+
+export function parseFile(source: string, language: Language): Parser.Tree {
+  const parser = getParser(language);
+  return parser.parse(source);
+}
diff --git a/code-review/03-analysis-agent/tests/unit/ast-analyzer.test.ts b/code-review/03-analysis-agent/tests/unit/ast-analyzer.test.ts
new file mode 100644
index 0000000..b4477c6
--- /dev/null
+++ b/code-review/03-analysis-agent/tests/unit/ast-analyzer.test.ts
@@ -0,0 +1,78 @@
+import { describe, it, expect } from "vitest";
+import { parseFile, isSupportedLanguage, detectLanguage } from "../../src/deterministic/ast-analyzer.js";
+
+describe("ast-analyzer", () => {
+  describe("parseFile", () => {
+    it("returns a valid Tree for TypeScript source", () => {
+      const tree = parseFile("const x: number = 1;", "typescript");
+      expect(tree.rootNode).toBeDefined();
+      expect(tree.rootNode.type).toBe("program");
+    });
+
+    it("returns a valid Tree for JavaScript source", () => {
+      const tree = parseFile("const x = 1;", "javascript");
+      expect(tree.rootNode).toBeDefined();
+      expect(tree.rootNode.type).toBe("program");
+    });
+
+    it("handles empty source string without throwing", () => {
+      const tree = parseFile("", "typescript");
+      expect(tree.rootNode).toBeDefined();
+      expect(tree.rootNode.type).toBe("program");
+    });
+
+    it("handles syntactically invalid source", () => {
+      const tree = parseFile("const = = = ;", "typescript");
+      expect(tree.rootNode).toBeDefined();
+      expect(tree.rootNode.type).toBe("program");
+    });
+  });
+
+  describe("isSupportedLanguage", () => {
+    it("returns true for supported extensions", () => {
+      for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) {
+        expect(isSupportedLanguage(`file${ext}`)).toBe(true);
+      }
+    });
+
+    it("returns false for unsupported extensions", () => {
+      for (const ext of [".py", ".go", ".css", ".json", ".md", ".rs", ".html"]) {
+        expect(isSupportedLanguage(`file${ext}`)).toBe(false);
+      }
+    });
+
+    it("handles paths with multiple dots", () => {
+      expect(isSupportedLanguage("foo.test.ts")).toBe(true);
+      expect(isSupportedLanguage("foo.spec.js")).toBe(true);
+      expect(isSupportedLanguage("foo.bar.py")).toBe(false);
+    });
+  });
+
+  describe("detectLanguage", () => {
+    it("returns typescript for .ts and .tsx files", () => {
+      expect(detectLanguage("file.ts")).toBe("typescript");
+      expect(detectLanguage("file.tsx")).toBe("typescript");
+    });
+
+    it("returns javascript for .js, .jsx, .mjs, .cjs files", () => {
+      expect(detectLanguage("file.js")).toBe("javascript");
+      expect(detectLanguage("file.jsx")).toBe("javascript");
+      expect(detectLanguage("file.mjs")).toBe("javascript");
+      expect(detectLanguage("file.cjs")).toBe("javascript");
+    });
+
+    it("returns null for unsupported extensions", () => {
+      expect(detectLanguage("file.py")).toBeNull();
+      expect(detectLanguage("file.go")).toBeNull();
+    });
+  });
+
+  describe("lazy initialization", () => {
+    it("isSupportedLanguage does not trigger parser creation", () => {
+      // This just verifies the function works without needing to parse
+      // If parser init was eager, this could fail with missing native bindings
+      expect(isSupportedLanguage("test.ts")).toBe(true);
+      expect(isSupportedLanguage("test.py")).toBe(false);
+    });
+  });
+});
