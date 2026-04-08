#!/usr/bin/env python3
"""
Principal-Grade AI Code Review Pipeline
========================================
Main orchestration script. Implements the 5-phase review pipeline:
  Phase 1: Pre-flight & circuit breaker
  Phase 2: Parallel map-reduce subagent analysis
  Phase 3: Deferred multi-choice question protocol
  Phase 4: Human-in-the-loop draft generation
  Phase 5: Automated GitHub publishing

Usage:
    python3 review_pr.py <PR_NUMBER>
"""

import json
import os
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Resolve tool imports relative to this script's location
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from tools.diff_fetcher import fetch_pr_metadata, PRMetadata
from tools.question_logger import Question, deduplicate_questions, present_questions
from tools.draft_generator import Finding, ReviewDraft, generate_draft
from tools.github_publisher import parse_draft, publish_comments, cleanup_draft

# --- Constants ---

MAX_DIFF_LINES = 800
MAX_CORE_FILES = 15
MAX_RETRIES = 3
DRAFT_PATH = ".claude/pr_review_draft.md"

SUBAGENTS = [
    {
        "name": "System Architect",
        "prompt_file": "prompts/system-architect.md",
    },
    {
        "name": "Performance Analyst",
        "prompt_file": "prompts/performance-analyst.md",
    },
    {
        "name": "Maintainability Lead",
        "prompt_file": "prompts/maintainability-lead.md",
    },
]


# ============================================================
# Phase 1: Pre-Flight & Circuit Breaker
# ============================================================

