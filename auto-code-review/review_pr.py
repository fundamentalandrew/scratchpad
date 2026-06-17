#!/usr/bin/env python3
"""
Principal-Grade AI Code Review Pipeline
========================================
Main orchestration script. Implements the review pipeline:
  Phase 1: Pre-flight & circuit breaker
  Phase 2: Parallel map-reduce subagent analysis (one agent per identity in prompts/)
  Phase 3: Deferred multi-choice question protocol
  Phase 4: LLM consolidation pass (de-duplicates findings across agents)
  Phase 5: Human-in-the-loop draft generation
  Phase 6: Automated GitHub publishing

Reviewer identities live as `*.md` files in `prompts/` with optional YAML
frontmatter (name, description, max_turns, enabled). Drop in a new file to
add a new perspective — no Python edits required.

Usage:
    python3 review_pr.py <PR_NUMBER>
"""

import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Resolve tool imports relative to this script's location
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from tools.diff_fetcher import fetch_pr_metadata, PRMetadata
from tools.question_logger import Question, deduplicate_questions, present_questions
from tools.draft_generator import Finding, ReviewDraft, generate_draft
from tools.github_publisher import parse_draft, publish_comments, cleanup_draft
from tools.finding_consolidator import consolidate_findings

# --- Constants ---

MAX_DIFF_LINES = 800
MAX_CORE_FILES = 15
MAX_RETRIES = 3
MAX_INPUT_ATTEMPTS = 5
DEFAULT_MAX_TURNS = 15
PROMPTS_DIR = SCRIPT_DIR / "prompts"
DRAFT_PATH = ".claude/pr_review_draft.md"


# ============================================================
# Identity Discovery
# ============================================================

def _parse_frontmatter(text: str) -> tuple[dict, str]:
    """Parse a minimal YAML-style `---`-delimited frontmatter from a markdown file.

    Supports `key: value` lines only — no nested structures, no lists. Returns
    `({}, text)` if no frontmatter is present so plain markdown still works.
    """
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].strip() != "---":
        return {}, text

    end_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end_idx = i
            break
    if end_idx is None:
        return {}, text

    meta: dict = {}
    for raw in lines[1:end_idx]:
        line = raw.rstrip()
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or ":" not in line:
            continue
        key, _, val = line.partition(":")
        meta[key.strip()] = val.strip().strip('"').strip("'")

    body = "".join(lines[end_idx + 1:]).lstrip("\n")
    return meta, body


def discover_identities(prompts_dir: Path = PROMPTS_DIR) -> list[dict]:
    """Discover reviewer identities by globbing `prompts/*.md`.

    Each file is one identity. Optional YAML frontmatter:

        ---
        name: System Architect
        description: short one-liner shown in logs
        max_turns: 3
        enabled: true
        ---

    Without frontmatter the filename (title-cased) is used as the name.
    `enabled: false` skips the identity.
    """
    if not prompts_dir.is_dir():
        return []

    identities = []
    for path in sorted(prompts_dir.glob("*.md")):
        text = path.read_text()
        meta, body = _parse_frontmatter(text)

        if str(meta.get("enabled", "true")).strip().lower() == "false":
            continue

        name = meta.get("name") or path.stem.replace("-", " ").replace("_", " ").title()
        try:
            max_turns = int(meta.get("max_turns", DEFAULT_MAX_TURNS))
        except ValueError:
            max_turns = DEFAULT_MAX_TURNS

        identities.append({
            "name": name,
            "description": meta.get("description", ""),
            "system_prompt": body,
            "max_turns": max_turns,
            "source_file": str(path.relative_to(SCRIPT_DIR)),
        })

    return identities


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


def _run_subagent(identity: dict, input_text: str) -> dict:
    """Spawn a single subagent via the claude CLI and parse its JSON output."""
    system_prompt = identity["system_prompt"]
    agent_name = identity["name"]
    max_turns = identity.get("max_turns", DEFAULT_MAX_TURNS)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            result = subprocess.run(
                [
                    "claude",
                    "--print",
                    "--output-format", "text",
                    "--system-prompt", system_prompt,
                    "--max-turns", str(max_turns),
                ],
                input=input_text,
                capture_output=True,
                text=True,
                timeout=1800,
            )

            output = result.stdout.strip()
            if not output:
                if attempt < MAX_RETRIES:
                    continue
                return _empty_result(agent_name, "Empty response from subagent")

            # Try to extract JSON from the output (may be wrapped in markdown)
            parsed = _extract_json(output)
            if parsed:
                # Backfill the agent name in case the prompt forgot to set it
                parsed.setdefault("agent", agent_name)
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


