To build a product that transforms a raw Product Brief into an ironclad **SSDLC (Secure Software Development Life Cycle) Developer Brief**—while maintaining the surgical, incisive questioning of deep-plan ([https://github.com/piercelamb/deep-plan/blob/main/README.md](https://github.com/piercelamb/deep-plan/blob/main/README.md)) —you need to shift the AI’s core persona.

It can no longer act as an "Eager Junior Coder" trying to please the user. It must become a **"Skeptical Staff Engineer & Application Security Architect."**

The secret to deep-plan is that LLMs don't ask brilliant questions simply because you prompt them to "ask good questions." **They ask brilliant questions when you trap them in a state-machine workflow where they mathematically *cannot* proceed without resolving missing information.**

Here is the blueprint for how to architect this product, breaking it down by workflow phases, behavioral forcing functions, and UX design.

### ---

**Phase 1: Ingestion & "Intent Extraction" (Combating Product Bias)**

Product teams frequently prescribe technical solutions disguised as requirements (e.g., *"Let's add a new MongoDB table for this"* or *"Just make it a simple REST endpoint"*). If the AI accepts these, it stops questioning.

* **The Action:** Ingest the Markdown brief, Jira tickets, and Figma prototypes (via a Vision model).  
* **The "Pushback" Prompt:** Run a background LLM call with a strict directive: *"Extract ONLY the pure business value and user journey. Explicitly isolate any technical, database, or architectural suggestions made by Product. Flag these as 'Unverified Assumptions' that must be aggressively challenged by Engineering."*  
* **Why this works:** By separating the "What" from the "How," the AI is forced to look at the raw problem, preventing it from blindly adopting Product's technical bias.

### **Phase 2: Contextual Reconnaissance (The Codebase RAG)**

Before the AI asks the developer a single question, it must understand the delta between what Product wants and what the existing architecture can actually support.

* **The Action:** The system connects to the target Git repository using an AST (Abstract Syntax Tree) parser and Vector search (using tools like Greptile, Bloop, or Aider's repomap).  
* **The Goal:** It specifically maps **patterns**: *How is authentication currently handled? What database ORM is used? Where are the API gateways?*  
* **The Result:** The AI grounds its questions in reality. Instead of asking, *"How should we authenticate?"*, it asks: *"Product wants a magic-link login for this feature. I scanned /src/middleware/auth.ts and we currently enforce strict JWT OAuth via Auth0. Do you want to implement this as a custom flow, or push back on Product to use our existing standard?"*

### **Phase 3: The Socratic Interrogation Engine (The Core Loop)**

This is where the user experiences the Socratic magic. You cannot dump 20 questions on the developer at once. You must use an orchestration framework (like **LangGraph** or **CrewAI**) to drive an incremental, looping chat interface.

* **Domain Sequencing:** Force the AI to move through topics sequentially: System Boundaries first, Data/State second, Security third. It cannot ask about the UI while figuring out the database.  
* **Anti-Happy-Path:** Instruct the AI to actively hunt for edge cases. If Product wants an "infinite scroll activity feed," the AI must ask about pagination cursors, database indexing, and cache invalidation.  
* **The Incrementality Rule:** The AI is strictly limited to asking 1 to 2 targeted questions at a time. It must wait for the developer's answer, update its internal state, and generate the next question based on the new context.

### **Phase 4: The Output "Forcing Functions" (SSDLC & Contracts)**

In deep-plan, Test-Driven Development (TDD) was the psychological trick that forced the LLM to think about edge cases. For a Staff-level architecture brief, your forcing functions are **Threat Models** and **API Contracts**.

**1\. The Security Forcing Function (STRIDE & OWASP ASVS)**

* Instruct the AI that its final output *must* include a STRIDE threat model (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) and OWASP ASVS check.  
* *The resulting question:* "The prototype shows users exporting CSV reports. Since I must write an Information Disclosure threat model, how are we enforcing tenant isolation on these files? Will these be stored in S3 with expiring, pre-signed URLs, or behind an auth guard?"

**2\. The API Contract Forcing Function**

* Instruct the AI that it *must* draft High-Level Contract Tests (e.g., OpenAPI schemas or Pact tests) defining exact JSON payloads and HTTP status codes.  
* *The resulting question:* "If the 3rd-party billing API times out during the checkout flow Product described, what exact HTTP status code and error payload should our new endpoint return? Do we fail fast (503) or queue for retry (202)?"

### **Phase 5: Adversarial Peer Review (AI vs. AI)**

Before finalizing the document, implement deep-plan's best architectural trick: the adversarial review.

* **The Action:** The primary AI (e.g., Claude 3.7 Sonnet) drafts the proposed SSDLC Dev Brief. Behind the scenes, it passes this draft to an isolated **Reviewer Model** (e.g., an OpenAI o3-mini reasoning model to capture a different model's "blind spots").  
* **The Reviewer's Prompt:** *"You are an aggressive Principal AppSec Engineer. Read this proposed Dev Brief. Find security loopholes, race conditions, scaling bottlenecks, and misaligned contracts. Output a list of fatal flaws."*  
* **Final Triage:** The primary AI brings these critiques back to the developer for a final round of triage: *"I drafted the brief, but upon review, there is a potential race condition in the async job queue we discussed if a user double-clicks submit. How do you want to handle deduplication/idempotency?"*

### **Phase 6: Generating the Final Artifact**

Because the developer has survived this rigorous gauntlet, the final output practically writes itself and is mathematically sound. The generated markdown brief should output:

1. **Executive Summary:** Aligned business intent.  
2. **Architecture Decision Records (ADRs):** A log of the choices made during the chat (e.g., *"Why we chose WebSockets over Polling, overriding Product's suggestion"*).  
3. **Threat Model (SSDLC):** Identified attack vectors and the exact code-level mitigation strategies required.  
4. **Integration Map:** Exactly which existing files in the repo will be modified and what new services will be created.  
5. **API Contracts & High-Level Tests:** The agreed-upon JSON schemas, error codes, and Consumer-Driven Contract scenarios.

