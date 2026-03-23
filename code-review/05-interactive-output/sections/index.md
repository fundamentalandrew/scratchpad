<!-- PROJECT_CONFIG
runtime: typescript-npm
test_command: npm test
END_PROJECT_CONFIG -->

<!-- SECTION_MANIFEST
section-01-setup
section-02-core-github
section-03-shared-formatters
section-04-output-formatters
section-05-interactive
section-06-publishers
section-07-output-agent
END_MANIFEST -->

# Implementation Sections Index

## Dependency Graph

| Section | Depends On | Blocks | Parallelizable |
|---------|------------|--------|----------------|
| section-01-setup | - | all | Yes |
| section-02-core-github | 01 | 06 | Yes |
| section-03-shared-formatters | 01 | 04 | Yes |
| section-04-output-formatters | 03 | 07 | No |
| section-05-interactive | 01 | 07 | Yes |
| section-06-publishers | 02 | 07 | No |
| section-07-output-agent | 04, 05, 06 | - | No |

## Execution Order

1. section-01-setup (no dependencies)
2. section-02-core-github, section-03-shared-formatters, section-05-interactive (parallel after 01)
3. section-04-output-formatters (after 03), section-06-publishers (after 02)
4. section-07-output-agent (after 04, 05, 06)

## Section Summaries

### section-01-setup
Project scaffolding: package.json, tsconfig.json, vitest.config.ts, module-specific types (UserDecision, AnnotatedRecommendation, OutputDestination), and src/index.ts public exports. Covers plan §3, §4, §10.

### section-02-core-github
Add `createOrUpdatePRComment()` method to GitHubClient in 01-core-infrastructure. Implements paginated comment search, update-or-create pattern with marker-based matching. Covers plan §9.

### section-03-shared-formatters
Shared markdown helper functions: formatRecommendationBlock, formatSafeToIgnoreSection, formatSummaryHeader, sanitizeForGitHub. Covers plan §6.1.

### section-04-output-formatters
PR comment formatter (formatPRComment with marker, details blocks) and markdown file formatter (formatMarkdownFile with YAML frontmatter). Covers plan §6.2, §6.3.

### section-05-interactive
Interactive terminal flow using @inquirer/prompts: review summary header, recommendation review loop with accept/reject/annotate/back, safe-to-ignore display, final destination confirmation, prompt cancellation handling. Covers plan §5.

### section-06-publishers
GitHub publisher (publishPRComment with size limit handling) and file publisher (publishMarkdownFile with directory creation). Covers plan §7.

### section-07-output-agent
Agent factory (createOutputAgent), run orchestration logic, error handling. Wires together interactive review, formatters, and publishers. Covers plan §8.
