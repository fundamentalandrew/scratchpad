#!/usr/bin/env node
// Pull full per-finding detail for an Aikido feature-branch scan and render reports.
//
// WHY THIS EXISTS
//   Aikido's CI token and public REST API only expose the consolidated (post-merge)
//   issue feed and scan *summaries* (counts + gate). The per-finding detail of a
//   PRE-MERGE feature-branch scan lives only behind the session-authenticated
//   endpoint  GET /api/integrations/continuous_integration/scan/<id>/getPullRequestInfo
//   (field: info.diffs.issues_added). This script replays that request using a
//   browser-captured cURL (which carries your session cookie) and extracts it.
//
// USAGE
//   node pull-aikido-scan.mjs [--curl <file>] [--out <dir>] [--report <path>]
//   Defaults: --curl ./scan.curl  --out .  (no report file unless --report given)
//
// See README.md in this directory for how to capture scan.curl.

import fs from "node:fs";
import path from "node:path";

// ---------- args ----------
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const here = path.dirname(new URL(import.meta.url).pathname);
const CURL = path.resolve(opt("--curl", path.join(here, "scan.curl")));
const OUT = path.resolve(opt("--out", here));
const REPORT = opt("--report", null); // optional grouped remediation report

// ---------- helpers ----------
const die = (msg) => { console.error("✗ " + msg); process.exit(1); };

function parseCurl(file) {
  if (!fs.existsSync(file)) die(`cURL file not found: ${file}\n  Capture it first — see README.md.`);
  const block = fs.readFileSync(file, "utf8");
  const url = (block.match(/curl\s+'([^']+)'/) || block.match(/curl\s+"([^"]+)"/) || [])[1];
  if (!url) die(`Could not find a URL in ${file}. Make sure it's a 'Copy as cURL' export.`);
  const headers = {};
  for (const m of block.matchAll(/-H\s+'([^:]+):\s*([^']*)'/g)) headers[m[1].toLowerCase().trim()] = m[2];
  const cookie = (block.match(/-b\s+'([^']*)'/) || block.match(/--cookie\s+'([^']*)'/) || [])[1];
  if (cookie) headers["cookie"] = cookie;
  if (!headers["cookie"]) die(`No cookie found in ${file}. The capture must include the session cookie (-b '...').`);
  return { url, headers };
}

// Warn early if the session JWT has expired (saves a confusing 401).
function checkExpiry(cookie) {
  const jwt = (cookie.match(/(?:^|;\s*)auth=([^;]+)/) || [])[1];
  if (!jwt) return;
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      die(`Session cookie expired at ${new Date(payload.exp * 1000).toISOString()}.\n  Re-capture scan.curl from your browser (see README.md).`);
    }
  } catch { /* non-fatal */ }
}

const SEV_LABEL = (s) => (s >= 90 ? "critical" : s >= 70 ? "high" : s >= 40 ? "medium" : s >= 10 ? "low" : "info");
const RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const BADGE = { critical: "🔴 CRITICAL", high: "🟠 HIGH", medium: "🟡 MEDIUM", low: "⚪ LOW", info: "· info" };
const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();

// Remediation strategy per known rule (extend as new rules appear).
const STRATEGY = {
  AIK_ts_node_nosqli_injection: "NoSQL/query injection — validate or cast user input (zod/class-validator) **before** it reaches query operators; never pass raw request objects into `where`/`findOne`/`updateMany`.",
  AIK_ts_generic_path_traversal: "Path traversal — resolve paths against a fixed base dir and assert the resolved path stays within it (`path.resolve(base, x)` + `startsWith(base)`); reject `..`/absolute inputs.",
  CKV_DOCKER_3: "Container hardening — add a non-root `USER` directive in the Dockerfile.",
};

