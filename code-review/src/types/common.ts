export type ReviewMode = "pr" | "repo";
export type RiskLevel = "critical" | "high" | "medium" | "low";

export interface FileScore {
  path: string;
  score: number; // 0-10
  riskLevel: RiskLevel;
  reasons: string[];
}

export interface Recommendation {
  file: string;
  line?: number;
  severity: RiskLevel;
  category: string;
  message: string;
  suggestion?: string;
}
