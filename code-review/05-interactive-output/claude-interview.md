# Interview Transcript: 05-Interactive-Output

## Q1: Recommendation Presentation UX

**Question:** The spec mentions presenting recommendations one-at-a-time with accept/reject. Should this be a simple confirm (yes/no per item), a checkbox list where users bulk-select which to keep, or something else? Also, should recommendations be pre-sorted (e.g., critical first)?

**Answer:** One at a time with an option per item to accept, reject, or to add a note to adjust.

## Q2: Non-Interactive Environment Handling

**Question:** When running in non-interactive environments (CI pipelines, piped output), what should happen?

**Answer:** Not needed for MVP. Only support interactive terminal for now.

## Q3: GitHub Update-or-Create Pattern

**Question:** The GitHub client currently has postPRComment() but no method to find/update existing comments. For the update-or-create pattern (using a hidden HTML marker to avoid spam on re-runs), should we extend the existing GitHubClient or implement locally?

**Answer:** Extend GitHubClient in core — add createOrUpdateComment() to the shared client.

## Q4: User Notes in Output

**Question:** For the 'add a note to adjust' action — what should that look like in the output?

**Answer:** Include notes in output — user notes appear as additional context next to the recommendation in PR comments and markdown.

## Q5: Output Destination Selection

**Question:** Should users be able to select multiple outputs (both PR comment AND markdown file), or is it strictly one choice?

**Answer:** Single choice only — user picks exactly one: PR comment OR markdown file OR cancel.

## Q6: Markdown Metadata

**Question:** What metadata should be included in the markdown file output?

**Answer:** Minimal metadata — just timestamp, PR URL, review mode. Keep it clean.

## Q7: Zero/All-Rejected Recommendations

**Question:** When the user rejects all recommendations or there are zero recommendations, what should happen?

**Answer:** Skip output silently — just print a message and exit, don't post or save anything.

## Q8: Progress and Navigation

**Question:** Should the interactive review show progress and allow going back?

**Answer:** Allow back navigation — user can go back and change previous accept/reject decisions, with progress indicator.
