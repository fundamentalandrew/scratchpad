import type { AnnotatedRecommendation } from "../types.js";
import type { ReviewOutput } from "../../../agents/schemas.js";
import { buildReportBody } from "./shared.js";

export function formatMarkdownFile(
  reviewOutput: ReviewOutput,
  approved: AnnotatedRecommendation[],
  totalFilesReviewed: number,
  metadata: { timestamp: string; prUrl?: string; reviewMode: string }
): string {
  let frontmatter = "---\n";
  frontmatter += `timestamp: "${metadata.timestamp}"\n`;
  frontmatter += `reviewMode: "${metadata.reviewMode}"\n`;
  if (metadata.prUrl) {
    frontmatter += `prUrl: "${metadata.prUrl}"\n`;
  }
  frontmatter += "---\n\n";

  const body = buildReportBody(reviewOutput, approved, totalFilesReviewed, {
    sanitize: false,
  });

  return frontmatter + body;
}
