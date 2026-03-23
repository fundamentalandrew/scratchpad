# Code Review Interview: Section 08 - Agent Orchestration

## Triage Summary

| # | Finding | Severity | Decision |
|---|---------|----------|----------|
| 1 | ScoringContext built twice | Critical | **Auto-fixed** - build once, reuse |
| 2 | Missing files disappear from output | Critical | **Asked user** → Add fallback (score 5) |
| 3 | ignorePatterns may be undefined | Critical | **Auto-fixed** - added `?? []` |
| 4 | File triage is no-op | High | **Let go** - by design; AST works when context agent provides content |
| 5 | Binary files get empty diff | High | **Auto-fixed** - descriptive placeholder instead of empty string |
| 6-10 | Missing tests for AST merge path | Medium | **Let go** - AST path is dead code without content fields |
| 11 | Status field cast fragile | Low | **Let go** |
| 12 | Empty PR early return | Low | **Let go** |
| 13 | No pipeline progress logging | Low | **Let go** |

## Interview

**Q: Missing files silently disappear from output when LLM omits them. Add fallback?**
A: User chose option 2 - add fallback with default score of 5 for unscored files.

## Fixes Applied

1. **ScoringContext dedup**: Build `scoringContext` once, pass to both `buildSystemPrompt()` and `scoreFiles()`
2. **Fallback for unscored files**: After LLM merge, any unclassified file not in scoreMap gets score 5 with reason "LLM did not return a score for this file"
3. **ignorePatterns guard**: Added `?? []` fallback when passing to `filterChangedFiles`
4. **Binary file diff**: Changed `f.patch ?? ""` to `f.patch ?? \`[binary or empty file: ${f.path}]\``
5. **Test import fix**: Replaced `@core/*` imports with inline Zod schema definitions to match vitest alias resolution
6. **Foundation test update**: Replaced obsolete stub rejection test with real behavior test
