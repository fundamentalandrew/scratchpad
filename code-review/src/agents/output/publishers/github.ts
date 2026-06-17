import type { GitHubClient } from "../../../clients/github.js";
import type { Logger } from "../../../utils/logger.js";

export const PR_COMMENT_MARKER = "<!-- code-review-cli:report:v1 -->";
const GITHUB_COMMENT_SIZE_LIMIT = 60_000;
const TRUNCATION_NOTICE =
  "\n\n> ⚠️ Report truncated due to GitHub comment size limits. Run with markdown output for the full report.";

// Recommendation blocks start with a bold file path pattern like **src/file.ts** or **src/file.ts:42**
const REC_BLOCK_PATTERN = /^\*\*[^\n]+\*\*\n\*\*Severity:\*\*/m;

function truncateBody(body: string): string {
  if (body.length <= GITHUB_COMMENT_SIZE_LIMIT) return body;

  // Find the recommendations section header
  const recHeaderMatch = body.match(/^## :stop_sign:.+$/m);
  if (!recHeaderMatch || recHeaderMatch.index === undefined) {
    // No structured recommendations section - fall back to simple truncation
    return body.slice(0, GITHUB_COMMENT_SIZE_LIMIT - TRUNCATION_NOTICE.length) + TRUNCATION_NOTICE;
  }

  const headerEnd = recHeaderMatch.index + recHeaderMatch[0].length;
  const beforeRecs = body.slice(0, headerEnd);
  const afterHeader = body.slice(headerEnd);

  // Split recommendation blocks. Each block starts with **filepath**\n**Severity:**
  // We split by looking ahead for the pattern
  const blocks: string[] = [];
  let remaining = afterHeader;

  // Find the section after recommendations (next ## header or end)
  const nextSectionMatch = remaining.match(/\n## (?!:stop_sign:)/);
  const recsContent = nextSectionMatch
    ? remaining.slice(0, nextSectionMatch.index!)
    : remaining;
  const afterRecs = nextSectionMatch
    ? remaining.slice(nextSectionMatch.index!)
    : "";

  // Split recommendation content into individual blocks
  const parts = recsContent.split(/(?=\*\*[^\n]+\*\*\n\*\*Severity:\*\*)/);
  for (const part of parts) {
    if (REC_BLOCK_PATTERN.test(part)) {
      blocks.push(part);
    } else if (blocks.length === 0) {
      // Leading content (e.g., blank lines after header)
      blocks.unshift(part);
    }
  }

  // Remove blocks from the end (lowest severity, since they're sorted severity-descending)
  while (blocks.length > 1) {
    const candidate = beforeRecs + blocks.join("") + afterRecs + TRUNCATION_NOTICE;
    if (candidate.length <= GITHUB_COMMENT_SIZE_LIMIT) {
      return candidate;
    }
    blocks.pop();
  }

  // If even one block is too long, fall back to simple truncation
  const minimal = beforeRecs + blocks.join("") + afterRecs + TRUNCATION_NOTICE;
  if (minimal.length <= GITHUB_COMMENT_SIZE_LIMIT) {
    return minimal;
  }

  return body.slice(0, GITHUB_COMMENT_SIZE_LIMIT - TRUNCATION_NOTICE.length) + TRUNCATION_NOTICE;
}

export async function publishPRComment(
  githubClient: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
  logger: Logger,
): Promise<void> {
  const finalBody = truncateBody(body);

  try {
    const result = await githubClient.createOrUpdatePRComment(
      owner,
      repo,
      prNumber,
      finalBody,
      PR_COMMENT_MARKER,
    );

    const action = result.updated ? "updated" : "created";
    logger.info(`PR comment ${action} (ID: ${result.commentId})`);
  } catch (error) {
    logger.error(`Failed to post PR comment: ${(error as Error).message}`);
    throw error;
  }
}
