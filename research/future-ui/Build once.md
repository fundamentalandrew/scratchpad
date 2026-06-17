# Build once, serve every surface: a unified architecture for multi-surface B2B SaaS

The most effective architecture for serving dashboards, chatbots, MCP tools, and Slack/Teams from a single codebase is a **hexagonal (ports-and-adapters) design** with a central **capability registry** that self-describes every business operation. Each capability is defined once — with its schema, permissions, and logic — then thin, surface-specific adapters translate it for the Vue dashboard, AI chatbot, MCP server, and messaging integrations. This approach lets you add a new feature by writing one service function and add a new surface by writing one adapter, while Fastify's plugin model and your custom ORM's built-in security enforce consistency at every layer. What follows is a detailed blueprint for implementing this across backend services, MCP integration, cross-surface widgets, and security.

---

## The hexagonal core: one capability, four surfaces

The foundational pattern is Alistair Cockburn's **Hexagonal Architecture** (Ports and Adapters). Your business logic lives in a framework-agnostic core, completely decoupled from how requests arrive or responses are formatted. Martin Fowler's Service Layer pattern complements this: a thin orchestration layer that coordinates operations, enforces security, and delegates to domain objects — designed precisely for the scenario where "different kinds of interfaces often need common interactions with the application."

**The concrete mapping for this platform:**

- **The Hexagon (Core)**: Pure business logic and domain models with zero Fastify dependencies. Each operation — `getSalesReport`, `createInvoice`, `listUsers` — is a self-describing capability function that takes validated input plus an execution context (user identity, tenant, permissions) and returns structured output.
- **Inbound Ports**: Abstract interfaces for how external consumers can invoke capabilities.
- **Inbound Adapters**: Fastify REST routes (Vue dashboard), MCP tool handlers (external AI), Slack webhook/command handlers, chatbot intent resolvers — each a thin translation layer calling the same service functions.
- **Outbound Ports/Adapters**: The custom ORM, email services, and third-party API clients.

The critical architectural decision is **not** to use full Backend-for-Frontend (BFF) instances per surface. Sam Newman, who originated the BFF pattern, warns that it bloats when serving fundamentally different interaction paradigms. Full BFFs would mean reimplementing business logic four times. Instead, use a **unified service layer with thin surface adapters** — each adapter handles only protocol translation and response formatting, never business rules.

### The capability registry as the system's spine

Every business operation registers in a central **CapabilityRegistry** that stores metadata alongside execution logic. Each capability declares its name, description, input/output JSON schemas, required permissions, and whether it's a query or command. This self-describing registry is the single source from which all surfaces auto-generate their interfaces:

```typescript
interface Capability {
  name: string;                    // 'get_sales_report'
  title: string;                   // 'Get Sales Report'  
  description: string;             // Used by MCP tool descriptions AND chatbot context
  type: 'query' | 'command';       // Read vs write — maps to MCP readOnlyHint
  inputSchema: JSONSchema;         // Validates inputs everywhere
  outputSchema: JSONSchema;        // Describes what's returned
  permissions: string[];           // Required CASL abilities
  execute: (input, context) => Promise<Result>;
}
```

From this single definition, the REST adapter generates Fastify routes with validation, the MCP adapter generates tool definitions with Zod schemas, the Slack adapter maps slash commands, and the chatbot adapter creates function-calling specifications. **Adding a new capability means writing one function; it appears on all surfaces automatically.** This mirrors how Salesforce's service layer exposes the same operations through Lightning components, REST APIs, batch processing, and their Agentforce AI agents.

### Fastify's plugin architecture makes this practical

Fastify is uniquely well-suited for this pattern. Its **encapsulation model** lets each surface be an isolated plugin with its own middleware, while shared services (the capability registry, ORM, auth) are registered via `fastify-plugin` to break encapsulation and become globally available. The `@fastify/awilix` plugin provides scoped dependency injection — critical for per-request user context propagation across surfaces.

