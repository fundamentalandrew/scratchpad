#!/usr/bin/env python3
"""SessionStart hook: captures session ID and plugin root for SSDLC Architect."""

import json
import os
import sys


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        payload = {}

    session_id = payload.get("session_id", "unknown")
    plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT", "")

    context_lines = [
        f"SSDLC_SESSION_ID={session_id}",
        f"SSDLC_PLUGIN_ROOT={plugin_root}",
    ]

    output = {
        "hookSpecificOutput": {
            "additionalContext": "\n".join(context_lines)
        }
    }

    json.dump(output, sys.stdout)


if __name__ == "__main__":
    main()
