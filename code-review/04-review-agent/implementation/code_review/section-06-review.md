# Section 06 Code Review

## Findings

1. **SEVERITY ASSERTIONS MISSING (High)**: No test asserts on recommendation `severity` field. Plan requires verifying 8-10=critical, 5-7=high, 4=medium.
2. **defaultConfig imported from core (Medium)**: Plan wanted a local helper, but using the real defaultConfig is acceptable since it's the actual runtime config.
3. **Idempotency test shares mock instance (Medium)**: Same mock returns same reference. Not a real problem since the agent creates new objects.
4. **safeToIgnore sort: label ascending not checked (Medium)**: Only count descending verified.
5. **Empty PR test lacks coreDecision assertion (Low-Medium)**: Plan says to verify valid coreDecision.
6. **All-ignored test lacks coreDecision/focusAreas assertion (Low)**: Should verify returned values.
7. **No repo-mode test (Low)**: All tests use PR mode.
8. **No prompt content assertion (Low)**: Mock doesn't verify prompt structure.
9. **buildAnalysisInput riskLevel thresholds differ from deriveSeverity (Low)**: Cosmetic, different concepts.
