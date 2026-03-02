# BigQuery FinOps Cost Analytics CLI

Audit and analyze Google BigQuery compute costs across multiple GCP projects and regions. Groups structurally unique but functionally identical queries using regex-based normalization, calculates exact USD costs, and outputs actionable CSV reports.

## Prerequisites

- **Node.js** v18+
- **Google Cloud SDK** with Application Default Credentials configured:
  ```bash
  gcloud auth application-default login
  ```
- BigQuery Job User (or higher) role on each target GCP project

## Installation

```bash
npm install
```

## Usage

```bash
node bq-analyzer.js \
  --start-date 2026-02-01 \
  --end-date 2026-02-28 \
  --projects data-prod-1,app-prod-2 \
  --regions europe-west2,us
```

### Required Arguments

| Argument | Description | Example |
|---|---|---|
| `--start-date` | Start date (YYYY-MM-DD) | `2026-02-01` |
| `--end-date` | End date (YYYY-MM-DD) | `2026-02-28` |
| `--projects` | Comma-separated GCP Project IDs | `proj-a,proj-b` |
| `--regions` | Comma-separated BigQuery regions | `europe-west2,us` |

## Output

Three CSV reports are written to `./reports/`:

### `spend_per_user.csv`
Per-user cost breakdown sorted by spend descending.

Columns: `user_email`, `total_queries_executed`, `total_tib_billed`, `estimated_cost_usd`

### `top_normalized_queries.csv`
Top 100 normalized query patterns with >5 executions, sorted by cost descending. Queries are normalized by replacing UUIDs, dates, numbers, and whitespace to group structurally identical queries.

Columns: `normalized_blueprint`, `execution_count`, `unique_users`, `total_tib_billed`, `estimated_cost_usd`, `avg_cost_per_run_usd`

### `top_user_query_matrix.csv`
Top 5 most expensive query patterns per user.

Columns: `user_email`, `query_rank`, `normalized_blueprint`, `execution_count`, `estimated_cost_usd`

## Cost Model

Uses BigQuery on-demand pricing: **$6.25 per TiB** of data billed. Cached queries (0 bytes processed) and script parent jobs are excluded.

## How It Works

1. Parses CLI arguments and validates dates/identifiers
2. Generates three SQL queries per project/region combination against `INFORMATION_SCHEMA.JOBS_BY_PROJECT`
3. Executes all combinations concurrently via `Promise.allSettled` (failed combos are warned and skipped)
4. Aggregates results across projects/regions in memory (deduplicating users, merging pattern counts)
5. Writes the three CSV reports
