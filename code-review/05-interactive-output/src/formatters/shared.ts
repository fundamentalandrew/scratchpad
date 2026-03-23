import type { AnnotatedRecommendation } from "../types.js";
import type { IgnoreGroup, ReviewOutput } from "@core/agents/schemas.js";

export function formatRecommendationBlock(rec: AnnotatedRecommendation): string {
  const { recommendation: r, decision } = rec;
  const location = r.line ? `${r.file}:${r.line}` : r.file;

  let output = `**${location}**\n`;
  output += `**Severity:** ${r.severity}\n`;
  if (r.score !== undefined) {
    output += `**Score:** ${r.score}/10\n`;
  }
  output += `**Category:** ${r.category}\n\n`;
  output += `${r.message}\n`;

  if (r.humanCheckNeeded) {
    output += `\n> ⚠️ **Human Check Needed:** ${r.humanCheckNeeded}\n`;
  }

  if (r.suggestion) {
    output += `\n**Suggestion:** ${r.suggestion}\n`;
  }

  if (decision.action === "annotate" && "note" in decision && decision.note) {
    output += `\n📝 ${decision.note}\n`;
  }

  output += "\n";
  return output;
}

export function formatSafeToIgnoreSection(groups: IgnoreGroup[]): string {
  if (groups.length === 0) return "";

  let output = `## ✅ Safe to Ignore\n\n`;
  for (const group of groups) {
    output += `- **${group.label}** (${group.count} files) — ${group.description}\n`;
  }
  output += "\n";
  return output;
}

export function formatSummaryHeader(
  reviewOutput: ReviewOutput,
  approvedCount: number,
  totalFilesReviewed: number
): string {
  let output = `## 🧠 Strategic PR Review Guide\n\n`;
  output += `**${totalFilesReviewed}** files reviewed · **${approvedCount}** recommendations approved · **${reviewOutput.recommendations.length}** total recommendations\n\n`;
  output += `### 🎯 Core Decision\n\n${reviewOutput.coreDecision}\n\n`;

  if (reviewOutput.focusAreas.length > 0) {
    output += `### Focus Areas\n\n`;
    for (const area of reviewOutput.focusAreas) {
      output += `- ${area}\n`;
    }
    output += "\n";
  }

  return output;
}

export function sanitizeForGitHub(text: string): string {
  return text.replace(/(^|\s)@(\w)/g, "$1@\u200b$2");
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function sortBySeverity(
  recs: AnnotatedRecommendation[]
): AnnotatedRecommendation[] {
  return [...recs].sort((a, b) => {
    const sevA = SEVERITY_ORDER[a.recommendation.severity] ?? 4;
    const sevB = SEVERITY_ORDER[b.recommendation.severity] ?? 4;
    if (sevA !== sevB) return sevA - sevB;
    return (b.recommendation.score ?? 0) - (a.recommendation.score ?? 0);
  });
}

export function buildReportBody(
  reviewOutput: ReviewOutput,
  approved: AnnotatedRecommendation[],
  totalFilesReviewed: number,
  options?: { sanitize?: boolean }
): string {
  let output = "";

  output += formatSummaryHeader(
    reviewOutput,
    approved.length,
    totalFilesReviewed
  );

  if (approved.length > 0) {
    output += `## :stop_sign: Top ${approved.length} Files Requiring Human Verification\n\n`;
    const sorted = sortBySeverity(approved);
    let recsBlock = sorted.map(formatRecommendationBlock).join("");
    if (options?.sanitize) {
      recsBlock = sanitizeForGitHub(recsBlock);
    }
    output += recsBlock;
  }

  const ignoreSection = formatSafeToIgnoreSection(reviewOutput.safeToIgnore);
  if (ignoreSection) {
    if (reviewOutput.safeToIgnore.length > 5) {
      output += `<details>\n<summary>Safe to Ignore (${reviewOutput.safeToIgnore.length} groups)</summary>\n\n${ignoreSection}</details>\n`;
    } else {
      output += ignoreSection;
    }
  }

  return output;
}
