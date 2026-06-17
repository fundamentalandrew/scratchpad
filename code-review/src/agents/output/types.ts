import type { Recommendation, ContextOutput } from "../../agents/schemas.js";
import type { Logger } from "../../utils/logger.js";
import type { GitHubClient } from "../../clients/github.js";

export type DecisionAction = "accept" | "reject" | "annotate";

export type UserDecision =
  | { action: "accept" | "reject" }
  | { action: "annotate"; note: string };

export interface AnnotatedRecommendation {
  recommendation: Recommendation;
  decision: UserDecision;
}

export type OutputDestination = "pr-comment" | "markdown-file" | "cancel";

export interface OutputConfig {
  markdown: boolean;
  markdownPath: string;
  githubComment: boolean;
}

export interface OutputAgentDependencies {
  logger: Logger;
  githubClient: GitHubClient;
  config: OutputConfig;
  contextOutput: ContextOutput;
}