Key Fastify patterns for this architecture:

- **Decorators** inject the shared capability registry: `fastify.decorate('capabilities', registry)`
- **Encapsulated plugins per surface**: `app.register(restApiPlugin, { prefix: '/api/v1' })`, `app.register(mcpPlugin, { prefix: '/mcp' })`, `app.register(slackPlugin, { prefix: '/integrations/slack' })`
- **JSON Schema as the universal contract**: Fastify's schema-first design means your capability input/output schemas serve triple duty — REST validation, OpenAPI generation via `@fastify/swagger`, and MCP tool parameter definitions
- **`@mcp-it/fastify`** automatically discovers all Fastify routes and exposes them as MCP tools using existing route schemas — meaning your REST API routes literally become MCP tools with zero additional code

A lightweight CQRS split (classifying capabilities as queries vs. commands) pays dividends across surfaces: MCP tools gain proper `readOnlyHint` annotations, Slack commands map naturally (slash commands are queries, interactive actions are commands), and the chatbot distinguishes "tell me about" from "do something for me."

---

## MCP server design: top-down from workflows, not bottom-up from APIs

The Model Context Protocol has matured rapidly. The **June 2025 spec** introduced typed output schemas and Streamable HTTP transport; the **November 2025 spec** added experimental Tasks for async operations, comprehensive OAuth 2.1, elicitation (server-requested user input), and MCP Apps for rendering interactive widgets in AI clients. For a B2B SaaS platform, MCP is the most important new surface to add — it lets ChatGPT, Claude, and other AI assistants directly operate on your platform's data with user-scoped authorization.

### Design tools from user intent, not API endpoints

**Block's engineering team (60+ internal MCP servers) discovered the single most important lesson**: design MCP tools top-down from user workflows, not bottom-up from API endpoints. Their Google Calendar MCP server went from four separate tools (`list_calendars`, `list_events`, `retrieve_timezone`, `retrieve_free_busy`) requiring multiple round-trips, to a **single `query_database` tool** backed by DuckDB that handles any calendar question in one call. Their Linear integration collapsed from 30+ GraphQL-mirroring tools down to just two: `execute_readonly_query` and `execute_mutation_query`.

The principle: **keep tool count between 5-15** for your entire platform. Agents handle fewer tools more effectively. Combine related operations into cohesive high-level tools rather than exposing raw CRUD. Use the `instructions` field during MCP initialization to give the AI a "user manual" for how your tools work together.

Practical tool design rules validated by production MCP servers:

- **Separate read from write tools** so clients can auto-approve reads but require confirmation for writes
- **Guard token budgets** — check output size before returning, paginate large results, cap responses (Block uses 400KB)
- **Make tools idempotent** since agents may retry or parallelize calls
- **Prefer markdown over JSON** in `content` responses — more token-efficient and LLMs handle it better
- **Use `structuredContent`** (June 2025+) alongside text content for typed, machine-readable responses

### Embedding MCP in your Fastify application

For a B2B SaaS with an existing Fastify backend, **embed the MCP server within your Fastify app** rather than running it as a separate process. This lets the MCP server share your service layer, ORM, connection pools, and auth middleware directly. Three Fastify plugins support this:

- **`fastify-mcp`** (by haroldadmin) — the cleanest integration, supports Streamable HTTP transport, manages sessions, emits connection lifecycle events
- **`fastify-mcp-server`** — adds built-in OAuth 2.1 support with bearer middleware, Redis session storage, and automatic `.well-known` metadata endpoints
- **`@mcp-it/fastify`** — the most powerful for existing APIs, automatically converting Fastify routes into MCP tools using their JSON schemas

The recommended approach combines these: use `@mcp-it/fastify` for automatic tool generation from existing REST routes, then manually register additional high-level workflow tools using the official `@modelcontextprotocol/sdk`. MCP tools become thin wrappers around the same capability registry functions that your REST routes call.

