import type { Agent } from "@core/pipeline/types.js";
import type { ContextOutput, ReviewOutput } from "@core/agents/schemas.js";
import type { OutputAgentDependencies } from "./types.js";
import { runInteractiveReview } from "./interactive.js";
import { formatPRComment } from "./formatters/pr-comment.js";
import { formatMarkdownFile } from "./formatters/markdown-file.js";
import { publishPRComment } from "./publishers/github.js";
import { publishMarkdownFile } from "./publishers/file.js";

function getTotalFilesReviewed(contextOutput: ContextOutput): number {
  if (contextOutput.mode === "pr" && contextOutput.pr) {
    return contextOutput.pr.files.length;
  }
  if (contextOutput.repoFiles) {
    return contextOutput.repoFiles.length;
  }
  return 0;
}

function buildPrUrl(contextOutput: ContextOutput): string | undefined {
  if (contextOutput.mode === "pr" && contextOutput.pr) {
    const { owner, repo } = contextOutput.repository;
    return `https://github.com/${owner}/${repo}/pull/${contextOutput.pr.number}`;
  }
  return undefined;
}

export function createOutputAgent(deps: OutputAgentDependencies): Agent<ReviewOutput, ReviewOutput> {
  return {
    name: "output",
    idempotent: false,
    async run(input: ReviewOutput): Promise<ReviewOutput> {
      const result = await runInteractiveReview(input, deps.contextOutput, deps.logger);

      if (result === null) {
        return input;
      }

      if (result.destination === "cancel") {
        deps.logger.info("Output cancelled.");
        return input;
      }

      const totalFilesReviewed = getTotalFilesReviewed(deps.contextOutput);

      if (result.destination === "pr-comment") {
        if (!deps.contextOutput.pr) {
          throw new Error("Cannot publish PR comment without PR context");
        }
        const body = formatPRComment(input, result.approved, totalFilesReviewed);
        const { owner, repo } = deps.contextOutput.repository;
        const prNumber = deps.contextOutput.pr.number;
        await publishPRComment(deps.githubClient, owner, repo, prNumber, body, deps.logger);
      } else if (result.destination === "markdown-file") {
        const prUrl = buildPrUrl(deps.contextOutput);
        const metadata = {
          timestamp: new Date().toISOString(),
          prUrl,
          reviewMode: deps.contextOutput.mode,
        };
        const content = formatMarkdownFile(input, result.approved, totalFilesReviewed, metadata);
        await publishMarkdownFile(content, deps.config.markdownPath, deps.logger);
      }

      return input;
    },
  };
}
