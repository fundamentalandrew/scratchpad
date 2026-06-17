import { z } from "zod";
import type { FileBatch, LLMScoringResult, ScoringContext } from "./types.js";
import { buildSystemPrompt, buildBatchPrompt } from "./prompt-builder.js";
import type { ClaudeClient } from "@core/clients/claude.js";
import type { Logger } from "@core/utils/logger.js";

export const LLMScoringResponseSchema = z.object({
  scores: z.array(
    z.object({
      file: z.string(),
      score: z.number().min(1).max(10),
      reason: z.string(),
      changeType: z.enum([
        "logic-change",
        "api-contract",
        "schema-change",
        "config-change",
        "test-change",
        "ui-change",
        "security-change",
        "other",
      ]),
    })
  ),
});

export async function scoreFiles(
  batches: FileBatch[],
  context: ScoringContext,
  claude: ClaudeClient,
  logger?: Logger,
): Promise<LLMScoringResult[]> {
  if (batches.length === 0) {
    return [];
  }

  const systemPrompt = buildSystemPrompt(context);
  const regularBatches = batches.filter((b) => !b.isLargeFile);
  const largeBatches = batches.filter((b) => b.isLargeFile);

  const results: LLMScoringResult[] = [];

  // Process regular batches sequentially to avoid rate limits
  for (const batch of regularBatches) {
    const userPrompt = buildBatchPrompt(batch);
    logger?.verbose(`Scoring batch with ${batch.files.length} files (${batch.estimatedTokens} tokens)`);
    const response = await claude.query({
      messages: [{ role: "user", content: userPrompt }],
      schema: LLMScoringResponseSchema,
      systemPrompt,
      maxTokens: 4096,
    });
    results.push(...response.data.scores);
  }

  // Process large-file batches in parallel
  if (largeBatches.length > 0) {
    const largeResults = await Promise.all(
      largeBatches.map(async (batch) => {
        const userPrompt = buildBatchPrompt(batch);
        logger?.verbose(`Scoring large file: ${batch.files[0]?.path} (${batch.estimatedTokens} tokens)`);
        const response = await claude.query({
          messages: [{ role: "user", content: userPrompt }],
          schema: LLMScoringResponseSchema,
          systemPrompt,
          maxTokens: 4096,
        });
        return response.data.scores;
      })
    );
    for (const scores of largeResults) {
      results.push(...scores);
    }
  }

  return results;
}
