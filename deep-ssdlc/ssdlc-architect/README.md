# ssdlc-architect

A Claude Code plugin that transforms raw Product Briefs into two ironclad artifacts — an **SSDLC Developer Brief** and **Code Review Instructions** — through an 8-phase Socratic interrogation workflow (Phase 0-7) with an **asynchronous file-based state machine** for cross-session persistence.

Together, these artifacts create an **immutable contract between Product, Engineering, and QA/Security**. The Developer Brief tells engineers exactly what to build. The Code Review Instructions tell reviewers exactly what to enforce. Nothing slips through the cracks because every decision made during planning is automatically compiled into a binary pass/fail gate for code review.

## The Persona

The AI adopts the persona of a **Skeptical Staff Engineer & Application Security Architect** — it challenges assumptions, refuses to proceed without answers, and forces security-first thinking at every stage.

## The 8-Phase Workflow (Phase 0-7)

| Phase | Name | Audience | What Happens |
|-------|------|----------|-------------|
| 0 | **Product Validation** | Product Team | **Asynchronous.** A subagent reviews the brief for missing user flows, edge cases, and metrics. Generates `product-questions.md` for the PM to answer offline. Workflow halts until answers are filled in. |
| 1 | **Intent Extraction** | Developer | A subagent strips technical bias from the validated brief, isolating pure business intent and flagging unverified assumptions. |
| 2 | **Contextual Recon** | Developer | The AI scans the codebase for auth patterns, data layers, API styles, and security controls to ground its questions in reality. |
| 3 | **Socratic Interrogation** | Developer | The core loop. 1-2 targeted questions at a time across 5 domains (boundaries, data, security, errors, scale). Waits for answers. |
| 4 | **SSDLC Forcing Functions** | Developer | Generates STRIDE threat model, API contracts with error taxonomies, and OWASP ASVS checks. |
| 5 | **Adversarial Review** | Developer | An Opus-powered AppSec subagent attacks the draft brief for security loopholes and contract flaws. Findings triaged with developer. |
| 6 | **Developer Brief** | Developer | Generates the complete SSDLC Developer Brief. |
| 7 | **Review Instructions** | QA / Reviewers | Compiles the brief into an enforceable code review rubric with AI bot directives, architectural gates, and test matrices. |

## Asynchronous File-Based Workflow

The plugin uses the **file system as its state machine**, so the workflow can span multiple sessions — even multiple days. The user can close their terminal, wait for Product to answer questions, and resume exactly where they left off.

### File Lifecycle

```
brief.md (your input)
     │
     ▼  Run /ssdlc-plan
┌─────────────────────────────┐
│  Phase 0: Product Validation │
└──────────┬──────────────────┘
           ▼
  product-questions.md generated
  ⏸️  WORKFLOW HALTS — waiting on Product
           │
     ┌─────┴─────┐
     │  PM fills  │  (hours, days, weeks — terminal can be closed)
     │  answers   │
     └─────┬─────┘
           ▼  Run /ssdlc-plan again
┌─────────────────────────────┐
│  Phases 1-5: Planning       │
│  (Socratic + Adversarial)   │
└──────────┬──────────────────┘
           ▼
┌─────────────────────────────┐
│  Phases 6-7: Generation     │
└──────────┬──────────────────┘
           │
      ┌────┴────┐
      ▼         ▼
ssdlc-brief.md    code-review-instructions.md
      │                    │
      ▼                    ├──▶ Human PR Reviewer (checklist)
    Engineer               ├──▶ CodeRabbit / AI Bot (XML directives)
    implements             └──▶ CI/CD test gate (required tests)
```

### How It Works

Every time you run `/ssdlc-plan`, the plugin checks which files exist to determine where to resume:

| Files Present | State | Action |
|--------------|-------|--------|
| No brief | Start | Asks you for the Product Brief |
| `original-brief.md` only | Phase 0 needed | Generates `product-questions.md`, then halts |
| `product-questions.md` with empty answers | Waiting | Halts — refuses to proceed until PM answers |
| `product-questions.md` fully answered | Ready | Proceeds to Phases 1-7 |
| `ssdlc-working/` with Phase N artifacts | Mid-workflow | Offers to resume from Phase N+1 |

The `product-questions.md` file uses a standardized format:
```markdown
### Q1: What happens when a user exports a date range with zero data?

> [!ANSWER] Product Team:
```

The PM fills in their answer directly below the marker. When all `> [!ANSWER] Product Team:` lines have text after them, the workflow detects completion and proceeds.

## Dual-Output: Shifting Left on Code Review

Most code review happens reactively. This plugin generates review criteria **before a single line of code is written**.

The `code-review-instructions.md` contains:

1. **`<ai-reviewer-directives>`** — An XML block ready to paste into CodeRabbit, GitHub Copilot for PRs, or any AI review bot. Configures the bot with feature-specific context, hard-reject rules, required code patterns, and security hotspots.
2. **Architectural Non-Negotiables** — Every ADR from planning translated into binary pass/fail review gates. If the code deviates from a planning decision, the PR gets rejected.
3. **Security Verification (STRIDE)** — The threat model mapped to exact code-level checks. Reviewers verify each mitigation is implemented, not just discussed.
4. **Contract & Test Coverage Matrix** — Required tests derived from API contracts and edge cases. A PR without these tests is incomplete.

