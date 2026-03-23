import { parsePRUrl } from "../utils/url-parser.js";
import { runReviewPipeline, type ReviewOptions } from "./shared.js";

export async function reviewPR(
  url: string,
  options: ReviewOptions,
): Promise<void> {
  const { owner, repo, number } = parsePRUrl(url);
  await runReviewPipeline({ mode: "pr", owner, repo, number }, options);
}