def phase1_preflight(pr_number: int) -> PRMetadata:
    """Fetch PR data, filter noise, apply circuit breaker."""
    print(f"\n{'='*60}")
    print(f"  PRINCIPAL-GRADE CODE REVIEW — PR #{pr_number}")
    print(f"{'='*60}\n")

    print("[Phase 1] Fetching PR metadata and diff...")
    pr = fetch_pr_metadata(pr_number)

    print(f"  Title:       {pr.title}")
    print(f"  Branch:      {pr.head_branch} -> {pr.base_branch}")
    print(f"  Total files: {len(pr.files)} ({pr.core_file_count} after filtering noise)")
    print(f"  Additions:   +{pr.additions}")
    print(f"  Deletions:   -{pr.deletions}")
    print(f"  Diff lines:  {pr.total_diff_lines} (filtered)")
    print()

    # Circuit breaker
    if pr.total_diff_lines > MAX_DIFF_LINES or pr.core_file_count > MAX_CORE_FILES:
        print(f"  WARNING: This PR contains massive changes "
              f"[{pr.total_diff_lines} lines, {pr.core_file_count} files].")
        print(f"  A principal-grade review will consume significant time and context.")
        try:
            answer = input("  Proceed? [y/N] ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            answer = "n"
        if answer != "y":
            print("\n  Review cancelled.")
            sys.exit(0)
        print()

    # Load ARCHITECTURE.md
    arch_path = Path("ARCHITECTURE.md")
    arch_rules = ""
    if arch_path.exists():
        arch_rules = arch_path.read_text()
        print("[Phase 1] Loaded ARCHITECTURE.md governance rules.")
    else:
        print("[Phase 1] No ARCHITECTURE.md found. Proceeding with general heuristics.")

    # Stash architecture rules on the PR metadata object for convenience
    pr._arch_rules = arch_rules
    print("[Phase 1] Pre-flight complete.\n")
    return pr


# ============================================================
# Phase 2: Parallel Map-Reduce & Subagent Spawning
# ============================================================

def _build_subagent_input(pr: PRMetadata) -> str:
    """Build the input payload sent to each subagent."""
    arch_section = ""
    if pr._arch_rules:
        arch_section = (
            "\n\n## ARCHITECTURE.md (ABSOLUTE GOVERNANCE — these rules override all else)\n\n"
            + pr._arch_rules
        )

    return (
        f"# Pull Request #{pr.number}: {pr.title}\n"
        f"Branch: {pr.head_branch} -> {pr.base_branch}\n"
        f"Files changed: {', '.join(pr.filtered_files)}\n"
        f"{arch_section}\n\n"
        f"## Diff\n\n```diff\n{pr.filtered_diff}\n```"
    )


def _run_subagent(agent_config: dict, input_text: str) -> dict:
    """Spawn a single subagent via the claude CLI and parse its JSON output."""
    prompt_path = SCRIPT_DIR / agent_config["prompt_file"]
    system_prompt = prompt_path.read_text()
    agent_name = agent_config["name"]

    # Write input to a temp file to avoid arg length limits
    with tempfile.NamedTemporaryFile(mode="w", suffix=".md", delete=False) as f:
        f.write(input_text)
        input_file = f.name

    try:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                result = subprocess.run(
                    [
                        "claude",
                        "--print",
                        "--output-format", "text",
                        "--system-prompt", system_prompt,
                        "--max-turns", "3",
                    ],
                    input=input_text,
                    capture_output=True,
                    text=True,
                    timeout=120,
                )

                output = result.stdout.strip()
                if not output:
                    if attempt < MAX_RETRIES:
                        continue
                    return _empty_result(agent_name, "Empty response from subagent")

                # Try to extract JSON from the output (may be wrapped in markdown)
                parsed = _extract_json(output)
                if parsed:
                    return parsed

                if attempt < MAX_RETRIES:
                    continue
                return _empty_result(agent_name, "Could not parse JSON from subagent output")

            except subprocess.TimeoutExpired:
                if attempt < MAX_RETRIES:
                    continue
                return _empty_result(agent_name, "Subagent timed out")
            except FileNotFoundError:
                return _empty_result(agent_name,
                    "claude CLI not found. Install: https://docs.anthropic.com/claude-code")

    finally:
        Path(input_file).unlink(missing_ok=True)


def _extract_json(text: str) -> dict | None:
    """Extract a JSON object from text that may contain markdown fences."""
    # Try the whole thing first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from ```json ... ``` blocks
    import re
    json_blocks = re.findall(r"```(?:json)?\s*\n(.*?)\n```", text, re.DOTALL)
    for block in json_blocks:
        try:
            return json.loads(block)
        except json.JSONDecodeError:
            continue

    # Try finding any { ... } at the top level
    brace_start = text.find("{")
    if brace_start >= 0:
        depth = 0
        for i in range(brace_start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[brace_start:i + 1])
                    except json.JSONDecodeError:
                        break
    return None


def _empty_result(agent_name: str, reason: str) -> dict:
    """Return a minimal result when a subagent fails."""
    return {
        "agent": agent_name,
        "findings": [],
        "questions": [],
        "summary": f"[Agent error: {reason}]",
    }


def phase2_parallel_analysis(pr: PRMetadata) -> list[dict]:
    """Spawn all subagents concurrently and collect results."""
    print("[Phase 2] Spawning advisory council subagents in parallel...")
    input_text = _build_subagent_input(pr)

    results = []
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(_run_subagent, agent, input_text): agent["name"]
            for agent in SUBAGENTS
        }
        for future in as_completed(futures):
            name = futures[future]
            try:
                result = future.result()
                finding_count = len(result.get("findings", []))
                question_count = len(result.get("questions", []))
                print(f"  {name}: {finding_count} findings, {question_count} questions")
                results.append(result)
            except Exception as e:
                print(f"  {name}: ERROR — {e}")
                results.append(_empty_result(name, str(e)))

    print("[Phase 2] All subagents complete.\n")
    return results


# ============================================================
# Phase 3: Deferred Multi-Choice Protocol
# ============================================================

