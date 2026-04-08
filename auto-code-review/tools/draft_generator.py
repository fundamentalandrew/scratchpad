"""
Generates the structured markdown review draft with hidden GH_META tags.
"""

from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class Finding:
    agent: str
    severity: str
    file: str
    line: int
    title: str
    analysis: str
    suggestion: str


@dataclass
class ReviewDraft:
    pr_number: int
    pr_title: str
    findings: list[Finding] = field(default_factory=list)
    agent_summaries: dict = field(default_factory=dict)
    answered_questions: list = field(default_factory=list)


SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2}
SEVERITY_EMOJI = {"critical": "!!!", "high": "!!", "medium": "!"}


def generate_draft(review: ReviewDraft, output_path: str) -> Path:
    """Generate the markdown review draft with hidden GH_META metadata tags."""
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    # Sort findings by severity
    sorted_findings = sorted(
        review.findings,
        key=lambda f: SEVERITY_ORDER.get(f.severity, 99)
    )

    lines = []
    lines.append(f"# Code Review: PR #{review.pr_number}")
    lines.append(f"## {review.pr_title}")
    lines.append("")
    lines.append("> **Instructions:** Review the findings below. Delete any you disagree with,")
    lines.append("> edit the text as needed, then return to the terminal and type `publish`.")
    lines.append("> Only surviving findings will be posted as PR comments.")
    lines.append("")

    # Agent summaries
    lines.append("---")
    lines.append("## Executive Summary")
    lines.append("")
    for agent, summary in review.agent_summaries.items():
        lines.append(f"**{agent}:** {summary}")
        lines.append("")

    # Resolved questions (for context)
    if review.answered_questions:
        lines.append("---")
        lines.append("## Resolved Ambiguities")
        lines.append("")
        for aq in review.answered_questions:
            lines.append(f"- **Q ({aq.question.agent}):** {aq.question.question}")
            lines.append(f"  - **A:** {aq.answer}")
            lines.append("")

    # Findings grouped by severity
    lines.append("---")
    lines.append("## Findings")
    lines.append("")

    current_severity = None
    for finding in sorted_findings:
        if finding.severity != current_severity:
            current_severity = finding.severity
            label = current_severity.upper()
            lines.append(f"### {SEVERITY_EMOJI.get(current_severity, '')} {label}")
            lines.append("")

        # Hidden metadata tag — this is what the publisher parses
        lines.append(f"<!-- GH_META: file={finding.file} line={finding.line} agent={finding.agent} severity={finding.severity} -->")
        lines.append(f"#### {finding.title}")
        lines.append(f"**File:** `{finding.file}:{finding.line}`  ")
        lines.append(f"**Agent:** {finding.agent}  ")
        lines.append("")
        lines.append(finding.analysis)
        lines.append("")
        if finding.suggestion:
            lines.append(f"**Suggestion:** {finding.suggestion}")
            lines.append("")
        lines.append("---")
        lines.append("")

    if not sorted_findings:
        lines.append("*No findings. The PR looks clean from an architectural perspective.*")
        lines.append("")

    content = "\n".join(lines)
    out.write_text(content)
    return out
