import { select, input } from "@inquirer/prompts";
import chalk from "chalk";
import type { Recommendation, ContextOutput, ReviewOutput } from "@core/agents/schemas.js";
import type { Logger } from "@core/utils/logger.js";
import type { AnnotatedRecommendation, OutputDestination, UserDecision } from "./types.js";

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const SEVERITY_COLOR: Record<string, (s: string) => string> = {
  critical: chalk.red.bold,
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.green,
};

function sortRecommendations(recs: Recommendation[]): Recommendation[] {
  return [...recs].sort((a, b) => {
    const sevDiff = (SEVERITY_RANK[a.severity] ?? 4) - (SEVERITY_RANK[b.severity] ?? 4);
    if (sevDiff !== 0) return sevDiff;
    const scoreA = a.score ?? -1;
    const scoreB = b.score ?? -1;
    return scoreB - scoreA;
  });
}

function printSummaryHeader(
  reviewOutput: ReviewOutput,
  contextOutput: ContextOutput,
  logger: Logger,
): void {
  const recCount = reviewOutput.recommendations.length;
  const ignoreTotal = reviewOutput.safeToIgnore.reduce((sum, g) => sum + g.count, 0);

  logger.info("");
  logger.info(chalk.bold("═══ Code Review Summary ═══"));

  if (contextOutput.mode === "pr" && contextOutput.pr) {
    logger.info(`PR: ${chalk.cyan(contextOutput.pr.title)}`);
    logger.info(`Files: ${contextOutput.pr.files.length}`);
  } else if (contextOutput.repoFiles) {
    logger.info(`Files analyzed: ${contextOutput.repoFiles.length}`);
  }

  logger.info(`Recommendations: ${recCount > 0 ? chalk.yellow(String(recCount)) : chalk.green("0")}`);
  if (ignoreTotal > 0) {
    logger.info(`Safe to ignore: ${chalk.green(String(ignoreTotal))} files`);
  }

  logger.info("");
  logger.info(`Core decision: ${reviewOutput.coreDecision}`);

  if (reviewOutput.focusAreas.length > 0) {
    logger.info("Focus areas:");
    for (const area of reviewOutput.focusAreas) {
      logger.info(`  • ${area}`);
    }
  }
  logger.info("");
}

function printRecommendation(
  rec: Recommendation,
  index: number,
  total: number,
  currentDecision: UserDecision | null,
  logger: Logger,
): void {
  const colorFn = SEVERITY_COLOR[rec.severity] ?? chalk.white;
  const severityBadge = colorFn(`[${rec.severity.toUpperCase()}]`);
  const scoreStr = rec.score != null ? ` (${rec.score}/10)` : "";

  logger.info(`Reviewing ${index + 1}/${total} recommendations`);
  logger.info(`${rec.file}${rec.line ? `:${rec.line}` : ""}`);
  logger.info(`${severityBadge}${scoreStr} | ${rec.category}`);
  logger.info(rec.message);

  if (rec.humanCheckNeeded) {
    logger.info(chalk.yellow(`⚠ Human check: ${rec.humanCheckNeeded}`));
  }
  if (rec.suggestion) {
    logger.info(chalk.dim(`Suggestion: ${rec.suggestion}`));
  }

  if (currentDecision) {
    const label =
      currentDecision.action === "annotate"
        ? `Current: Note: ${currentDecision.note}`
        : `Current: ${currentDecision.action.charAt(0).toUpperCase() + currentDecision.action.slice(1)}`;
    logger.info(chalk.dim(label));
  }
}

function printSafeToIgnore(reviewOutput: ReviewOutput, logger: Logger): void {
  if (reviewOutput.safeToIgnore.length === 0) return;

  const totalCount = reviewOutput.safeToIgnore.reduce((sum, g) => sum + g.count, 0);
  logger.info("");
  logger.info(chalk.bold(`Safely Ignore / Skim (${totalCount} Files)`));
  for (const group of reviewOutput.safeToIgnore) {
    logger.info(`  ${group.label} (${group.count} files) -- ${group.description}`);
  }
  logger.info("");
}

export async function runInteractiveReview(
  reviewOutput: ReviewOutput,
  contextOutput: ContextOutput,
  logger: Logger,
): Promise<{
  approved: AnnotatedRecommendation[];
  destination: OutputDestination;
} | null> {
  try {
    printSummaryHeader(reviewOutput, contextOutput, logger);

    const sorted = sortRecommendations(reviewOutput.recommendations);

    if (sorted.length === 0) {
      logger.info("No recommendations to post.");
      return null;
    }

    // Review loop
    const decisions: (UserDecision | null)[] = new Array(sorted.length).fill(null);
    let currentIndex = 0;

    while (currentIndex < sorted.length) {
      const rec = sorted[currentIndex];
      logger.info("───────────────────────────────────────");
      printRecommendation(rec, currentIndex, sorted.length, decisions[currentIndex], logger);

      const choices: Array<{ name: string; value: string }> = [
        { name: "Accept", value: "accept" },
        { name: "Reject", value: "reject" },
        { name: "Add note", value: "annotate" },
      ];
      if (currentIndex > 0) {
        choices.push({ name: "Back", value: "back" });
      }

      const action = await select({ message: "Action:", choices });

      switch (action) {
        case "accept":
          decisions[currentIndex] = { action: "accept" };
          currentIndex++;
          break;
        case "reject":
          decisions[currentIndex] = { action: "reject" };
          currentIndex++;
          break;
        case "annotate": {
          const note = await input({ message: "Enter note:" });
          decisions[currentIndex] = { action: "annotate", note };
          currentIndex++;
          break;
        }
        case "back":
          currentIndex--;
          break;
      }
    }

    // Safe-to-ignore display
    printSafeToIgnore(reviewOutput, logger);

    // Build approved list
    const approved: AnnotatedRecommendation[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const decision = decisions[i];
      if (decision == null) continue;
      if (decision.action === "accept" || decision.action === "annotate") {
        approved.push({ recommendation: sorted[i], decision });
      }
    }

    if (approved.length === 0) {
      logger.info("No recommendations to post.");
      return null;
    }

    // Destination prompt
    const destChoices: Array<{ name: string; value: string }> = [];
    if (contextOutput.mode === "pr" && contextOutput.pr) {
      destChoices.push({ name: "Post as PR comment", value: "pr-comment" });
    }
    destChoices.push({ name: "Save as markdown file", value: "markdown-file" });
    destChoices.push({ name: "Cancel", value: "cancel" });

    const destination = await select({ message: "Output destination:", choices: destChoices }) as OutputDestination;

    if (destination === "cancel") {
      return null;
    }

    return { approved, destination };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ExitPromptError") {
      return null;
    }
    throw error;
  }
}
