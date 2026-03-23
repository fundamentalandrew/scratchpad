import { z } from "zod";

const DEFAULT_IGNORE_PATTERNS = [
  "node_modules/**", "dist/**", "build/**", "coverage/**",
  ".next/**", "vendor/**", "*.lock", "*.min.*", ".git/**",
  "*.png", "*.jpg", "*.svg", "*.gif", "*.ico",
  "*.woff", "*.woff2", ".turbo/**", ".pnpm-store/**",
];

const outputSchema = z.object({
  console: z.boolean().default(true),
  markdown: z.boolean().default(false),
  markdownPath: z.string().default("./code-review-report.md"),
  githubComment: z.boolean().default(false),
}).strict();

export const configSchema = z.object({
  ignorePatterns: z.array(z.string()).default(DEFAULT_IGNORE_PATTERNS),
  criticalThreshold: z.number().min(0).max(10).default(8),
  domainRulesPath: z.string().default("./DOMAIN_RULES.md"),
  architecturePath: z.string().default("./ARCHITECTURE.md"),
  apiKey: z.string().optional(),
  githubToken: z.string().optional(),
  model: z.string().default("claude-sonnet-4-5-20250514"),
  maxRetries: z.number().min(0).default(3),
  output: outputSchema.default({}),
}).strict();

export const partialConfigSchema = configSchema.partial().strict();

export type CodeReviewConfig = z.infer<typeof configSchema>;

export const defaultConfig: CodeReviewConfig = configSchema.parse({});
