export type {
  DecisionAction,
  UserDecision,
  AnnotatedRecommendation,
  OutputDestination,
  OutputConfig,
  OutputAgentDependencies,
} from "./types.js";

export { formatPRComment } from "./formatters/pr-comment.js";
export { formatMarkdownFile } from "./formatters/markdown-file.js";

// TODO: export { createOutputAgent } from "./output-agent.js"; (section-07)
