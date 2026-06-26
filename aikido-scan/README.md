# aikido-scan — pull full findings from an Aikido feature-branch scan

Aikido's **CI token** and **public REST API** can only return the consolidated
(post-merge) issue feed and scan **summaries** (counts + gate result). The
**per-finding detail of a pre-merge feature-branch scan** — file, line, rule,
severity, description, remediation, code snippet — is exposed *only* through a
session-authenticated endpoint that the Aikido web UI calls:

```
GET /api/integrations/continuous_integration/scan/<scan_id>/getPullRequestInfo
     → info.diffs.issues_added[]
```

This tool replays that request (using a cURL you capture from your logged-in
browser) and renders three artifacts.

## Prerequisites

- Node.js 18+ (uses built-in `fetch`; no dependencies)

## Step 1 — Capture the request

The `scan_id` is the number in the scan URL, e.g.
`https://app.aikido.dev/featurebranch/scan/137350427?groupId=32624`.

1. Open that scan page while **logged in** to Aikido.
2. Open **DevTools → Network**, filter to **Fetch/XHR**, then **reload**.
3. Click the request named **`getPullRequestInfo`**.
4. Right-click → **Copy → Copy as cURL**.
5. Save it next to this script:
   ```bash
   pbpaste > aikido-scan/scan.curl      # macOS
   # (Linux: xclip -o -sel clip > aikido-scan/scan.curl)
   ```

The captured cURL contains your **session cookie** (a short-lived JWT, ~20h).
`scan.curl` is **gitignored** — never commit it.

## Step 2 — Run

```bash
# default: reads ./scan.curl, writes findings.json + findings.md here
node aikido-scan/pull-aikido-scan.mjs

# also write the grouped, agent-ready remediation report into another repo:
node aikido-scan/pull-aikido-scan.mjs --report ../argus/aikido-scan-report.md
```

Options:

| Flag | Default | Meaning |
|---|---|---|
| `--curl <file>` | `./scan.curl` | The `Copy as cURL` capture to replay |
| `--out <dir>` | this directory | Where `findings.json` / `findings.md` are written |
| `--report <path>` | _(off)_ | Also write the grouped-by-file remediation report here |

## Outputs

- **`findings.json`** — every finding, full structured detail (machine-readable).
- **`findings.md`** — all findings grouped by severity (human-readable).
- **`<--report>`** — actionable (medium+) findings grouped **by file**, with a
  root-cause summary table and a low/info appendix. Designed for another agent
  to fix the issues file-by-file.

## Severity mapping

Aikido returns a 0–99 score per finding; this tool buckets them as:

| Label | Score | Gate-blocking? |
|---|---|---|
| 🔴 critical | ≥ 90 | yes |
| 🟠 high | 70–89 | yes |
| 🟡 medium | 40–69 | yes (at `from_severity=MEDIUM`) |
| ⚪ low | 10–39 | no |
| · info | < 10 | no |

## Troubleshooting

- **`HTTP 401/403` / "session cookie expired"** — the JWT in `scan.curl` aged
  out. Re-capture it (Step 1). The script also pre-checks the JWT `exp` and
  fails fast with the expiry time.
- **"no info.diffs.issues_added"** — the URL isn't a feature-branch scan, or the
  scan has no diff findings. Confirm the `scan_id` and that you copied the
  `getPullRequestInfo` request.

## Why not the CI / REST API?

Investigated and confirmed against the live scan:

| Source | Auth | Pre-merge scan detail? |
|---|---|---|
| `…/continuous_integration/scan/repository?scan_id=` | CI token | counts + gate only |
| `/api/public/v1/issues/export`, `/open-issue-groups` | REST OAuth | empty pre-merge (feed is post-merge) |
| `…/scan/<id>/getPullRequestInfo` | **session cookie** | ✅ full `issues_added[]` |

For an automated PR report in CI (no human session), prefer Aikido's native
inline SAST review comments (dashboard PR-gating setting); the CI-token summary
is the fallback. This tool is for **on-demand triage/remediation** of a specific
scan.
