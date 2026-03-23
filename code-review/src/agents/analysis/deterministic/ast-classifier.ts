import type Parser from "tree-sitter";
import type { ClassificationResult } from "./types.js";
import { extractFunctionHashes } from "./subtree-hash.js";

type SyntaxNode = Parser.SyntaxNode;
type Tree = Parser.Tree;

export function classifyChange(before: Tree, after: Tree): ClassificationResult {
  // Check for parse errors — fall back to structural
  if (hasErrorNodes(before.rootNode) || hasErrorNodes(after.rootNode)) {
    return { changeType: "structural", confidence: 1.0, details: "Parse errors detected in source" };
  }

  // Handle empty file edge cases
  const beforeEmpty = before.rootNode.namedChildCount === 0;
  const afterEmpty = after.rootNode.namedChildCount === 0;
  if (beforeEmpty && afterEmpty) {
    return { changeType: "format-only", confidence: 1.0, details: "Both files empty" };
  }
  if (beforeEmpty || afterEmpty) {
    return { changeType: "structural", confidence: 1.0, details: beforeEmpty ? "New code added to empty file" : "All code removed" };
  }

  // Check format-only and rename-only via parallel tree walk
  const walkResult = compareNodes(before.rootNode, after.rootNode);

  if (walkResult.identical) {
    return { changeType: "format-only", confidence: 1.0, details: "Only whitespace/formatting changes detected" };
  }

  if (walkResult.structurallyIdentical && walkResult.renames.size > 0) {
    // Check bijective rename mapping
    const reverse = new Map<string, string>();
    let consistent = true;
    for (const [oldName, newName] of walkResult.renames) {
      if (reverse.has(newName) && reverse.get(newName) !== oldName) {
        consistent = false;
        break;
      }
      reverse.set(newName, oldName);
    }

    if (consistent) {
      const renameList = Array.from(walkResult.renames.entries())
        .map(([o, n]) => `${o}→${n}`)
        .join(", ");
      return {
        changeType: "rename-only",
        confidence: 0.95,
        details: `Consistent renames: ${renameList}`,
      };
    }
  }

  // Check moved-function
  const beforeFns = extractFunctionHashes(before);
  const afterFns = extractFunctionHashes(after);

  if (beforeFns.size > 0 && afterFns.size > 0) {
    const beforeHashes = new Set(Array.from(beforeFns.values()).map((f) => f.hash));
    const afterHashes = new Set(Array.from(afterFns.values()).map((f) => f.hash));

    if (
      beforeHashes.size === afterHashes.size &&
      [...beforeHashes].every((h) => afterHashes.has(h))
    ) {
      // Same functions, potentially reordered
      const beforeOrder = Array.from(beforeFns.keys());
      const afterOrder = Array.from(afterFns.keys());
      if (beforeOrder.join(",") !== afterOrder.join(",")) {
        return {
          changeType: "moved-function",
          confidence: 0.9,
          details: "Functions reordered",
        };
      }
    }
  }

  return { changeType: "structural", confidence: 1.0, details: "Structural code changes detected" };
}

function hasErrorNodes(node: SyntaxNode): boolean {
  if (node.type === "ERROR") return true;
  for (const child of node.namedChildren) {
    if (hasErrorNodes(child)) return true;
  }
  return false;
}

interface WalkResult {
  identical: boolean;
  structurallyIdentical: boolean;
  renames: Map<string, string>;
}

function filterComments(children: SyntaxNode[]): SyntaxNode[] {
  return children.filter((c) => c.type !== "comment" && c.type !== "block_comment");
}

import { IDENTIFIER_TYPES } from "./shared-constants.js";

function getOperatorTokens(node: SyntaxNode): string[] {
  const tokens: string[] = [];
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i)!;
    if (!child.isNamed) {
      tokens.push(child.type);
    }
  }
  return tokens;
}

function compareNodes(a: SyntaxNode, b: SyntaxNode): WalkResult {
  const aChildren = filterComments(a.namedChildren);
  const bChildren = filterComments(b.namedChildren);

  if (a.type !== b.type || aChildren.length !== bChildren.length) {
    return { identical: false, structurallyIdentical: false, renames: new Map() };
  }

  // Check anonymous tokens (operators, punctuation) for structural differences
  const aOps = getOperatorTokens(a);
  const bOps = getOperatorTokens(b);
  if (aOps.length !== bOps.length || aOps.some((op, i) => op !== bOps[i])) {
    return { identical: false, structurallyIdentical: false, renames: new Map() };
  }

  // Leaf node
  if (aChildren.length === 0 && bChildren.length === 0) {
    if (a.text === b.text) {
      return { identical: true, structurallyIdentical: true, renames: new Map() };
    }

    // Identifier with different text — potential rename
    if (IDENTIFIER_TYPES.has(a.type)) {
      const renames = new Map<string, string>();
      renames.set(a.text, b.text);
      return { identical: false, structurallyIdentical: true, renames };
    }

    // Non-identifier leaf with different text — structural
    return { identical: false, structurallyIdentical: false, renames: new Map() };
  }

  // Recurse into children
  let allIdentical = true;
  let allStructural = true;
  const mergedRenames = new Map<string, string>();

  for (let i = 0; i < aChildren.length; i++) {
    const childResult = compareNodes(aChildren[i], bChildren[i]);
    if (!childResult.identical) allIdentical = false;
    if (!childResult.structurallyIdentical) {
      allStructural = false;
      break;
    }

    // Merge renames, check consistency
    for (const [oldName, newName] of childResult.renames) {
      if (mergedRenames.has(oldName) && mergedRenames.get(oldName) !== newName) {
        allStructural = false;
        break;
      }
      mergedRenames.set(oldName, newName);
    }
    if (!allStructural) break;
  }

  return {
    identical: allIdentical,
    structurallyIdentical: allStructural,
    renames: mergedRenames,
  };
}
