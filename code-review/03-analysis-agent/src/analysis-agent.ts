import type { Agent } from "@core/pipeline/types.js";
import type { ContextOutput, AnalysisOutput } from "@core/agents/schemas.js";
import type { ClaudeClient } from "@core/clients/claude.js";
import type { Logger } from "@core/utils/logger.js";
import type { CodeReviewConfig } from "@core/config/schema.js";

export function createAnalysisAgent(deps: {
  claude: ClaudeClient;
  logger?: Logger;
  config: CodeReviewConfig;
}): Agent<ContextOutput, AnalysisOutput> {
  return {
    name: "analysis",
    idempotent: true,
    async run(_input: ContextOutput): Promise<AnalysisOutput> {
      throw new Error("Not implemented");
    },
  };
}
