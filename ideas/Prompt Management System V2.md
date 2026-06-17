# **Technical Specification: Enterprise AI Orchestration & Prompt Engine**

**Version:** 2.0

## **1. Executive Summary**

This system evolves our LLM microservice (`microlang`) from a simple pass-through gateway into a **Centralized AI Orchestration Engine**. It abstracts prompt management, multi-agent routing, native LLM execution, and evaluation out of the core application codebases.

Acting as the single source of truth and execution, the Engine natively runs multi-provider LLM calls (via official SDKs, bypassing restrictive wrappers like LangChain), executes multi-turn tool-calling loops via Model Context Protocol (MCP) clients, and evaluates outputs via Google Cloud Tasks. Consumer applications (like our internal chatbot) are reduced to lightweight UIs that expose their internal stateful tools as MCP Servers.

## ---

**2. Architectural Components**

* **Prompt & Workflow Admin UI:** Internal web portal with RBAC. Used for drafting prompt templates, defining multi-agent routing workflows (DAGs), writing test cases, running evaluations, and promoting to production.
* **LLM Orchestration Engine (`microlang`):** The execution core. It natively integrates with OpenAI, Anthropic, and Google GenAI SDKs. It intercepts UI requests, fetches workflow graphs, executes routing, runs multi-turn tool-calling loops, and synthesizes final responses.
* **MCP Client (Internal to Engine):** Binds live OpenAPI/JSON schemas from consumer apps. During a generation loop, it forwards LLM tool calls to the consumer's MCP Server.
* **Primary Database (MySQL):** The relational source of truth storing workflow definitions, prompt versions, test cases, and audit logs.
* **Cache Layer (Google Bigtable):** High-speed, flat key-value cache ensuring the engine adds near-zero database latency to agent executions.
* **Async Workers (Google Cloud Tasks):** Background job queue responsible for executing long-running "LLM-as-a-judge" evaluations.
* **Consumer MCP Servers:** External application backends (e.g., `prototype-chatbot-test`) that expose their internal tools (e.g., CSV Data Analyst, Media Plan Query) to the Engine via MCP.

## ---

**3. Data Model (MySQL Schema)**

The system models both individual Prompts and Agentic Workflows (graphs of prompts).

### **3.1 workflows (The Routing Container)**

* `id` (UUID, PK)  
* `slug` (String, Unique) — *e.g., billing_agent_workflow. The exact ID the codebase calls.*  
* `name` (String)  
* `active_prod_version_id` (UUID, FK -> workflow_versions)  
* `active_dev_version_id` (UUID, FK -> workflow_versions, Nullable)

### **3.2 workflow_versions (Immutable Graphs)**

* `id` (UUID, PK)  
* `workflow_id` (UUID, FK -> workflows)  
* `version_number` (Integer)  
* `status` (Enum: DRAFT, PROD, ARCHIVED)
* `graph_definition` (JSON) — *Defines the execution DAG. e.g., Node 1 (Router Prompt) -> Node 2 (Parallel Specialist Prompts) -> Node 3 (Synthesis Prompt).*
* `created_by` (UUID), `created_at` (Timestamp)

### **3.3 prompts & prompt_versions**

* `id` (UUID, PK)
* `version_number` (Integer)
* `model_name` (String) — *e.g., claude-3-5-sonnet, gpt-4o.*  
* `hyperparameters` (JSON)
* `system_template` (Text) — *The prompt body (Jinja2/Handlebars).*  
* `few_shot_messages` (JSON Array)
* `linked_mcp_servers` (JSON Array) — *Array of consumer MCP servers this prompt is allowed to query tools from.*
* `expected_variables` (JSON Array)

### **3.4 test_cases (Evaluation Data)**

* Strict Organizational Policy: **NO PII ALLOWED**. Dummy data only.
* `id` (UUID, PK)  
* `workflow_id` (UUID, FK -> workflows)  
* `mock_variables` (JSON)  
* `mock_tool_responses` (JSON) — *Injected during evals to bypass live consumer MCP servers.*  
* `eval_rules` (JSON Array) — *Configurations for regex, schema match, or LLM-judge rubrics.*

