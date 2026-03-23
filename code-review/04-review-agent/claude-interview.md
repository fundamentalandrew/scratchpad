# Interview Transcript: Review Agent (Agent C)

## Q1: Schema Extension

**Q:** The existing ReviewOutput schema has `recommendations`, `coreDecision`, and `focusAreas` -- but the spec also mentions `safeToIgnore: IgnoreGroup[]` and `summary: string`. Should we extend the core schema in 01-core-infrastructure, or keep the extra fields local to the review agent?

**A:** Extend the core schema. Add safeToIgnore and summary to ReviewOutputSchema in 01-core-infrastructure.

## Q2: Input Type for Review Agent

**Q:** The pipeline passes AnalysisOutput as input to ReviewAgent, but the Review Agent also needs ContextOutput (PR title, domain rules, architecture doc). The stub currently types input as just AnalysisOutput. How should we handle this?

**A:** Combined input type. Create `ReviewAgentInput = { context: ContextOutput, analysis: AnalysisOutput }` and update pipeline/stubs.

## Q3: Recommendation Fields

**Q:** For the Recommendation type, the spec wants `estimatedReviewTime` (e.g., '5 min') and `humanCheckNeeded` (specific question for the reviewer). The existing schema has `message` and `suggestion`. Should we add these new fields alongside existing ones, or replace message/suggestion?

**A:** Add new fields alongside existing. Keep message/suggestion, add humanCheckNeeded, estimatedReviewTime, score.

## Q4: Repo Mode Behavior

**Q:** For repo mode (not PR mode), how different should repo mode behavior be from PR mode?

**A:** Separate prompts per mode. Different system prompts with different rubrics for PR vs repo review.

## Q5: Error Handling

**Q:** What should happen when the Claude API call fails?

**A:** Fail fast (let pipeline handle retries). Throw error, let pipeline runner retry idempotent agent.

## Q6: Low-Risk File Detail

**Q:** Should the review agent generate a 'why you can skip these' explanation for low-score files, or just list them in safeToIgnore groups?

**A:** Just group counts. e.g., "tests/* (30 files) - Standard mock updates"
