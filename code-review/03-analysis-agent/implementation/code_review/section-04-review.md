# Code Review: Section 04 - AST Classifier

1. MISSING: Arrow function / lexical_declaration handling in extractFunctionHashes. Plan requires detecting arrow functions assigned to const.

2. BUG: buildRepr LITERAL_TYPES set is misleading — includes 'true', 'false', 'null' which are keyword types. Fallback condition saves it but set is incomplete.

3. MISSING: Empty file edge case handling. Plan requires empty-to-non-empty/non-empty-to-empty as structural.

4. WEAK TEST: Inconsistent rename test accepts both outcomes. Plan requires exactly 'structural'.

5. MISSING TEST: No low-confidence test case for ambiguous classifications.

6. MISSING TEST: No tests for empty files, parse errors, or ERROR node detection.

7. LOGIC ISSUE: Renamed+moved function falls through to structural due to pipeline ordering. compareNodes runs first and detects structural differences before moved-function check.

8. DUPLICATION: IDENTIFIER_TYPES defined identically in both files.
