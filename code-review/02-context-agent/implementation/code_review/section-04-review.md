# Code Review: Section 04 - Issue Parser

**CRITICAL: Files placed in the wrong directory.** Plan says `02-context-agent/src/` but files are in `01-core-infrastructure/src/utils/`. This follows the same convention as section-03 (single-package project).

**HIGH: Mixed references test may fail due to global regex lastIndex.** The comma-scanning loop breaks on non-reference text, but the outer keyword regex should still catch `resolves` on the next iteration. Needs verification.

**MEDIUM: Regex creates new RegExp objects on every inner loop iteration.** Lines creating `new RegExp(...)` inside the while loop should be compiled once.

**MEDIUM: Keyword regex edge cases.** Pattern requires a character after keyword matching `[:(\s]` — works for normal cases.

**LOW: No test for bare keyword forms.** `fix #42`, `close #42`, `resolve #42` not tested.

**LOW: Missing negative test for bare URL without keyword.**
