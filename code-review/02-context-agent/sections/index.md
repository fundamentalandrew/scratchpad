<!-- PROJECT_CONFIG
runtime: typescript-npm
test_command: npm test
END_PROJECT_CONFIG -->

<!-- SECTION_MANIFEST
section-01-schema-extensions
section-02-github-client-extensions
section-03-file-filter
section-04-issue-parser
section-05-domain-rules-loader
section-06-tech-stack-detector
section-07-context-agent-pr-mode
section-08-context-agent-repo-mode
section-09-integration-tests
END_MANIFEST -->

# Implementation Sections Index

## Dependency Graph

| Section | Depends On | Blocks | Parallelizable |
|---------|------------|--------|----------------|
| section-01-schema-extensions | - | 02, 03, 04, 05, 06, 07, 08 | Yes |
| section-02-github-client-extensions | 01 | 05, 06, 07, 08 | No |
| section-03-file-filter | 01 | 07, 08 | Yes |
| section-04-issue-parser | 01 | 07 | Yes |
| section-05-domain-rules-loader | 02 | 07, 08 | Yes |
| section-06-tech-stack-detector | 02 | 08 | Yes |
| section-07-context-agent-pr-mode | 02, 03, 04, 05 | 09 | No |
| section-08-context-agent-repo-mode | 02, 03, 05, 06 | 09 | No |
| section-09-integration-tests | 07, 08 | - | No |

## Execution Order

1. section-01-schema-extensions (no dependencies)
2. section-02-github-client-extensions (after 01)
3. section-03-file-filter, section-04-issue-parser (parallel after 01)
4. section-05-domain-rules-loader, section-06-tech-stack-detector (parallel after 02)
5. section-07-context-agent-pr-mode (after 02, 03, 04, 05)
6. section-08-context-agent-repo-mode (after 02, 03, 05, 06)
7. section-09-integration-tests (after 07, 08)

## Section Summaries

### section-01-schema-extensions
Extend Zod schemas in 01-core-infrastructure: add ReferencedIssueSchema, ReviewCommentSchema, TechStackSchema, PRFileSchema.previousPath, and new optional fields on ContextOutputSchema. Update StubContextAgent. Tests first.

### section-02-github-client-extensions
Add getFileContent, getReviewComments, getReferencedIssues methods to GitHubClient. Extend getPR to return headSha/baseSha. Includes sensitive file deny-list in getFileContent. Tests first.

### section-03-file-filter
Implement filterFiles() using picomatch to apply ignorePatterns. Generic function supporting both PR file objects and repo file paths. Tests first.

### section-04-issue-parser
Implement parseClosingReferences() to extract issue references from PR descriptions. Supports same-repo (#N), cross-repo (owner/repo#N), URL references, and multiple issues per keyword. Skips code blocks. Tests first.

### section-05-domain-rules-loader
Implement loadDomainRules() with config-first, fallback-search strategy for DOMAIN_RULES.md and ARCHITECTURE.md. Uses getFileContent with ref parameter. Tests first.

### section-06-tech-stack-detector
Implement detectTechStack() to parse root-level manifest files (package.json, go.mod, requirements.txt, etc.) and derive languages, frameworks, and dependencies. Tests first.

### section-07-context-agent-pr-mode
Implement createContextAgent factory and PR mode run() method. Orchestrates getPR (for SHAs), then parallelizes file fetch, diff, issues, comments, and domain rules. Assembles ContextOutput. Tests first.

### section-08-context-agent-repo-mode
Implement repo mode run() method in the context agent. Fetches file tree, detects tech stack, loads domain rules. Assembles ContextOutput with repoFiles and techStack. Tests first.

### section-09-integration-tests
End-to-end tests with fully mocked GitHubClient verifying complete ContextOutput passes schema validation for both PR and repo modes. Pipeline integration test feeding output to StubAnalysisAgent.
