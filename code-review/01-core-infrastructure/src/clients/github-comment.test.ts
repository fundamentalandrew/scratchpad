import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubClient } from "./github.js";
import { GitHubAPIError } from "../utils/errors.js";
import type { Logger } from "../utils/logger.js";

// Mock the Octokit plugins and constructor
const mockPaginate = vi.hoisted(() => vi.fn());
const mockCreateComment = vi.hoisted(() => vi.fn());
const mockUpdateComment = vi.hoisted(() => vi.fn());
const mockListComments = vi.hoisted(() => vi.fn());

vi.mock("@octokit/rest", () => {
  class MockOctokit {
    rest = {
      issues: {
        listComments: mockListComments,
        createComment: mockCreateComment,
        updateComment: mockUpdateComment,
      },
      pulls: { get: vi.fn(), listFiles: vi.fn(), listReviewComments: vi.fn() },
      repos: { getContent: vi.fn() },
      git: { getTree: vi.fn() },
    };
    paginate = mockPaginate;
    constructor() {}
    static plugin() {
      return MockOctokit;
    }
  }
  return { Octokit: MockOctokit };
});

vi.mock("@octokit/plugin-throttling", () => ({ throttling: {} }));
vi.mock("@octokit/plugin-retry", () => ({ retry: {} }));

function createMockLogger(): Logger {
  return {
    info: vi.fn(),
    verbose: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
  };
}

describe("GitHubClient.createOrUpdatePRComment", () => {
  let client: GitHubClient;
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = createMockLogger();
    client = new GitHubClient({ token: "test-token", logger });
  });

  it("creates new comment when no existing comment has marker", async () => {
    mockPaginate.mockResolvedValueOnce([]);
    mockCreateComment.mockResolvedValueOnce({ data: { id: 42 } });

    const result = await client.createOrUpdatePRComment(
      "owner",
      "repo",
      1,
      "body with <!-- marker -->",
      "<!-- marker -->",
    );

    expect(mockCreateComment).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      issue_number: 1,
      body: "body with <!-- marker -->",
    });
    expect(result).toEqual({ commentId: 42, updated: false });
  });

  it("updates existing comment when marker found in comment body", async () => {
    mockPaginate.mockResolvedValueOnce([
      { id: 10, body: "old comment with <!-- marker --> inside" },
    ]);
    mockUpdateComment.mockResolvedValueOnce({ data: { id: 10 } });

    const result = await client.createOrUpdatePRComment(
      "owner",
      "repo",
      1,
      "new body with <!-- marker -->",
      "<!-- marker -->",
    );

    expect(mockUpdateComment).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      comment_id: 10,
      body: "new body with <!-- marker -->",
    });
    expect(result).toEqual({ commentId: 10, updated: true });
  });

  it("with multiple comments, only updates the one containing marker", async () => {
    mockPaginate.mockResolvedValueOnce([
      { id: 1, body: "unrelated comment" },
      { id: 2, body: "this has <!-- marker --> in it" },
      { id: 3, body: "another unrelated comment" },
    ]);
    mockUpdateComment.mockResolvedValueOnce({ data: { id: 2 } });

    await client.createOrUpdatePRComment(
      "owner",
      "repo",
      1,
      "updated body <!-- marker -->",
      "<!-- marker -->",
    );

    expect(mockUpdateComment).toHaveBeenCalledTimes(1);
    expect(mockUpdateComment).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 2 }),
    );
    expect(mockCreateComment).not.toHaveBeenCalled();
  });

  it("finds marker in large paginated result set", async () => {
    const comments = Array.from({ length: 150 }, (_, i) => ({
      id: i + 1,
      body: `comment ${i + 1}`,
    }));
    comments[120].body = "comment with <!-- marker --> found";
    mockPaginate.mockResolvedValueOnce(comments);
    mockUpdateComment.mockResolvedValueOnce({ data: { id: 121 } });

    const result = await client.createOrUpdatePRComment(
      "owner",
      "repo",
      1,
      "new body <!-- marker -->",
      "<!-- marker -->",
    );

    expect(result).toEqual({ commentId: 121, updated: true });
  });

  it("does not modify the body parameter", async () => {
    mockPaginate.mockResolvedValueOnce([]);
    mockCreateComment.mockResolvedValueOnce({ data: { id: 99 } });

    const body = "exact body content <!-- marker -->";
    await client.createOrUpdatePRComment("owner", "repo", 1, body, "<!-- marker -->");

    expect(mockCreateComment).toHaveBeenCalledWith(
      expect.objectContaining({ body: "exact body content <!-- marker -->" }),
    );
  });

  it("returns { commentId, updated: true } on update", async () => {
    mockPaginate.mockResolvedValueOnce([
      { id: 55, body: "has <!-- marker -->" },
    ]);
    mockUpdateComment.mockResolvedValueOnce({ data: { id: 55 } });

    const result = await client.createOrUpdatePRComment(
      "owner",
      "repo",
      1,
      "new body <!-- marker -->",
      "<!-- marker -->",
    );

    expect(result).toStrictEqual({ commentId: 55, updated: true });
  });

  it("returns { commentId, updated: false } on create", async () => {
    mockPaginate.mockResolvedValueOnce([]);
    mockCreateComment.mockResolvedValueOnce({ data: { id: 77 } });

    const result = await client.createOrUpdatePRComment(
      "owner",
      "repo",
      1,
      "body <!-- marker -->",
      "<!-- marker -->",
    );

    expect(result).toStrictEqual({ commentId: 77, updated: false });
  });

  it("throws GitHubAPIError when paginate fails", async () => {
    mockPaginate.mockRejectedValueOnce(new Error("API rate limit"));

    await expect(
      client.createOrUpdatePRComment("owner", "repo", 1, "body", "marker"),
    ).rejects.toThrow(GitHubAPIError);
  });

  it("throws GitHubAPIError when createComment fails", async () => {
    mockPaginate.mockResolvedValueOnce([]);
    mockCreateComment.mockRejectedValueOnce(new Error("create failed"));

    await expect(
      client.createOrUpdatePRComment("owner", "repo", 1, "body", "marker"),
    ).rejects.toThrow(GitHubAPIError);
  });

  it("throws GitHubAPIError when updateComment fails", async () => {
    mockPaginate.mockResolvedValueOnce([
      { id: 5, body: "has marker in it" },
    ]);
    mockUpdateComment.mockRejectedValueOnce(new Error("update failed"));

    await expect(
      client.createOrUpdatePRComment("owner", "repo", 1, "body", "marker"),
    ).rejects.toThrow(GitHubAPIError);
  });
});
