import { loadConfig } from "../config/loader.js";
import { createLogger } from "../utils/logger.js";
import { GitHubClient, resolveGitHubToken } from "../clients/github.js";
import { ClaudeClient } from "../clients/claude.js";
import { runPipeline } from "../pipeline/runner.js";
import { AuthError } from "../utils/errors.js";
import { createContextAgent } from "../agents/context/context-agent.js";
import { createAnalysisAgent } from "../agents/analysis/analysis-agent.js";
import { createReviewAgent } from "../agents/review/review-agent.js";
import { createOutputAgent } from "../agents/output/output-agent.js";
import type { ContextOutput } from "../agents/schemas.js";

export interface ReviewOptions {
  verbose: boolean;
  config?: string;
}

export async function runReviewPipeline(
  input: Record<string, unknown>,
  options: ReviewOptions,
): Promise<void> {
  const config = loadConfig({ configPath: options.config });

  const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AuthError("No Anthropic API key configured");
  }

  const logger = createLogger({ verbose: options.verbose });
  const githubToken = resolveGitHubToken(config, logger);

  const github = new GitHubClient({ token: githubToken, logger });
  const claude = new ClaudeClient({ apiKey, model: config.model, logger });

  const fullInput = {
    ...input,
    config,
    githubToken,
    apiKey,
  };

  // Context agent output will be captured for downstream use
  let contextOutput: ContextOutput | undefined;

  const contextAgent = createContextAgent({ github, logger });
  const analysisAgent = createAnalysisAgent({ claude, logger, config });
  const reviewAgent = createReviewAgent({ claude, logger, config });

  // Wrap context agent to capture output for the output agent
  const wrappedContextAgent = {
    ...contextAgent,
    async run(inp: unknown) {
      const result = await contextAgent.run(inp as Parameters<typeof contextAgent.run>[0]);
      contextOutput = result;
      return result;
    },
  };

  // Create output agent lazily after context is available
  const lazyOutputAgent = {
    name: "output",
    idempotent: false,
    async run(inp: unknown) {
      const outputAgent = createOutputAgent({
        logger,
        githubClient: github,
        config: {
          markdown: config.output?.markdown ?? false,
          markdownPath: config.output?.markdownPath ?? "./code-review-output.md",
          githubComment: config.output?.githubComment ?? false,
        },
        contextOutput: contextOutput!,
      });
      return outputAgent.run(inp as Parameters<ReturnType<typeof createOutputAgent>["run"]>[0]);
    },
  };

  const agents = [
    wrappedContextAgent,
    analysisAgent,
    reviewAgent,
    lazyOutputAgent,
  ];

  const result = await runPipeline(agents, fullInput, {
    logger,
    maxRetries: config.maxRetries,
  });

  logger.success(`Pipeline completed in ${result.totalDuration}ms`);
  logger.info(JSON.stringify(result.output, null, 2));
}
