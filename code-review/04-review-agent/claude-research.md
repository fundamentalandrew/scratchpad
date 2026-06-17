# Research: Review Agent (Agent C)

## Part 1: Codebase Analysis

### Agent Interface

All agents implement `Agent<TInput, TOutput>` from `01-core-infrastructure/src/pipeline/types.ts`:
```typescript
interface Agent<TInput, TOutput> {
  name: string;
  idempotent: boolean;
  run(input: TInput): Promise<TOutput>;
}
```

Factory function pattern with dependency injection (e.g., `createAnalysisAgent(deps)`).

### ReviewOutput Schema (Already Defined)

From `01-core-infrastructure/src/agents/schemas.ts`:

```typescript
const RecommendationSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  severity: RiskLevelSchema,  // "critical" | "high" | "medium" | "low"
  category: z.string(),
  message: z.string(),
  suggestion: z.string().optional(),
});

const ReviewOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema),
  coreDecision: z.string(),
  focusAreas: z.array(z.string()),
});
```

**Gap vs spec:** The spec requires `safeToIgnore: IgnoreGroup[]` and `summary: string` which are NOT in the existing schema. The schema has `focusAreas` instead. We either need to extend the schema or work within existing types.

### ContextOutput (Input from Agent A)

Key fields: `mode` (pr/repo), `pr` (title, description, files, diff), `domainRules`, `architectureDoc`, `referencedIssues`, `comments`, `techStack`.

### AnalysisOutput (Input from Agent B)

Key fields: `scoredFiles` (FileScore[]), `criticalFiles` (FileScore[]), `summary` (totalFiles, criticalCount, highCount, categories).

### ClaudeClient Usage Pattern

```typescript
const response = await claude.query({
  messages: [{ role: "user", content: userPrompt }],
  schema: LLMScoringResponseSchema,
  systemPrompt,
  maxTokens: 4096,
});
```

Uses Zod schema for structured output validation. Throws `ClaudeAPIError` on validation failure.

### Prompt Building Pattern (from analysis agent)

`prompt-builder.ts` constructs system prompt with sections: role statement, rubric, domain rules (conditional), architecture context (conditional), tech stack, PR intent, output format, data safety warnings.

### Stub Review Agent (Shows Expected Shape)

From `01-core-infrastructure/src/agents/stubs.ts`:
```typescript
createStubReviewAgent(logger): Agent<AnalysisOutput, ReviewOutput>
```

Note: Stub takes `AnalysisOutput` as input, not combined context+analysis. The pipeline runner passes output of previous agent as input to next.

### Pipeline Integration

From `01-core-infrastructure/src/commands/shared.ts`:
```
ContextAgent (→ ContextOutput) → AnalysisAgent (→ AnalysisOutput) → ReviewAgent (→ ReviewOutput) → OutputAgent
```

**Critical insight:** Pipeline passes output of agent N as input to agent N+1. Review agent receives `AnalysisOutput`, NOT `ContextOutput`. To access context data, the Review Agent either needs:
1. Analysis agent to pass through context fields, OR
2. A combined input type, OR
3. Access to context data via the AnalysisOutput

### Testing Patterns

- **Unit tests:** Mock ClaudeClient with `vi.fn()`, verify schema passed, verify response shape
- **Integration tests:** Real deterministic components, mocked Claude, verify output schema conformance
- **Vitest** framework, test files in `tests/unit/` and `tests/integration/`

### Configuration

`CodeReviewConfig` has `criticalThreshold` (default 8), `model`, `maxRetries`, `ignorePatterns`. Config is `.strict()` so no extra fields.

---

## Part 2: Web Research - Structured Output Best Practices

### Claude Structured Outputs (GA)

Anthropic's structured outputs compile JSON schema into grammar constraints during inference. Key patterns:

- Use `zodOutputFormat()` from SDK for type-safe responses
- `additionalProperties: false` enforced by Zod objects by default
- Use descriptive field names (Claude interprets semantically)
- Use `.describe()` on Zod fields to guide output
- Set generous `max_tokens` to prevent truncation
- `minimum`/`maximum`/`pattern` NOT enforced at grammar level (moved to descriptions)

### Prompt Design for Code Review Synthesis

**Core Decision Identification:**
- Provide full diff + PR metadata (title, description, linked issues)
- Dedicated prompt section: "In one sentence, what is the key decision this PR is making?"
- Few-shot examples of good core-decision summaries are the most effective technique

**Actionable Recommendations:**
- Persona with domain focus (not generic "code reviewer")
- Constrained output schema with `file`, `severity`, `description`, `suggested_fix`
- Require reasoning ("explain *why* this matters in our context")
- Confidence levels to filter low-quality suggestions

**Estimated Review Times:**
- Heuristics: <300 lines ~5-10 min, 300-1500 ~15-30 min, >1500 ~30-60+ min
- Complexity multipliers: new patterns, security-sensitive, cross-cutting
- File type weighting: tests/config faster than core business logic

**Grouping Low-Risk Files:**
- Group by concern (API endpoints, test updates, config changes, type definitions)
- Assign risk levels per group with rationale
- Collapse mechanical changes into single category

**Temperature:** Use 0.2-0.3 for review synthesis. Enough variation for natural language while keeping analysis deterministic.

**System Prompt Structure:**
1. Persona (senior staff engineer)
2. Context injection (PR diff, file tree, PR description)
3. Task decomposition (identify core decision → group files → analyze → synthesize → estimate time)
4. Output format (reference Zod schema)
5. Few-shot examples (2-3 excellent review syntheses)

**Key insight:** Design to augment human reviewers, not replace them. Flag areas for attention rather than making approve/reject decisions.

Sources: Anthropic docs, CodeRabbit engineering blog, Microsoft Engineering, Salesforce Engineering, arxiv papers on LLM-assisted code review.
