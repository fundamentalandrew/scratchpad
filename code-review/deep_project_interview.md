# Deep Project Interview Transcript

## Project: AI Code Review Agent ("Macro-Reviewer")

### Summary of Decisions

**Platform & Runtime:**
- TypeScript/Node CLI tool (standalone repo, not published to npm)
- Claude (Anthropic) API as the LLM provider

**Two Operating Modes:**
1. **PR Review Mode** — Given a GitHub PR URL, analyzes the diff and produces a strategic review
2. **Full Repo Review Mode** — Given a GitHub repo URL (for new repos), performs a full audit of the entire codebase

**Architecture: Multi-Agent with Structured Message Passing**
- Agent A (Context Agent): Fetches PR description, linked issues, repo context, domain rules
- Agent B (Analysis Agent): Reads diffs/code, performs deterministic noise reduction + AST analysis, scores files
- Agent C (Principal Engineer Agent): Synthesizes Agent A + B output, writes the final review
- Agents communicate via typed JSON contracts (not shared mutable state)

**Deterministic Noise Reduction:**
- Full AST analysis using Tree-sitter
- Detect format-only changes, renames, moved functions, extracted methods, refactored patterns
- Auto-classify as low-risk before passing to LLM

**Domain Rules:**
- Scaffold + consume: Provide a CLI command to generate a starter DOMAIN_RULES.md / ARCHITECTURE.md
- During reviews, automatically read and inject these files into agent context

**Scoring:**
- Numeric 1-10 domain impact scoring per file
- Fine-grained, with configurable threshold for what constitutes "critical"

**Full Repo Review Scope:**
- Architecture + code quality + security + domain logic (full audit)

**Interactive Output UX:**
1. Tool runs analysis and produces recommendations
2. Presents recommendations interactively in the terminal — user accepts/rejects each one
3. Two output targets:
   - Post approved comments directly to the GitHub PR (PR mode)
   - Generate a markdown file with all approved comments (either mode)

**Distribution:**
- Standalone repo (clone and run)
- Not published to npm or as a GitHub Action

### Interview Q&A Detail

**Q: Target platform?**
A: CLI tool — run locally, outputs to stdout or posts via API.

**Q: Language/runtime?**
A: TypeScript/Node.

**Q: LLM provider?**
A: Claude (Anthropic) only.

**Q: Multi-agent vs single pipeline?**
A: Multi-agent as described in the brief.

**Q: Ticket/context integrations?**
A: Two modes — given a GitHub PR URL (reviews the diff), or given a GitHub repo URL (reviews the whole codebase for new repos). No external ticket system integration at launch.

**Q: AST filtering sophistication?**
A: Full AST analysis — detect format changes, renames, moved functions, extracted methods, refactored patterns using Tree-sitter.

**Q: Domain rules handling?**
A: Scaffold + consume — CLI command generates a starter file, reviews consume it automatically.

**Q: Output target?**
A: Interactive terminal confirmation of recommendations first. Then either post to PR or generate markdown file.

**Q: Full repo review focus?**
A: Full audit — architecture, code quality, security, domain logic.

**Q: Interactive UX?**
A: Terminal interactive — show recommendations, user accepts/rejects each.

**Q: Scoring system?**
A: Numeric 1-10 domain impact scoring.

**Q: Agent communication?**
A: Structured message passing — each agent produces typed JSON consumed by the next.

**Q: Distribution?**
A: Standalone repo, not npm.
