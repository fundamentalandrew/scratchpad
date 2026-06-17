import { createHash } from "crypto";
import type Parser from "tree-sitter";
import type { FunctionInfo } from "./types.js";

type SyntaxNode = Parser.SyntaxNode;
type Tree = Parser.Tree;

import { IDENTIFIER_TYPES } from "./shared-constants.js";

const LITERAL_TYPES = new Set(["string", "number", "template_string", "true", "false", "null"]);

export function hashSubtree(node: SyntaxNode): string {
  const repr = buildRepr(node);
  return createHash("sha256").update(repr).digest("hex");
}

function buildRepr(node: SyntaxNode): string {
  if (IDENTIFIER_TYPES.has(node.type)) {
    return "identifier";
  }

  if (LITERAL_TYPES.has(node.type) || node.namedChildCount === 0) {
    return `${node.type}(${node.text})`;
  }

  const childReprs = node.namedChildren
    .filter((c) => c.type !== "comment")
    .map((c) => buildRepr(c));

  return `${node.type}(${childReprs.join(",")})`;
}

const FUNCTION_NODE_TYPES = new Set([
  "function_declaration",
  "method_definition",
]);

export function extractFunctionHashes(tree: Tree): Map<string, FunctionInfo> {
  const result = new Map<string, FunctionInfo>();
  visitNodes(tree.rootNode, result);
  return result;
}

function visitNodes(node: SyntaxNode, result: Map<string, FunctionInfo>): void {
  for (const child of node.namedChildren) {
    if (FUNCTION_NODE_TYPES.has(child.type)) {
      const nameNode = child.namedChildren.find(
        (c) => c.type === "identifier" || c.type === "property_identifier",
      );
      const bodyNode = child.namedChildren.find(
        (c) => c.type === "statement_block",
      );
      if (nameNode && bodyNode) {
        result.set(nameNode.text, {
          name: nameNode.text,
          hash: hashSubtree(bodyNode),
          startLine: child.startPosition.row,
          endLine: child.endPosition.row,
        });
      }
    } else if (child.type === "lexical_declaration") {
      // Handle arrow functions: const foo = () => { ... }
      for (const declarator of child.namedChildren) {
        if (declarator.type === "variable_declarator") {
          const nameNode = declarator.namedChildren.find(
            (c) => c.type === "identifier",
          );
          const arrowFn = declarator.namedChildren.find(
            (c) => c.type === "arrow_function",
          );
          if (nameNode && arrowFn) {
            const bodyNode = arrowFn.namedChildren.find(
              (c) => c.type === "statement_block",
            );
            if (bodyNode) {
              result.set(nameNode.text, {
                name: nameNode.text,
                hash: hashSubtree(bodyNode),
                startLine: child.startPosition.row,
                endLine: child.endPosition.row,
              });
            }
          }
        }
      }
    } else if (child.type === "class_declaration" || child.type === "class") {
      const classBody = child.namedChildren.find(
        (c) => c.type === "class_body",
      );
      if (classBody) {
        visitNodes(classBody, result);
      }
    } else if (child.type === "export_statement") {
      visitNodes(child, result);
    }
  }
}