def phase2_parallel_analysis(pr: PRMetadata, identities: list[dict]) -> list[dict]:
    """Spawn all subagents concurrently and collect results."""
    print(f"[Phase 2] Spawning {len(identities)} advisory council subagent(s) in parallel...")
    for ident in identities:
        desc = f" — {ident['description']}" if ident.get("description") else ""
        print(f"  - {ident['name']}{desc}")
    input_text = _build_subagent_input(pr)

    results = []
    with ThreadPoolExecutor(max_workers=max(1, len(identities))) as executor:
        futures = {
            executor.submit(_run_subagent, ident, input_text): ident["name"]
            for ident in identities
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
# Phase 4: LLM Consolidation Pass
# ============================================================

def phase4_consolidate(results: list[dict]) -> list[dict]:
    """Merge near-duplicate findings from multiple agents into single entries.

    Returns a list of consolidated finding dicts, each carrying `agents` as a
    list of attributing reviewer names. On consolidator failure, falls back to
    passthrough (each finding keeps its single original agent).
    """
    print("[Phase 4] Consolidating findings across agents...")

    raw: list[dict] = []
    for r in results:
        agent = r.get("agent", "unknown")
        for f in r.get("findings", []):
            # Make the originating agent explicit so the consolidator sees it
            raw.append({**f, "agent": f.get("agent", agent)})

    if not raw:
        print("  No findings to consolidate.\n")
        return []

    print(f"  {len(raw)} raw findings collected. Running LLM consolidation...")
    consolidated = consolidate_findings(raw)
    print(f"  Consolidated into {len(consolidated)} finding(s).\n")
    return consolidated


# ============================================================
# Phase 5: Two-Stage Human-in-the-Loop Drafting
# ============================================================

def phase5_draft(
    pr: PRMetadata,
    results: list[dict],
    consolidated_findings: list[dict],
    answered_questions: list,
) -> str:
    """Generate the markdown review draft with hidden GH_META tags."""
    print("[Phase 5] Generating review draft...")

    # Per-agent executive summaries still come from raw results
    summaries = {r.get("agent", "unknown"): r.get("summary", "") for r in results}

    findings = []
    for f in consolidated_findings:
        agents = f.get("agents")
        if not agents:
            single = f.get("agent")
            agents = [single] if single else ["unknown"]
        elif isinstance(agents, str):
            agents = [agents]
        findings.append(Finding(
            severity=f.get("severity", "medium"),
            file=f.get("file", "unknown"),
            line=f.get("line", 0),
            title=f.get("title", "Untitled"),
            analysis=f.get("analysis", ""),
            suggestion=f.get("suggestion", ""),
            agents=list(agents),
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

    if not sys.stdin.isatty():
        print(f"  Non-interactive stdin detected. Cannot prompt for publish/abort.")
        print(f"  Draft preserved at: {draft_path}")
        print(f"  Review it, then re-run this script from a real terminal to publish,")
        print(f"  or post manually with the GitHub CLI.")
        sys.exit(2)

    # Wait for user
    for _ in range(MAX_INPUT_ATTEMPTS):
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

    print(f"\n  No valid command after {MAX_INPUT_ATTEMPTS} attempts. "
          f"Draft preserved at: {draft_path}")
    sys.exit(2)


# ============================================================
# Phase 6: Automated GitHub Publishing
# ============================================================

def phase6_publish(pr_number: int, draft_path: str):
    """Parse the edited draft and publish to GitHub."""
    print("\n[Phase 6] Publishing review to GitHub...")

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

    # Identity discovery — the list of reviewer perspectives is data, not code.
    identities = discover_identities()
    if not identities:
        print(f"Error: No reviewer identities found in {PROMPTS_DIR}.")
        print("Drop one or more `*.md` prompt files (with optional YAML frontmatter) into that directory.")
        sys.exit(1)

    # Phase 1
    pr = phase1_preflight(pr_number)

    # Phase 2
    results = phase2_parallel_analysis(pr, identities)

    # Phase 3
    answered = phase3_questions(results)

    # Phase 4
    consolidated = phase4_consolidate(results)

    # Phase 5
    draft_path = phase5_draft(pr, results, consolidated, answered)

    # Phase 6
    phase6_publish(pr_number, draft_path)


if __name__ == "__main__":
    main()
