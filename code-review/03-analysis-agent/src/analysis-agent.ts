import type { Agent } from "@core/pipeline/types.js";
import type { ContextOutput, AnalysisOutput, FileScore } from "@core/agents/schemas.js";
import type { ClaudeClient } from "@core/clients/claude.js";
import type { Logger } from "@core/utils/logger.js";
import type { CodeReviewConfig } from "@core/config/schema.js";
import type { AnalysisFile, ClassificationResult } from "./deterministic/types.js";
import type { ScoringFile, ScoringContext, LowRiskSummary, LLMScoringResult } from "./scoring/types.js";
import { filterChangedFiles, ANALYSIS_IGNORE_PATTERNS } from "./deterministic/pattern-filter.js";
import { isSupportedLanguage, parseFile, detectLanguage } from "./deterministic/ast-analyzer.js";
import { classifyChange } from "./deterministic/ast-classifier.js";
import { buildBatches, estimateTokens } from "./scoring/batch-builder.js";
import { buildSystemPrompt } from "./scoring/prompt-builder.js";
import { scoreFiles } from "./scoring/llm-scorer.js";

type RiskLevel = "critical" | "high" | "medium" | "low";

function mapRiskLevel(score: number): RiskLevel {
  if (score >= 8) return "critical";
  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function emptyOutput(): AnalysisOutput {
  return {
    scoredFiles: [],
    criticalFiles: [],
    summary: { totalFiles: 0, criticalCount: 0, highCount: 0, categories: {} },
  };
}

export function createAnalysisAgent(deps: {
  claude: ClaudeClient;
  logger?: Logger;
  config: CodeReviewConfig;
}): Agent<ContextOutput, AnalysisOutput> {
  return {
    name: "analysis",
    idempotent: true,
    async run(input: ContextOutput): Promise<AnalysisOutput> {
      // Step 1: Extract file list — PR mode only
      if (!input.pr) {
        return emptyOutput();
      }

      const prFiles = input.pr.files;
      if (prFiles.length === 0) {
        return emptyOutput();
      }

      // Step 2: Triage files
      const analysisFiles: AnalysisFile[] = prFiles.map((f) => ({ ...f }));

      // Step 3: Pattern filter
      const { passed, ignoredScores } = filterChangedFiles(
        analysisFiles,
        deps.config.ignorePatterns ?? [],
        ANALYSIS_IGNORE_PATTERNS,
      );

      // Track change types for categories
      const changeTypeMap = new Map<string, string>();
      for (const s of ignoredScores) {
        changeTypeMap.set(s.path, "ignored");
      }

      // Step 4: AST classification
      const classifiedFiles: FileScore[] = [];
      const lowRiskSummaries: LowRiskSummary[] = [];
      const unclassifiedFiles: AnalysisFile[] = [];

      for (const file of passed) {
        const af = file as AnalysisFile;
        const canAST =
          isSupportedLanguage(af.path) &&
          af.beforeContent !== undefined &&
          af.afterContent !== undefined;

        if (canAST) {
          try {
            const lang = detectLanguage(af.path)!;
            const beforeTree = parseFile(af.beforeContent!, lang);
            const afterTree = parseFile(af.afterContent!, lang);
            const result: ClassificationResult = classifyChange(beforeTree, afterTree);

            if (result.confidence >= 0.9 && result.changeType !== "structural") {
              const score = result.changeType === "moved-function" ? 2 : 1;
              classifiedFiles.push({
                path: af.path,
                score,
                riskLevel: "low",
                reasons: [result.details],
              });
              lowRiskSummaries.push({
                path: af.path,
                changeType: result.changeType,
                suggestedScore: score,
              });
              changeTypeMap.set(af.path, result.changeType);
              continue;
            }
          } catch (err) {
            deps.logger?.warn(`AST parse failed for ${af.path}: ${err}`);
          }
        }

        unclassifiedFiles.push(af);
      }

      // Step 5: Build batches
      const scoringFiles: ScoringFile[] = unclassifiedFiles.map((f) => ({
        path: f.path,
        diff: f.patch ?? `[binary or empty file: ${f.path}]`,
        status: (f.status as "added" | "modified" | "deleted" | "renamed") ?? "modified",
        metadata: f.previousPath ? `Renamed from ${f.previousPath}` : undefined,
      }));

      const scoringContext: ScoringContext = {
        domainRules: input.domainRules,
        architectureDoc: input.architectureDoc,
        techStack: input.techStack ?? { languages: [], frameworks: [], dependencies: {} },
        prTitle: input.pr.title,
        prDescription: input.pr.description,
      };
      const systemPrompt = buildSystemPrompt(scoringContext);
      const systemPromptTokens = estimateTokens(systemPrompt);

      const batches = buildBatches(scoringFiles, systemPromptTokens, undefined, lowRiskSummaries);

      // Step 6: LLM Score
      let llmResults: LLMScoringResult[] = [];
      if (batches.length > 0) {
        llmResults = await scoreFiles(batches, scoringContext, deps.claude, deps.logger);
      }

      // Step 7: Assemble output — merge results
      const scoreMap = new Map<string, FileScore>();

      // Add ignored files
      for (const s of ignoredScores) {
        scoreMap.set(s.path, s);
      }

      // Add AST-classified files
      for (const s of classifiedFiles) {
        scoreMap.set(s.path, s);
      }

      // Merge LLM results (higher score wins)
      for (const lr of llmResults) {
        const existing = scoreMap.get(lr.file);
        const llmScore: FileScore = {
          path: lr.file,
          score: lr.score,
          riskLevel: mapRiskLevel(lr.score),
          reasons: [lr.reason],
        };

        if (existing) {
          if (lr.score > existing.score) {
            llmScore.reasons = [...llmScore.reasons, ...existing.reasons];
            scoreMap.set(lr.file, llmScore);
            changeTypeMap.set(lr.file, lr.changeType);
          }
        } else {
          scoreMap.set(lr.file, llmScore);
          changeTypeMap.set(lr.file, lr.changeType);
        }
      }

      // Fallback: any unclassified file not scored by LLM gets a default score
      for (const f of unclassifiedFiles) {
        if (!scoreMap.has(f.path)) {
          const defaultScore = 5;
          scoreMap.set(f.path, {
            path: f.path,
            score: defaultScore,
            riskLevel: mapRiskLevel(defaultScore),
            reasons: ["LLM did not return a score for this file"],
          });
          changeTypeMap.set(f.path, "other");
        }
      }

      const scoredFiles = Array.from(scoreMap.values());
      const criticalThreshold = deps.config.criticalThreshold ?? 8;
      const criticalFiles = scoredFiles.filter((f) => f.score >= criticalThreshold);

      // Summary statistics
      const categories: Record<string, number> = {};
      for (const [, changeType] of changeTypeMap) {
        categories[changeType] = (categories[changeType] ?? 0) + 1;
      }

      return {
        scoredFiles,
        criticalFiles,
        summary: {
          totalFiles: scoredFiles.length,
          criticalCount: scoredFiles.filter((f) => f.riskLevel === "critical").length,
          highCount: scoredFiles.filter((f) => f.riskLevel === "high").length,
          categories,
        },
      };
    },
  };
}
