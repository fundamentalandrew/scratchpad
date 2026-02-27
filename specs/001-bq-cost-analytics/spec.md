# Feature Specification: BigQuery FinOps Cost Analytics CLI

**Feature Branch**: `001-bq-cost-analytics`
**Created**: 2026-02-27
**Status**: Draft
**Input**: User description: "BigQuery FinOps Cost Analytics CLI — a local Node.js CLI tool to audit and analyze Google BigQuery compute costs across multiple GCP projects and regions, with query normalization for grouping structurally unique but functionally identical queries, and actionable CSV report output."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Basic Cost Audit Across Projects and Regions (Priority: P1)

A FinOps engineer wants to understand how much their organization is spending on BigQuery compute across multiple GCP projects and regions for a given date range. They run the CLI with their desired parameters and receive a per-user cost breakdown as a CSV report.

**Why this priority**: This is the foundational use case — without cross-project/region data collection and per-user cost attribution, no other analysis is possible. Delivers immediate value by answering "who is spending the most?"

**Independent Test**: Can be fully tested by running the CLI with `--start-date`, `--end-date`, `--projects`, and `--regions` flags and verifying that `spend_per_user.csv` is generated with correct user emails, query counts, TiB billed, and cost figures.

**Acceptance Scenarios**:

1. **Given** the user has valid GCP credentials and specifies two projects and two regions, **When** they run the CLI with valid date range arguments, **Then** a `reports/spend_per_user.csv` file is created containing aggregated spend per user across all specified projects and regions, sorted by cost descending.
2. **Given** a user email appears in multiple project/region combinations, **When** results are aggregated, **Then** the CSV contains a single row per user email with costs summed across all projects and regions.
3. **Given** the user specifies a project that does not have BigQuery enabled in a given region, **When** the CLI processes that combination, **Then** it logs a warning to the console and continues processing remaining combinations without failing.

---

### User Story 2 - Identify Expensive Recurring Query Patterns (Priority: P1)

A FinOps engineer wants to identify which automated/tooling queries are costing the most. Because internal tooling generates thousands of structurally unique but functionally identical queries (with varying UUIDs, timestamps, numeric IDs, and whitespace), the CLI must normalize query text to group these variants together and report on the most expensive recurring patterns.

**Why this priority**: This is the core differentiating capability of the tool. Without query normalization, it is impossible to identify systemic cost drivers hidden behind thousands of one-off-looking queries.

**Independent Test**: Can be tested by running the CLI and verifying that `top_normalized_queries.csv` contains grouped query patterns with execution counts greater than 5, and that queries differing only by UUIDs/dates/numbers/whitespace are grouped into the same normalized blueprint.

**Acceptance Scenarios**:

1. **Given** multiple queries exist that differ only by embedded UUIDs, **When** the normalization engine processes them, **Then** they are grouped under a single normalized blueprint with UUIDs replaced by `<UUID>`.
2. **Given** multiple queries exist that differ only by embedded dates, timestamps, numeric IDs, or whitespace, **When** the normalization engine processes them, **Then** they are grouped under a single normalized blueprint with appropriate placeholders (`<DATE>`, `<NUM>`) and compressed whitespace.
3. **Given** the aggregated results contain normalized blueprints, **When** generating `top_normalized_queries.csv`, **Then** only blueprints with more than 5 executions are included, sorted by cost descending, limited to the top 100 entries.

---

### User Story 3 - Drill Down into Per-User Top Queries (Priority: P2)

A FinOps engineer has identified high-spending users from Report 1 and wants to understand what specific query patterns those users are running. They check the user-query matrix report to see the top 5 most expensive normalized query blueprints per user.

**Why this priority**: Builds on the insights from Reports 1 and 2 to provide actionable per-user detail. Important for follow-up conversations with specific teams or individuals, but requires the foundation of the first two reports.

**Independent Test**: Can be tested by running the CLI and verifying that `top_user_query_matrix.csv` contains rows for each user showing their top 5 queries ranked by cost, with proper ranking (1 through 5).

**Acceptance Scenarios**:

1. **Given** a user has executed queries in the date range, **When** the matrix report is generated, **Then** it contains up to 5 rows for that user, each with a `query_rank` from 1 to 5, showing normalized blueprints ordered by bytes billed descending.
2. **Given** a user has executed fewer than 5 distinct normalized blueprints, **When** the matrix report is generated, **Then** only the actual number of distinct blueprints appears (e.g., 3 rows for a user with 3 blueprints).

---

### User Story 4 - Safe and Cost-Conscious Execution (Priority: P1)

A FinOps engineer wants to ensure that running the cost analysis tool itself does not generate excessive BigQuery costs. The CLI must use mandatory partition pruning on all INFORMATION_SCHEMA queries and exclude cached/free queries from cost calculations.

**Why this priority**: Without cost controls, the audit tool itself could become a cost center. Partition pruning and compute isolation filters are critical safety guardrails.

**Independent Test**: Can be tested by inspecting the generated SQL queries to verify they include partition pruning filters on `creation_time` and exclusion filters for cached queries, script parent jobs, and non-DONE/non-QUERY jobs.

**Acceptance Scenarios**:

1. **Given** the CLI generates SQL queries, **When** any query targets INFORMATION_SCHEMA, **Then** it includes a `WHERE creation_time >= TIMESTAMP('{start-date}') AND creation_time <= TIMESTAMP('{end-date} 23:59:59')` clause.
2. **Given** the CLI generates SQL queries, **When** filtering job records, **Then** it excludes records where `cache_hit = TRUE`, `statement_type = 'SCRIPT'`, `job_type != 'QUERY'`, or `state != 'DONE'`.

