import type { TechStack } from "@core/agents/schemas.js";
import type { ClassificationResult } from "../deterministic/types.js";

export type ScoringChangeType =
  | "logic-change"
  | "api-contract"
  | "schema-change"
  | "config-change"
  | "test-change"
  | "ui-change"
  | "security-change"
  | "other";

export type FileStatus = "added" | "modified" | "deleted" | "renamed";

export interface ScoringContext {
  domainRules: string | null;
  architectureDoc: string | null;
  techStack: TechStack;
  prTitle: string;
  prDescription: string;
}

export interface ScoringFile {
  path: string;
  diff: string;
  status: FileStatus;
  metadata?: string;
}

export interface FileBatch {
  files: ScoringFile[];
  estimatedTokens: number;
  isLargeFile: boolean;
}

export interface LLMScoringResult {
  file: string;
  score: number;
  reason: string;
  changeType: ScoringChangeType;
}

export interface LowRiskSummary {
  path: string;
  changeType: ClassificationResult["changeType"];
  suggestedScore: number;
}