// ---------- main ----------
const req = parseCurl(CURL);
checkExpiry(req.headers.cookie);
const scanId = (req.url.match(/\/scan\/(\d+)\//) || [])[1] || "unknown";

console.log(`→ Fetching scan ${scanId} …`);
const res = await fetch(req.url, { headers: req.headers });
if (res.status === 401 || res.status === 403) {
  die(`HTTP ${res.status} — session cookie rejected/expired. Re-capture scan.curl (see README.md).`);
}
if (!res.ok) die(`HTTP ${res.status} from ${req.url}`);
const body = await res.json().catch(() => die("Response was not JSON (are you logged in / is the URL right?)"));
const info = body.info;
if (!info?.diffs?.issues_added) die("Response has no info.diffs.issues_added — is this a feature-branch scan with findings?");

const findings = info.diffs.issues_added.map((a) => ({
  severity_score: a.severity, severity: SEV_LABEL(a.severity),
  type: a.type, scanner: a.scanner, rule_id: a.rule_id, title: a.title, lang: a.programming_language,
  file: a.file, start_line: a.start_line, end_line: a.end_line, start_col: a.start_column, end_col: a.end_column,
  description: a.description, remediation: a.remediation, url: a.background_info_url,
  snippet: a.snippet, snoozed: a.snoozed,
})).sort((x, y) => RANK[x.severity] - RANK[y.severity] || y.severity_score - x.severity_score || (x.file || "").localeCompare(y.file || "") || x.start_line - y.start_line);

const bySev = {};
for (const f of findings) bySev[f.severity] = (bySev[f.severity] || 0) + 1;
const actionable = findings.filter((f) => RANK[f.severity] <= 2);
const noise = findings.filter((f) => RANK[f.severity] > 2);
const meta = {
  scan_id: Number(scanId) || scanId, repo: info.repo_name, branch: info.branch_name,
  pr: info.pull_request_url, gate: { from_severity: info.from_severity, new_gate_status: info.new_gate_status },
};

fs.mkdirSync(OUT, { recursive: true });

// 1) machine-readable
fs.writeFileSync(path.join(OUT, "findings.json"),
  JSON.stringify({ ...meta, total: findings.length, by_severity: bySev, actionable_count: actionable.length, findings }, null, 2));

// 2) human-readable (flat, by severity)
{
  let m = `# Aikido scan ${meta.scan_id} — ${meta.repo} \`${meta.branch}\`\n\nPR: ${meta.pr}\n\n`;
  m += `**${findings.length} findings** (` + ["critical", "high", "medium", "low", "info"].filter((s) => bySev[s]).map((s) => `${bySev[s]} ${s}`).join(" · ") + `)\n\n`;
  m += `Gate: \`${meta.gate.new_gate_status}\` · threshold \`from_severity=${meta.gate.from_severity}\` · **${actionable.length} actionable (medium+)**\n\n---\n`;
  let cur = "";
  for (const f of findings) {
    if (f.severity !== cur) { cur = f.severity; m += `\n## ${cur.toUpperCase()} — ${bySev[cur]}\n`; }
    m += `\n### [${f.severity_score}] ${f.title}${f.snoozed ? " _(snoozed)_" : ""}\n\`${f.file}:${f.start_line}${f.end_line > f.start_line ? "-" + f.end_line : ""}\` · rule \`${f.rule_id}\` · ${f.scanner} · ${f.lang}\n\n`;
    if (f.description) m += `**Why:** ${clean(f.description).slice(0, 600)}\n\n`;
    if (f.remediation) m += `**Fix:** ${clean(f.remediation).slice(0, 600)}\n\n`;
    if (f.snippet) m += `\`\`\`${(f.lang || "").toLowerCase()}\n${String(f.snippet).trim().slice(0, 500)}\n\`\`\`\n`;
    if (f.url) m += `<${f.url}>\n`;
  }
  fs.writeFileSync(path.join(OUT, "findings.md"), m);
}

// 3) optional grouped remediation report (agent-ready, by file)
if (REPORT) {
  const byFile = {};
  for (const f of actionable) (byFile[f.file] = byFile[f.file] || []).push(f);
  const files = Object.keys(byFile).sort((a, b) => byFile[b].length - byFile[a].length || a.localeCompare(b));
  let m = `# Aikido Security Scan — Remediation Report\n\n`;
  m += `> **Source:** Aikido feature-branch scan \`${meta.scan_id}\` · repo \`${meta.repo}\` · branch \`${meta.branch}\`\n`;
  m += `> **PR:** ${meta.pr}\n> **Gate:** \`${meta.gate.new_gate_status}\` (threshold \`from_severity=${meta.gate.from_severity}\`)\n`;
  m += `> **Pulled from** \`getPullRequestInfo.info.diffs.issues_added\` (live scan diff — not available via Aikido CI/REST API tokens).\n\n`;
  m += `## Summary\n\n**${findings.length} findings introduced** — ` + ["critical", "high", "medium", "low", "info"].filter((s) => bySev[s]).map((s) => `${bySev[s]} ${s}`).join(" · ") + `.\n\n`;
  m += `**${actionable.length} are gate-blocking (medium+) and must be fixed.**\n\n`;
  const ruleRoll = Object.entries(actionable.reduce((a, f) => ((a[f.rule_id] = (a[f.rule_id] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  m += `| Count | Rule | Class | Strategy |\n|--:|---|---|---|\n`;
  for (const [r, c] of ruleRoll) m += `| ${c} | \`${r}\` | ${actionable.find((f) => f.rule_id === r).type} | ${STRATEGY[r] || "see findings below"} |\n`;
  m += `\n> ${noise.length} low/info items omitted; see \`findings.json\` for the full set.\n\n`;
  m += `Per-file (actionable): ` + files.map((f) => `\`${f}\` (${byFile[f].length})`).join(", ") + `\n\n---\n`;
  for (const file of files) {
    m += `\n## \`${file}\` — ${byFile[file].length} finding${byFile[file].length > 1 ? "s" : ""}\n`;
    for (const f of byFile[file].sort((a, b) => RANK[a.severity] - RANK[b.severity] || a.start_line - b.start_line)) {
      m += `\n### ${BADGE[f.severity]} (score ${f.severity_score}) · L${f.start_line}${f.end_line > f.start_line ? `–${f.end_line}` : ""} · ${f.title}\n`;
      m += `- **Rule:** \`${f.rule_id}\` · scanner \`${f.scanner}\` · ${f.lang}\n`;
      if (f.description) m += `- **Why:** ${clean(f.description)}\n`;
      if (f.remediation) m += `- **Fix:** ${clean(f.remediation)}\n`;
      if (f.url) m += `- **Ref:** ${f.url}\n`;
      if (f.snippet) m += `\n\`\`\`${(f.lang || "").toLowerCase()}\n// ${file}:${f.start_line}\n${String(f.snippet).trim()}\n\`\`\`\n`;
    }
  }
  m += `\n---\n\n## Appendix — ${noise.length} low/info findings (not gate-blocking)\n\n| Sev | Score | Location | Rule | Title |\n|---|--:|---|---|---|\n`;
  for (const f of noise) m += `| ${f.severity} | ${f.severity_score} | \`${f.file}:${f.start_line}\` | \`${f.rule_id || "-"}\` | ${f.title} |\n`;
  fs.mkdirSync(path.dirname(path.resolve(REPORT)), { recursive: true });
  fs.writeFileSync(path.resolve(REPORT), m);
}

// ---------- console summary ----------
console.log(`\n✓ scan ${meta.scan_id} · ${meta.repo}/${meta.branch} · gate=${meta.gate.new_gate_status}`);
console.log(`  ${findings.length} findings: ` + ["critical", "high", "medium", "low", "info"].filter((s) => bySev[s]).map((s) => `${bySev[s]} ${s}`).join(", "));
console.log(`  ${actionable.length} actionable (medium+). By rule:`);
for (const [r, c] of Object.entries(actionable.reduce((a, f) => ((a[f.rule_id] = (a[f.rule_id] || 0) + 1), a), {})).sort((a, b) => b[1] - a[1]))
  console.log(`    ${String(c).padStart(3)}×  ${r}`);
console.log(`\n  wrote: ${path.join(OUT, "findings.json")}`);
console.log(`         ${path.join(OUT, "findings.md")}`);
if (REPORT) console.log(`         ${path.resolve(REPORT)}`);
