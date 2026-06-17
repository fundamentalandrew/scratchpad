# Section 06 Code Review Interview

## Auto-fixes
1. Add severity assertions to full pipeline test (#1)
2. Add coreDecision assertion to empty PR test (#5)
3. Add coreDecision/summary assertions to all-ignored test (#6)

## Let Go
- #2: Real defaultConfig is acceptable
- #3: Idempotency mock sharing is fine (agent creates new objects)
- #4: Label ascending tested in unit tests
- #7: Repo mode tested in unit tests
- #8: Prompt content tested in unit tests
- #9: Cosmetic riskLevel difference