def phase3_questions(results: list[dict]) -> list:
    """Collect, deduplicate, and present questions to the user."""
    print("[Phase 3] Processing deferred questions...")

    all_questions = []
    for r in results:
        for q in r.get("questions", []):
            all_questions.append(Question(
                agent=q.get("agent", "unknown"),
                file=q.get("file", "unknown"),
                line=q.get("line", 0),
                assumption=q.get("assumption", ""),
                question=q.get("question", ""),
                options=q.get("options", []),
            ))

    deduped = deduplicate_questions(all_questions)

    if not deduped:
        print("  No ambiguities to resolve. Proceeding.\n")
        return []

    print(f"  {len(all_questions)} questions collected, {len(deduped)} after dedup.")
    answered = present_questions(deduped)
    return answered


# ============================================================
# Phase 4: Two-Stage Human-in-the-Loop Drafting
# ============================================================

def phase4_draft(pr: PRMetadata, results: list[dict], answered_questions: list) -> str:
    """Generate the markdown review draft with hidden GH_META tags."""
    print("[Phase 4] Generating review draft...")

    # Collect all findings
    findings = []
    summaries = {}
    for r in results:
        agent = r.get("agent", "unknown")
        summaries[agent] = r.get("summary", "")
        for f in r.get("findings", []):
            findings.append(Finding(
                agent=f.get("agent", agent),
                severity=f.get("severity", "medium"),
                file=f.get("file", "unknown"),
                line=f.get("line", 0),
                title=f.get("title", "Untitled"),
                analysis=f.get("analysis", ""),
                suggestion=f.get("suggestion", ""),
            ))

    review = ReviewDraft(
        pr_number=pr.number,
        pr_title=pr.title,
        findings=findings,
        agent_summaries=summaries,
        answered_questions=answered_questions,
    )

    draft_path = generate_draft(review, DRAFT_PATH)
    finding_count = len(findings)

    print(f"  Draft written to: {draft_path}")
    print(f"  Total findings:   {finding_count}")
    print()
    print("=" * 60)
    print(f"  Draft generated at `{DRAFT_PATH}`.")
    print("  Please review the file in your IDE.")
    print("  Delete any findings you disagree with, edit text as needed.")
    print("  Return here and type 'publish' when ready to push to GitHub.")
    print("  Type 'abort' to cancel without publishing.")
    print("=" * 60)
    print()

    # Wait for user
    while True:
        try:
            command = input("  > ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            print("\n  Aborted.")
            sys.exit(0)

        if command == "publish":
            return str(draft_path)
        elif command == "abort":
            print("  Review aborted. Draft preserved at:", draft_path)
            sys.exit(0)
        else:
            print("  Type 'publish' to post to GitHub or 'abort' to cancel.")


# ============================================================
# Phase 5: Automated GitHub Publishing
# ============================================================

def phase5_publish(pr_number: int, draft_path: str):
    """Parse the edited draft and publish to GitHub."""
    print("\n[Phase 5] Publishing review to GitHub...")

    comments = parse_draft(draft_path)
    if not comments:
        print("  No findings survived editing. Nothing to publish.")
        cleanup_draft(draft_path)
        return

    print(f"  Posting {len(comments)} inline comments on PR #{pr_number}...")
    posted = publish_comments(pr_number, comments)

    print(f"  Successfully posted {posted}/{len(comments)} comments.")
    cleanup_draft(draft_path)
    print(f"  Draft cleaned up. Review complete.\n")


# ============================================================
# Main
# ============================================================

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 review_pr.py <PR_NUMBER>")
        sys.exit(1)

    try:
        pr_number = int(sys.argv[1])
    except ValueError:
        print(f"Error: '{sys.argv[1]}' is not a valid PR number.")
        sys.exit(1)

    # Phase 1
    pr = phase1_preflight(pr_number)

    # Phase 2
    results = phase2_parallel_analysis(pr)

    # Phase 3
    answered = phase3_questions(results)

    # Phase 4
    draft_path = phase4_draft(pr, results, answered)

    # Phase 5
    phase5_publish(pr_number, draft_path)


if __name__ == "__main__":
    main()
