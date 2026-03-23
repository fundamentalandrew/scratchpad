import type { ScoringFile, FileBatch, LowRiskSummary } from "./types.js";

const OUTPUT_RESERVE = 4000;
const LARGE_FILE_THRESHOLD = 0.5;
const CONTEXT_UTILIZATION = 0.75;
const DEFAULT_MAX_CONTEXT_TOKENS = 200_000;

export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

export function buildBatches(
  files: ScoringFile[],
  systemPromptTokens: number,
  maxContextTokens: number = DEFAULT_MAX_CONTEXT_TOKENS,
  lowRiskSummaries?: LowRiskSummary[]
): FileBatch[] {
  if (files.length === 0 && (!lowRiskSummaries || lowRiskSummaries.length === 0)) {
    return [];
  }

  const budget = Math.max(
    1,
    maxContextTokens * CONTEXT_UTILIZATION - systemPromptTokens - OUTPUT_RESERVE
  );
  const largeThreshold = budget * LARGE_FILE_THRESHOLD;

  // Sort files by path for directory grouping
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  // Separate large files from normal files
  const largeBatches: FileBatch[] = [];
  const normalFiles: Array<{ file: ScoringFile; tokens: number }> = [];

  for (const file of sorted) {
    const tokens = estimateTokens(file.diff);
    if (tokens > largeThreshold) {
      largeBatches.push({
        files: [file],
        estimatedTokens: tokens,
        isLargeFile: true,
      });
    } else {
      normalFiles.push({ file, tokens });
    }
  }

  // Greedily pack normal files into batches
  const normalBatches: FileBatch[] = [];
  let currentFiles: ScoringFile[] = [];
  let currentTokens = 0;

  for (const { file, tokens } of normalFiles) {
    if (currentFiles.length > 0 && currentTokens + tokens > budget) {
      normalBatches.push({
        files: currentFiles,
        estimatedTokens: currentTokens,
        isLargeFile: false,
      });
      currentFiles = [];
      currentTokens = 0;
    }
    currentFiles.push(file);
    currentTokens += tokens;
  }
  if (currentFiles.length > 0) {
    normalBatches.push({
      files: currentFiles,
      estimatedTokens: currentTokens,
      isLargeFile: false,
    });
  }

  // Append low-risk summaries to the smallest non-large batch
  if (lowRiskSummaries && lowRiskSummaries.length > 0) {
    const summaryText = lowRiskSummaries
      .map((s) => `- ${s.path} — ${s.changeType} (score: ${s.suggestedScore})`)
      .join("\n");
    const summaryTokens = estimateTokens(summaryText);

    if (normalBatches.length > 0) {
      // Find batch with fewest tokens
      let minIdx = 0;
      for (let i = 1; i < normalBatches.length; i++) {
        if (normalBatches[i].estimatedTokens < normalBatches[minIdx].estimatedTokens) {
          minIdx = i;
        }
      }
      normalBatches[minIdx].estimatedTokens += summaryTokens;
    } else {
      // All files were large; create a dedicated batch for summaries
      normalBatches.push({
        files: [],
        estimatedTokens: summaryTokens,
        isLargeFile: false,
      });
    }
  }

  return [...largeBatches, ...normalBatches];
}
