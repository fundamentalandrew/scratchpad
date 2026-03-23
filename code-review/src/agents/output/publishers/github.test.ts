import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Logger } from "../../../utils/logger.js";
import type { GitHubClient } from "../../../clients/github.js";

function makeLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    success: vi.fn(),
  };
}

function makeMockGitHubClient(
  overrides: Partial<{
    createOrUpdatePRComment: ReturnType<typeof vi.fn>;
  }> = {},
) {
  return {
    createOrUpdatePRComment:
      overrides.createOrUpdatePRComment ??
      vi.fn().mockResolvedValue({ commentId: 123, updated: false }),
  } as unknown as GitHubClient;
}

import { publishPRComment, PR_COMMENT_MARKER } from "./github.js";

describe("publishPRComment", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = makeLogger();
  });

  it("calls createOrUpdatePRComment with correct arguments", async () => {
    const mockClient = makeMockGitHubClient();
    await publishPRComment(mockClient, "owner", "repo", 42, "body text", logger);

    expect(mockClient.createOrUpdatePRComment).toHaveBeenCalledWith(
      "owner",
      "repo",
      42,
      "body text",
      PR_COMMENT_MARKER,
    );
  });

  it("logs success message on successful post", async () => {
    const mockClient = makeMockGitHubClient();
    await publishPRComment(mockClient, "owner", "repo", 42, "body", logger);

    expect(logger.info).toHaveBeenCalled();
    const msg = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(msg).toContain("123");
  });

  it("logs 'created' when comment is new", async () => {
    const mockClient = makeMockGitHubClient({
      createOrUpdatePRComment: vi.fn().mockResolvedValue({ commentId: 10, updated: false }),
    });
    await publishPRComment(mockClient, "owner", "repo", 1, "body", logger);

    const msg = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(msg.toLowerCase()).toContain("created");
  });

  it("logs 'updated' when comment already existed", async () => {
    const mockClient = makeMockGitHubClient({
      createOrUpdatePRComment: vi.fn().mockResolvedValue({ commentId: 10, updated: true }),
    });
    await publishPRComment(mockClient, "owner", "repo", 1, "body", logger);

    const msg = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(msg.toLowerCase()).toContain("updated");
  });

  it("throws on GitHub API failure and logs error", async () => {
    const mockClient = makeMockGitHubClient({
      createOrUpdatePRComment: vi.fn().mockRejectedValue(new Error("API error")),
    });

    await expect(
      publishPRComment(mockClient, "owner", "repo", 1, "body", logger),
    ).rejects.toThrow("API error");

    expect(logger.error).toHaveBeenCalled();
    const msg = (logger.error as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(msg).toContain("API error");
  });

  it("truncates body when exceeding 60k chars, appending truncation notice", async () => {
    const longBody = "A".repeat(70_000);
    const mockFn = vi.fn().mockResolvedValue({ commentId: 1, updated: false });
    const mockClient = makeMockGitHubClient({ createOrUpdatePRComment: mockFn });

    await publishPRComment(mockClient, "owner", "repo", 1, longBody, logger);

    const postedBody = mockFn.mock.calls[0][3] as string;
    expect(postedBody.length).toBeLessThanOrEqual(60_000);
    expect(postedBody).toContain("truncated");
    expect(postedBody).toContain("markdown");
  });

  it("truncation removes lowest-severity recommendations first", async () => {
    // Build a structured body with recommendation blocks sorted by severity
    const header = "## :stop_sign: Top 3 Files Requiring Human Verification\n\n";
    const criticalBlock = "**src/auth.ts:10**\n**Severity:** critical\n**Category:** security\n\nSQL injection\n\n";
    const highBlock = "**src/api.ts:20**\n**Severity:** high\n**Category:** performance\n\nN+1 query\n\n";
    // Make the low block very large to push over the limit
    const lowBlock = "**src/utils.ts:30**\n**Severity:** low\n**Category:** style\n\n" + "X".repeat(60_000) + "\n\n";
    const footer = "## ✅ Safe to Ignore\n\nSome content\n";

    const body = header + criticalBlock + highBlock + lowBlock + footer;
    expect(body.length).toBeGreaterThan(60_000);

    const mockFn = vi.fn().mockResolvedValue({ commentId: 1, updated: false });
    const mockClient = makeMockGitHubClient({ createOrUpdatePRComment: mockFn });

    await publishPRComment(mockClient, "owner", "repo", 1, body, logger);

    const postedBody = mockFn.mock.calls[0][3] as string;
    expect(postedBody.length).toBeLessThanOrEqual(60_000);
    // Critical and high blocks should survive
    expect(postedBody).toContain("src/auth.ts:10");
    expect(postedBody).toContain("SQL injection");
    expect(postedBody).toContain("src/api.ts:20");
    expect(postedBody).toContain("N+1 query");
    // Low block should be removed
    expect(postedBody).not.toContain("src/utils.ts:30");
    // Truncation notice should be present
    expect(postedBody).toContain("truncated");
    // Footer (safe to ignore) should survive
    expect(postedBody).toContain("Safe to Ignore");
  });
});
