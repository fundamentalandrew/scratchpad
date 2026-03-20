# Code Review: Section 07 - Context Agent PR Mode

Several issues found, ranging from architectural mismatches with the plan to missing functionality.

1. WRONG IMPORT PATHS FOR UTILITY MODULES (High Severity)
The plan explicitly states dependencies come from local files within 02-context-agent/src/:
- filterFiles from '02-context-agent/src/file-filter.ts'
- parseClosingReferences from '02-context-agent/src/issue-parser.ts'
- loadDomainRules from '02-context-agent/src/domain-rules.ts'

The plan's mock setup examples use relative paths: vi.mock('./file-filter.js'), vi.mock('./issue-parser.js'), vi.mock('./domain-rules.js').

The implementation instead imports from @core paths:
- context-agent.ts lines 6-8: imports from '@core/utils/file-filter.js', '@core/utils/issue-parser.js', '@core/context/domain-rules.js'
- context-agent.test.ts lines 39-47: mocks '@core/utils/file-filter.js', '@core/utils/issue-parser.js', '@core/context/domain-rules.js'

These modules do not exist under 01-core-infrastructure (they were created by sections 03-05 under 02-context-agent/src/). The code will fail to resolve these imports at both compile time and test time. This is a build-breaking bug.

2. WRONG IMPORT PATHS FOR OTHER @core MODULES (Medium Severity)
The test file imports ContextOutputSchema from '@core/agents/schemas.js', GitHubAPIError from '@core/utils/errors.js', defaultConfig from '@core/config/schema.js', etc. The implementation file imports from '@core/pipeline/types.js', '@core/clients/github.js', etc. Without verifying these exact paths exist in 01-core-infrastructure, these are fragile assumptions. The tsconfig.json paths alias maps @core/* to '../01-core-infrastructure/src/*' but the vitest.config.ts alias maps @core to the directory directly. These could conflict.

3. index.ts MISSING RE-EXPORTS OF UTILITY MODULES (Medium Severity)
The plan states: 'Export createContextAgent and the ContextAgentInput type from index.ts. It should re-export from context-agent.ts and from the utility modules.' The implemented index.ts only exports from context-agent.ts. It is missing re-exports of filterFiles, parseClosingReferences, loadDomainRules, and any other utility module exports that sections 03-05 created.

4. previous_filename vs previousPath MAPPING NOT TESTED PROPERLY (Low-Medium Severity)
The plan specifies that GitHub API returns 'previous_filename' and the agent should map it to 'previousPath'. However, the test at line 201-222 mocks getPRFiles returning objects that already have 'previousPath' instead of 'previous_filename'. This means the test does not actually verify the field mapping transformation described in the plan (step 3: 'Map previous_filename to previousPath for renamed files'). The implementation at line 465 reads f.previousPath, which only works if the GitHub client already normalizes the field.

5. parseClosingReferences RETURN TYPE ASSUMPTION (Low-Medium Severity)
The fetchReferencedIssues helper assumes parseClosingReferences returns objects with optional 'owner' and 'repo' properties for cross-repo references. The plan's description at step 3 mentions 'sameRepoNumbers' and 'crossRepoRefs'. The Section 04 IssueReference type does include owner/repo fields, so this is valid.

6. MISSING techStack FIELD IN OUTPUT (Low Severity)
The assembled ContextOutput object does not include a techStack field. Section 06 implemented a Tech Stack Detector, but the plan does not explicitly require techStack in PR mode output.

7. NO LOGGING ON ERRORS (Low Severity)
The logger parameter is accepted but only used for two verbose calls. On validation failures or error propagation, no logging occurs.
