# Tasks: BigQuery FinOps Cost Analytics CLI

**Input**: Design documents from `/specs/001-bq-cost-analytics/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not requested in feature specification. No test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root, entry point at `bq-analyzer.js`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and module scaffolding

- [x] T001 Create project directory structure: `bq-analyzer.js` (entry point stub), `src/` directory with empty module files (`cli.js`, `sql-generator.js`, `bq-executor.js`, `aggregator.js`, `report-writer.js`)
- [x] T002 Initialize Node.js project with `package.json` and install dependencies: `@google-cloud/bigquery`, `commander`, `csv-writer`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented. Includes US4 (Safe and Cost-Conscious Execution) — partition pruning and compute isolation filters are built into the base SQL generator from the start.

**US4 coverage**: All acceptance scenarios for User Story 4 are fulfilled by T004 (safe filters in every generated query).

- [x] T003 [P] Implement CLI argument parsing and validation in `src/cli.js`: define 4 required options (`--start-date`, `--end-date`, `--projects`, `--regions`) using Commander.js `.requiredOption()`, validate YYYY-MM-DD date format and start <= end, split comma-separated projects/regions into arrays, exit with code 1 and stderr message on validation failure (see `contracts/cli-contract.md` for error format)
- [x] T004 [P] Implement base SQL generator in `src/sql-generator.js`: create a shared function that builds the common WHERE clause with mandatory partition pruning (`creation_time >= TIMESTAMP(@startDate) AND creation_time <= TIMESTAMP(@endDate 23:59:59)`), compute isolation filters (`job_type = 'QUERY'`, `state = 'DONE'`, `cache_hit != TRUE`, `statement_type != 'SCRIPT'`), and the cost formula `(total_bytes_billed / POWER(1024, 4)) * 6.25 AS estimated_cost_usd`. Dynamically construct FROM clause using `` `{project_id}`.`region-{region}`.INFORMATION_SCHEMA.JOBS_BY_PROJECT `` pattern. Use parameterized queries (`@startDate`, `@endDate`) for date values.
- [x] T005 [P] Implement BigQuery executor in `src/bq-executor.js`: accept an array of SQL query objects (each with query string, params, and location), execute all project×region combinations using `Promise.allSettled` with `bigquery.query({ query, params, location })`, log progress to console (`Processing {project} / {region}...`), catch and log warnings for failed combinations (permissions, region not enabled), return array of settled results with metadata indicating which project/region each belongs to
- [x] T006 [P] Implement report writer scaffold in `src/report-writer.js`: create helper function using `csv-writer` that accepts a file path, header definitions, and row data, writes CSV using `createObjectCsvWriter`, auto-creates `./reports/` directory if it does not exist (use `fs.mkdirSync` with `recursive: true`)

**Checkpoint**: Foundation ready — CLI parsing, SQL generation with safe filters, BQ execution, and CSV writing infrastructure all in place

---

## Phase 3: User Story 1 — Basic Cost Audit Across Projects and Regions (Priority: P1) MVP

**Goal**: Generate `reports/spend_per_user.csv` showing aggregated spend per user across all specified projects and regions

**Independent Test**: Run CLI with `--start-date`, `--end-date`, `--projects`, `--regions` and verify `reports/spend_per_user.csv` is created with correct columns, sorted by cost descending, with costs summed across project/region combinations for the same user

### Implementation for User Story 1

- [x] T007 [P] [US1] Add user spend SQL query generator function to `src/sql-generator.js`: generate a query that SELECTs `user_email`, `COUNT(*) AS total_queries_executed`, `SUM(total_bytes_billed) / POWER(1024, 4) AS total_tib_billed`, `SUM((total_bytes_billed / POWER(1024, 4)) * 6.25) AS estimated_cost_usd` from INFORMATION_SCHEMA.JOBS_BY_PROJECT with the shared WHERE clause filters, GROUP BY `user_email`
- [x] T008 [P] [US1] Implement UserSpend aggregation in `src/aggregator.js`: accept arrays of user spend rows from multiple project×region results, merge by `user_email` key (sum `total_queries_executed`, `total_tib_billed`, `estimated_cost_usd`), sort by `estimated_cost_usd` descending, return merged array
- [x] T009 [US1] Add `writeSpendPerUser` function to `src/report-writer.js`: write `reports/spend_per_user.csv` with columns `user_email`, `total_queries_executed`, `total_tib_billed`, `estimated_cost_usd` using the report writer helper from T006
- [x] T010 [US1] Wire US1 end-to-end in `bq-analyzer.js`: parse CLI args (T003), generate user spend SQL for each project×region combo (T007), execute via BQ executor (T005), aggregate results (T008), write CSV report (T009), print summary with row count to console. Handle case where all combinations fail (exit code 1, stderr message)

**Checkpoint**: US1 complete — `spend_per_user.csv` generated with cross-project/region per-user cost breakdown. This is a functional MVP.

---

## Phase 4: User Story 2 — Identify Expensive Recurring Query Patterns (Priority: P1)

**Goal**: Generate `reports/top_normalized_queries.csv` showing the most expensive recurring query patterns after normalization

**Independent Test**: Run CLI and verify `reports/top_normalized_queries.csv` contains grouped query patterns with execution_count > 5, queries differing only by UUIDs/dates/numbers/whitespace are grouped into the same normalized blueprint

### Implementation for User Story 2

- [x] T011 [US2] Add normalization pipeline to `src/sql-generator.js`: create a shared SQL expression builder that chains `REGEXP_REPLACE` calls in order — (1) `SUBSTR(query, 1, 2000)` truncation, (2) replace UUID pattern `r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'` with `'<UUID>'`, (3) replace date/timestamp pattern `r'\\d{4}[-_/]?\\d{2}[-_/]?\\d{2}([ ][0-9:.]+)?'` with `'<DATE>'`, (4) replace standalone numbers `r'\\b\\d+\\b'` with `'<NUM>'`, (5) replace whitespace `r'\\s+'` with `' '`. Return as `normalized_blueprint` column alias.
- [x] T012 [US2] Add normalized query patterns SQL query generator function to `src/sql-generator.js`: generate a query that SELECTs `normalized_blueprint`, `COUNT(*) AS execution_count`, `COUNT(DISTINCT user_email) AS unique_users`, `SUM(total_bytes_billed) / POWER(1024, 4) AS total_tib_billed`, `SUM((total_bytes_billed / POWER(1024, 4)) * 6.25) AS estimated_cost_usd` with shared WHERE clause, GROUP BY `normalized_blueprint`, HAVING `COUNT(*) > 5`, ORDER BY `estimated_cost_usd` DESC, LIMIT 100. Uses normalization pipeline from T011.
- [x] T013 [P] [US2] Implement QueryPattern aggregation in `src/aggregator.js`: accept arrays of query pattern rows from multiple project×region results, merge by `normalized_blueprint` key (sum `execution_count`, `total_tib_billed`, `estimated_cost_usd`; track distinct `user_email` sets per blueprint for accurate `unique_users` count across regions), recompute `avg_cost_per_run_usd` as `estimated_cost_usd / execution_count`, re-filter `execution_count > 5` after merge, sort by `estimated_cost_usd` descending, limit to 100
- [x] T014 [P] [US2] Add `writeTopNormalizedQueries` function to `src/report-writer.js`: write `reports/top_normalized_queries.csv` with columns `normalized_blueprint`, `execution_count`, `unique_users`, `total_tib_billed`, `estimated_cost_usd`, `avg_cost_per_run_usd`
- [x] T015 [US2] Wire US2 into `bq-analyzer.js`: add normalized query patterns SQL generation alongside user spend queries, execute both query types per project×region combo, aggregate query pattern results, write the second CSV report, update summary output with pattern count

