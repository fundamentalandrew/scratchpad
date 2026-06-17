"""
LLM-driven consolidation pass for findings from multiple review agents.

Spawns a `claude` subprocess with a dedicated system prompt to merge near-duplicate
findings (different agents flagging the same root issue) into single, stronger
entries with multi-agent attribution. Falls back to passthrough on any failure
so the pipeline never blocks on consolidator errors.
"""

import json
import re
import subprocess


CONSOLIDATOR_SYSTEM_PROMPT = """You are the Consolidator on a code review advisory council.

You receive a JSON object containing a `findings` array produced by several
reviewer agents (e.g. System Architect, Performance Analyst, Maintainability
Lead). Multiple agents often flag the SAME underlying issue from different
angles. Your job is to merge those duplicates into a single, stronger finding
while preserving truly distinct issues.

## What counts as a duplicate

Two findings are duplicates if they describe the same root issue, even if:
- The wording differs
- The line numbers are off by a few lines (same code region)
- They emphasise different consequences (e.g. one frames it as performance,
  another as maintainability)

Two findings are NOT duplicates if they identify different root causes that
merely happen to live in the same file or region.

## Merging rules

When merging duplicates:
- `agents`: union of all reviewer agent names that flagged the issue, in
  order of first appearance
- `severity`: the highest severity among the merged findings
  (critical > high > medium)
- `file` and `line`: the most specific values present (prefer concrete line
  numbers over `0` when available)
- `title`: choose or synthesise the clearest title
- `analysis`: write a single coherent analysis that integrates each agent's
  perspective. Do NOT just concatenate — re-write so the reader sees one
  unified argument that names the multiple consequences (architectural,
  performance, maintainability, etc.) when relevant
- `suggestion`: combine into one actionable suggestion. If agents disagree
  on the fix, surface the trade-off briefly

Findings that no other agent flagged pass through unchanged but with
`agents` as a single-element list.

## Output

Return ONLY a JSON object of this exact shape — no commentary, no markdown:

{
  "findings": [
    {
      "agents": ["<name1>", "<name2>"],
      "severity": "critical|high|medium",
      "file": "<path>",
      "line": <int>,
      "title": "<title>",
      "analysis": "<merged analysis>",
      "suggestion": "<merged suggestion>"
    }
  ]
}

Do not invent new findings. Do not drop findings unless they are exact
duplicates being merged. Preserve every distinct issue.
"""


def consolidate_findings(
    raw_findings: list[dict],
    *,
    max_turns: int = 15,
    timeout: int = 1800,
) -> list[dict]:
    """Run the LLM consolidation pass over findings from all reviewer agents.

    Each input finding may carry either `agent: str` (typical) or
    `agents: list[str]`. The output always uses `agents: list[str]`.

    On any failure (CLI missing, timeout, unparseable response) this returns
    the normalised raw findings as a passthrough — the pipeline keeps moving.
    """
    if not raw_findings:
        return []

    normalised = [_normalise(f) for f in raw_findings]

    payload = json.dumps({"findings": normalised}, indent=2)

    try:
        result = subprocess.run(
            [
                "claude",
                "--print",
                "--output-format", "text",
                "--system-prompt", CONSOLIDATOR_SYSTEM_PROMPT,
                "--max-turns", str(max_turns),
            ],
            input=payload,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        print("  [consolidator] timed out; using raw findings.")
        return normalised
    except FileNotFoundError:
        print("  [consolidator] claude CLI not found; using raw findings.")
        return normalised

    output = result.stdout.strip()
    if not output:
        print("  [consolidator] empty response; using raw findings.")
        return normalised

    parsed = _extract_json(output)
    if not parsed or not isinstance(parsed, dict) or "findings" not in parsed:
        print("  [consolidator] could not parse JSON; using raw findings.")
        return normalised

    consolidated = parsed["findings"]
    if not isinstance(consolidated, list):
        print("  [consolidator] `findings` was not a list; using raw findings.")
        return normalised

    # Final normalisation pass — guarantee `agents` is always a list of strings
    return [_normalise(f) for f in consolidated]


def _normalise(f: dict) -> dict:
    """Ensure every finding carries `agents: list[str]`."""
    agents = f.get("agents")
    if not agents:
        single = f.get("agent")
        agents = [single] if single else ["unknown"]
    elif isinstance(agents, str):
        agents = [agents]
    return {**f, "agents": list(agents)}


def _extract_json(text: str):
    """Loose JSON extractor — tolerates markdown fences and prefix chatter."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    for block in re.findall(r"```(?:json)?\s*\n(.*?)\n```", text, re.DOTALL):
        try:
            return json.loads(block)
        except json.JSONDecodeError:
            continue

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