---

### Edge Cases

- What happens when a specified GCP project does not exist or the user lacks permissions? The CLI logs a warning and continues processing remaining project/region combinations.
- What happens when the date range returns zero results for a project/region combination? The CLI logs an informational message and continues; the final reports omit that combination's data gracefully.
- What happens when all project/region combinations fail? The CLI exits with an error message indicating no data could be retrieved.
- What happens when a query text exceeds 2000 characters? The normalization engine truncates query text to 2000 characters before applying regex normalization.
- What happens when the `./reports` directory does not exist? The CLI creates it automatically.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept `--start-date` (YYYY-MM-DD), `--end-date` (YYYY-MM-DD), `--projects` (comma-separated GCP Project IDs), and `--regions` (comma-separated BigQuery regions) as required CLI arguments.
- **FR-002**: System MUST validate that date arguments conform to YYYY-MM-DD format and that start date is before or equal to end date.
- **FR-003**: System MUST authenticate using Google Cloud Application Default Credentials.
- **FR-004**: System MUST query `INFORMATION_SCHEMA.JOBS_BY_PROJECT` for every combination of specified projects and regions (Cartesian product).
- **FR-005**: System MUST dynamically construct the FROM clause using the pattern `` `{project_id}`.`region-{region}`.INFORMATION_SCHEMA.JOBS_BY_PROJECT ``.
- **FR-006**: System MUST include mandatory partition pruning on `creation_time` using the user-specified date range in all INFORMATION_SCHEMA queries.
- **FR-007**: System MUST filter jobs to include only records where `job_type = 'QUERY'`, `state = 'DONE'`, `cache_hit != TRUE`, and `statement_type != 'SCRIPT'`.
- **FR-008**: System MUST calculate estimated cost using the formula: `(total_bytes_billed / POWER(1024, 4)) * 6.25`.
- **FR-009**: System MUST normalize query text by applying the following regex pipeline in SQL, in order: (1) truncate to 2000 characters, (2) replace UUIDs with `<UUID>`, (3) replace dates/timestamps with `<DATE>`, (4) replace standalone numbers with `<NUM>`, (5) compress whitespace to single spaces.
- **FR-010**: System MUST execute project/region queries asynchronously, logging a warning and continuing execution if any individual combination fails.
- **FR-011**: System MUST aggregate results across all project/region combinations in memory before writing reports (e.g., summing costs for the same user across projects).
- **FR-012**: System MUST generate `reports/spend_per_user.csv` with columns: `user_email`, `total_queries_executed`, `total_tib_billed`, `estimated_cost_usd`, sorted by `estimated_cost_usd` descending.
- **FR-013**: System MUST generate `reports/top_normalized_queries.csv` with columns: `normalized_blueprint`, `execution_count`, `unique_users`, `total_tib_billed`, `estimated_cost_usd`, `avg_cost_per_run_usd`, filtered to `execution_count > 5`, sorted by `estimated_cost_usd` descending, limited to top 100.
- **FR-014**: System MUST generate `reports/top_user_query_matrix.csv` with columns: `user_email`, `query_rank`, `normalized_blueprint`, `execution_count`, `estimated_cost_usd`, showing the top 5 most expensive normalized blueprints per user using a window function ranking by `total_bytes_billed` descending.
- **FR-015**: System MUST provide clear console progress updates indicating which project/region combination is currently being processed.
- **FR-016**: System MUST create the `./reports` output directory if it does not already exist.

### Key Entities

- **Job Record**: A completed BigQuery query job extracted from INFORMATION_SCHEMA, with attributes including user email, query text, bytes billed, creation time, job type, state, cache hit status, and statement type.
- **Normalized Blueprint**: A processed version of query text where dynamic values (UUIDs, dates, numbers) are replaced with placeholders and whitespace is compressed, enabling grouping of functionally identical queries.
- **User Spend**: An aggregated record associating a user email with their total query count, total TiB billed, and estimated USD cost across all projects and regions.
- **Query Pattern**: A normalized blueprint with associated aggregate metrics (execution count, unique user count, total cost, average cost per run) representing a recurring query workload.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can generate a complete cost audit across 2+ projects and 2+ regions in a single CLI invocation.
- **SC-002**: Queries that differ only by UUIDs, dates, numeric IDs, or whitespace are grouped into the same normalized blueprint with 100% consistency.
- **SC-003**: The per-user spend report accurately reflects the sum of costs across all queried projects and regions, with no double-counting of cached or script-parent jobs.
- **SC-004**: All three CSV reports are generated and written to the local filesystem upon successful execution.
- **SC-005**: The tool completes execution for a 30-day date range across 2 projects and 2 regions within 5 minutes under normal network conditions.
- **SC-006**: Running the tool itself does not scan unbounded INFORMATION_SCHEMA data — all queries are partition-pruned to the user-specified date range.
- **SC-007**: The top normalized queries report surfaces at least 80% of identifiable recurring tooling workloads (execution count > 5) in the audited period.
- **SC-008**: Users can identify their top 5 most expensive query patterns per person, enabling targeted cost optimization conversations with specific teams.

## Assumptions

- Users have pre-configured Google Cloud Application Default Credentials (`gcloud auth application-default login`) before running the tool.
- The BigQuery on-demand pricing rate of $6.25 per TiB is the applicable rate. Organizations with flat-rate or editions pricing would need to adjust this value.
- The 2000-character truncation for query normalization is sufficient to capture the distinguishing structure of most queries.
- The `INFORMATION_SCHEMA.JOBS_BY_PROJECT` view is available in all specified regions for the specified projects.
- The `./reports` directory is an acceptable default output location (relative to the working directory).
