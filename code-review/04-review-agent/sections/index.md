<!-- PROJECT_CONFIG
runtime: typescript-npm
test_command: npx vitest run
END_PROJECT_CONFIG -->

<!-- SECTION_MANIFEST
section-01-schema-updates
section-02-foundation
section-03-prompt-builder
section-04-review-agent
section-05-unit-tests
section-06-integration-tests
section-07-analysis-passthrough
END_MANIFEST -->

# Implementation Sections Index

## Dependency Graph

| Section | Depends On | Blocks | Parallelizable |
|---------|------------|--------|----------------|
| section-01-schema-updates | - | all | Yes |
| section-02-foundation | 01 | 03, 04, 05, 06 | Yes |
| section-03-prompt-builder | 01, 02 | 04, 05, 06 | Yes |
| section-04-review-agent | 01, 02, 03 | 05, 06 | No |
| section-05-unit-tests | 04 | 06 | No |
| section-06-integration-tests | 05 | 07 | No |
| section-07-analysis-passthrough | 01 | - | No |

## Execution Order

1. section-01-schema-updates (no dependencies)
2. section-02-foundation (after 01)
3. section-03-prompt-builder (after 01, 02)
4. section-04-review-agent (after 01, 02, 03)
5. section-05-unit-tests (after 04)
6. section-06-integration-tests (after 05)
7. section-07-analysis-passthrough (after 01, can run any time after 01 but placed last to avoid disrupting 03-analysis-agent tests mid-flow)

## Section Summaries

### section-01-schema-updates
Extend schemas in 01-core-infrastructure: add optional fields to RecommendationSchema (humanCheckNeeded, estimatedReviewTime, score), add IgnoreGroupSchema, extend ReviewOutputSchema (safeToIgnore, summary), add contextPassthrough to AnalysisOutputSchema, update stub review agent. Include schema validation tests.

### section-02-foundation
Project scaffolding for 04-review-agent: package.json, tsconfig.json, vitest.config.ts, directory structure, types.ts with LLMReviewResponseSchema, index.ts barrel exports.

### section-03-prompt-builder
PR mode and repo mode system prompt builders, user prompt builder with truncation limits. Unit tests for prompt content, conditional sections, truncation behavior.

### section-04-review-agent
Factory function createReviewAgent, run method orchestration: file threshold splitting, deterministic safe-to-ignore grouping, prompt selection by mode, Claude API call, response mapping with deterministic severity and score injection.

### section-05-unit-tests
Unit tests for review-agent.ts: mock ClaudeClient, test orchestration flow, severity mapping, safeToIgnore grouping, mode selection, schema conformance, edge cases (empty files, missing context).

### section-06-integration-tests
Integration tests with real prompt construction and mocked ClaudeClient. Full pipeline scenarios, output schema validation, idempotency checks.

### section-07-analysis-passthrough
Update 03-analysis-agent to set contextPassthrough field on its output. Update existing analysis agent tests to verify backward compatibility.
