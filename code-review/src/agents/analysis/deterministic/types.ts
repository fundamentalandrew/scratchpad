import type { z } from "zod";
import type { PRFileSchema } from "../../../agents/schemas.js";

export type PRFile = z.infer<typeof PRFileSchema>;

export interface ClassificationResult {
  changeType: "format-only" | "rename-only" | "moved-function" | "structural";
  confidence: number;
  details: string;
}

export interface FunctionInfo {
  name: string;
  hash: string;
  startLine: number;
  endLine: number;
}

export interface FilterResult {
  passed: PRFile[];
  ignored: PRFile[];
}

export interface AnalysisFile extends PRFile {
  beforeContent?: string;
  afterContent?: string;
}
