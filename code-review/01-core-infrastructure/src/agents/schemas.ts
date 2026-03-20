import { z } from "zod";

export const ReviewModeSchema = z.enum(["pr", "repo"]);
export const RiskLevelSchema = z.enum(["critical", "high", "medium", "low"]);

export const FileScoreSchema = z.object({
  path: z.string(),
  score: z.number().min(0).max(10),
  riskLevel: RiskLevelSchema,
  reasons: z.array(z.string()),
});

export const RecommendationSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  severity: RiskLevelSchema,
  category: z.string(),
  message: z.string(),
  suggestion: z.string().optional(),
});

const PRFileSchema = z.object({
  path: z.string(),
  status: z.string(),
  additions: z.number(),
  deletions: z.number(),
  patch: z.string().nullable().optional(),
});

const PRSchema = z.object({
  number: z.number(),
  title: z.string(),
  description: z.string(),
  author: z.string(),
  baseBranch: z.string(),
  headBranch: z.string(),
  files: z.array(PRFileSchema),
  diff: z.string(),
});

const RepositorySchema = z.object({
  owner: z.string(),
  repo: z.string(),
  defaultBranch: z.string(),
});

export const ContextOutputSchema = z
  .object({
    mode: ReviewModeSchema,
    repository: RepositorySchema,
    pr: PRSchema.optional(),
    repoFiles: z.array(z.object({ path: z.string() })).optional(),
    domainRules: z.string().nullable(),
    architectureDoc: z.string().nullable(),
  })
  .refine((data) => data.pr !== undefined || data.repoFiles !== undefined, {
    message: "Either pr or repoFiles must be provided",
  });

export const AnalysisOutputSchema = z.object({
  scoredFiles: z.array(FileScoreSchema),
  criticalFiles: z.array(FileScoreSchema),
  summary: z.object({
    totalFiles: z.number(),
    criticalCount: z.number(),
    highCount: z.number(),
    categories: z.record(z.string(), z.number()),
  }),
});

export const ReviewOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema),
  coreDecision: z.string(),
  focusAreas: z.array(z.string()),
});

export type FileScore = z.infer<typeof FileScoreSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type ContextOutput = z.infer<typeof ContextOutputSchema>;
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
export type ReviewOutput = z.infer<typeof ReviewOutputSchema>;
