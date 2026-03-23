# Code Review: Section 08 - Agent Orchestration

## Critical Issues

1. **ScoringContext built twice** - Orchestrator builds system prompt for token estimation, then `scoreFiles` internally calls `buildSystemPrompt()` again via llm-scorer. Could diverge.

2. **Missing files silently disappear** - If LLM omits a file from its response, that file has no entry in scoreMap and vanishes from output.

3. **`deps.config.ignorePatterns` may be undefined** - No fallback `?? []` when passing to `filterChangedFiles`.

## High-Severity Issues

4. **File triage step is effectively a no-op** - PRFile never has beforeContent/afterContent, so AST path is dead code until context agent populates these.

5. **Binary files get empty diff** - `patch ?? ""` sends empty string to LLM. Plan says conservative default or metadata-only call.

## Medium-Severity Issues

6. **Merge test doesn't actually test merge path** - Can't test without beforeContent/afterContent.
7-10. **Missing tests** - pre-classified file keeps score, AST files preserved, mixed file types, default patterns.

## Low-Severity Issues

11. Status field cast is fragile.
12. prFiles.length === 0 early return bypasses filter.
13. No logging for pipeline progress.
