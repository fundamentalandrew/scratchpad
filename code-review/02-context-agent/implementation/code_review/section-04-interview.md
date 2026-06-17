# Code Review Interview: Section 04 - Issue Parser

## Finding: Wrong directory
**Action:** Let go
**Rationale:** Intentional deviation — same convention as section-03. Single-package project, all code in `01-core-infrastructure/src/utils/`.

## Finding: Mixed references / global regex lastIndex
**Action:** Verified — test passes. The outer keyword regex correctly picks up subsequent keywords.

## Finding: RegExp objects in inner loop
**Action:** Auto-fix (applied)
**Resolution:** Pre-compiled anchored regex patterns outside the loop.

## Finding: Missing bare keyword tests
**Action:** Auto-fix (applied)
**Resolution:** Added tests for `fix #42`, `close #43`, `resolve #44`.

## Finding: Missing bare URL negative test
**Action:** Auto-fix (applied)
**Resolution:** Added test verifying bare URL without keyword returns empty.
