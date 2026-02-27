'use strict';

const COST_FORMULA = '(total_bytes_billed / POWER(1024, 4)) * 6.25';
const TIB_FORMULA = 'total_bytes_billed / POWER(1024, 4)';

function buildFromClause(projectId, region) {
  return `\`${projectId}\`.\`region-${region}\`.INFORMATION_SCHEMA.JOBS_BY_PROJECT`;
}

function buildWhereClause() {
  return `
  WHERE creation_time >= TIMESTAMP(@startDate)
    AND creation_time <= TIMESTAMP(CONCAT(@endDate, ' 23:59:59'))
    AND job_type = 'QUERY'
    AND state = 'DONE'
    AND cache_hit != TRUE
    AND statement_type != 'SCRIPT'`;
}

function buildParams(startDate, endDate) {
  return { startDate, endDate };
}

function buildNormalizedBlueprint() {
  return `REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            SUBSTR(query, 1, 2000),
            r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<UUID>'
          ),
          r'\\d{4}[-_/]?\\d{2}[-_/]?\\d{2}([ ][0-9:.]+)?', '<DATE>'
        ),
        r'\\b\\d+\\b', '<NUM>'
      ),
      r'\\s+', ' '
    ),
    r'^\\s+|\\s+$', ''
  ) AS normalized_blueprint`;
}

function generateNormalizedQueryPatternsQuery(projectId, region) {
  const from = buildFromClause(projectId, region);
  const where = buildWhereClause();
  const blueprint = buildNormalizedBlueprint();

  const query = `
SELECT
  ${blueprint},
  COUNT(*) AS execution_count,
  COUNT(DISTINCT user_email) AS unique_users,
  ARRAY_AGG(DISTINCT user_email) AS user_emails,
  SUM(${TIB_FORMULA}) AS total_tib_billed,
  SUM(${COST_FORMULA}) AS estimated_cost_usd
FROM ${from}
${where}
GROUP BY normalized_blueprint
HAVING COUNT(*) > 5
ORDER BY estimated_cost_usd DESC
LIMIT 100`;

  return query;
}

function generateUserSpendQuery(projectId, region) {
  const from = buildFromClause(projectId, region);
  const where = buildWhereClause();

  const query = `
SELECT
  user_email,
  COUNT(*) AS total_queries_executed,
  SUM(${TIB_FORMULA}) AS total_tib_billed,
  SUM(${COST_FORMULA}) AS estimated_cost_usd
FROM ${from}
${where}
GROUP BY user_email`;

  return query;
}

function generateUserQueryMatrixQuery(projectId, region) {
  const from = buildFromClause(projectId, region);
  const where = buildWhereClause();
  const blueprint = buildNormalizedBlueprint();

  const query = `
WITH ranked AS (
  SELECT
    user_email,
    ${blueprint},
    COUNT(*) AS execution_count,
    SUM(${TIB_FORMULA}) AS total_tib_billed,
    SUM(total_bytes_billed) AS total_bytes_billed,
    SUM(${COST_FORMULA}) AS estimated_cost_usd,
    ROW_NUMBER() OVER(PARTITION BY user_email ORDER BY SUM(total_bytes_billed) DESC) AS query_rank
  FROM ${from}
  ${where}
  GROUP BY user_email, normalized_blueprint
)
SELECT
  user_email,
  query_rank,
  normalized_blueprint,
  execution_count,
  total_bytes_billed,
  estimated_cost_usd
FROM ranked
WHERE query_rank <= 5
ORDER BY user_email, query_rank`;

  return query;
}

module.exports = {
  buildFromClause,
  buildWhereClause,
  buildNormalizedBlueprint,
  buildParams,
  generateUserSpendQuery,
  generateNormalizedQueryPatternsQuery,
  generateUserQueryMatrixQuery,
};