### MCP authentication requires OAuth 2.1

Since March 2025, MCP mandates **OAuth 2.1** for all HTTP transports. Your MCP server is an OAuth Resource Server — it validates bearer tokens but doesn't authenticate users directly. The flow: the AI client discovers your authorization server via `/.well-known/oauth-protected-resource` (Protected Resource Metadata, RFC 9728), redirects the user to authenticate, receives an authorization code, exchanges it for an access token with PKCE, then includes the token on all MCP requests.

For implementation, deploy `oidc-provider` (Node.js) or configure Auth0/Okta as your OAuth2 authorization server. Define scopes that map to tool permissions (`mcp:read`, `mcp:write`, `projects:manage`). Support Dynamic Client Registration (RFC 7591) if you want Claude.ai and other clients to connect without manual configuration. Extract `orgId` and `userId` from the validated JWT on every tool invocation to enforce multi-tenant isolation.

---

## Cross-surface widget rendering: shared data, surface-specific presentation

The widget reuse problem divides cleanly into two halves: **data resolution** (surface-agnostic) and **rendering** (surface-specific). The data a KPI card needs is identical whether it appears in a Vue dashboard, a Slack message, a Teams card, or a chatbot response. Only the visual output format changes. This separation is the key architectural insight.

### The widget registry pattern

Define each widget type with a **shared data resolver** and **per-surface renderers**:

```typescript
interface WidgetRegistryEntry {
  type: string;                    // 'kpi', 'table', 'chart'
  inputSchema: JSONSchema;         // What parameters it needs
  outputSchema: JSONSchema;        // What data it produces
  resolve: (params, ctx) => Promise<ResolvedData>;  // Shared data fetching
  renderers: {
    vue: () => Promise<VueComponent>;             // Dynamic import
    slack: (data: ResolvedData) => SlackBlock[];   // Block Kit JSON
    teams: (data: ResolvedData) => AdaptiveCard;   // Adaptive Card JSON
    chat: (data: ResolvedData) => ChatResponse;    // Markdown + plain text
  };
}
```

This mirrors how **Grafana's plugin architecture** works: panel plugins receive a standardized `DataFrame` and render it — they don't care where the data came from. Airbnb's Ghost Platform (their production Server-Driven UI system) follows the same principle: backend returns `sections` (data + UI building blocks) that are entirely independent, rendered natively on each platform.

### Vue 3 composables as the headless logic layer

For the web surface, Vue 3 **composables** provide the headless component pattern — logic (data fetching, state management, formatting) separated from rendering:

```typescript
export function useKpiWidget(config: WidgetConfig) {
  const data = ref(null);
  const loading = ref(false);
  const formatted = computed(() => ({
    value: formatNumber(data.value?.metric),
    trend: calculateTrend(data.value?.history),
    label: config.title,
  }));
  return { data, loading, formatted, fetchData };
}
```

The composable runs in the browser for Vue; the same underlying resolve function runs in Node.js for Slack/Teams/chat. **Zag.js** (state machines for headless components) and **TanStack Table** (headless table logic) extend this pattern to complex interactive widgets.

### Handling each constrained surface

**Slack Block Kit** supports sections, headers, actions, context blocks, and interactive elements (buttons, menus, date pickers) — but no native charts and a maximum of **50 blocks per message**. Use the `slack-block-builder` npm package for declarative, type-safe block construction. For charts, render them server-side as PNG images using `chartjs-node-canvas` and embed the image URL.

**Microsoft Adaptive Cards** offer richer layouts (ColumnSets, FactSets, Tables, input controls) and recently added basic chart support. The `adaptivecards-templating` package separates data from layout using `${expression}` binding syntax, enabling reusable card templates populated with widget data. Teams supports Adaptive Cards up to schema version 1.6.