**Note on unique_users dedup**: The per-region SQL returns `COUNT(DISTINCT user_email)` within that region. When merging across regions, the aggregator must track actual user email sets per normalized_blueprint (not just sum the counts) to avoid overcounting users who appear in multiple regions. See plan.md "Key Design Decisions" §4.

**Checkpoint**: US2 complete — both `spend_per_user.csv` and `top_normalized_queries.csv` generated. Normalization engine groups variant queries correctly.

---

## Phase 5: User Story 3 — Drill Down into Per-User Top Queries (Priority: P2)

**Goal**: Generate `reports/top_user_query_matrix.csv` showing each user's top 5 most expensive normalized query blueprints

**Independent Test**: Run CLI and verify `reports/top_user_query_matrix.csv` contains up to 5 rows per user with query_rank 1-5, showing normalized blueprints ranked by bytes billed descending

### Implementation for User Story 3

- [x] T016 [US3] Add user-query matrix SQL query generator function to `src/sql-generator.js`: generate a query using a CTE or subquery that first groups by `(user_email, normalized_blueprint)` with aggregated metrics (`execution_count`, `SUM(total_bytes_billed)`, `estimated_cost_usd`), then applies `ROW_NUMBER() OVER(PARTITION BY user_email ORDER BY total_bytes_billed DESC) AS query_rank`, filtered to `query_rank <= 5`. Uses normalization pipeline from T011.
- [x] T017 [P] [US3] Implement UserQueryMatrix aggregation in `src/aggregator.js`: accept arrays of user-query matrix rows from multiple project×region results, merge by composite key `user_email:normalized_blueprint` (sum `execution_count`, `estimated_cost_usd`, `total_bytes_billed`), then re-rank per user (recalculate `query_rank` 1-5 by `total_bytes_billed` descending), filter to top 5 per user
- [x] T018 [P] [US3] Add `writeUserQueryMatrix` function to `src/report-writer.js`: write `reports/top_user_query_matrix.csv` with columns `user_email`, `query_rank`, `normalized_blueprint`, `execution_count`, `estimated_cost_usd`
- [x] T019 [US3] Wire US3 into `bq-analyzer.js`: add user-query matrix SQL generation alongside existing queries, execute all three query types per project×region combo, aggregate matrix results, write the third CSV report, update summary output with row count

