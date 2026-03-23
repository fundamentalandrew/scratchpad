import type { AnnotatedRecommendation } from "../types.js";
import type { ReviewOutput } from "@core/agents/schemas.js";
import { buildReportBody } from "./shared.js";

const MARKER = "<!-- code-review-cli:report:v1 -->";

export function formatPRComment(
  reviewOutput: ReviewOutput,
  approved: AnnotatedRecommendation[],
  totalFilesReviewed: number
): string {
  return (
    MARKER +
    "\n\n" +
    buildReportBody(reviewOutput, approved, totalFilesReviewed, {
      sanitize: true,
    })
  );
}
