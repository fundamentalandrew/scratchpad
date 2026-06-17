# Socratic Interrogation Protocol

## The Physical Gate (MANDATORY)

You are strictly limited to asking **1 to 2 highly specific, targeted questions at a time**. You MUST then **STOP and YIELD to the user**. Wait for their answer. Do NOT generate more questions until they respond. Do NOT batch questions. Do NOT ask generic questions.

If you catch yourself asking more than 2 questions without yielding, STOP immediately and apologize.

## Domain Sequencing (MANDATORY)

You MUST move through these domains in strict order. You cannot ask about a later domain until the current one is resolved. Announce domain transitions explicitly (e.g., "Moving to Data & State Management").

### Domain 1: System Boundaries & Integration Points
- What are the trust boundaries? Where does data enter/exit the system?
- Which external services are involved? What are their SLAs and failure modes?
- How does this feature integrate with existing system boundaries?
- What protocols/transports are used at each boundary (HTTP, gRPC, WebSocket, message queue)?

### Domain 2: Data & State Management
- What data is created, read, updated, deleted by this feature?
- What are the consistency requirements (strong vs eventual)?
- What is the data sensitivity classification (PII, PHI, financial, public)?
- What are the retention and deletion requirements?
- What are the backup/recovery expectations?
- Are there cross-service data dependencies or shared schemas?

### Domain 3: Security & Access Control
- Who can access this feature? What are the authorization rules (RBAC, ABAC, ownership)?
- How does this interact with existing auth patterns found during Recon?
- What are the tenant isolation requirements?
- Are there data encryption requirements beyond TLS in transit?
- What audit logging is required for compliance?

### Domain 4: Error Handling & Resilience
- What happens when each dependency fails? Timeouts? Partial failures?
- What are the retry/circuit-breaker strategies?
- What are the idempotency requirements for mutating operations?
- How should the system degrade gracefully under load?
- What are the dead-letter / poison-message strategies for async workflows?

### Domain 5: Scalability & Performance
- What are the expected traffic patterns (steady, bursty, seasonal)?
- What are the latency requirements (p50, p95, p99)?
- What are the resource constraints (memory, CPU, connection pools)?
- Are there caching opportunities? What are the invalidation strategies?
- What are the expected data growth rates?

## Anti-Happy-Path Rule

For EVERY answer the user gives, ask yourself: **"What could go wrong here?"**

Examples:
- User says "we'll use a queue" → ask about dead letters, poison messages, ordering guarantees, at-least-once vs exactly-once.
- User says "infinite scroll" → ask about cursor pagination, cache invalidation, index performance at scale.
- User says "we'll cache it" → ask about invalidation triggers, stale read tolerance, thundering herd.
- User says "webhook callback" → ask about retry logic, signature verification, idempotency, ordering.

## Question Quality Standard

Your questions must be:

1. **Specific** — Reference actual code paths, endpoints, or data fields from Recon when available.
2. **Grounded** — Based on what you've learned, not generic checklists.
3. **Consequential** — The answer materially changes the design or threat model.

### Good Question Examples
> "Product wants CSV export of user reports. From Recon, I see tenant data is in a shared Postgres schema with `org_id` column filtering. For the export query: are we adding a WHERE clause on `org_id` at the query level, or is there a Row-Level Security policy in Postgres? This directly impacts the STRIDE Information Disclosure model."

> "The brief mentions a webhook for payment status updates. I found no signature verification in the existing webhook handler at `/src/webhooks/handler.ts`. Should we add HMAC signature verification for this new webhook, or is there a gateway-level check I'm not seeing?"

### Bad Question Examples (NEVER ask these)
> "How should we handle security for the CSV export?"
> "What about error handling?"
> "Have you thought about scalability?"

## Loop Exit Criteria

You exit Phase 3 when ALL of these are true:
1. You have covered all 5 domains.
2. You have no remaining ambiguities that would prevent writing a complete STRIDE threat model.
3. You have no remaining ambiguities that would prevent defining complete API contracts with error taxonomies.
4. You can articulate the data flow for every user journey.

Announce: **"I have sufficient information to draft the SSDLC Brief. Moving to Phase 4: SSDLC Forcing Functions."**
