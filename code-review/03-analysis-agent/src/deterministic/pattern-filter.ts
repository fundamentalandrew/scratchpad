import { filterFiles } from "@core/utils/file-filter.js";
import type { FileScore } from "@core/agents/schemas.js";
import type { PRFile } from "./types.js";

export const ANALYSIS_IGNORE_PATTERNS = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "*.generated.*",
  "*.gen.*",
  "*.graphql",
  "prisma/migrations/**",
  "**/locales/**",
  "**/translations/**",
  "**/i18n/**",
  "**/*.svg",
  "**/__snapshots__/**",
  "**/*.snap",
];

export interface PatternFilterResult {
  passed: PRFile[];
  ignored: PRFile[];
  ignoredScores: FileScore[];
}

export function filterChangedFiles(
  files: PRFile[],
  corePatterns: string[],
  analysisPatterns: string[] = ANALYSIS_IGNORE_PATTERNS,
): PatternFilterResult {
  const mergedPatterns = Array.from(
    new Set([...corePatterns, ...analysisPatterns]),
  );

  const passed = filterFiles(files, mergedPatterns, (f) => f.path);

  const passedPaths = new Set(passed.map((f) => f.path));
  const ignored = files.filter((f) => !passedPaths.has(f.path));

  const ignoredScores: FileScore[] = ignored.map((f) => ({
    path: f.path,
    score: 0,
    riskLevel: "low" as const,
    reasons: ["Filtered by ignore pattern"],
  }));

  return { passed, ignored, ignoredScores };
}
