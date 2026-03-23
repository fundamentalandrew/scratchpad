import type { ClaudeClient } from "../../clients/claude.js";
import type { Logger } from "../../utils/logger.js";
import type { Agent } from "../../pipeline/types.js";
import type { CodeReviewConfig } from "../../config/schema.js";
import type {
  AnalysisOutput,
  ReviewOutput,
  FileScore,
  IgnoreGroup,
  ContextOutput,
} from "../../agents/schemas.js";
import { LLMReviewResponseSchema } from "./types.js";
import { buildPRSystemPrompt, buildRepoSystemPrompt, buildUserPrompt } from "./prompt-builder.js";

export function createReviewAgent(deps: {
  claude: ClaudeClient;
  logger?: Logger;
  config: CodeReviewConfig;
}): Agent<AnalysisOutput, ReviewOutput> {
  return {
    name: "review",
    idempotent: true,

    async run(input: AnalysisOutput): Promise<ReviewOutput> {
      const context = input.contextPassthrough as ContextOutput | undefined;

      if (!context) {
        deps.logger?.warn("review-agent: contextPassthrough missing, returning minimal output");
        return {
          recommendations: [],
          coreDecision: "Unable to review: missing context data",
          focusAreas: [],
          safeToIgnore: [],
          summary: "",
        };
      }

      // Step 2: Separate files by threshold
      const highRiskFiles = input.scoredFiles.filter((f) => f.score >= 4);
      const lowRiskFiles = input.scoredFiles.filter((f) => f.score < 4);

      // Step 3: Group low-risk files
      const safeToIgnore = groupLowRiskFiles(lowRiskFiles, input.summary.categories);

      // Step 4 & 5: Build prompts
      const systemPrompt =
        context.mode === "pr"
          ? buildPRSystemPrompt(context)
          : buildRepoSystemPrompt(context);
      const userPrompt = buildUserPrompt(highRiskFiles, context, input.summary);

      // Step 6: Call Claude (skip if no high-risk files)
      if (highRiskFiles.length === 0) {
        return {
          recommendations: [],
          coreDecision: "No high-risk files detected",
          focusAreas: [],
          safeToIgnore,
          summary: "All files scored below the review threshold.",
        };
      }

      const response = await deps.claude.query({
        messages: [{ role: "user", content: userPrompt }],
        schema: LLMReviewResponseSchema,
        systemPrompt,
        maxTokens: 8192,
      });

      // Step 7: Map LLM response to ReviewOutput
      const scoreMap = new Map(input.scoredFiles.map((f) => [f.path, f.score]));

      const recommendations = response.data.recommendations.map((rec) => {
        const score = scoreMap.get(rec.file) ?? 0;
        const severity = deriveSeverity(score);
        return {
          file: rec.file,
          line: undefined,
          severity,
          category: rec.category,
          message: rec.message,
          suggestion: rec.suggestion,
          humanCheckNeeded: rec.humanCheckNeeded,
          estimatedReviewTime: rec.estimatedReviewTime,
          score,
        };
      });

      return {
        recommendations,
        coreDecision: response.data.coreDecision,
        focusAreas: response.data.focusAreas,
        safeToIgnore,
        summary: response.data.summary,
      };
    },
  };
}

export function deriveSeverity(
  score: number,
): "critical" | "high" | "medium" | "low" {
  if (score >= 8) return "critical";
  if (score >= 5) return "high";
  if (score >= 4) return "medium";
  return "low";
}

export function groupLowRiskFiles(
  files: FileScore[],
  categories: Record<string, number>,
): IgnoreGroup[] {
  if (files.length === 0) return [];

  // Known category-based labels for change types
  const categoryLabels = new Set(Object.keys(categories));
  const categoryGroups = new Map<string, FileScore[]>();
  const ungrouped: FileScore[] = [];

  // Step 1: Group files by category if they have a matching reason/change type
  for (const file of files) {
    const matchedCategory = file.reasons.find((r) => {
      const normalized = r.toLowerCase().replace(/\s+/g, "-");
      return categoryLabels.has(normalized) || categoryLabels.has(r);
    });
    if (matchedCategory) {
      const label = matchedCategory.toLowerCase().replace(/\s+/g, "-");
      const existing = categoryGroups.get(label) ?? [];
      existing.push(file);
      categoryGroups.set(label, existing);
    } else {
      ungrouped.push(file);
    }
  }

  // Step 2: Group remaining files by top-level directory
  const dirGroups = new Map<string, FileScore[]>();
  for (const file of ungrouped) {
    const segments = file.path.split("/");
    const label = segments.length > 1 ? segments[0] + "/" : "root";
    const existing = dirGroups.get(label) ?? [];
    existing.push(file);
    dirGroups.set(label, existing);
  }

  // Split directory groups that exceed 20 files by next path segment
  const finalDirGroups = new Map<string, FileScore[]>();
  for (const [label, groupFiles] of dirGroups) {
    if (groupFiles.length > 20) {
      for (const file of groupFiles) {
        const segments = file.path.split("/");
        const subLabel =
          segments.length > 2
            ? segments[0] + "/" + segments[1] + "/"
            : label;
        const existing = finalDirGroups.get(subLabel) ?? [];
        existing.push(file);
        finalDirGroups.set(subLabel, existing);
      }
    } else {
      finalDirGroups.set(label, groupFiles);
    }
  }

  // Build result from both category groups and directory groups
  const result: IgnoreGroup[] = [];

  for (const [label, groupFiles] of categoryGroups) {
    result.push({
      label,
      count: groupFiles.length,
      description: `${groupFiles.length} ${label} files`,
    });
  }

  for (const [label, groupFiles] of finalDirGroups) {
    const riskLevels = [...new Set(groupFiles.map((f) => f.riskLevel))];
    result.push({
      label,
      count: groupFiles.length,
      description: `${groupFiles.length} low-risk ${riskLevels.join("/")} files`,
    });
  }

  // Sort by count descending, then label ascending
  result.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return result;
}