**Checkpoint**: All three CSV reports generated. Complete feature functionality achieved.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and output refinement

- [x] T020 Refine console output in `bq-analyzer.js`: ensure progress messages match the format in `contracts/cli-contract.md` (processing status per combo, warning format for failures, final summary listing all three reports with row counts)
- [x] T021 End-to-end validation: run the tool against real BigQuery projects per `quickstart.md`, verify all three CSV files are generated with correct columns, sorting, and data, confirm no partition-pruning violations in generated SQL

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — can start immediately after Phase 2
- **US2 (Phase 4)**: Depends on Foundational — can start after Phase 2 (parallel with US1 if desired, though sequential is simpler since US2 extends `sql-generator.js`)
- **US3 (Phase 5)**: Depends on US2 (needs normalization pipeline from T011)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Phase 2 only. No normalization needed. Independent MVP.
- **User Story 2 (P1)**: Depends on Phase 2 only. Adds normalization to sql-generator.js. Can proceed in parallel with US1 (they modify different functions in the same files).
- **User Story 3 (P2)**: Depends on US2's normalization pipeline (T011). Cannot start until T011 is complete.
- **User Story 4 (P1)**: Fully addressed by Phase 2 (T004) — safe filters built into base SQL generator from the start.

### Within Each User Story

- SQL generator additions before aggregator (aggregator depends on query output shape)
- Aggregator and report writer can be parallel (different files, independent)
- Wiring task (bq-analyzer.js) is always last in each story phase

### Parallel Opportunities

**Phase 2** (all [P] — different files):
```
T003 (cli.js) | T004 (sql-generator.js) | T005 (bq-executor.js) | T006 (report-writer.js)
```

**Phase 3** (T007 and T008 are parallel — different files):
```
T007 (sql-generator.js) | T008 (aggregator.js)
Then: T009 (report-writer.js)
Then: T010 (bq-analyzer.js — wires everything)
```

**Phase 4** (T013 and T014 are parallel — different files):
```
T011 → T012 (both sql-generator.js, sequential)
T013 (aggregator.js) | T014 (report-writer.js) — parallel after T012
Then: T015 (bq-analyzer.js)
```

**Phase 5** (T017 and T018 are parallel — different files):
```
T016 (sql-generator.js)
T017 (aggregator.js) | T018 (report-writer.js) — parallel
Then: T019 (bq-analyzer.js)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational with safe execution filters (T003-T006)
3. Complete Phase 3: User Story 1 (T007-T010)
4. **STOP and VALIDATE**: Run tool against a real project, verify `spend_per_user.csv`
5. MVP delivers: per-user cost breakdown with safe partition-pruned queries

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 → `spend_per_user.csv` works → MVP!
3. Add US2 → `top_normalized_queries.csv` works → Normalization engine live
4. Add US3 → `top_user_query_matrix.csv` works → Full feature complete
5. Polish → Console output matches contract, end-to-end validated

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- US4 (Safe Execution) is not a separate phase — its requirements are built into the foundational SQL generator (T004)
- The normalization pipeline (T011) is the key dependency gate between US2 and US3
- unique_users dedup in QueryPattern aggregation (T013) requires tracking email sets, not summing counts — see plan.md §4
- All SQL uses parameterized queries for dates; project/region are string-interpolated into backtick-quoted FROM clause identifiers (safe per research.md §6)
