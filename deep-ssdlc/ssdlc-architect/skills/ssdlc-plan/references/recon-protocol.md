# Codebase Reconnaissance Protocol

## Purpose

Before asking the developer a single question, you must understand the delta between what Product wants and what the existing architecture can actually support. This grounds every subsequent question in reality.

## What to Search For

Use Grep, Glob, and Read tools to investigate each category. Spend no more than 2-3 tool calls per category — this is a quick survey, not an audit.

### 1. Authentication & Identity

**Search patterns:**
- Glob: `**/auth/**`, `**/middleware/auth*`, `**/middleware/session*`
- Grep: `jwt`, `oauth`, `bearer`, `session`, `passport`, `auth0`, `cognito`, `firebase.auth`, `supabase.auth`
- Grep: `verify.*token`, `decode.*token`, `authenticate`

**What to note:**
- Auth provider (Auth0, Cognito, Firebase, custom)
- Token type (JWT, session cookie, API key)
- Where auth middleware is applied (global, per-route, per-service)
- Any service-to-service auth patterns

### 2. Database & Data Layer

**Search patterns:**
- Glob: `**/models/**`, `**/schema/**`, `**/migrations/**`, `**/entities/**`
- Grep: `prisma`, `typeorm`, `sequelize`, `mongoose`, `sqlalchemy`, `knex`, `drizzle`
- Grep: `CREATE TABLE`, `@Entity`, `@Table`, `class.*Model`
- Glob: `**/prisma/schema.prisma`, `**/drizzle/**`, `docker-compose*`

**What to note:**
- Database type (Postgres, MySQL, MongoDB, etc.)
- ORM/query builder in use
- Migration strategy (auto, manual, versioned)
- Multi-tenancy approach (shared schema with tenant ID, schema-per-tenant, DB-per-tenant)
- Any Row-Level Security (RLS) policies

### 3. API Patterns

**Search patterns:**
- Glob: `**/routes/**`, `**/controllers/**`, `**/api/**`, `**/handlers/**`
- Grep: `app.get\(`, `app.post\(`, `router.`, `@Get`, `@Post`, `@Controller`
- Grep: `openapi`, `swagger`, `graphql`, `trpc`
- Glob: `**/openapi*`, `**/swagger*`

**What to note:**
- API style (REST, GraphQL, gRPC, tRPC)
- Route organization pattern (file-per-resource, centralized router)
- Request validation approach (Zod, Joi, class-validator, manual)
- Response envelope pattern (standardized error shapes?)
- Existing API documentation / OpenAPI specs

### 4. Security Controls

**Search patterns:**
- Grep: `rate.?limit`, `throttle`, `helmet`, `cors`, `csrf`, `xss`
- Grep: `sanitize`, `escape`, `validate`, `encrypt`, `decrypt`, `hash`
- Grep: `rbac`, `abac`, `permission`, `authorize`, `can\(`, `ability`
- Glob: `**/security/**`, `**/crypto/**`

**What to note:**
- Rate limiting (per-user, per-IP, per-endpoint, global)
- CORS configuration (restrictive or permissive)
- Input sanitization approach
- Authorization model (RBAC, ABAC, ownership-based)
- Encryption utilities (at-rest encryption, field-level encryption)

### 5. Testing Patterns

**Search patterns:**
- Glob: `**/*.test.*`, `**/*.spec.*`, `**/test/**`, `**/tests/**`, `**/__tests__/**`
- Grep: `describe\(`, `it\(`, `test\(`, `expect\(`, `assert`
- Grep: `supertest`, `pact`, `contract`, `e2e`, `integration`
- Glob: `**/jest.config*`, `**/vitest.config*`, `**/pytest.ini`, `**/pyproject.toml`

**What to note:**
- Test framework (Jest, Vitest, pytest, Go testing)
- Test types present (unit, integration, e2e, contract)
- Test directory structure
- Any contract testing (Pact, OpenAPI validation)
- CI test pipeline configuration

### 6. Infrastructure & Deployment

**Search patterns:**
- Glob: `**/Dockerfile*`, `**/docker-compose*`, `**/.github/workflows/**`, `**/terraform/**`, `**/k8s/**`
- Grep: `aws`, `gcp`, `azure`, `vercel`, `railway`, `fly.io`
- Glob: `**/serverless*`, `**/.env.example`

**What to note:**
- Deployment target (cloud provider, container orchestration, serverless)
- Environment configuration approach (.env files, secrets manager)
- CI/CD pipeline structure
- Existing monitoring/alerting setup

## Output Format

Present findings as a concise Recon Report:

```markdown
## Recon Report

| Category | Finding | Key Files |
|----------|---------|-----------|
| Auth | [summary] | [paths] |
| Data Layer | [summary] | [paths] |
| API Style | [summary] | [paths] |
| Security Controls | [summary] | [paths] |
| Test Framework | [summary] | [paths] |
| Infrastructure | [summary] | [paths] |

### Key Observations
- [Anything that conflicts with Product's assumptions]
- [Patterns that constrain architectural decisions]
- [Security controls that are missing or weak]
```

## No Codebase Available

If the working directory contains no recognizable codebase (no `src/`, `package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `pom.xml`, etc.), announce:

> "No existing codebase detected — this appears to be a greenfield project. All architectural decisions are open. Would you like to point me at an existing repository, or shall we proceed with a clean-slate design?"
