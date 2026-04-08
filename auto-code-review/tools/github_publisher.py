"""
Parses the human-edited review draft, extracts GH_META tags,
and publishes inline comments on the GitHub PR.
"""

import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass
class InlineComment:
    file: str
    line: int
    agent: str
    severity: str
    title: str
    body: str


GH_META_PATTERN = re.compile(
    r"<!--\s*GH_META:\s*file=(\S+)\s+line=(\d+)\s+agent=(\S+)\s+severity=(\S+)\s*-->"
)


def parse_draft(draft_path: str) -> list[InlineComment]:
    """Parse the edited markdown draft and extract surviving findings with GH_META tags."""
    content = Path(draft_path).read_text()
    lines = content.split("\n")

    comments = []
    i = 0

    while i < len(lines):
        match = GH_META_PATTERN.match(lines[i].strip())
        if match:
            file_path = match.group(1)
            line_num = int(match.group(2))
            agent = match.group(3)
            severity = match.group(4)

            # Collect the body: everything after the GH_META tag until the next
            # GH_META tag or "---" separator (whichever comes first)
            i += 1
            body_lines = []
            title = ""

            while i < len(lines):
                stripped = lines[i].strip()
                # Stop at next GH_META or section separator
                if GH_META_PATTERN.match(stripped):
                    break
                if stripped == "---":
                    i += 1
                    break

                # Extract title from #### heading
                if stripped.startswith("#### "):
                    title = stripped[5:].strip()
                # Skip the File/Agent metadata lines from the body
                elif stripped.startswith("**File:**") or stripped.startswith("**Agent:**"):
                    pass
                elif stripped:
                    body_lines.append(stripped)

                i += 1

            body = "\n".join(body_lines).strip()
            if body:
                # Format the comment for GitHub
                severity_label = severity.upper()
                formatted_body = f"**[{severity_label}] {title}** ({agent})\n\n{body}"

                comments.append(InlineComment(
                    file=file_path,
                    line=line_num,
                    agent=agent,
                    severity=severity,
                    title=title,
                    body=formatted_body,
                ))
        else:
            i += 1

    return comments


def get_pr_review_commit(pr_number: int) -> str:
    """Get the latest commit SHA of the PR head."""
    raw = subprocess.run(
        ["gh", "pr", "view", str(pr_number), "--json", "headRefOid"],
        capture_output=True, text=True, check=True, timeout=15
    )
    data = json.loads(raw.stdout)
    return data["headRefOid"]


def publish_comments(pr_number: int, comments: list[InlineComment], repo: str = "") -> int:
    """
    Publish inline comments on the PR using gh api.
    Posts a single review with all comments attached.
    Returns the number of successfully posted comments.
    """
    if not comments:
        print("No comments to publish.")
        return 0

    commit_sha = get_pr_review_commit(pr_number)

    # Build the review comments payload
    review_comments = []
    for c in comments:
        review_comments.append({
            "path": c.file,
            "line": c.line,
            "body": c.body,
        })

    # Determine the repo slug
    if not repo:
        try:
            raw = subprocess.run(
                ["gh", "repo", "view", "--json", "nameWithOwner"],
                capture_output=True, text=True, check=True, timeout=15
            )
            repo = json.loads(raw.stdout)["nameWithOwner"]
        except (subprocess.CalledProcessError, KeyError):
            print("Error: Could not determine repository. Pass --repo flag.", file=sys.stderr)
            sys.exit(1)

    # Summary body
    severity_counts = {}
    for c in comments:
        severity_counts[c.severity] = severity_counts.get(c.severity, 0) + 1
    summary_parts = [f"{count} {sev}" for sev, count in sorted(severity_counts.items())]
    summary = f"Principal-Grade AI Review: {', '.join(summary_parts)} findings"

    # Post a single pull request review with all inline comments
    payload = json.dumps({
        "commit_id": commit_sha,
        "body": summary,
        "event": "COMMENT",
        "comments": review_comments,
    })

    try:
        subprocess.run(
            ["gh", "api", "--method", "POST",
             f"/repos/{repo}/pulls/{pr_number}/reviews",
             "--input", "-"],
            input=payload, text=True, check=True, timeout=30,
        )
        return len(comments)
    except subprocess.CalledProcessError as e:
        print(f"Error posting review: {e.stderr}", file=sys.stderr)
        # Fall back to posting individual comments
        return _publish_individual_comments(pr_number, comments, commit_sha, repo)


def _publish_individual_comments(
    pr_number: int, comments: list[InlineComment],
    commit_sha: str, repo: str
) -> int:
    """Fallback: post comments one at a time if batch review fails."""
    posted = 0
    for c in comments:
        payload = json.dumps({
            "body": c.body,
            "commit_id": commit_sha,
            "path": c.file,
            "line": c.line,
        })
        try:
            subprocess.run(
                ["gh", "api", "--method", "POST",
                 f"/repos/{repo}/pulls/{pr_number}/comments",
                 "--input", "-"],
                input=payload, text=True, check=True, timeout=15,
            )
            posted += 1
        except subprocess.CalledProcessError as e:
            print(f"  Warning: Failed to post comment on {c.file}:{c.line}: {e.stderr}",
                  file=sys.stderr)
    return posted


def cleanup_draft(draft_path: str):
    """Remove the draft file after publishing."""
    p = Path(draft_path)
    if p.exists():
        p.unlink()
