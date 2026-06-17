diff --git a/code-review/01-core-infrastructure/src/utils/issue-parser.test.ts b/code-review/01-core-infrastructure/src/utils/issue-parser.test.ts
new file mode 100644
index 0000000..5e06c60
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/utils/issue-parser.test.ts
@@ -0,0 +1,103 @@
+import { describe, it, expect } from "vitest";
+import { parseClosingReferences } from "./issue-parser.js";
+
+describe("parseClosingReferences", () => {
+  // Basic keyword recognition
+  it("parses 'fixes #123'", () => {
+    expect(parseClosingReferences("fixes #123")).toEqual([{ number: 123 }]);
+  });
+
+  it("parses 'closes #123'", () => {
+    expect(parseClosingReferences("closes #123")).toEqual([{ number: 123 }]);
+  });
+
+  it("parses 'resolves #123'", () => {
+    expect(parseClosingReferences("resolves #123")).toEqual([{ number: 123 }]);
+  });
+
+  // Past-tense keywords
+  it("parses past tense keywords", () => {
+    expect(parseClosingReferences("fixed #1")).toEqual([{ number: 1 }]);
+    expect(parseClosingReferences("closed #2")).toEqual([{ number: 2 }]);
+    expect(parseClosingReferences("resolved #3")).toEqual([{ number: 3 }]);
+  });
+
+  // Case insensitivity
+  it("is case-insensitive", () => {
+    expect(parseClosingReferences("FIXES #10")).toEqual([{ number: 10 }]);
+    expect(parseClosingReferences("Closes #20")).toEqual([{ number: 20 }]);
+  });
+
+  // Punctuation variants
+  it("parses colon variant 'fixes: #123'", () => {
+    expect(parseClosingReferences("fixes: #123")).toEqual([{ number: 123 }]);
+  });
+
+  it("parses parenthesized 'fixes (#123)'", () => {
+    expect(parseClosingReferences("fixes (#123)")).toEqual([{ number: 123 }]);
+  });
+
+  // Multiple issues
+  it("parses multiple issues 'fixes #1, #2, #3'", () => {
+    const result = parseClosingReferences("fixes #1, #2, #3");
+    expect(result).toEqual([{ number: 1 }, { number: 2 }, { number: 3 }]);
+  });
+
+  // Cross-repo references
+  it("parses cross-repo 'fixes owner/repo#123'", () => {
+    expect(parseClosingReferences("fixes owner/repo#123")).toEqual([
+      { owner: "owner", repo: "repo", number: 123 },
+    ]);
+  });
+
+  // URL references
+  it("parses full URL reference", () => {
+    expect(
+      parseClosingReferences("fixes https://github.com/owner/repo/issues/456"),
+    ).toEqual([{ owner: "owner", repo: "repo", number: 456 }]);
+  });
+
+  // Deduplication
+  it("deduplicates repeated issue numbers", () => {
+    const result = parseClosingReferences("fixes #1\ncloses #1");
+    expect(result).toEqual([{ number: 1 }]);
+  });
+
+  // Empty / no-match cases
+  it("returns empty array for body with no closing references", () => {
+    expect(parseClosingReferences("just a regular PR description")).toEqual([]);
+  });
+
+  it("returns empty array for null/empty body", () => {
+    expect(parseClosingReferences(null as unknown as string)).toEqual([]);
+    expect(parseClosingReferences(undefined as unknown as string)).toEqual([]);
+    expect(parseClosingReferences("")).toEqual([]);
+  });
+
+  // Code block exclusion
+  it("skips references inside inline code blocks", () => {
+    const body = "see `fixes #999` for details\nfixes #1";
+    expect(parseClosingReferences(body)).toEqual([{ number: 1 }]);
+  });
+
+  it("skips references inside fenced code blocks", () => {
+    const body = "Some text\n```\nfixes #999\n```\nfixes #1";
+    expect(parseClosingReferences(body)).toEqual([{ number: 1 }]);
+  });
+
+  // Mixed references
+  it("handles body with mix of same-repo and cross-repo refs", () => {
+    const body = "fixes #1, resolves other/repo#50\ncloses #2";
+    const result = parseClosingReferences(body);
+    expect(result).toEqual([
+      { number: 1 },
+      { owner: "other", repo: "repo", number: 50 },
+      { number: 2 },
+    ]);
+  });
+
+  // Bare references without keyword should NOT match
+  it("does not match bare #123 without keyword", () => {
+    expect(parseClosingReferences("see #123 for context")).toEqual([]);
+  });
+});
diff --git a/code-review/01-core-infrastructure/src/utils/issue-parser.ts b/code-review/01-core-infrastructure/src/utils/issue-parser.ts
new file mode 100644
index 0000000..1196822
--- /dev/null
+++ b/code-review/01-core-infrastructure/src/utils/issue-parser.ts
@@ -0,0 +1,76 @@
+export interface IssueReference {
+  owner?: string;
+  repo?: string;
+  number: number;
+}
+
+/**
+ * Extracts GitHub closing-reference issue numbers from a PR description.
+ * Only matches references preceded by closing keywords (fixes, closes, resolves, etc.).
+ * Ignores references inside code blocks.
+ */
+export function parseClosingReferences(body: string): IssueReference[] {
+  if (!body) return [];
+
+  // Strip fenced code blocks, then inline code
+  const stripped = body
+    .replace(/```[\s\S]*?```/g, "")
+    .replace(/`[^`]+`/g, "");
+
+  const results: IssueReference[] = [];
+  const seen = new Set<string>();
+
+  const keywordPattern =
+    /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*[:(\s]/gi;
+
+  // Reference patterns
+  const urlRef =
+    /https?:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)/;
+  const crossRepoRef = /([\w.-]+)\/([\w.-]+)#(\d+)/;
+  const sameRepoRef = /#(\d+)/;
+
+  let keywordMatch: RegExpExecArray | null;
+  while ((keywordMatch = keywordPattern.exec(stripped)) !== null) {
+    // Extract the rest of the string after the keyword
+    let rest = stripped.slice(keywordMatch.index + keywordMatch[0].length);
+
+    // Parse first reference and any comma-separated follow-ups
+    let continueScanning = true;
+    while (continueScanning) {
+      rest = rest.replace(/^[\s,()]+/, ""); // trim leading whitespace, commas, parens
+
+      let match: RegExpMatchArray | null;
+      if ((match = rest.match(new RegExp(`^${urlRef.source}`)))) {
+        addRef(results, seen, { owner: match[1], repo: match[2], number: parseInt(match[3], 10) });
+        rest = rest.slice(match[0].length);
+      } else if ((match = rest.match(new RegExp(`^${crossRepoRef.source}`)))) {
+        addRef(results, seen, { owner: match[1], repo: match[2], number: parseInt(match[3], 10) });
+        rest = rest.slice(match[0].length);
+      } else if ((match = rest.match(new RegExp(`^${sameRepoRef.source}`)))) {
+        addRef(results, seen, { number: parseInt(match[1], 10) });
+        rest = rest.slice(match[0].length);
+      } else {
+        continueScanning = false;
+      }
+
+      // Continue only if next non-whitespace is a comma followed by a reference
+      if (continueScanning && !/^\s*,/.test(rest)) {
+        continueScanning = false;
+      }
+    }
+  }
+
+  return results;
+}
+
+function addRef(
+  results: IssueReference[],
+  seen: Set<string>,
+  ref: IssueReference,
+): void {
+  const key = ref.owner ? `${ref.owner}/${ref.repo}#${ref.number}` : `#${ref.number}`;
+  if (!seen.has(key)) {
+    seen.add(key);
+    results.push(ref);
+  }
+}
