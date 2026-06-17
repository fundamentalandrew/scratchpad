# Section 04 Code Review Interview

## All Auto-fixed (no user decisions needed)

### #1+#2 — URLParseError constructor + error messages
Changed URLParseError constructor to pass message through directly (no hardcoded format).
Updated parsePRUrl and parseRepoUrl to include correct format examples in their messages.
Updated errors.test.ts to match new behavior.

### #3 — Authorization regex over-redaction
Changed `.+` to `\S+` to avoid redacting non-secret data on same line.

### #4 — Removed overly broad `sk-` pattern
Kept `sk-ant-` for Anthropic keys, removed generic `sk-` catch-all.

### #5 — Added standalone Bearer token pattern
Added `Bearer\s+[A-Za-z0-9._-]+` pattern.

### #6 — Re-exported URLParseError from url-parser.ts
Added `export { URLParseError } from "./errors.js"`.

### #7 — Added success method test
Added test verifying success writes to stdout.

### #8 — Added parseRepoUrl hostname rejection test
Added test for non-github.com hostname.

## Let Go
- #9: Authorization test assertion weakness — covered by #3 fix
