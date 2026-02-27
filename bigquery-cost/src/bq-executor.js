'use strict';

const { BigQuery } = require('@google-cloud/bigquery');

const bigquery = new BigQuery();

async function executeSingleCombo(projectId, region, queries, params) {
  const regionResults = {};
  for (const [queryName, sql] of Object.entries(queries)) {
    const [rows] = await bigquery.query({
      query: sql,
      params,
      location: region,
    });
    regionResults[queryName] = rows;
  }
  return regionResults;
}

async function executeQueries(querySets) {
  const results = await Promise.allSettled(
    querySets.map(async ({ projectId, region, queries, params }) => {
      console.log(`Processing ${projectId} / ${region}...`);
      try {
        const regionResults = await executeSingleCombo(projectId, region, queries, params);
        return { projectId, region, results: regionResults };
      } catch (err) {
        console.log(`Warning: ${projectId} / ${region} \u2014 ${err.message || err}, skipping.`);
        throw err;
      }
    })
  );

  const succeeded = [];
  const failed = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      succeeded.push(result.value);
    } else {
      failed.push(result.reason);
    }
  }

  return { succeeded, failed, total: querySets.length };
}

module.exports = { executeQueries };
