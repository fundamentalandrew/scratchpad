# Quickstart: BigQuery FinOps Cost Analytics CLI

**Feature Branch**: `001-bq-cost-analytics`

## Prerequisites

1. **Node.js v18+** installed
2. **Google Cloud SDK** installed with Application Default Credentials configured:
   ```bash
   gcloud auth application-default login
   ```
3. IAM permissions: `bigquery.jobs.listAll` on each target project (typically via `roles/bigquery.resourceViewer` or `roles/bigquery.admin`)

## Install

```bash
npm install
```

## Run

```bash
node bq-analyzer.js \
  --start-date 2026-02-01 \
  --end-date 2026-02-28 \
  --projects data-prod-1,app-prod-2 \
  --regions europe-west2,us
```

## Output

Three CSV files in `./reports/`:

| File                        | What it answers                                  |
| --------------------------- | ------------------------------------------------ |
| `spend_per_user.csv`        | Who is spending the most on BigQuery compute?    |
| `top_normalized_queries.csv`| Which recurring query patterns cost the most?    |
| `top_user_query_matrix.csv` | What are each user's top 5 most expensive queries? |

## Common Issues

- **"BigQuery not enabled in this region"**: Expected for project/region combinations where BQ isn't used. The tool skips and continues.
- **"All project/region combinations failed"**: Check that your ADC credentials have the correct IAM permissions on the target projects.
- **Cost formula**: Uses $6.25/TiB on-demand pricing. If you use flat-rate or editions pricing, the cost figures will not reflect your actual billing.
