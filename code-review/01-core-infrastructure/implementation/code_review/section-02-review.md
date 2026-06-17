# Code Review: Section 02 - Shared Types & Zod Schemas

## Findings

1. **Duplicate type definitions (structural risk)** — types.ts and schemas.ts both export ContextOutput, AnalysisOutput, ReviewOutput without connection. Could diverge silently.

2. **AuthError doesn't append remediation steps** — Plan requires remediation text in message, but constructor is a pass-through.

3. **JSON Schema test uses .toJSONSchema()** — Only available in Zod v4+. No fallback. (We're on Zod 4.3.6, so this works.)

4. **ContextOutput refinement test is weak** — Only tests mode='pr' with missing fields, not mode='repo'.

5. **ReviewMode schema inlined** — Duplicates ReviewMode from common.ts as z.enum.

6. **PRSchema/RepositorySchema not exported** — Downstream can't validate partial data.

7. **GitHubAPIError is bare-bones** — No statusCode, response, or cause wrapping.

8. **No negative tests for AnalysisOutput/ReviewOutput** — Inconsistent test rigor.

9. **PipelineError cause assignment** — Should use idiomatic `super(msg, { cause })` pattern.
