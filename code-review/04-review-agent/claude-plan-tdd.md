# TDD Plan: Review Agent (Agent C)

Testing framework: **vitest** (matching 03-analysis-agent conventions).
Test locations: `tests/unit/` and `tests/integration/`.
Mock patterns: `vi.fn()` for ClaudeClient, type assertions with `as any`.

---

## 3. Schema Changes in 01-core-infrastructure

### Tests: schema-updates.test.ts (in 01-core-infrastructure)

```
# Test: Extended RecommendationSchema accepts optional humanCheckNeeded, estimatedReviewTime, score
# Test: Extended RecommendationSchema still validates without new optional fields (backward compat)
# Test: estimatedReviewTime only accepts enum values "5", "15", "30", "60"
# Test: IgnoreGroupSchema validates label, count, description
# Test: Extended ReviewOutputSchema accepts safeToIgnore and summary fields
# Test: AnalysisOutputSchema accepts optional contextPassthrough field
# Test: AnalysisOutputSchema validates without contextPassthrough (backward compat)
# Test: Updated stub review agent output conforms to extended ReviewOutputSchema
```

## 5. Prompt Builder

### Tests: prompt-builder.test.ts

```
# Test: buildPRSystemPrompt includes principal engineer role statement
# Test: buildPRSystemPrompt includes scoring rubric context
# Test: buildPRSystemPrompt includes data safety warning
# Test: buildPRSystemPrompt includes domain rules when provided
# Test: buildPRSystemPrompt omits domain rules section when null
# Test: buildPRSystemPrompt includes architecture doc when provided
# Test: buildPRSystemPrompt includes tech stack when provided
# Test: buildRepoSystemPrompt includes architecture assessment role
# Test: buildRepoSystemPrompt has different focus than PR mode
# Test: buildUserPrompt includes file paths and scores for files scoring 4+
# Test: buildUserPrompt excludes files scoring below 4
# Test: buildUserPrompt includes PR title and description
# Test: buildUserPrompt truncates description to 2000 chars
# Test: buildUserPrompt limits to top 50 files by score
# Test: buildUserPrompt includes category distribution
# Test: buildUserPrompt limits reasons to first 2 per file
```

## 4. Review Agent Implementation

### Tests: review-agent.test.ts (unit)

```
# Test: agent.name is "review" and agent.idempotent is true
# Test: empty scoredFiles returns empty recommendations and safeToIgnore
# Test: all files below threshold (score < 4) produces only safeToIgnore, no recommendations
# Test: files scoring 4+ appear in recommendations with correct scores from analysis data
# Test: severity derived deterministically from score (8-10 critical, 5-7 high, 4 medium)
# Test: LLM response fields (message, humanCheckNeeded, estimatedReviewTime, category) mapped correctly
# Test: safeToIgnore groups computed from low-score files, not from LLM
# Test: safeToIgnore grouped by category then by top-level directory
# Test: safeToIgnore sorted by count descending, label ascending
# Test: PR mode uses buildPRSystemPrompt
# Test: repo mode uses buildRepoSystemPrompt
# Test: missing contextPassthrough returns minimal output with warning log
# Test: coreDecision from LLM passed through to output
# Test: focusAreas from LLM passed through to output
# Test: summary from LLM passed through to output
# Test: output conforms to ReviewOutputSchema.parse()
# Test: Claude client called with LLMReviewResponseSchema
```

### Tests: review-agent.test.ts (integration)

```
# Test: full pipeline with mixed scores produces valid ReviewOutput
# Test: high-score files (4+) appear as recommendations with humanCheckNeeded
# Test: low-score files appear in safeToIgnore with correct counts
# Test: coreDecision is a non-empty string
# Test: focusAreas is non-empty array
# Test: output conforms to ReviewOutputSchema (Zod parse)
# Test: idempotency - same input produces same output structure
# Test: empty PR (no files) returns empty output
# Test: all-ignored files (score 0) appear only in safeToIgnore
```

## 8. Analysis Agent Update

### Tests: contextPassthrough in analysis-agent

```
# Test: analysis agent output includes contextPassthrough with the input ContextOutput
# Test: existing analysis agent tests still pass (backward compat)
```
