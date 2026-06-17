# **Technical Specification: Enterprise Prompt Management System**

**Version:** 1.0

## **1\. Executive Summary**

This system abstracts prompt management out of the core application codebase and into a centralized registry. Acting as an **LLM Gateway/Proxy** built into an existing LLM microservice, it natively supports our multi-agent orchestration architecture and Model Context Protocol (MCP) integrations.

It enables non-developer iteration, graceful model deprecation testing, granular audit trails, and automated prompt evaluation. The architecture leverages **Google Bigtable** for ultra-low latency caching, **MySQL** for relational persistence, and **Google Cloud Tasks** for asynchronous evaluations.

## ---

**2\. Architectural Components**

* **Prompt Admin UI:** Existing internal web portal upgraded with RBAC. Used for drafting templates, writing test cases, running evaluations, and promoting to production. It handles cache invalidation directly.  
* **LLM Gateway (The Proxy):** The execution engine. It intercepts requests from the orchestrator, fetches templates, handles variable templating, constructs multi-agent memory arrays, binds live MCP tools, executes the LLM API call, and logs telemetry.  
* **Primary Database (MySQL):** The relational source of truth storing logical prompt routes, immutable versions, test cases, and audit logs.  
* **Cache Layer (Google Bigtable):** High-speed, flat key-value cache ensuring the proxy layer adds near-zero latency to agent executions.  
* **Async Workers (Google Cloud Tasks):** Background job queue responsible for executing long-running evaluations without timing out the Admin UI.  
* **MCP Servers:** Internal endpoints hosting tool logic and live OpenAPI/JSON schemas, queried dynamically by the Gateway during execution.

## ---

**3\. Data Model (MySQL Schema)**

By decoupling the logical "Prompt Route" from its immutable "Versions", the system supports instant rollbacks and draft isolation.

### **3.1 prompts (The Routing Container)**

* id (UUID, PK)  
* slug (String, Unique) — *e.g., billing\_agent\_router. This is the exact ID the codebase calls.*  
* name (String)  
* active\_prod\_version\_id (UUID, FK \-\> prompt\_versions)  
* active\_dev\_version\_id (UUID, FK \-\> prompt\_versions, Nullable)

### **3.2 prompt\_versions (Immutable Snapshots)**

*Once saved, a version is immutable. Edits create a new draft.*

* id (UUID, PK)  
* prompt\_id (UUID, FK \-\> prompts)  
* version\_number (Integer)  
* status (Enum: DRAFT, PROD, ARCHIVED)  
* model\_name (String) — *e.g., claude-3-5-sonnet. Changing a model requires a new version.*  
* hyperparameters (JSON) — *e.g., {"temperature": 0.2, "top\_p": 0.9, "max\_tokens": 4096}*  
* system\_template (Text) — *The prompt body, written for a templating engine (Jinja2/Handlebars).*  
* few\_shot\_messages (JSON Array) — *Static mock user/assistant interactions for in-context learning.*  
* linked\_tools (JSON Array) — *Array of MCP tool IDs (e.g., \["mcp\_user\_search"\]).*  
* expected\_variables (JSON Array) — *Array of required variable keys to monitor schema drift.*  
* created\_by (UUID), created\_at (Timestamp)

### **3.3 test\_cases (Evaluation Data)**

*Strict Organizational Policy: **NO PII ALLOWED**. Dummy data only.*

* id (UUID, PK)  
* prompt\_id (UUID, FK \-\> prompts)  
* name (String)  
* mock\_variables (JSON)  
* mock\_memory (JSON Array) — *Mock conversation history.*  
* mock\_tool\_responses (JSON) — *Injected during evals to bypass live MCP calls.*  
* eval\_rules (JSON Array) — *Configurations for regex, schema match, or LLM-judge rubrics.*

### **3.4 audit\_logs**

* id (UUID, PK), prompt\_id, version\_id, user\_id  
* action (Enum: CREATED, PROMOTED, ROLLED\_BACK)  
* timestamp

## ---

**4\. Execution Workflow & Context Mechanics**

When the Orchestrator requires an LLM generation, it makes a single API call to the Proxy Gateway.

### **4.1 Dev Mode & Graceful Fallback**

Internal users toggle "Dev Mode" via the UI, appending the header X-Prompt-Env: dev to their requests.

* **Routing:** The Proxy attempts to fetch the {slug}\#dev key from Bigtable/MySQL.  
* **Graceful Fallback:** If active\_dev\_version\_id is null (meaning no active draft exists for this specific prompt), the Proxy **gracefully defaults to fetching the prod version**. This ensures Dev Mode does not break multi-agent flows when testing only a single prompt.

### **4.2 Variable Templating & Missing Variable Tolerance**

The Gateway uses a templating engine (Jinja2/Handlebars) rather than JSON.stringify to inject variables into the system\_template.

