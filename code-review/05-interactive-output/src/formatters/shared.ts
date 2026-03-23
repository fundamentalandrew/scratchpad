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
