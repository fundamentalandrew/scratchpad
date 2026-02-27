# Implementation Plan: BigQuery FinOps Cost Analytics CLI

**Feature Branch**: `001-bq-cost-analytics`
**Created**: 2026-02-27
**Status**: Ready for task generation

## Technical Context

| Aspect              | Decision                                                  |
| ------------------- | --------------------------------------------------------- |
| Runtime             | Node.js v18+                                              |
| CLI framework       | Commander.js (`.requiredOption()` for 4 mandatory flags)  |
| BigQuery SDK        | @google-cloud/bigquery (`bigquery.query()` with `location` option) |
| CSV output          | csv-writer (Promise-based `writeRecords()`)               |
| Authentication      | Google Cloud Application Default Credentials (ADC)        |
| SQL dialect         | BigQuery Standard SQL (GoogleSQL) with RE2 regex           |
| Parameter safety    | Parameterized queries for dates; string interpolation for table references (project/region in backtick-quoted identifiers) |

## Constitution Check

Constitution is uninitialized (template only). No gates to evaluate. Proceeding without constraints.

## Architecture Overview

### Module Structure

```
bq-analyzer.js          # Entry point — CLI parsing, orchestration
src/
  cli.js                # Commander.js argument parsing and validation
  sql-generator.js      # SQL query construction with normalization pipeline
  bq-executor.js        # BigQuery query execution (async, per project×region)
  aggregator.js         # Cross-project/region result aggregation
  report-writer.js      # CSV report generation (3 reports)
```

### Execution Flow

```
1. Parse CLI args (cli.js)
   ↓
2. Validate dates, split projects/regions (cli.js)
   ↓
3. Generate SQL queries with normalization pipeline (sql-generator.js)
   ↓
4. For each (project, region) combination — execute in parallel (bq-executor.js)
   │  ├── Success → collect rows
   │  └── Failure → log warning, continue
   ↓
5. Aggregate results across all combinations (aggregator.js)
   │  ├── By user_email → UserSpend
   │  ├── By normalized_blueprint → QueryPattern
   │  └── By (user_email, normalized_blueprint) + rank → UserQueryMatrix
   ↓
6. Write 3 CSV reports (report-writer.js)
   ↓
7. Print summary to console
```

### SQL Strategy

Three separate SQL queries are generated per project×region combination, each using the same base filters and normalization pipeline but different SELECT/GROUP BY/window logic:

1. **User spend query**: Groups by `user_email`, sums bytes billed, counts queries
2. **Normalized query patterns**: Groups by `normalized_blueprint`, counts executions and distinct users
3. **User-query matrix**: Groups by `(user_email, normalized_blueprint)`, applies ROW_NUMBER window function

Alternative: A single query returning all raw normalized job records, with aggregation done entirely in Node.js. Rejected because:
- Transferring raw rows for thousands of jobs across multiple projects is wasteful
- BigQuery can aggregate more efficiently than Node.js
- Three focused queries are simpler to test and debug

### Aggregation Strategy

Each project×region query returns pre-aggregated rows. The Node.js aggregator merges these by:
- **UserSpend**: Map keyed by `user_email` — sum `total_queries_executed`, `total_tib_billed`, `estimated_cost_usd`
- **QueryPattern**: Map keyed by `normalized_blueprint` — sum `execution_count`, merge `unique_users` (must track distinct across regions), sum `total_tib_billed`, `estimated_cost_usd`, recompute `avg_cost_per_run_usd`
- **UserQueryMatrix**: Map keyed by `user_email:normalized_blueprint` — sum metrics, then re-rank top 5 per user after merging

### Key Design Decisions

1. **Three SQL queries per combination** (not one monolithic query): Keeps each query focused and testable. The normalization pipeline is shared via a SQL-generating function.

2. **Normalization in SQL** (not Node.js): Avoids transferring raw query text over the wire. GROUP BY on `normalized_blueprint` happens server-side.

3. **Parallel execution with Promise.allSettled**: Allows partial success — failed project/region combos don't abort the whole run.

4. **unique_users tracking for QueryPattern**: Since the same user may appear in multiple project/region results for the same blueprint, the per-combination SQL counts distinct users, but the cross-combination aggregator needs to handle user deduplication. This requires either: (a) tracking user sets per blueprint during aggregation, or (b) running a single additional pass. Decision: track user email sets in memory during aggregation (acceptable scale for ~100s of blueprints × ~100s of users).

## Phase 0 Output Reference

- [research.md](./research.md) — Technology decisions and rationale
- [data-model.md](./data-model.md) — Entity definitions and relationships

## Phase 1 Output Reference

- [contracts/cli-contract.md](./contracts/cli-contract.md) — CLI interface contract
- [quickstart.md](./quickstart.md) — Setup and usage guide

## Dependencies (npm)

| Package                | Purpose                           | Version  |
| ---------------------- | --------------------------------- | -------- |
| @google-cloud/bigquery | BigQuery SDK                      | latest   |
| commander              | CLI argument parsing              | latest   |
| csv-writer             | CSV file generation               | latest   |

No dev dependencies required for MVP (no test framework specified in brief). Testing strategy to be determined during task generation.

## Risk Register

| Risk                                    | Likelihood | Impact | Mitigation                                              |
| --------------------------------------- | ---------- | ------ | ------------------------------------------------------- |
| BigQuery API rate limiting              | Low        | Medium | Promise.allSettled with per-combination error handling   |
| Large result sets exceeding memory      | Low        | Medium | Pre-aggregation in SQL limits row count per query       |
| Regex normalization missing edge cases  | Medium     | Low    | Truncation to 2000 chars bounds complexity; pipeline order is specified |
| unique_users dedup across regions       | Medium     | Medium | Track email sets per blueprint in aggregator            |
| ADC credentials not configured          | Medium     | High   | Clear error message on auth failure with fix instructions |