**Chatbot responses** use **progressive degradation**: rich markdown for clients that render it, with a plain-text natural language summary as the universal fallback. The chat renderer converts structured widget data into narrative text — "Your revenue this month is $1.2M, up 15% from last month" — while the same data renders as a sparkline chart on the Vue dashboard.

**Charts are the hardest cross-surface problem.** The solution: full interactive charts (ECharts, Chart.js) for Vue, server-side rendered PNG images for Slack/Teams/chat via `chartjs-node-canvas`, and emoji-based sparklines (`📈 ▁▂▃▅▇`) as lightweight text alternatives.

### Emerging frameworks worth watching

**json-render** (Vercel Labs) is a new Generative UI framework where AI generates interfaces constrained to a component catalog you define, supporting React, Vue, Svelte, React Native, PDF, email, and terminal from the same catalog. **Google A2UI** is an open standard for agent-driven UIs where agents send declarative JSON and clients render natively. Both validate the direction of schema-driven, multi-surface rendering.

---

## Unified security: one authorization layer, four entry points

The non-negotiable principle: **authorization happens at the service layer, enforced by the ORM, regardless of which surface initiated the request.** Each surface handles authentication differently (cookies, OAuth tokens, Slack bot tokens), but all resolve to a single internal `UserContext` before reaching the shared capability layer.

### Identity resolution across surfaces

A Fastify `preHandler` hook resolves every inbound request to a normalized `UserContext` containing `userId`, `tenantId`, `roles`, `scopes`, and `surface`:

| Surface | Auth Mechanism | Resolution |
|---------|---------------|------------|
| Vue dashboard | HTTP-only cookie with JWT | Decode JWT → extract user/tenant |
| AI chatbot | Inherited web session or short-lived token | Validate session token → same user context |
| MCP server | OAuth 2.1 bearer token | Validate token → lookup `mcp_connections` table → map to internal user |
| Slack | Bot token + Slack user ID from events | Workspace ID + user ID → lookup `slack_user_mappings` → internal user |
| Teams | Bot Framework token + Azure AD identity | Azure AD object ID → lookup `teams_user_mappings` → internal user |

The **OAuth 2.0 Token Exchange** pattern (RFC 8693) adds a trust boundary for external integrations: the MCP server validates the external token, then exchanges it for an internal service token carrying the mapped user identity. External tokens never touch internal services directly.

### CASL as the isomorphic authorization bridge

**CASL** is the recommended authorization library for this architecture because it's isomorphic — the same permission definitions work in the Vue frontend (hiding UI elements the user can't access) and the Node.js backend (enforcing access at the service layer). It supports hybrid RBAC + ABAC, integrates at the ORM/query level (generating database filters from abilities), and bridges your custom ORM's existing security model to all surfaces:

```javascript
function buildAbilityForUser(ormUser, surface) {
  const { can, cannot, build } = new AbilityBuilder(Ability);
  const permissions = ormUser.getPermissions(); // existing ORM method
  permissions.forEach(p => can(p.action, p.subject, p.conditions));
  
  // Surface-specific restrictions
  if (surface === 'mcp') { cannot('delete', 'all'); cannot('manage', 'User'); }
  if (surface === 'chatbot') { cannot('write', 'BillingInfo'); }
  
  return build();
}
```

This pattern preserves the ORM as the **single source of truth** for permissions while adding surface-aware restrictions. The ability object travels with every capability execution, and the ORM's `accessibleBy(ability)` method automatically generates tenant-scoped, permission-filtered database queries.

### Multi-tenancy: defense in depth

Enforce tenant isolation at three layers simultaneously. **Application layer**: the ORM automatically applies `WHERE tenant_id = ?` using `AsyncLocalStorage` to carry tenant context through async operations. **Service layer**: CASL abilities are built per-user per-tenant, ensuring cross-tenant queries are structurally impossible. **Database layer**: PostgreSQL Row-Level Security as a safety net — even if application code has a bug that forgets tenant filtering, Postgres blocks cross-tenant access automatically.

