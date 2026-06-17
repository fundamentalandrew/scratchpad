import { describe, it, expect } from "vitest";
import { parseClosingReferences } from "./issue-parser.js";

describe("parseClosingReferences", () => {
  // Basic keyword recognition
  it("parses 'fixes #123'", () => {
    expect(parseClosingReferences("fixes #123")).toEqual([{ number: 123 }]);
  });

  it("parses 'closes #123'", () => {
    expect(parseClosingReferences("closes #123")).toEqual([{ number: 123 }]);
  });

  it("parses 'resolves #123'", () => {
    expect(parseClosingReferences("resolves #123")).toEqual([{ number: 123 }]);
  });

  // Past-tense keywords
  it("parses past tense keywords", () => {
    expect(parseClosingReferences("fixed #1")).toEqual([{ number: 1 }]);
    expect(parseClosingReferences("closed #2")).toEqual([{ number: 2 }]);
    expect(parseClosingReferences("resolved #3")).toEqual([{ number: 3 }]);
  });

  // Case insensitivity
  it("is case-insensitive", () => {
    expect(parseClosingReferences("FIXES #10")).toEqual([{ number: 10 }]);
    expect(parseClosingReferences("Closes #20")).toEqual([{ number: 20 }]);
  });

  // Punctuation variants
  it("parses colon variant 'fixes: #123'", () => {
    expect(parseClosingReferences("fixes: #123")).toEqual([{ number: 123 }]);
  });

  it("parses parenthesized 'fixes (#123)'", () => {
    expect(parseClosingReferences("fixes (#123)")).toEqual([{ number: 123 }]);
  });

  // Multiple issues
  it("parses multiple issues 'fixes #1, #2, #3'", () => {
    const result = parseClosingReferences("fixes #1, #2, #3");
    expect(result).toEqual([{ number: 1 }, { number: 2 }, { number: 3 }]);
  });

  // Cross-repo references
  it("parses cross-repo 'fixes owner/repo#123'", () => {
    expect(parseClosingReferences("fixes owner/repo#123")).toEqual([
      { owner: "owner", repo: "repo", number: 123 },
    ]);
  });

  // URL references
  it("parses full URL reference", () => {
    expect(
      parseClosingReferences("fixes https://github.com/owner/repo/issues/456"),
    ).toEqual([{ owner: "owner", repo: "repo", number: 456 }]);
  });

  // Deduplication
  it("deduplicates repeated issue numbers", () => {
    const result = parseClosingReferences("fixes #1\ncloses #1");
    expect(result).toEqual([{ number: 1 }]);
  });

  // Empty / no-match cases
  it("returns empty array for body with no closing references", () => {
    expect(parseClosingReferences("just a regular PR description")).toEqual([]);
  });

  it("returns empty array for null/empty body", () => {
    expect(parseClosingReferences(null as unknown as string)).toEqual([]);
    expect(parseClosingReferences(undefined as unknown as string)).toEqual([]);
    expect(parseClosingReferences("")).toEqual([]);
  });

  // Code block exclusion
  it("skips references inside inline code blocks", () => {
    const body = "see `fixes #999` for details\nfixes #1";
    expect(parseClosingReferences(body)).toEqual([{ number: 1 }]);
  });

  it("skips references inside fenced code blocks", () => {
    const body = "Some text\n```\nfixes #999\n```\nfixes #1";
    expect(parseClosingReferences(body)).toEqual([{ number: 1 }]);
  });

  // Mixed references
  it("handles body with mix of same-repo and cross-repo refs", () => {
    const body = "fixes #1, resolves other/repo#50\ncloses #2";
    const result = parseClosingReferences(body);
    expect(result).toEqual([
      { number: 1 },
      { owner: "other", repo: "repo", number: 50 },
      { number: 2 },
    ]);
  });

  // Bare references without keyword should NOT match
  it("does not match bare #123 without keyword", () => {
    expect(parseClosingReferences("see #123 for context")).toEqual([]);
  });

  it("does not match bare URL without keyword", () => {
    expect(
      parseClosingReferences("see https://github.com/owner/repo/issues/123"),
    ).toEqual([]);
  });

  // Bare keyword forms (without suffix)
  it("parses bare keyword forms: fix, close, resolve", () => {
    expect(parseClosingReferences("fix #42")).toEqual([{ number: 42 }]);
    expect(parseClosingReferences("close #43")).toEqual([{ number: 43 }]);
    expect(parseClosingReferences("resolve #44")).toEqual([{ number: 44 }]);
  });
});