* **Fault Tolerance:** If a prompt engineer adds a new variable (e.g., {{ customer\_age }}) to a draft, but the codebase hasn't been deployed to pass it yet, **the engine will not crash**. It will tolerate the missing variable by rendering it as an empty string or null.  
* **Alerting:** Upon detecting the missing variable against the expected\_variables array, the Proxy will continue execution but **instantly fire an asynchronous alert** to the engineering monitoring system (Sentry/Datadog). This allows the team to fix the code-to-prompt contract drift.

### **4.3 The "Message Sandwich" Assembly**

To support multi-agent memory natively, the Proxy constructs the final message array in strict order, ensuring the LLM prioritizes system instructions over dynamic agent state:

1. **\[0\] System**: The fully templated system\_template.  
2. **\[1\] Few-Shot**: The static mock messages from the DB (if any).  
3. **\[2\] Memory**: The dynamic conversation history passed from the orchestrator.  
4. **\[3\] User**: The latest user/trigger message.

### **4.4 MCP Tool Binding**

To prevent storing massive JSON schemas in prompts, the Proxy reads the linked\_tools array. During execution, it makes rapid internal requests to your MCP servers to fetch the live OpenAPI/JSON schemas for those specific tools, binding them natively to the tools parameter of the LLM API request.

## ---

**5\. Caching Strategy & Invalidation**

* **Cache Structure:** Bigtable stores flattened JSON versions of the active prompt. Keys are formatted as {slug}\#{env} (e.g., billing\_agent\#prod, billing\_agent\#dev).  
* **Invalidation Flow (Push-Based):**  
  1. A Promoter clicks "Deploy to Prod" in the Admin UI.  
  2. Admin UI updates the MySQL pointer.  
  3. Admin UI connects directly to Bigtable and **deletes the specific key** (DEL billing\_agent\#prod).  
  4. The next microservice proxy request hits a Cache Miss, queries MySQL, repopulates Bigtable, and executes.  
* **Resiliency:** If Bigtable experiences an outage, the Proxy connects directly to MySQL.

## ---

**6\. Evaluation Framework (Cloud Tasks)**

Evaluations are mandatory gates before promotion.

* **Execution:** Because "LLM-as-a-judge" tests are slow, clicking "Run Tests" in the Admin UI drops a payload into **Google Cloud Tasks**. The UI returns a 202 Accepted and polls for results.  
* **Testing Types:** A background worker runs Deterministic tests (Regex/Schema validation) and LLM-as-a-Judge tests (using a larger model \+ rubric to score outputs).  
* **Mock Tool Interception:** During tests, if the LLM attempts to call an MCP tool, the Proxy intercepts the call, injects the mock\_tool\_responses from the test case, and continues the evaluation without hitting live backend actions.

## ---

**7\. Lifecycle, RBAC & Deployment Sync**

### **7.1 RBAC Roles**

* **Viewer:** Read-only access to prompts, history, and test results.  
* **Editor:** Can create Drafts, write Test Cases, and trigger Cloud Task Evals. Can test via Dev Mode.  
* **Promoter:** Possesses the authority to deploy to PROD and execute rollbacks.

### **7.2 Deployment Syncing (Code vs. Prompt)**

If a prompt requires a brand-new codebase variable:

1. Editor tests it in the Admin UI Playground.  
2. Developers write the code and test locally using Dev Mode (X-Prompt-Env: dev).  
3. The new code is pushed to Production. *(The old PROD prompt simply ignores the new variable).*  
4. The Promoter deploys the new prompt to Production. The loop is complete safely.

### **7.3 Instant Rollbacks**

1. If telemetry shows degradation, a Promoter clicks "Rollback" on an older version in the UI.  
2. The Admin System instantly updates active\_prod\_version\_id to point back to the older version's UUID.  
3. The Bigtable cache key is deleted. Rollback is instant.  
4. An audit\_log records ROLLED\_BACK.

## ---

**8\. API Contract (Microservice Proxy Interface)**

*The internal codebase orchestrator only needs to integrate with one endpoint.*

**POST /v1/prompt/execute**

**Headers:**

X-Prompt-Env: dev (Optional)

**Request Payload:**

JSON

{  
  "prompt\_slug": "billing\_agent\_router",  
  "variables": {  
    "customer\_name": "Acme Corp",  
    "invoice\_id": "INV-8890"  
  },  
  "memory": \[  
    {"role": "user", "content": "I need help with my bill."},  
    {"role": "assistant", "content": "I can help with that. What is the invoice number?"}  
  \],  
  "latest\_message": {"role": "user", "content": "It's INV-8890"}  
}

**Proxy Response:**

JSON

{  
  "content": "Let me look up invoice INV-8890 for Acme Corp.",  
  "tool\_calls": \[...\],   
  "prompt\_version\_id": "uuid-for-telemetry-tracking"  
}

*(Note: Token usage, latency, and success/failure metrics are asynchronously logged directly to your observability platform by the Proxy, tagged with prompt\_version\_id, rather than returned to the client).*