# Research: BigQuery FinOps Cost Analytics CLI

**Date**: 2026-02-27
**Feature Branch**: `001-bq-cost-analytics`

## Technology Decisions

### 1. CLI Framework: Commander.js

**Decision**: Use Commander.js (not yargs)
**Rationale**: Commander's `.requiredOption()` is purpose-built for mandatory named flags. The API is concise for a flat command structure with no subcommands. Zero dependencies, smaller footprint (~77KB vs ~260KB).
**Alternatives considered**: Yargs — more powerful subcommand routing and built-in validation (.choices(), .coerce(), .check()), but overkill for 4 required flags with no subcommands.

### 2. CSV Library: csv-writer

**Decision**: Use csv-writer (not fast-csv)
**Rationale**: Promise-based `writeRecords()` API requires 3-4 lines of code. For 100-1000 rows, in-memory write is perfectly adequate. No stream/event boilerplate needed.
**Alternatives considered**: fast-csv — stream-based, better for very large files, but adds unnecessary complexity at this data scale.

### 3. BigQuery SDK Query Execution

**Decision**: Use `bigquery.query()` with per-query `location` option
**Rationale**: The `bigquery.query(options)` method handles job creation and result fetching in one call. The `location` property in options overrides any default, enabling per-region queries in the loop.
**Alternatives considered**: `createQueryJob()` + `getQueryResults()` — unnecessary two-step process for this use case.

### 4. BigQuery INFORMATION_SCHEMA Table Reference

**Decision**: Use fully-qualified format `` `{project_id}`.`region-{region}`.INFORMATION_SCHEMA.JOBS_BY_PROJECT ``
**Rationale**: Confirmed this is the correct and mandatory format. The `region-` prefix is required. Backticks required around project ID and region qualifier. The `location` SDK option must match.
**Alternatives considered**: None — this is the only supported format for cross-project, cross-region INFORMATION_SCHEMA queries.

### 5. Regex Engine Compatibility (RE2)

**Decision**: All normalization regex patterns are valid for BigQuery's RE2 engine
**Rationale**: Chained `REGEXP_REPLACE` nesting works in Standard SQL. UUID pattern `[0-9a-f]{8}-...`, date pattern `\d{4}[-_/]?\d{2}[-_/]?\d{2}`, number pattern `\b\d+\b`, and whitespace pattern `\s+` are all valid RE2 syntax. No lookaheads/lookbehinds needed.
**Alternatives considered**: Client-side normalization in Node.js — rejected because doing it in SQL enables GROUP BY on the normalized result directly, avoiding transferring raw query text for thousands of jobs.

### 6. Parameter Injection Strategy

**Decision**: Use BigQuery parameterized queries for date values; string-interpolate project/region into FROM clause
**Rationale**: Date values passed as `@params` prevent SQL injection. Project ID and region must be interpolated into the FROM clause (table reference) because BigQuery does not support parameterized table names. These values come from the user's own CLI arguments (not external input), and are used in backtick-quoted identifiers.
**Alternatives considered**: Fully parameterized queries — not possible for table references in BigQuery.
