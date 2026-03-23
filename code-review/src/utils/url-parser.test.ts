import { describe, it, expect } from "vitest";
import { parsePRUrl, parseRepoUrl } from "./url-parser.js";
import { URLParseError } from "./errors.js";

describe("parsePRUrl", () => {
  it("parses standard PR URL", () => {
    const result = parsePRUrl("https://github.com/owner/repo/pull/123");
    expect(result).toEqual({ owner: "owner", repo: "repo", number: 123 });
  });

  it("parses PR URL with trailing slash", () => {
    const result = parsePRUrl("https://github.com/owner/repo/pull/456/");
    expect(result).toEqual({ owner: "owner", repo: "repo", number: 456 });
  });

  it("parses PR URL with query params", () => {
    const result = parsePRUrl("https://github.com/owner/repo/pull/789?diff=split");
    expect(result).toEqual({ owner: "owner", repo: "repo", number: 789 });
  });

  it("parses PR URL with fragment", () => {
    const result = parsePRUrl("https://github.com/owner/repo/pull/10#discussion");
    expect(result).toEqual({ owner: "owner", repo: "repo", number: 10 });
  });

  it("rejects non-github.com hostname", () => {
    expect(() => parsePRUrl("https://gitlab.com/owner/repo/pull/1")).toThrow(URLParseError);
  });

  it("rejects malformed PR URL (missing pull number)", () => {
    expect(() => parsePRUrl("https://github.com/owner/repo/pull")).toThrow(URLParseError);
  });

  it("rejects PR URL with non-numeric pull number", () => {
    expect(() => parsePRUrl("https://github.com/owner/repo/pull/abc")).toThrow(URLParseError);
  });

  it("error messages include expected format example", () => {
    expect(() => parsePRUrl("https://github.com/owner")).toThrow(
      /https:\/\/github\.com\/owner\/repo\/pull\/123/,
    );
  });
});

describe("parseRepoUrl", () => {
  it("parses standard repo URL", () => {
    const result = parseRepoUrl("https://github.com/owner/repo");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  it("parses repo URL with trailing slash", () => {
    const result = parseRepoUrl("https://github.com/owner/repo/");
    expect(result).toEqual({ owner: "owner", repo: "repo" });
  });

  it("rejects non-github.com hostname", () => {
    expect(() => parseRepoUrl("https://gitlab.com/owner/repo")).toThrow(URLParseError);
  });

  it("rejects URL with no path segments", () => {
    expect(() => parseRepoUrl("https://github.com")).toThrow(URLParseError);
  });

  it("error messages include expected format example", () => {
    expect(() => parseRepoUrl("https://github.com")).toThrow(
      /https:\/\/github\.com\/owner\/repo/,
    );
  });
});
