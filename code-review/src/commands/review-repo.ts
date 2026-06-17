import { parseRepoUrl } from "../utils/url-parser.js";
import { runReviewPipeline, type ReviewOptions } from "./shared.js";

export async function reviewRepo(
  url: string,
  options: ReviewOptions,
): Promise<void> {
  const { owner, repo } = parseRepoUrl(url);
  await runReviewPipeline({ mode: "repo", owner, repo }, options);
}
