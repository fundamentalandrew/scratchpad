---
name: ssdlc-eval
description: Evaluates a completed SSDLC Developer Brief for quality, completeness, and actionability. Runs structural validation and an AI quality review, producing a scored report.
license: MIT
compatibility: Claude Code with Agent tool support
---

# SSDLC Brief Evaluator

Evaluate a completed SSDLC Developer Brief through two complementary checks:
1. **Structural validation** — automated checks for required sections, STRIDE coverage, API contracts, placeholders
2. **Quality evaluation** — AI-driven scoring across 6 dimensions by a Staff Engineering Manager persona

## Usage

The user invokes `/ssdlc-eval` and optionally provides a path to the brief. If no path is given, default to `./ssdlc-brief.md`.

## Workflow

### Step 1: Locate the Brief

If the user provided a file path, use that. Otherwise check:
1. `./ssdlc-brief.md` (default output location)
2. `./ssdlc-working/draft-brief.md` (in-progress draft)

If neither exists, ask the user for the path.

Read the brief to confirm it's non-empty.

### Step 2: Structural Validation

Run the structural validator:

```bash
python3 ${SSDLC_PLUGIN_ROOT}/scripts/validate-brief.py [brief_path]
```

Present the results to the user. This catches missing sections, empty tables, and leftover placeholder text.

### Step 3: Quality Evaluation

Delegate to the `brief-evaluator` subagent for a deep quality review:

```
Agent(
  subagent_type: "brief-evaluator",
  description: "Evaluate SSDLC brief quality",
  model: "opus",
  prompt: "Evaluate the following SSDLC Developer Brief for quality, completeness, and actionability. Score across all 6 dimensions.\n\n<brief>\n{FULL BRIEF CONTENT}\n</brief>"
)
```

### Step 4: Combined Report

Present the combined results:

1. **Structural check** — pass/fail count and any failures
2. **Quality scores** — the 6-dimension scorecard (X/30)
3. **Grade** — Ship-ready / Needs minor revisions / Needs significant work / Back to interrogation
4. **Top 3 actions** — The highest-impact improvements the user could make

If the brief scores below 19/30, suggest running `/ssdlc-plan` to resume the interrogation and address the gaps.

### Step 5: Save Report

Write the evaluation report to:
```
Write: ./ssdlc-working/evaluation-report.md
```

Inform the user of the file location.
