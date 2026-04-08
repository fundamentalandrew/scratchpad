# STRIDE Threat Model & OWASP ASVS Template

## STRIDE Threat Model

For EACH component and data flow identified during the Socratic Interrogation, produce a row for every applicable STRIDE category.

### Threat Table Format

| # | Threat Type | Component / Data Flow | Attack Scenario | Likelihood | Impact | Severity | Mitigation | Owner |
|---|------------|----------------------|-----------------|-----------|--------|----------|------------|-------|
| T-01 | Spoofing | [specific component] | [concrete attack] | H/M/L | H/M/L | Critical/High/Medium/Low | [specific mitigation with code-level detail] | [team/person] |

### STRIDE Categories — What to Evaluate

**Spoofing (Authentication)**
- Can an attacker impersonate a legitimate user, service, or component?
- Are all authentication mechanisms validated at every entry point?
- Is there mutual TLS between internal services where required?
- Are API keys / tokens rotated and scoped appropriately?

**Tampering (Integrity)**
- Can data be modified in transit or at rest without detection?
- Are integrity checks in place (checksums, signatures, HMACs)?
- Can request parameters be manipulated to alter behavior (parameter tampering)?
- Is there protection against replay attacks?

**Repudiation (Audit)**
- Can a user deny performing an action?
- Is audit logging adequate for compliance requirements?
- Are logs tamper-resistant (append-only, shipped to immutable store)?
- Do logs capture WHO did WHAT to WHICH resource and WHEN?

**Information Disclosure (Confidentiality)**
- Can sensitive data leak through logs, error messages, or side channels?
- Are access controls enforced at the data layer (not just the API layer)?
- Is PII/PHI encrypted at rest? With what key management?
- Can timing attacks reveal information about data existence?

**Denial of Service (Availability)**
- Can the system be overwhelmed by volume or complexity?
- Are rate limits defined per-user, per-tenant, and per-endpoint?
- Are resource quotas in place (file upload sizes, query limits, connection pools)?
- Is there circuit-breaker protection for downstream dependencies?

**Elevation of Privilege (Authorization)**
- Can a lower-privileged user escalate to higher privileges?
- Is authorization checked at every layer (API, service, data)?
- Are there IDOR (Insecure Direct Object Reference) risks?
- Is the principle of least privilege enforced for service accounts?

### Trust Boundary Diagram

Describe trust boundaries in text format:

```
[External User] --HTTPS--> [API Gateway / Load Balancer]
   |-- Trust Boundary 1: Public Internet → DMZ
   |
[API Gateway] --internal--> [Application Server]
   |-- Trust Boundary 2: DMZ → Internal Network
   |
[Application Server] --TLS--> [Database]
   |-- Trust Boundary 3: App → Data Store
   |
[Application Server] --HTTPS--> [3rd Party API]
   |-- Trust Boundary 4: Internal → External Dependency
```

Adapt this to the specific architecture. Every arrow crossing a trust boundary needs a threat assessment.

---

## OWASP ASVS Quick Check

Run through these ASVS categories and flag any gaps. Only include categories relevant to the feature being designed.

### V1: Architecture, Design and Threat Modeling
- [ ] Threat model exists and covers all data flows
- [ ] Trust boundaries are explicitly defined
- [ ] All components use consistent security controls

### V2: Authentication
- [ ] Authentication is required for all non-public endpoints
- [ ] Credentials are not stored in plaintext
- [ ] Multi-factor authentication where required by sensitivity

### V3: Session Management
- [ ] Sessions are invalidated on logout and timeout
- [ ] Session tokens are cryptographically random and sufficient length
- [ ] Session fixation protections in place

### V4: Access Control
- [ ] Principle of least privilege enforced
- [ ] Access control checks at server side, not client
- [ ] IDOR protections (indirect references or ownership checks)

### V5: Validation, Sanitization and Encoding
- [ ] All input validated on server side
- [ ] Output encoding appropriate for context (HTML, SQL, OS command)
- [ ] File upload validation (type, size, content scanning)

### V7: Error Handling and Logging
- [ ] Errors don't leak sensitive information
- [ ] Security events are logged with sufficient detail
- [ ] Log injection protections in place

### V8: Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] PII identified and classified
- [ ] Data retention policies enforced programmatically

### V9: Communication
- [ ] TLS enforced for all external communication
- [ ] Certificate validation not disabled
- [ ] HSTS headers configured

### V10: Malicious Code
- [ ] Dependencies scanned for known vulnerabilities
- [ ] No hardcoded secrets in source code
- [ ] Subresource integrity for external scripts

### V13: API and Web Service
- [ ] API authentication on every endpoint
- [ ] Rate limiting configured per endpoint
- [ ] Request size limits enforced
- [ ] CORS configured restrictively
