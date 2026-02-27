'use strict';

const { createObjectCsvWriter } = require('csv-writer');
const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(process.cwd(), 'reports');

function ensureReportsDir() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

async function writeCsv(filename, headers, records) {
  ensureReportsDir();
  const filePath = path.join(REPORTS_DIR, filename);
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers,
  });
  await csvWriter.writeRecords(records);
  return { filePath, count: records.length };
}

async function writeSpendPerUser(records) {
  const headers = [
    { id: 'user_email', title: 'user_email' },
    { id: 'total_queries_executed', title: 'total_queries_executed' },
    { id: 'total_tib_billed', title: 'total_tib_billed' },
    { id: 'estimated_cost_usd', title: 'estimated_cost_usd' },
  ];
  return writeCsv('spend_per_user.csv', headers, records);
}

async function writeTopNormalizedQueries(records) {
  const headers = [
    { id: 'normalized_blueprint', title: 'normalized_blueprint' },
    { id: 'execution_count', title: 'execution_count' },
    { id: 'unique_users', title: 'unique_users' },
    { id: 'total_tib_billed', title: 'total_tib_billed' },
    { id: 'estimated_cost_usd', title: 'estimated_cost_usd' },
    { id: 'avg_cost_per_run_usd', title: 'avg_cost_per_run_usd' },
  ];
  return writeCsv('top_normalized_queries.csv', headers, records);
}

async function writeUserQueryMatrix(records) {
  const headers = [
    { id: 'user_email', title: 'user_email' },
    { id: 'query_rank', title: 'query_rank' },
    { id: 'normalized_blueprint', title: 'normalized_blueprint' },
    { id: 'execution_count', title: 'execution_count' },
    { id: 'estimated_cost_usd', title: 'estimated_cost_usd' },
  ];
  return writeCsv('top_user_query_matrix.csv', headers, records);
}

module.exports = { writeCsv, writeSpendPerUser, writeTopNormalizedQueries, writeUserQueryMatrix, REPORTS_DIR };
