diff --git a/code-review/05-interactive-output/src/formatters/markdown-file.ts b/code-review/05-interactive-output/src/formatters/markdown-file.ts
new file mode 100644
index 0000000..a2ab322
--- /dev/null
+++ b/code-review/05-interactive-output/src/formatters/markdown-file.ts
@@ -0,0 +1,24 @@
+import type { AnnotatedRecommendation } from "../types.js";
+import type { ReviewOutput } from "@core/agents/schemas.js";
+import { buildReportBody } from "./pr-comment.js";
+
+export function formatMarkdownFile(
+  reviewOutput: ReviewOutput,
+  approved: AnnotatedRecommendation[],
+  totalFilesReviewed: number,
+  metadata: { timestamp: string; prUrl?: string; reviewMode: string }
+): string {
+  let frontmatter = "---\n";
+  frontmatter += `timestamp: ${metadata.timestamp}\n`;
+  frontmatter += `reviewMode: ${metadata.reviewMode}\n`;
+  if (metadata.prUrl) {
+    frontmatter += `prUrl: ${metadata.prUrl}\n`;
+  }
+  frontmatter += "---\n\n";
+
+  const body = buildReportBody(reviewOutput, approved, totalFilesReviewed, {
+    sanitize: false,
+  });
+
+  return frontmatter + body;
+}
diff --git a/code-review/05-interactive-output/src/formatters/pr-comment.ts b/code-review/05-interactive-output/src/formatters/pr-comment.ts
new file mode 100644
index 0000000..858a516
--- /dev/null
+++ b/code-review/05-interactive-output/src/formatters/pr-comment.ts
@@ -0,0 +1,80 @@
+import type { AnnotatedRecommendation } from "../types.js";
+import type { ReviewOutput } from "@core/agents/schemas.js";
+import {
+  formatRecommendationBlock,
+  formatSafeToIgnoreSection,
+  formatSummaryHeader,
+  sanitizeForGitHub,
+} from "./shared.js";
+
+const MARKER = "<!-- code-review-cli:report:v1 -->";
+
+const SEVERITY_ORDER: Record<string, number> = {
+  critical: 0,
+  high: 1,
+  medium: 2,
+  low: 3,
+};
+
+function sortBySeverity(
+  recs: AnnotatedRecommendation[]
+): AnnotatedRecommendation[] {
+  return [...recs].sort((a, b) => {
+    const sevA = SEVERITY_ORDER[a.recommendation.severity] ?? 4;
+    const sevB = SEVERITY_ORDER[b.recommendation.severity] ?? 4;
+    if (sevA !== sevB) return sevA - sevB;
+    return (b.recommendation.score ?? 0) - (a.recommendation.score ?? 0);
+  });
+}
+
+export function buildReportBody(
+  reviewOutput: ReviewOutput,
+  approved: AnnotatedRecommendation[],
+  totalFilesReviewed: number,
+  options?: { sanitize?: boolean }
+): string {
+  let output = "";
+
+  output += formatSummaryHeader(
+    reviewOutput,
+    approved.length,
+    totalFilesReviewed
+  );
+
+  output += `## :dart: Core Decision\n\n${reviewOutput.coreDecision}\n\n`;
+
+  if (approved.length > 0) {
+    output += `## :stop_sign: Top ${approved.length} Files Requiring Human Verification\n\n`;
+    const sorted = sortBySeverity(approved);
+    let recsBlock = sorted.map(formatRecommendationBlock).join("");
+    if (options?.sanitize) {
+      recsBlock = sanitizeForGitHub(recsBlock);
+    }
+    output += recsBlock;
+  }
+
+  const ignoreSection = formatSafeToIgnoreSection(reviewOutput.safeToIgnore);
+  if (ignoreSection) {
+    if (reviewOutput.safeToIgnore.length > 5) {
+      output += `<details>\n<summary>Safe to Ignore (${reviewOutput.safeToIgnore.length} groups)</summary>\n\n${ignoreSection}</details>\n`;
+    } else {
+      output += ignoreSection;
+    }
+  }
+
+  return output;
+}
+
+export function formatPRComment(
+  reviewOutput: ReviewOutput,
+  approved: AnnotatedRecommendation[],
+  totalFilesReviewed: number
+): string {
+  return (
+    MARKER +
+    "\n\n" +
+    buildReportBody(reviewOutput, approved, totalFilesReviewed, {
+      sanitize: true,
+    })
+  );
+}
diff --git a/code-review/05-interactive-output/tests/formatters/markdown-file.test.ts b/code-review/05-interactive-output/tests/formatters/markdown-file.test.ts
new file mode 100644
index 0000000..0b00b46
--- /dev/null
+++ b/code-review/05-interactive-output/tests/formatters/markdown-file.test.ts
@@ -0,0 +1,64 @@
+import { describe, it, expect } from "vitest";
+import { formatMarkdownFile } from "../../src/formatters/markdown-file.js";
+import type { ReviewOutput } from "@core/agents/schemas.js";
+
+function makeReviewOutput(overrides: Partial<ReviewOutput> = {}): ReviewOutput {
+  return {
+    recommendations: [],
+    coreDecision: "Approve with minor changes",
+    focusAreas: ["Error handling"],
+    safeToIgnore: [],
+    summary: "Looks good overall",
+    ...overrides,
+  };
+}
+
+describe("formatMarkdownFile", () => {
+  it("starts with YAML frontmatter containing timestamp, reviewMode", () => {
+    const output = formatMarkdownFile(makeReviewOutput(), [], 5, {
+      timestamp: "2026-01-15T10:00:00Z",
+      reviewMode: "pr",
+    });
+    expect(output.startsWith("---\n")).toBe(true);
+    const frontmatter = output.split("---\n")[1];
+    expect(frontmatter).toContain("timestamp: 2026-01-15T10:00:00Z");
+    expect(frontmatter).toContain("reviewMode: pr");
+  });
+
+  it("includes prUrl in frontmatter when provided (PR mode)", () => {
+    const output = formatMarkdownFile(makeReviewOutput(), [], 5, {
+      timestamp: "2026-01-15T10:00:00Z",
+      reviewMode: "pr",
+      prUrl: "https://github.com/owner/repo/pull/42",
+    });
+    const frontmatter = output.split("---\n")[1];
+    expect(frontmatter).toContain(
+      "prUrl: https://github.com/owner/repo/pull/42"
+    );
+  });
+
+  it("omits prUrl from frontmatter when not provided (repo mode)", () => {
+    const output = formatMarkdownFile(makeReviewOutput(), [], 5, {
+      timestamp: "2026-01-15T10:00:00Z",
+      reviewMode: "repo",
+    });
+    const frontmatter = output.split("---\n")[1];
+    expect(frontmatter).not.toContain("prUrl");
+  });
+
+  it("body content matches PR comment format (same sections)", () => {
+    const review = makeReviewOutput({
+      coreDecision: "Fix critical bug first",
+      safeToIgnore: [
+        { label: "Tests", count: 5, description: "Test file changes" },
+      ],
+    });
+    const output = formatMarkdownFile(review, [], 10, {
+      timestamp: "2026-01-15T10:00:00Z",
+      reviewMode: "pr",
+    });
+    expect(output).toContain("Strategic PR Review Guide");
+    expect(output).toContain("Fix critical bug first");
+    expect(output).toContain("Safe to Ignore");
+  });
+});
diff --git a/code-review/05-interactive-output/tests/formatters/pr-comment.test.ts b/code-review/05-interactive-output/tests/formatters/pr-comment.test.ts
new file mode 100644
index 0000000..bd3ff4e
--- /dev/null
+++ b/code-review/05-interactive-output/tests/formatters/pr-comment.test.ts
@@ -0,0 +1,103 @@
+import { describe, it, expect } from "vitest";
+import { formatPRComment } from "../../src/formatters/pr-comment.js";
+import type { AnnotatedRecommendation } from "../../src/types.js";
+import type { ReviewOutput } from "@core/agents/schemas.js";
+
+function makeReviewOutput(overrides: Partial<ReviewOutput> = {}): ReviewOutput {
+  return {
+    recommendations: [],
+    coreDecision: "Approve with minor changes",
+    focusAreas: ["Error handling"],
+    safeToIgnore: [],
+    summary: "Looks good overall",
+    ...overrides,
+  };
+}
+
+function makeApproved(
+  file: string,
+  severity: "critical" | "high" | "medium" | "low",
+  message: string,
+  score?: number
+): AnnotatedRecommendation {
+  return {
+    recommendation: { file, severity, category: "bug", message, score },
+    decision: { action: "accept" },
+  };
+}
+
+describe("formatPRComment", () => {
+  it("output starts with hidden marker <!-- code-review-cli:report:v1 -->", () => {
+    const output = formatPRComment(makeReviewOutput(), [], 5);
+    expect(output.startsWith("<!-- code-review-cli:report:v1 -->")).toBe(true);
+  });
+
+  it("includes summary header, core decision, recommendations, safe-to-ignore sections", () => {
+    const review = makeReviewOutput({
+      coreDecision: "Ship it with one fix",
+      safeToIgnore: [
+        { label: "Config files", count: 3, description: "Boilerplate" },
+      ],
+    });
+    const approved = [makeApproved("src/a.ts", "high", "Fix null check")];
+    const output = formatPRComment(review, approved, 10);
+    expect(output).toContain("Strategic PR Review Guide");
+    expect(output).toContain("Ship it with one fix");
+    expect(output).toContain("Fix null check");
+    expect(output).toContain("Safe to Ignore");
+    expect(output).toContain("Config files");
+  });
+
+  it("uses <details> blocks when more than 5 safe-to-ignore groups", () => {
+    const groups = Array.from({ length: 6 }, (_, i) => ({
+      label: `Group ${i}`,
+      count: i + 1,
+      description: `Description ${i}`,
+    }));
+    const review = makeReviewOutput({ safeToIgnore: groups });
+    const output = formatPRComment(review, [], 5);
+    expect(output).toContain("<details>");
+    expect(output).toContain("</details>");
+  });
+
+  it("does not use <details> when 5 or fewer groups", () => {
+    const groups = Array.from({ length: 3 }, (_, i) => ({
+      label: `Group ${i}`,
+      count: i + 1,
+      description: `Description ${i}`,
+    }));
+    const review = makeReviewOutput({ safeToIgnore: groups });
+    const output = formatPRComment(review, [], 5);
+    expect(output).not.toContain("<details>");
+  });
+
+  it("approved recommendations appear in severity order", () => {
+    const approved = [
+      makeApproved("low.ts", "low", "Low issue"),
+      makeApproved("crit.ts", "critical", "Critical issue"),
+      makeApproved("med.ts", "medium", "Medium issue"),
+    ];
+    const output = formatPRComment(makeReviewOutput(), approved, 10);
+    const critIdx = output.indexOf("Critical issue");
+    const medIdx = output.indexOf("Medium issue");
+    const lowIdx = output.indexOf("Low issue");
+    expect(critIdx).toBeLessThan(medIdx);
+    expect(medIdx).toBeLessThan(lowIdx);
+  });
+
+  it("annotated recommendations include user notes", () => {
+    const approved: AnnotatedRecommendation[] = [
+      {
+        recommendation: {
+          file: "src/b.ts",
+          severity: "high",
+          category: "security",
+          message: "Check injection",
+        },
+        decision: { action: "annotate", note: "Verified safe in context" },
+      },
+    ];
+    const output = formatPRComment(makeReviewOutput(), approved, 5);
+    expect(output).toContain("Verified safe in context");
+  });
+});