For AI-powered surfaces, tenant isolation requires extra vigilance: chatbot conversation stores must be tenant-partitioned, MCP tool invocations must validate tenant context on every call, vector stores for RAG must be tenant-scoped, and shared caches must use tenant-prefixed keys.

### AI-specific security controls

OWASP ranks prompt injection as the **#1 LLM security risk**. A 2025 Invariant Labs audit found **43% of early MCP servers had command injection vulnerabilities**. Four essential controls:

- **Structured tool invocation**: Never let the LLM construct raw function calls. Validate all parameters against JSON Schema. Reject malformed inputs.
- **Human-in-the-loop**: Require explicit user confirmation for destructive operations (writes, deletes, sends). MCP tool annotations (`readOnlyHint: false`) signal which tools need approval.
- **Least privilege by surface**: MCP and chatbot surfaces start with more restrictive permissions than the dashboard. Surface-aware CASL rules prevent escalation.
- **Comprehensive audit logging**: Every capability invocation across all surfaces logs `userId`, `tenantId`, `surface`, `action`, `resource`, `result`, and surface-specific metadata (MCP client ID, Slack channel ID). Use Pino (Fastify's default) with structured JSON to a centralized platform.

---

## Incremental migration in six phases

This architecture can be adopted incrementally without disrupting the existing platform:

**Phase 1 (weeks 1-3)**: Formalize the `UserContext` type and identity resolution middleware. Wrap existing cookie/JWT auth to produce it. Ensure all service-layer code receives `UserContext` instead of raw request objects. No behavior changes — just standardize the interface.

**Phase 2 (weeks 4-6)**: Extract business logic into capability functions with the registry pattern. Map existing ORM permissions to CASL abilities, running both old and new authorization in parallel. Log discrepancies. The Vue dashboard continues working unchanged.

**Phase 3 (weeks 7-9)**: Add the chatbot surface. It inherits the web session and routes queries through the same capability layer. Add surface-specific CASL restrictions and prompt injection defenses.

**Phase 4 (weeks 10-13)**: Deploy OAuth 2.1 for MCP. Set up `oidc-provider` or Auth0, implement Protected Resource Metadata, register MCP tools from the capability registry, and build identity mapping for external AI clients.

**Phase 5 (weeks 14-17)**: Add Slack/Teams. Implement OAuth flows, user identity linking (via a web dashboard flow where users connect their Slack/Teams accounts), and surface adapters that map commands to capabilities.

**Phase 6 (ongoing)**: Harden with PostgreSQL RLS, per-surface rate limiting, LLM-specific penetration testing, and anomaly detection on AI-powered surfaces.

The cardinal migration rule: **new surfaces start with more restrictive permissions than existing ones and open up gradually.** The ORM remains the authority. Every surface goes through the same service layer. Audit everything.

---

## Conclusion

The architecture converges on three interconnected registries: a **capability registry** (business operations with schemas), a **widget registry** (data resolvers with per-surface renderers), and an **authorization registry** (CASL abilities built from ORM permissions with surface-aware restrictions). These three registries, living inside a hexagonal architecture with Fastify plugins as surface adapters, create a system where the marginal cost of supporting a new feature across all surfaces approaches zero.

The most counterintuitive insight from production MCP deployments is that **fewer, smarter tools outperform many granular ones** — Block's evolution from 30+ tools to 2 per service shows that AI agents work better with high-level workflow tools than raw CRUD endpoints. This aligns with the capability-first design: each capability is a meaningful business operation, not a database wrapper.

The `@mcp-it/fastify` plugin deserves special attention — it automatically generates MCP tools from existing Fastify route schemas, meaning your migration to MCP can start with zero new code. Combined with CASL for isomorphic authorization, `slack-block-builder` for Slack rendering, `adaptivecards-templating` for Teams, and Fastify's native JSON Schema validation powering everything, the entire stack stays within the Node.js/TypeScript ecosystem your team already knows.