## Key Design Principles

- **Async-First:** Phase 0 generates questions and halts — no blocking the developer while waiting on Product.
- **File = State:** The file system is the persistent memory. No database, no server, no session tokens.
- **Physical Gate:** The AI is hard-constrained to ask only 1-2 questions at a time, then yield. No question dumps.
- **Anti-Happy-Path:** For every answer, the AI asks "what could go wrong here?"
- **Domain Sequencing:** Questions follow a strict order (boundaries -> data -> security -> errors -> scale).
- **Grounded Questions:** When a codebase exists, questions reference specific files and patterns found during recon.
- **Adversarial Review:** A separate AI agent actively tries to break the design before it ships.
- **Full Transcript:** Every question and answer is logged to `interrogation-log.md` — an audit trail and crash-recovery mechanism.

## Plugin Structure

```
ssdlc-architect/
├── .claude-plugin/
│   ├── plugin.json              # Plugin metadata
│   └── marketplace.json         # Local marketplace config
├── skills/
│   ├── ssdlc-plan/
│   │   ├── SKILL.md             # Main orchestration (8-phase file-based state machine)
│   │   └── references/
│   │       ├── socratic-protocol.md   # Domain sequencing & Physical Gate rules
│   │       ├── stride-template.md     # STRIDE + OWASP ASVS formats
│   │       ├── recon-protocol.md      # Codebase search patterns
│   │       ├── output-template.md     # Final brief template
│   │       └── transcript-protocol.md # Q&A logging format
│   └── ssdlc-eval/
│       └── SKILL.md             # /ssdlc-eval — quality scoring skill
├── agents/
│   ├── product-evaluator.md     # Phase 0: Async product validation questions
│   ├── intent-extractor.md      # Phase 1: Bias-free intent extraction
│   ├── appsec-reviewer.md       # Phase 5: Adversarial security review
│   ├── review-compiler.md       # Phase 7: Code review instruction generation
│   └── brief-evaluator.md       # /ssdlc-eval: Quality scoring (6 dimensions)
├── hooks/
│   └── hooks.json               # SessionStart hook
├── scripts/
│   ├── hooks/
│   │   └── capture-session-id.py
│   ├── smoke-test.sh            # Plugin structure validator
│   └── validate-brief.py        # Brief structural completeness checker
├── config.json                  # Tunable settings
├── examples/
│   └── sample-brief.md          # Test Product Brief with embedded bias
├── CLAUDE.md                    # Development notes
└── README.md
```

## Installation

### Install from CLI

```bash
claude plugin add /path/to/ssdlc-architect
```

### Load for development (without installing)

```bash
claude --plugin-dir /path/to/ssdlc-architect
```

## Usage

1. Navigate to your project directory.
2. Start Claude Code (or use `claude --plugin-dir /path/to/ssdlc-architect`).
3. Run `/ssdlc-plan` and paste your Product Brief.
4. **Phase 0:** The tool generates `product-questions.md` and halts. Share this with your PM.
5. Once the PM fills in all answers, run `/ssdlc-plan` again.
6. **Phases 1-5:** Answer the Socratic interrogation questions. Review the threat model and triage adversarial findings.
7. **Phases 6-7:** Three artifacts are written to your working directory:
   - `./ssdlc-brief.md` — the Developer Brief
   - `./code-review-instructions.md` — the Review Instructions
   - `./product-questions.md` — the answered Product validation (retained for audit)

## Outputs

### `product-questions.md` — Product Validation (Phase 0)

Structured questions for the Product team covering:
- Missing user flows and personas
- Undefined edge cases and business logic
- Analytics and metrics requirements
- Premature technical constraints to challenge

### `ssdlc-brief.md` — Developer Brief (Phase 6)

1. **Executive Summary** — Aligned business intent
2. **Architecture Decision Records** — Every choice with alternatives and trade-offs
3. **STRIDE Threat Model** — Component-level attack scenarios and mitigations
4. **Integration Map** — Exact files to modify and new components to create
5. **API Contracts** — Request/response schemas, error taxonomies, rate limits
6. **Security Controls Checklist** — Actionable implementation checklist
7. **Open Questions** — Explicitly deferred decisions with rationale

### `code-review-instructions.md` — Review Rubric (Phase 7)

1. **AI Reviewer Directives** — XML block for CodeRabbit / AI bots
2. **Architectural Non-Negotiables** — ADRs as pass/fail gates
3. **Security Verification** — STRIDE as code-level checklist
4. **Contract & Test Coverage Matrix** — Required tests with priority

### `./ssdlc-working/` — Working Artifacts

All intermediate outputs preserved for audit and resume:
- `original-brief.md`, `verified-business-intent.md`, `intent-extraction.md`
- `recon-report.md`, `interrogation-log.md` (full Q&A transcript)
- `draft-brief.md`, `adversarial-findings.md`

## Evaluation

After generating a brief, validate its quality:

```bash
# Structural validation (required sections, STRIDE coverage, placeholders)
python3 /path/to/ssdlc-architect/scripts/validate-brief.py ./ssdlc-brief.md

# Full AI-powered quality evaluation (6-dimension scoring)
/ssdlc-eval ./ssdlc-brief.md
```
