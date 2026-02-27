# CLI Contract: bq-analyzer

**Date**: 2026-02-27
**Feature Branch**: `001-bq-cost-analytics`

## Command Signature

```
node bq-analyzer.js --start-date <YYYY-MM-DD> --end-date <YYYY-MM-DD> --projects <id,...> --regions <region,...>
```

## Arguments

| Flag           | Required | Format                         | Example                     |
| -------------- | -------- | ------------------------------ | --------------------------- |
| `--start-date` | Yes      | `YYYY-MM-DD`                   | `2026-02-01`                |
| `--end-date`   | Yes      | `YYYY-MM-DD`                   | `2026-02-28`                |
| `--projects`   | Yes      | Comma-separated GCP Project IDs | `data-prod-1,app-prod-2`   |
| `--regions`    | Yes      | Comma-separated BQ regions     | `europe-west2,us`           |

## Validation Rules

- `--start-date` and `--end-date` must match `/^\d{4}-\d{2}-\d{2}$/` and parse to valid dates
- `--start-date` must be <= `--end-date`
- `--projects` must contain at least one non-empty value after splitting on commas
- `--regions` must contain at least one non-empty value after splitting on commas

## Exit Codes

| Code | Meaning                                                |
| ---- | ------------------------------------------------------ |
| 0    | Success — all reports generated                        |
| 1    | Argument validation failure (missing/invalid arguments) |
| 1    | All project/region combinations failed (no data)       |

## stdout (Console Output)

Progress messages during execution:

```
Processing project-a / europe-west2...
Processing project-a / us...
Processing project-b / europe-west2...
Warning: project-b / us — BigQuery not enabled in this region, skipping.
Processing project-b / us... skipped.

Reports written to ./reports/
  - spend_per_user.csv (42 users)
  - top_normalized_queries.csv (87 patterns)
  - top_user_query_matrix.csv (210 rows)
```

## stderr (Error Output)

Validation errors and fatal failures written to stderr:

```
Error: --start-date is required
Error: Invalid date format for --end-date: "Feb 2026" (expected YYYY-MM-DD)
Error: --start-date (2026-03-01) must be before or equal to --end-date (2026-02-01)
Error: All project/region combinations failed. No data retrieved.
```

## Output Files

All written to `./reports/` (created automatically if missing).

### spend_per_user.csv

```csv
user_email,total_queries_executed,total_tib_billed,estimated_cost_usd
analytics-bot@project-a.iam.gserviceaccount.com,12847,3.45,21.56
alice@company.com,342,1.22,7.63
```

### top_normalized_queries.csv

```csv
normalized_blueprint,execution_count,unique_users,total_tib_billed,estimated_cost_usd,avg_cost_per_run_usd
SELECT <NUM> FROM `dataset`.`table_<DATE>` WHERE id = <NUM> AND session = '<UUID>',8432,12,45.6,285.00,0.034
```

### top_user_query_matrix.csv

```csv
user_email,query_rank,normalized_blueprint,execution_count,estimated_cost_usd
analytics-bot@project-a.iam.gserviceaccount.com,1,SELECT <NUM> FROM ...,4521,15.32
analytics-bot@project-a.iam.gserviceaccount.com,2,INSERT INTO ...,3210,4.21
```
