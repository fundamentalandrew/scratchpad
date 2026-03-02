#!/usr/bin/env node
'use strict';

const { parseArgs } = require('./src/cli');
const { generateUserSpendQuery, generateNormalizedQueryPatternsQuery, generateUserQueryMatrixQuery, buildParams } = require('./src/sql-generator');
const { executeQueries } = require('./src/bq-executor');
const { aggregateUserSpend, aggregateQueryPatterns, aggregateUserQueryMatrix } = require('./src/aggregator');
const { writeSpendPerUser, writeTopNormalizedQueries, writeUserQueryMatrix } = require('./src/report-writer');

async function main() {
  const args = parseArgs(process.argv);
  const params = buildParams(args.startDate, args.endDate);

  const querySets = [];
  for (const projectId of args.projects) {
    for (const region of args.regions) {
      querySets.push({
        projectId,
        region,
        queries: {
          userSpend: generateUserSpendQuery(projectId, region),
          queryPatterns: generateNormalizedQueryPatternsQuery(projectId, region),
          userQueryMatrix: generateUserQueryMatrixQuery(projectId, region),
        },
        params,
      });
    }
  }

  const { succeeded, failed, total } = await executeQueries(querySets);

  if (succeeded.length === 0) {
    console.error('Error: All project/region combinations failed. No data retrieved.');
    process.exit(1);
  }

  const userSpendRows = succeeded.map(s => s.results.userSpend);
  const userSpend = aggregateUserSpend(userSpendRows);

  const queryPatternRows = succeeded.map(s => s.results.queryPatterns);
  const queryPatterns = aggregateQueryPatterns(queryPatternRows);

  const matrixRows = succeeded.map(s => s.results.userQueryMatrix);
  const userQueryMatrix = aggregateUserQueryMatrix(matrixRows);

  const spendResult = await writeSpendPerUser(userSpend);
  const patternsResult = await writeTopNormalizedQueries(queryPatterns);
  const matrixResult = await writeUserQueryMatrix(userQueryMatrix);

  console.log('');
  if (failed.length > 0) {
    console.log(`Warning: ${failed.length} of ${total} project/region combinations failed.`);
  }
  console.log(`Results from ${succeeded.length} of ${total} project/region combinations.`);
  console.log('Reports written to ./reports/');
  console.log(`  - spend_per_user.csv (${spendResult.count} users)`);
  console.log(`  - top_normalized_queries.csv (${patternsResult.count} patterns)`);
  console.log(`  - top_user_query_matrix.csv (${matrixResult.count} rows)`);
}

main().catch(err => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
