# Code Review: Section 06 - Tech Stack Detector

1. WRONG FILE PATHS (HIGH): Plan says 02-context-agent/src/, implementation uses 01-core-infrastructure/src/context/. Same deviation as section 05, already approved by user.

2. LANGUAGE ADDED BEFORE PARSE (MEDIUM): Language is unconditionally added before parsing. A garbage package.json still reports "JavaScript". Plan allows this ("languages may still include the language").

3. MISSING `nestjs` KEY IN FRAMEWORK_MAP (MEDIUM): Only `@nestjs/core` is mapped, not the plain `nestjs` package name.

4. MISSING `pyproject.toml` PARSER (LOW-MEDIUM): Listed in MANIFEST_LANGUAGES but no parse case. Language detected but no dependencies extracted.

5. REQUIREMENTS.TXT PARSER REGEX FRAGILE (MEDIUM): Version extraction regex doesn't correctly handle double-character operators like `==`. `==2.0.0` becomes `=2.0.0`.

6. NO TESTS FOR OTHER MANIFESTS (LOW): No tests for pyproject.toml, setup.py, pom.xml, build.gradle, Gemfile language detection.

7. MEANINGLESS TEST ASSERTION (LOW): `expect(() => result).not.toThrow()` is a no-op since result is already awaited.

8. NO DEDUPLICATION TEST (LOW): No test verifying deduplication when multiple manifests yield same language.

9. MISSING FRAMEWORK TESTS (LOW): No tests for @nestjs/core, vue, angular, svelte, fastify detection.
