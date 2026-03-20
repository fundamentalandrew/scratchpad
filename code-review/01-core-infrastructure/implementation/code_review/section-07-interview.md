# Code Review Interview: Section 07 - Agent Orchestration Pipeline

## Interview Decisions

### maxRetries semantics (Asked user)
- **Finding:** Plan says "retry up to maxRetries times" (implying N+1 total), implementation uses maxRetries as total attempts
- **Decision:** User chose to keep current semantics (maxRetries = total attempts). Simpler mental model.
- **Action:** No change

## Auto-fixes Applied

### Unnecessary backoff after last attempt
- **Finding:** Guard `if (attempt < maxRetries)` was always true, causing a sleep after the final failed attempt before throwing
- **Fix:** Changed to `if (attempt < maxRetries - 1)` in runner.ts
- **Status:** Applied

### Stub README.md score
- **Finding:** README.md was scored 9/critical which is unrealistic for documentation
- **Fix:** Changed to score 4/low with reason "Minor documentation update"; updated criticalCount from 1 to 0
- **Status:** Applied

## Let Go (No Action)

- StageResult.error never populated on failure — PipelineError already carries all needed info
- Logger info vs verbose mismatch — info is appropriate for pipeline-level logging
- Non-idempotent code structure — works correctly, theoretical fragility not worth restructuring
- Test gap: default maxRetries — low value, implicitly covered
- Test gap: logger.info — low value for a simple log call
