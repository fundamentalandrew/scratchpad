import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import JavaScript from "tree-sitter-javascript";

type Language = "typescript" | "javascript";

const EXTENSION_MAP: Record<string, Language> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
};

let tsParser: Parser | null = null;
let jsParser: Parser | null = null;

function getParser(language: Language): Parser {
  if (language === "typescript") {
    if (!tsParser) {
      try {
        tsParser = new Parser();
        tsParser.setLanguage(TypeScript.typescript);
      } catch (err) {
        tsParser = null;
        throw new Error(
          `Failed to initialize TypeScript parser. Ensure tree-sitter native bindings are compiled: ${err}`,
        );
      }
    }
    return tsParser;
  }

  if (!jsParser) {
    try {
      jsParser = new Parser();
      jsParser.setLanguage(JavaScript);
    } catch (err) {
      jsParser = null;
      throw new Error(
        `Failed to initialize JavaScript parser. Ensure tree-sitter native bindings are compiled: ${err}`,
      );
    }
  }
  return jsParser;
}

export function detectLanguage(filePath: string): Language | null {
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1) return null;
  const ext = filePath.slice(lastDot);
  return EXTENSION_MAP[ext] ?? null;
}

export function isSupportedLanguage(filePath: string): boolean {
  return detectLanguage(filePath) !== null;
}

export function parseFile(source: string, language: Language): Parser.Tree {
  const parser = getParser(language);
  return parser.parse(source);
}
