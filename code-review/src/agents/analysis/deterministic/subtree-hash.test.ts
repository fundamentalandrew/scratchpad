import { describe, it, expect } from "vitest";
import { parseFile } from "./ast-analyzer.js";
import { hashSubtree, extractFunctionHashes } from "./subtree-hash.js";

describe("subtree-hash", () => {
  describe("hashSubtree", () => {
    it("identical function bodies produce identical hashes", () => {
      const tree1 = parseFile("function foo() { return 1; }", "typescript");
      const tree2 = parseFile("function foo() { return 1; }", "typescript");
      const fn1 = tree1.rootNode.namedChildren[0];
      const fn2 = tree2.rootNode.namedChildren[0];
      expect(hashSubtree(fn1)).toBe(hashSubtree(fn2));
    });

    it("renamed function (different name, same body) produces identical hash", () => {
      const tree1 = parseFile("function foo() { return 1; }", "typescript");
      const tree2 = parseFile("function bar() { return 1; }", "typescript");
      const fn1 = tree1.rootNode.namedChildren[0];
      const fn2 = tree2.rootNode.namedChildren[0];
      expect(hashSubtree(fn1)).toBe(hashSubtree(fn2));
    });

    it("different function bodies produce different hashes", () => {
      const tree1 = parseFile("function foo() { return 1; }", "typescript");
      const tree2 = parseFile("function foo() { return 2; }", "typescript");
      const fn1 = tree1.rootNode.namedChildren[0];
      const fn2 = tree2.rootNode.namedChildren[0];
      expect(hashSubtree(fn1)).not.toBe(hashSubtree(fn2));
    });

    it("literal value changes produce different hashes", () => {
      const tree1 = parseFile("function f() { return 0; }", "typescript");
      const tree2 = parseFile("function f() { return 1; }", "typescript");
      const fn1 = tree1.rootNode.namedChildren[0];
      const fn2 = tree2.rootNode.namedChildren[0];
      expect(hashSubtree(fn1)).not.toBe(hashSubtree(fn2));
    });

    it("hash is stable across multiple calls", () => {
      const tree = parseFile("function foo() { return 1; }", "typescript");
      const fn = tree.rootNode.namedChildren[0];
      const hash1 = hashSubtree(fn);
      const hash2 = hashSubtree(fn);
      expect(hash1).toBe(hash2);
    });
  });

  describe("extractFunctionHashes", () => {
    it("finds all top-level function declarations", () => {
      const source = `
function foo() { return 1; }
function bar() { return 2; }
function baz() { return 3; }
`;
      const tree = parseFile(source, "typescript");
      const hashes = extractFunctionHashes(tree);
      expect(hashes.has("foo")).toBe(true);
      expect(hashes.has("bar")).toBe(true);
      expect(hashes.has("baz")).toBe(true);
      expect(hashes.size).toBe(3);
    });

    it("finds method declarations in classes", () => {
      const source = `
class MyClass {
  doStuff() { return 1; }
  doOtherStuff() { return 2; }
}
`;
      const tree = parseFile(source, "typescript");
      const hashes = extractFunctionHashes(tree);
      expect(hashes.has("doStuff")).toBe(true);
      expect(hashes.has("doOtherStuff")).toBe(true);
    });

    it("finds arrow functions assigned to const", () => {
      const source = `const handler = () => { return 1; };\nconst processor = () => { return 2; };`;
      const tree = parseFile(source, "typescript");
      const hashes = extractFunctionHashes(tree);
      expect(hashes.has("handler")).toBe(true);
      expect(hashes.has("processor")).toBe(true);
    });

    it("includes name, hash, and line range for each function", () => {
      const source = `function hello() {\n  return "world";\n}`;
      const tree = parseFile(source, "typescript");
      const hashes = extractFunctionHashes(tree);
      const info = hashes.get("hello");
      expect(info).toBeDefined();
      expect(info!.name).toBe("hello");
      expect(typeof info!.hash).toBe("string");
      expect(info!.hash.length).toBeGreaterThan(0);
      expect(typeof info!.startLine).toBe("number");
      expect(typeof info!.endLine).toBe("number");
      expect(info!.endLine).toBeGreaterThanOrEqual(info!.startLine);
    });
  });
});
