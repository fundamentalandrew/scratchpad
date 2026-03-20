# Code Review: Section 08 - CLI Entry Point & Commands

1. **Missing GitHub token validation test**: No test for when resolveGitHubToken throws AuthError.
2. **Code duplication**: review-pr.ts and review-repo.ts are nearly identical.
3. **Environment variable pollution**: Test deletes process.env.ANTHROPIC_API_KEY without restoring.
4. **Plan calls for ClaudeClient instantiation, skipped**: Neither handler creates ClaudeClient/GitHubClient instances.
5. **Untyped pipeline input**: No interface governing pipeline input shape.
6. **Hardcoded version**: 0.1.0 hardcoded instead of read from package.json.
7. **review-repo test doesn't verify parseRepoUrl is called**: Only checks mode, not which parser.
8. **API key test fragile**: Doesn't verify error message mentions "Anthropic API key".
9. **Top-level error handler uses non-verbose logger**: Verbose mode not respected in catch block.
