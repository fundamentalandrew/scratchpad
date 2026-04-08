# System Build Specification: Principal-Grade AI Code Review Pipeline

## 1. Context & Objective
**To the AI Assistant (Claude Code):** Your objective is to build and configure a custom AI Code Review system within this environment that functions as a "Principal Engineer." 

This system must bypass standard AI bottlenecks (context collapse, linting distractions, endless prompt loops, and blocking the developer's flow state). To achieve this, you will design a system that utilizes Claude Code's native **Parallel Subagent Teams**, a **Local Code Graph MCP**, the **GitHub CLI (`gh`)**, and a strict **Asynchronous Map-Reduce** workflow. 

## 2. Core Operational Mandates (The "Laws")
When generating the prompts, tools, and execution logic for this system, you must strictly encode these rules:

1. **The Exclusionary Contract:** The agents must explicitly ignore syntax formatting, variable naming, and basic CVEs (which are handled by CI/CD). 100% of reasoning tokens must be reserved for macro-architecture, domain boundaries, abstraction leakage, and technical debt.
2. **Context Preservation (Fractal Summarization):** Parent agents must never load massive dependency chains into their context window. If a deep dependency tree needs checking, they must spawn temporary *Leaf Subagents* to read the files and return 1-2 sentence compressed summaries.
3. **Deferred Interruption:** Agents are **FORBIDDEN** from stopping execution to ask the developer questions dynamically. They must log their assumption, proceed with the analysis, and batch all questions for the very end.
4. **Local Governance:** The ultimate source of truth is a local `ARCHITECTURE.md` file, which overrides any generic web-scraped engineering heuristics.

## 3. Agent Topology & Roles
You must design the system to use the following persona topology:

### A. The Orchestrator (Principal Engineer)
* **Role:** Lead coordinator, conflict resolver, and user interface manager.
* **Capabilities:** Access to the `gh` CLI, file system read/write, and the ability to spawn parallel subagents.
* **Conflict Resolution:** If subagents disagree, the Orchestrator makes a judgment call based on this strict hierarchy: 1. `ARCHITECTURE.md` Rules -> 2. System Maintainability -> 3. Micro-performance.

### B. The Advisory Council (Parallel Subagents)
Spawned concurrently by the Orchestrator to analyze the PR diff:
1. **System Architect:** Evaluates technical trade-offs, scalability, domain-driven design, and tight coupling.
2. **Performance Analyst:** Hunts for resource leaks, blocking operations, and N+1 database queries.
3. **Maintainability Lead:** Assesses cognitive load, "God Classes", "Feature Envy", and testability boundaries.

## 4. Execution Pipeline (The 5-Phase Workflow)
You must write the wrapper scripts and agent instructions to enforce this exact sequential pipeline:

### Phase 1: Pre-Flight & Circuit Breaker
1. **Scope Acquisition:** The Orchestrator uses the `gh` CLI (`gh pr view --json files,additions,deletions` and `gh pr diff`) to fetch the PR scope, filtering out noise (lockfiles, minified assets).
2. **Circuit Breaker:** If the diff exceeds 800 lines or 15 core files, the Orchestrator pauses and prompts the user in the CLI: *"⚠️ This PR contains massive changes [X lines]. A principal-grade review will consume significant time and context. Proceed? [y/N]"*
3. **Load Laws:** Read the local `ARCHITECTURE.md` file into memory.

### Phase 2: Parallel Map-Reduce & Code Graph Querying
1. **Map:** The Orchestrator spawns the 3 Advisory Council subagents concurrently.
2. **Context Engine:** The agents use a Local Code Graph MCP to query the *uncommitted* local state of the repository.
3. **Loop Limits:** A hard limit of `MAX_RETRIES = 3` must be set for any tool use or codebase query to prevent infinite hallucination loops.

### Phase 3: Deferred Multi-Choice Protocol
1. **Logging:** If a subagent encounters an undocumented design choice, it uses a custom `log_assumption_and_question` tool. It states its working assumption, logs the question, and continues.
2. **Batching:** The Orchestrator synthesizes all subagent questions and deduplicates them.
3. **Prompting the User:** The CLI pauses and asks the human to resolve the ambiguities. It MUST enforce a **Multiple-Choice Format** plus a custom text option to respect the developer's time.
   * *Format Example:* 
     `Question: The PaymentController bypasses the repository pattern. Is this intentional?`
     `[1] Yes, acceptable exception for high-throughput webhook.`
     `[2] No, this is a mistake. Flag it for refactoring.`
     `[3] [Custom input]`
4. The Orchestrator ingests the human's answers and instantly updates its internal logic.

### Phase 4: Two-Stage Human-in-the-Loop Drafting
1. **Markdown Generation:** The Orchestrator writes a highly structured draft report to a local file (e.g., `.claude/pr_review_draft.md`).
2. **Hidden Metadata Mapping (CRITICAL):** The Orchestrator MUST embed hidden HTML comments directly above every specific code critique so it knows exactly where to post it later on GitHub. 
   * *Example:* ``
3. **Human Editing:** The CLI outputs: *"Draft generated at `.claude/pr_review_draft.md`. Please review the file in your IDE. Delete any points you disagree with, edit text, or ask me questions about my findings here. Type 'publish' when you are ready to push the review to GitHub."*

### Phase 5: Automated GitHub Publishing
1. **Approval:** The user types "publish" into the CLI.
2. **Parsing:** The Orchestrator reads the *human-edited* `.claude/pr_review_draft.md` file.
3. **Execution:** Using the hidden metadata tags, the Orchestrator maps the surviving critiques to the PR and executes `gh pr review --comment` (or uses the `gh api`) to post the findings as inline threaded comments on the remote GitHub Pull Request.
4. **Cleanup:** Deletes the draft markdown file and exits gracefully.

---

## 5. Implementation Tasks Required
**Action Items for Claude Code:** Based on this specification, please generate the following scaffolding and code in this repository:

1. **`ARCHITECTURE.md` Template:** Generate a boilerplate file at the root of the project to serve as the local governance law.
2. **Agent Prompts / Configurations:** Generate the specific persona prompt files for the Orchestrator, System Architect, Performance Analyst, and Maintainability Lead, explicitly encoding the "Exclusionary Contract" and instructing them on how to summarize to protect context.
3. **Custom Tools / Scripts:** Write the necessary wrapper scripts (e.g., in Python or Bash) to implement:
    * `batch_question_logger`: To handle Phase 3 batching.
    * `draft_generator`: To handle markdown creation and hidden HTML metadata injection.
    * `github_publisher`: To parse the edited markdown, extract the `GH_META` tags, and execute the `gh` CLI commands.
4. **Entrypoint Script (`review_pr.sh` or `review_pr.py`):** Create the main execution script that handles the Phase 1 circuit breaker, manages the parallel subagent execution, and handles the CLI UI terminal pausing.