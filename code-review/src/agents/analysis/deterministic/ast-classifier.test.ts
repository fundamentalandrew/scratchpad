import { describe, it, expect } from "vitest";
import { parseFile } from "./ast-analyzer.js";
import { classifyChange } from "./ast-classifier.js";

describe("ast-classifier", () => {
  describe("format-only", () => {
    it("detects whitespace-only changes", () => {
      const before = parseFile("const x=1;function foo(){return x;}", "typescript");
      const after = parseFile("const x = 1;\n\nfunction foo() {\n  return x;\n}", "typescript");
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("format-only");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("detects comment-only changes as format-only", () => {
      const before = parseFile("const x = 1;", "typescript");
      const after = parseFile("// a comment\nconst x = 1;", "typescript");
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("format-only");
    });
  });

  describe("rename-only", () => {
    it("detects single consistent variable rename", () => {
      const before = parseFile(
        "function fetchData() { return fetchData; }",
        "typescript",
      );
      const after = parseFile(
        "function getData() { return getData; }",
        "typescript",
      );
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("rename-only");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("detects multiple consistent renames", () => {
      const before = parseFile(
        "const foo = 1; const baz = 2; const result = foo + baz;",
        "typescript",
      );
      const after = parseFile(
        "const bar = 1; const qux = 2; const result = bar + qux;",
        "typescript",
      );
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("rename-only");
    });

    it("rejects inconsistent rename mapping", () => {
      // x maps to both y and z in different positions
      const before = parseFile(
        "const a = x + x;",
        "typescript",
      );
      const after = parseFile(
        "const a = y + z;",
        "typescript",
      );
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("structural");
    });
  });

  describe("moved-function", () => {
    it("detects function reordering", () => {
      const before = parseFile(
        "function foo() { return 1; }\nfunction bar() { return 2; }",
        "typescript",
      );
      const after = parseFile(
        "function bar() { return 2; }\nfunction foo() { return 1; }",
        "typescript",
      );
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("moved-function");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("structural", () => {
    it("detects logic changes", () => {
      const before = parseFile("function f(x: number) { return x > 0; }", "typescript");
      const after = parseFile("function f(x: number) { return x >= 0; }", "typescript");
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("structural");
    });

    it("detects new function added", () => {
      const before = parseFile("function foo() { return 1; }", "typescript");
      const after = parseFile(
        "function foo() { return 1; }\nfunction bar() { return 2; }",
        "typescript",
      );
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("structural");
    });

    it("detects function body changes", () => {
      const before = parseFile("function foo() { return 1; }", "typescript");
      const after = parseFile("function foo() { return 2; }", "typescript");
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("structural");
    });
  });

  describe("confidence threshold", () => {
    it("high confidence for clear format-only changes", () => {
      const before = parseFile("const x=1;", "typescript");
      const after = parseFile("const x = 1;", "typescript");
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("format-only");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("edge cases", () => {
    it("empty-to-empty is format-only", () => {
      const before = parseFile("", "typescript");
      const after = parseFile("", "typescript");
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("format-only");
    });

    it("empty-to-non-empty is structural", () => {
      const before = parseFile("", "typescript");
      const after = parseFile("const x = 1;", "typescript");
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("structural");
    });

    it("non-empty-to-empty is structural", () => {
      const before = parseFile("const x = 1;", "typescript");
      const after = parseFile("", "typescript");
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("structural");
    });

    it("parse errors fall back to structural", () => {
      // tree-sitter is error-tolerant, so we need a really broken input
      // that produces ERROR nodes
      const before = parseFile("function f() { return 1; }", "typescript");
      const after = parseFile("function { { { return", "typescript");
      const result = classifyChange(before, after);
      expect(result.changeType).toBe("structural");
    });
  });
});
