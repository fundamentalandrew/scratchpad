# Code Review: Section 01 - Schema Extensions

The implementation is a faithful, nearly line-for-line translation of the plan. That said, here are the issues a critical reviewer would raise:

1. **Missing negative test coverage for TechStackSchema.** The plan says all fields are required (languages, frameworks, dependencies), but there is no test that rejects an object missing one of those fields (e.g., `{ languages: ['TS'] }` without frameworks/dependencies). The ReferencedIssueSchema and ReviewCommentSchema both have rejection tests; TechStackSchema does not. This is an asymmetry that could hide bugs if someone later makes a field optional.

2. **No type-rejection tests for any schema.** None of the tests verify that wrong types are rejected (e.g., passing a string for `ReferencedIssueSchema.number`, or a number for `ReviewCommentSchema.body`). The plan's test outlines are minimal, but a responsible implementation should still guard against type coercion surprises, especially since Zod's coerce mode could be enabled upstream.

3. **ReviewCommentSchema.createdAt is `z.string()` with no format validation**. The plan explicitly says 'ISO timestamp' but the schema accepts any string. While the plan says to use `z.string()`, a `z.string().datetime()` refinement would be trivial and would catch garbage data at parse time rather than downstream. This is a design smell.

4. **ReferencedIssueSchema.state is unconstrained**. The plan notes values will be 'open' or 'closed' but says not to constrain at the schema level. This is intentional per the plan, but worth flagging.

5. **PRFileSchema.status is still `z.string()`**. Now that `previousPath` has been added specifically for renamed files, there is no schema-level enforcement that `previousPath` only appears when `status === 'renamed'`. The plan does not require this, but it is a missed opportunity.

6. **JSON Schema generation test not updated.** The diff does not add the new schemas (ReferencedIssueSchema, ReviewCommentSchema, TechStackSchema, PRFileSchema) to the array of schemas tested for JSON Schema output. The plan says: 'all schemas (including new ones, if added to the array) should produce valid JSON Schema output.'

7. **No `stubs.test.ts` verification shown in the diff.** The plan requires confirming that the existing stub test still passes after the stub changes. Presumably verified by running `npm test`.

8. **Minor: test data uses hardcoded date strings from 2024**. Not a bug, but these are stale fixtures.

Overall the implementation matches the plan's requirements. The most actionable gap is item 6 (JSON Schema generation test not updated with new schemas).
