import { loadConfig } from "../config/loader.js";
import { createLogger } from "../utils/logger.js";
import { resolveGitHubToken } from "../clients/github.js";
import { runPipeline } from "../pipeline/runner.js";
import { AuthError } from "../utils/errors.js";
import {
  createStubContextAgent,
  createStubAnalysisAgent,
  createStubReviewAgent,
  createStubOutputAgent,
} from "../agents/stubs.js";
import type { Logger } from "../utils/logger.js";

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

  const fullInput = {
    ...input,
    config,
    githubToken,
    apiKey,
  };

  const agents = [
    createStubContextAgent(logger),
    createStubAnalysisAgent(logger),
    createStubReviewAgent(logger),
    createStubOutputAgent(logger),
  ];

  const result = await runPipeline(agents, fullInput, {
    logger,
    maxRetries: config.maxRetries,
  });

  logger.success(`Pipeline completed in ${result.totalDuration}ms`);
  logger.info(JSON.stringify(result.output, null, 2));
}
