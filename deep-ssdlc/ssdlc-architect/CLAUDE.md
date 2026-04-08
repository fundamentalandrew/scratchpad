# SSDLC Architect Plugin — Development Notes

## Structure

- `.claude-plugin/` — Plugin metadata (plugin.json, marketplace.json)
- `skills/ssdlc-plan/` — Main orchestration skill with 6-phase state machine
- `skills/ssdlc-plan/references/` — Domain-specific protocol documents loaded on-demand
- `agents/` — Subagent definitions (intent-extractor, appsec-reviewer)
- `hooks/` — SessionStart hook for context injection
- `scripts/` — Hook scripts (Python)
- `config.json` — User-tunable settings
- `examples/` — Sample Product Briefs for testing

## Key Design Decisions

- **Reference files over monolithic SKILL.md**: Domain protocols (socratic-protocol.md, stride-template.md, etc.) are extracted into reference files that the skill loads on-demand via `Read`. This keeps the main SKILL.md focused on orchestration and reduces context window consumption.
- **TodoWrite for state tracking**: The workflow uses Claude Code Tasks with dependencies to survive context compaction. Context-pinning tasks (C1-C3) store critical state like plugin_root and current_phase.
- **Disk persistence**: Every phase writes its output to `./ssdlc-working/`. This enables resume after crashes and provides an audit trail.
- **Subagent isolation**: Phase 1 (intent extraction) and Phase 5 (adversarial review) run in isolated subagents to keep the main context window clean and enable different model selection.

## Testing Locally

```bash
# Install the plugin
claude plugin add /path/to/ssdlc-architect

# Or load for dev without installing
claude --plugin-dir /path/to/ssdlc-architect

# Then in Claude Code:
/ssdlc-plan
# paste the contents of examples/sample-brief.md
```

## Adding New Agents

1. Create a new `.md` file in `agents/` with YAML frontmatter:
   ```yaml
   ---
   name: agent-name
   description: What this agent does
   tools: Read, Grep, Glob
   model: inherit
   ---
   ```
2. Reference it from SKILL.md using `Agent(subagent_type: "agent-name", ...)`

## Adding New Reference Files

1. Create a new `.md` file in `skills/ssdlc-plan/references/`
2. Add a `Read: ${SSDLC_PLUGIN_ROOT}/skills/ssdlc-plan/references/filename.md` instruction in the appropriate step of SKILL.md
