# Interview Transcript — 02-Context Agent

## Q1: API Layer — How should the Context Agent interact with the GitHub API?

**Question:** The existing GitHubClient already has getPR, getPRFiles, getPRDiff, and getRepoTree methods. Should the Context Agent use these directly, or do you envision a wrapper/adapter layer?

**Answer:** Use GitHubClient directly. Call existing methods and handle filtering in the agent's run() method.

## Q2: Linked Issues — How thorough should linked issue detection be?

**Question:** The spec mentions parsing PR description and GitHub linked issues. What formats should we support?

**Answer:** GitHub API closing references only. Use GitHub's timeline/events API to get officially linked issues.

## Q3: Repo Mode — When should we clone vs use the API?

**Question:** The existing GitHubClient has getRepoTree() via the API. When should we actually clone vs just use the API?

**Answer:** API-first, clone for domain rules. Use getRepoTree() for file listing; only clone if we need to read file contents (domain rules, ARCHITECTURE.md).

## Q4: Domain Rules — How should we discover domain rules files?

**Question:** Should the agent check config paths, hardcoded search paths, or both?

**Answer:** Config paths first, then fallback search. Check config.domainRulesPath and config.architecturePath first, then search common locations.

## Q5: Filtering — Should the Context Agent filter files?

**Question:** Should ignorePatterns be applied early or left for downstream agents?

**Answer:** Filter in Context Agent. Apply ignorePatterns early to reduce data volume for downstream agents.

## Q6: PR Comments — What comment data should we fetch?

**Question:** Should we fetch all comments, review comments only, or skip?

**Answer:** Review comments only. Fetch inline code review comments — these provide the most context for reviewers.

## Q7: Schema Extension — How should we handle new fields in ContextOutput?

**Question:** The existing ContextOutput type doesn't include linked issues, PR comments, or tech stack detection. How should we handle this?

**Answer:** Extend core schema. Add linkedIssues, comments, and techStack as optional fields in ContextOutputSchema.

## Q8: Tech Stack Detection — How sophisticated should this be?

**Question:** The spec mentions detecting languages, frameworks, and dependencies.

**Answer:** Parse package.json/config files. Read package.json, go.mod, requirements.txt etc. to detect languages and deps.

## Q9: Error Handling — What's the error policy for API failures?

**Question:** If fetching PR files fails on page 3 of 5, should we return partial results or fail the whole agent?

**Answer:** Fail fast. Any API failure should throw and let the pipeline's retry logic handle it.

## Q10: Performance — Any timeout constraints?

**Question:** Should the context agent have a timeout, or is it acceptable to take 30+ seconds for very large repos?

**Answer:** No hard timeout. Let it take as long as needed; GitHub API rate limits are the natural constraint. The pipeline runner already has retry/timeout logic.
