import { describe, it, expect } from "vitest";
import { parseFile, isSupportedLanguage, detectLanguage } from "../../src/deterministic/ast-analyzer.js";

describe("ast-analyzer", () => {
  describe("parseFile", () => {
    it("returns a valid Tree for TypeScript source", () => {
      const tree = parseFile("const x: number = 1;", "typescript");
      expect(tree.rootNode).toBeDefined();
      expect(tree.rootNode.type).toBe("program");
    });

    it("returns a valid Tree for JavaScript source", () => {
      const tree = parseFile("const x = 1;", "javascript");
      expect(tree.rootNode).toBeDefined();
      expect(tree.rootNode.type).toBe("program");
    });

    it("handles empty source string without throwing", () => {
      const tree = parseFile("", "typescript");
      expect(tree.rootNode).toBeDefined();
      expect(tree.rootNode.type).toBe("program");
    });

    it("handles syntactically invalid source", () => {
      const tree = parseFile("const = = = ;", "typescript");
      expect(tree.rootNode).toBeDefined();
      expect(tree.rootNode.type).toBe("program");
    });
  });

  describe("isSupportedLanguage", () => {
    it("returns true for supported extensions", () => {
      for (const ext of [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]) {
        expect(isSupportedLanguage(`file${ext}`)).toBe(true);
      }
    });

    it("returns false for unsupported extensions", () => {
      for (const ext of [".py", ".go", ".css", ".json", ".md", ".rs", ".html"]) {
        expect(isSupportedLanguage(`file${ext}`)).toBe(false);
      }
    });

    it("handles paths with multiple dots", () => {
      expect(isSupportedLanguage("foo.test.ts")).toBe(true);
      expect(isSupportedLanguage("foo.spec.js")).toBe(true);
      expect(isSupportedLanguage("foo.bar.py")).toBe(false);
    });

    it("returns false for files with no extension", () => {
      expect(isSupportedLanguage("Makefile")).toBe(false);
      expect(isSupportedLanguage("Dockerfile")).toBe(false);
    });

    it("returns false for dotfiles", () => {
      expect(isSupportedLanguage(".gitignore")).toBe(false);
      expect(isSupportedLanguage(".eslintrc")).toBe(false);
    });
  });

  describe("detectLanguage", () => {
    it("returns typescript for .ts and .tsx files", () => {
      expect(detectLanguage("file.ts")).toBe("typescript");
      expect(detectLanguage("file.tsx")).toBe("typescript");
    });

    it("returns javascript for .js, .jsx, .mjs, .cjs files", () => {
      expect(detectLanguage("file.js")).toBe("javascript");
      expect(detectLanguage("file.jsx")).toBe("javascript");
      expect(detectLanguage("file.mjs")).toBe("javascript");
      expect(detectLanguage("file.cjs")).toBe("javascript");
    });

    it("returns null for unsupported extensions", () => {
      expect(detectLanguage("file.py")).toBeNull();
      expect(detectLanguage("file.go")).toBeNull();
    });

    it("returns null for files with no extension", () => {
      expect(detectLanguage("Makefile")).toBeNull();
      expect(detectLanguage("Dockerfile")).toBeNull();
    });

    it("returns null for dotfiles", () => {
      expect(detectLanguage(".gitignore")).toBeNull();
    });
  });

  describe("lazy initialization", () => {
    it("isSupportedLanguage does not trigger parser creation", () => {
      // This just verifies the function works without needing to parse
      // If parser init was eager, this could fail with missing native bindings
      expect(isSupportedLanguage("test.ts")).toBe(true);
      expect(isSupportedLanguage("test.py")).toBe(false);
    });
  });
});
