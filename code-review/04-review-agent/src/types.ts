import { z } from "zod";

export const LLMReviewResponseSchema = z.object({
  coreDecision: z.string(),
  recommendations: z.array(
    z.object({
      file: z.string(),
      category: z.string(),
      message: z.string(),
      suggestion: z.string().optional(),
      humanCheckNeeded: z.string(),
      estimatedReviewTime: z.enum(["5", "15", "30", "60"]),
    }),
  ),
  focusAreas: z.array(z.string()),
  summary: z.string(),
});

export type LLMReviewResponse = z.infer<typeof LLMReviewResponseSchema>;

// Re-exports from core
export type {
  ContextOutput,
  AnalysisOutput,
  ReviewOutput,
  FileScore,
  Recommendation,
} from "@core/agents/schemas.js";

export {
  ReviewOutputSchema,
  AnalysisOutputSchema,
} from "@core/agents/schemas.js";
