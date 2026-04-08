# SSDLC Developer Brief Output Template

Use this template to generate the final artifact in Phase 6. Replace all bracketed placeholders with actual content derived from the interrogation.

---

```markdown
# SSDLC Developer Brief: [Feature Name]

**Generated:** [date]
**Product Brief Source:** [original brief filename or "provided inline"]
**Interrogation Phases Completed:** 6/6

---

## 1. Executive Summary

[2-3 paragraphs covering:]
- [The aligned business intent — what Product actually needs, bias-free]
- [The key architectural decisions made during interrogation and their rationale]
- [Scope boundaries — what is explicitly IN and OUT of scope]

---

## 2. Architecture Decision Records (ADRs)

[One ADR per significant decision made during Phases 3-5. Number sequentially.]

### ADR-001: [Decision Title]

- **Status:** Accepted
- **Context:** [Why this decision was needed — the question that triggered it]
- **Decision:** [What was decided]
- **Alternatives Considered:**
  - [Alternative A] — rejected because [reason]
  - [Alternative B] — rejected because [reason]
- **Consequences:**
  - Positive: [benefits]
  - Negative: [trade-offs accepted]
  - Risks: [residual risks]

### ADR-002: [Decision Title]
[repeat structure]

---

## 3. Threat Model

### 3.1 Trust Boundaries

[Text-based diagram of trust boundaries for this feature]

```
[Actor/System] --protocol--> [Component]
   |-- Trust Boundary: [description]
```

### 3.2 STRIDE Analysis

| # | Threat | Component / Data Flow | Attack Scenario | Severity | Mitigation | Owner |
|---|--------|----------------------|-----------------|----------|------------|-------|
| T-01 | [type] | [component] | [specific attack] | [Critical/High/Medium/Low] | [specific mitigation] | [owner] |

### 3.3 Data Flow Analysis

[For each sensitive data path:]

| Data | Classification | Source | Destination | Protection in Transit | Protection at Rest |
|------|---------------|--------|-------------|----------------------|-------------------|
| [data type] | [PII/PHI/Financial/Internal/Public] | [source] | [destination] | [TLS/mTLS/none] | [encryption method] |

### 3.4 OWASP ASVS Compliance

| ASVS Category | Status | Notes |
|---------------|--------|-------|
| V2: Authentication | [Pass/Gap/N/A] | [details] |
| V4: Access Control | [Pass/Gap/N/A] | [details] |
| V5: Validation | [Pass/Gap/N/A] | [details] |
| V7: Error Handling | [Pass/Gap/N/A] | [details] |
| V8: Data Protection | [Pass/Gap/N/A] | [details] |
| V13: API Security | [Pass/Gap/N/A] | [details] |

---

## 4. Integration Map

### 4.1 Files to Modify

| File Path | Change Description | Risk Level |
|-----------|-------------------|-----------|
| [exact path] | [what changes] | [High/Medium/Low] |

### 4.2 New Components to Create

| Component | Purpose | Dependencies |
|-----------|---------|-------------|
| [path/name] | [what it does] | [what it depends on] |

### 4.3 External Dependencies

| Service | Purpose | SLA | Failure Mode | Fallback Strategy |
|---------|---------|-----|-------------|-------------------|
| [service] | [why needed] | [uptime/latency] | [what happens when down] | [how we handle it] |

---

## 5. API Contracts

### 5.1 New Endpoints

[For each new endpoint:]

#### `[METHOD] [path]`

**Authentication:** [required auth type]
**Authorization:** [required permissions/roles]
**Rate Limit:** [requests per window]

**Request:**
```json
{
  // request schema with types and constraints
}
```

**Success Response:** `[status code]`
```json
{
  // response schema
}
```

**Error Responses:**

| Status | Code | Description | Response Body |
|--------|------|-------------|---------------|
| 400 | `VALIDATION_ERROR` | [when] | `{"error": "...", "details": [...]}` |
| 401 | `UNAUTHORIZED` | [when] | `{"error": "..."}` |
| 403 | `FORBIDDEN` | [when] | `{"error": "..."}` |
| 404 | `NOT_FOUND` | [when] | `{"error": "..."}` |
| 429 | `RATE_LIMITED` | [when] | `{"error": "...", "retry_after": N}` |
| 500 | `INTERNAL_ERROR` | [when] | `{"error": "..."}` |
| 503 | `SERVICE_UNAVAILABLE` | [when] | `{"error": "...", "retry_after": N}` |

### 5.2 Modified Endpoints

[For each modified endpoint:]

#### `[METHOD] [path]` (MODIFIED)

**Changes:**
- [what changed and why]

### 5.3 Error Taxonomy

[Global error code registry for this feature]

| Error Code | HTTP Status | Meaning | Client Action |
|-----------|-------------|---------|--------------|
| [code] | [status] | [meaning] | [what client should do] |

---

## 6. Security Controls Checklist

[Actionable, checkable items derived directly from the threat model. Each maps to a specific threat.]

- [ ] **[T-01 mitigation]:** [specific implementation action, e.g., "Add RLS policy on `reports` table filtering by `org_id`"]
- [ ] **[T-02 mitigation]:** [specific action]
- [ ] **Rate limiting:** [specific config]
- [ ] **Input validation:** [specific schemas/rules]
- [ ] **Audit logging:** [what events to log, where]
- [ ] **Encryption:** [what to encrypt, with what]

---

## 7. Open Questions & Deferred Decisions

[Anything explicitly deferred during interrogation. Each must have a rationale for deferral and a trigger for when it must be resolved.]

| # | Question / Decision | Why Deferred | Resolve Before |
|---|-------------------|-------------|---------------|
| 1 | [question] | [reason] | [milestone/date] |
```
