#!/usr/bin/env node
import { Command } from "commander";
import { createLogger } from "./utils/logger.js";
import { reviewPR } from "./commands/review-pr.js";
import { reviewRepo } from "./commands/review-repo.js";
import { initProject } from "./commands/init.js";
import { ConfigError, AuthError, PipelineError, URLParseError } from "./utils/errors.js";

const program = new Command();

program
  .name("code-review")
  .description("AI-powered code review agent")
  .version("0.1.0")
  .option("--verbose", "Enable verbose output", false)
  .option("--config <path>", "Path to config file");

program
  .command("review-pr <url>")
  .description("Review a GitHub pull request")
  .action(async (url: string) => {
    const opts = program.opts<{ verbose: boolean; config?: string }>();
    await reviewPR(url, opts);
  });

program
  .command("review-repo <url>")
  .description("Review a GitHub repository")
  .action(async (url: string) => {
    const opts = program.opts<{ verbose: boolean; config?: string }>();
    await reviewRepo(url, opts);
  });

program
  .command("init")
  .description("Initialize review config files in the current directory")
  .action(async () => {
    const opts = program.opts<{ verbose: boolean; config?: string }>();
    const logger = createLogger({ verbose: opts.verbose });
    await initProject(process.cwd(), logger);
  });

try {
  await program.parseAsync(process.argv);
} catch (err) {
  const logger = createLogger({ verbose: false });

  if (err instanceof ConfigError) {
    logger.error(`Configuration error: ${err.message}`);
  } else if (err instanceof AuthError) {
    logger.error(`Authentication error: ${err.message}`);
  } else if (err instanceof PipelineError) {
    logger.error(
      `Pipeline failed: Agent '${err.agentName}' failed after ${err.attempts} attempt(s): ${err.cause instanceof Error ? err.cause.message : String(err.cause)}`,
    );
  } else if (err instanceof URLParseError) {
    logger.error(err.message);
  } else if (err instanceof Error) {
    logger.error(err.stack ?? err.message);
  } else {
    logger.error(String(err));
  }

  process.exitCode = 1;
}
