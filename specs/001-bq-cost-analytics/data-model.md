# Data Model: BigQuery FinOps Cost Analytics CLI

**Date**: 2026-02-27
**Feature Branch**: `001-bq-cost-analytics`

## Source Data

### JobRecord (from BigQuery INFORMATION_SCHEMA.JOBS_BY_PROJECT)

| Field               | Type      | Description                                      |
| ------------------- | --------- | ------------------------------------------------ |
| user_email          | string    | Email of the user or service account that ran the query |
| query               | string    | Raw SQL text of the executed query               |
| total_bytes_billed  | integer   | Bytes billed for the query (0 for cached queries) |
| creation_time       | timestamp | When the job was created                         |
| job_type            | string    | Type of job (QUERY, LOAD, EXTRACT, COPY)         |
| state               | string    | Job state (DONE, RUNNING, PENDING)               |
| cache_hit           | boolean   | Whether the query result was served from cache   |
| statement_type      | string    | SQL statement type (SELECT, INSERT, SCRIPT, etc.) |

**Filters applied at query time**:
- `job_type = 'QUERY'`
- `state = 'DONE'`
- `cache_hit != TRUE`
- `statement_type != 'SCRIPT'`
- `creation_time` within user-specified date range

### Derived: NormalizedJobRecord

| Field                | Type    | Description                                       |
| -------------------- | ------- | ------------------------------------------------- |
| user_email           | string  | From source                                       |
| normalized_blueprint | string  | Query text after normalization pipeline            |
| total_bytes_billed   | integer | From source                                       |
| estimated_cost_usd   | float   | `(total_bytes_billed / 1024^4) * 6.25`            |

**Normalization pipeline** (applied in SQL via chained REGEXP_REPLACE):
1. `SUBSTR(query, 1, 2000)` — truncate
2. Replace UUID pattern → `<UUID>`
3. Replace date/timestamp pattern → `<DATE>`
4. Replace standalone numbers → `<NUM>`
5. Compress whitespace → single space

## Aggregated Entities

### UserSpend (Report 1: spend_per_user.csv)

| Field                  | Type   | Description                              |
| ---------------------- | ------ | ---------------------------------------- |
| user_email             | string | Primary key — unique across all projects/regions |
| total_queries_executed | integer | Count of non-cached, non-script query jobs |
| total_tib_billed       | float  | Sum of bytes billed converted to TiB     |
| estimated_cost_usd     | float  | Sum of per-query costs                   |

**Aggregation**: GROUP BY user_email across all project/region results
**Sort**: estimated_cost_usd DESC

### QueryPattern (Report 2: top_normalized_queries.csv)

| Field                | Type    | Description                                |
| -------------------- | ------- | ------------------------------------------ |
| normalized_blueprint | string  | Primary key — the normalized query template |
| execution_count      | integer | Number of times this pattern was executed  |
| unique_users         | integer | Count of distinct user_emails              |
| total_tib_billed     | float   | Sum of bytes billed converted to TiB       |
| estimated_cost_usd   | float   | Sum of per-query costs                     |
| avg_cost_per_run_usd | float   | estimated_cost_usd / execution_count       |

**Aggregation**: GROUP BY normalized_blueprint across all project/region results
**Filter**: execution_count > 5
**Sort**: estimated_cost_usd DESC
**Limit**: 100

### UserQueryMatrix (Report 3: top_user_query_matrix.csv)

| Field                | Type    | Description                                  |
| -------------------- | ------- | -------------------------------------------- |
| user_email           | string  | The user                                     |
| query_rank           | integer | 1-5, rank by total_bytes_billed DESC per user |
| normalized_blueprint | string  | The normalized query template                |
| execution_count      | integer | Times this user ran this pattern             |
| estimated_cost_usd   | float   | Cost for this user running this pattern      |

**Aggregation**: GROUP BY (user_email, normalized_blueprint), then RANK by bytes billed per user
**Window**: ROW_NUMBER() OVER(PARTITION BY user_email ORDER BY total_bytes_billed DESC)
**Filter**: query_rank <= 5

## Entity Relationships

```
JobRecord (source)
  │
  ├──[normalize + aggregate by user_email]──→ UserSpend
  │
  ├──[normalize + aggregate by normalized_blueprint]──→ QueryPattern
  │
  └──[normalize + aggregate by (user_email, normalized_blueprint) + rank]──→ UserQueryMatrix
```

All three aggregations share the same source data and normalization pipeline. They differ only in GROUP BY keys and post-aggregation processing (filtering, ranking, limiting).
