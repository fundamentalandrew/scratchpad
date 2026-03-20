# Section 04 Code Review

## Critical
1. URLParseError constructor hardcodes PR format — repo URLs show wrong example
2. parsePRUrl error messages lack format examples (relies on constructor suffix)
3. Authorization regex `.+` is greedy — over-redacts in multi-field lines
4. `sk-` pattern too broad — false positives on non-Anthropic keys
5. Missing standalone `Bearer` token pattern
6. URLParseError not re-exported from url-parser.ts

## Minor
7. No test for `success` method output
8. No test for parseRepoUrl rejecting non-github.com hostname
9. Authorization redaction test is weak (can't catch over-redaction)
