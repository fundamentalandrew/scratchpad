# Code Review Interview: Section 03 - AST Analyzer

## Triage Summary

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | No error handling around grammar loading | Medium | Auto-fix |
| 2 | Weak lazy initialization test | Low | Let go |
| 3 | Missing no-extension test | Low | Auto-fix |
| 4 | Missing dotfile test | Low | Auto-fix |
| 5 | Parser.Tree vs Tree return type | Cosmetic | Let go |
| 6 | Missing detectLanguage null test for extensionless | Low | Auto-fix |

## Auto-fixes Applied

### Fix 1: Error handling around grammar loading
Added try/catch in `getParser()` around `new Parser()` and `setLanguage()` calls. On failure, resets the cached parser to null and throws a descriptive error message. This matches the plan's explicit requirement.

### Fix 3, 4, 6: Missing edge case tests
Added tests for:
- `isSupportedLanguage` with extensionless files (Makefile, Dockerfile)
- `isSupportedLanguage` with dotfiles (.gitignore, .eslintrc)
- `detectLanguage` returning null for extensionless files
- `detectLanguage` returning null for dotfiles

## Items Let Go

### Item 2: Weak lazy initialization test
The lazy initialization is a structural property of the code (module-level null variables). Testing it properly would require mocking the Parser constructor, adding fragile coupling to internals. The code clearly demonstrates lazy init by inspection.

### Item 5: Parser.Tree vs Tree return type
`Parser.Tree` is the canonical way to reference the Tree type from the tree-sitter package. Functionally identical.