## ---

**4. Execution Workflow & Context Mechanics**

When a consumer application requires an AI generation, it makes a single API call to the Engine, passing any required context variables and its `session_id`.

### **4.1 The Agentic Execution Loop**

1. **Graph Resolution:** The Engine fetches the requested `workflow` graph from Bigtable.
2. **Templating:** Variables are injected into the starting node's `system_template`. Missing variables trigger async Datadog alerts but render as empty strings for fault tolerance.
3. **MCP Tool Binding:** The Engine acts as an MCP Client, fetching live tool schemas from the `linked_mcp_servers` and binding them natively to the LLM SDK request.
4. **Native Tool Loop:** The Engine invokes the native LLM SDK (e.g., OpenAI). If the LLM returns a `tool_call`:
   * The Engine forwards the tool call over HTTP to the consumer's MCP Server. It passes the `session_id` so the consumer can access its local state (e.g., the user's uploaded CSV).
   * The consumer returns the tool result.
   * The Engine passes the result back to the LLM and continues the loop until completion.
5. **Graph Traversal:** If the workflow dictates (e.g., the Router selected two sub-agents), the Engine executes the subsequent nodes in parallel, and finally executes the Synthesis node.

### **4.2 Dev Mode & Graceful Fallback**

Internal users toggle "Dev Mode" via the UI, appending `X-Prompt-Env: dev`. The Engine attempts to fetch the `{slug}#dev` key. If no active draft exists, it gracefully defaults to the PROD version, ensuring multi-agent flows do not break when testing a single node.

## ---

**5. Caching Strategy & Invalidation**

* **Cache Structure:** Bigtable stores flattened JSON versions of active workflows and prompts. Keys are formatted as `{slug}#{env}`.  
* **Invalidation Flow (Push-Based):**  
  1. A Promoter clicks "Deploy to Prod" in the Admin UI.  
  2. Admin UI updates the MySQL pointer and directly deletes the specific Bigtable key.  
  3. The next request hits a Cache Miss, repopulates Bigtable, and executes.  

## ---

**6. Evaluation Framework (Cloud Tasks)**

Evaluations are mandatory gates before promotion. Because `microlang` now owns the native LLM SDKs and the prompt definitions, it handles evaluations internally.

* **Execution:** Clicking "Run Tests" in the Admin UI drops a payload into **Google Cloud Tasks**. A worker process within the Engine cluster picks it up.
* **Testing Types:** Deterministic tests (Regex/Schema validation) and LLM-as-a-Judge tests.  
* **Mock Interception:** During tests, the Engine's MCP Client intercepts tool calls, injecting `mock_tool_responses` from the test case instead of hitting live consumer MCP servers.

## ---

**7. API Contract (The Orchestration Interface)**

*The consumer codebase orchestrator only needs to integrate with one endpoint.*

**POST /v1/workflow/execute**

**Headers:**
`X-Prompt-Env: dev` (Optional)

**Request Payload:**
```json
{  
  "workflow_slug": "main_chatbot_orchestrator",  
  "session_id": "thread_abc123",  
  "variables": {  
    "customer_name": "Acme Corp",
    "active_csv_filename": "q3_data.csv"
  },  
  "memory": [  
    {"role": "user", "content": "Can you analyze the data?"},  
    {"role": "assistant", "content": "Certainly, I'll look at the CSV."}  
  ],  
  "latest_message": {"role": "user", "content": "What is the total revenue?"}  
}
```

**Engine Response:**
```json
{  
  "content": "Based on the CSV data, the total revenue for Q3 is $4.2M.",  
  "usage": {
    "total_input_tokens": 4500,
    "total_output_tokens": 200,
    "cost_usd": 0.014
  },
  "workflow_version_id": "uuid-for-telemetry-tracking"  
}
```

*(Note: The Engine handles all intermediate tool calls internally. The consumer only receives the final synthesized string, while complete telemetry and token usage are asynchronously logged to the observability platform by the Engine).*
