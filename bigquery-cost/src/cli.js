'use strict';

const { Command } = require('commander');

const ALL_BIGQUERY_REGIONS = [
  // Multi-regions
  'us', 'eu',
  // Americas
  'us-central1', 'us-east1', 'us-east4', 'us-east5',
  'us-south1', 'us-west1', 'us-west2', 'us-west3', 'us-west4',
  'northamerica-northeast1', 'northamerica-northeast2',
  'southamerica-east1', 'southamerica-west1',
  // Europe
  'europe-central2', 'europe-north1', 'europe-southwest1',
  'europe-west1', 'europe-west2', 'europe-west3', 'europe-west4',
  'europe-west6', 'europe-west8', 'europe-west9', 'europe-west12',
  // Asia Pacific
  'asia-east1', 'asia-east2',
  'asia-northeast1', 'asia-northeast2', 'asia-northeast3',
  'asia-south1', 'asia-south2',
  'asia-southeast1', 'asia-southeast2',
  'australia-southeast1', 'australia-southeast2',
  // Middle East & Africa
  'me-central1', 'me-central2', 'me-west1',
  'africa-south1',
];

function parseArgs(argv) {
  const program = new Command();

  program
    .name('bq-analyzer')
    .description('BigQuery FinOps Cost Analytics CLI')
    .requiredOption('--start-date <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--end-date <date>', 'End date (YYYY-MM-DD)')
    .requiredOption('--projects <items>', 'Comma-separated GCP Project IDs')
    .option('--regions <items>', 'Comma-separated BigQuery regions')
    .option('--all-regions', 'Scan all known BigQuery regions');

  program.parse(argv);
  const opts = program.opts();

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(opts.startDate)) {
    console.error(`Error: Invalid date format for --start-date: "${opts.startDate}" (expected YYYY-MM-DD)`);
    process.exit(1);
  }
  if (!dateRegex.test(opts.endDate)) {
    console.error(`Error: Invalid date format for --end-date: "${opts.endDate}" (expected YYYY-MM-DD)`);
    process.exit(1);
  }

  function validateDate(dateStr, flag) {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) {
      console.error(`Error: Invalid date for ${flag}: "${dateStr}"`);
      process.exit(1);
    }
    const roundTrip = d.toISOString().slice(0, 10);
    if (roundTrip !== dateStr) {
      console.error(`Error: Invalid date for ${flag}: "${dateStr}" (resolved to ${roundTrip})`);
      process.exit(1);
    }
    return d;
  }

  const startDate = validateDate(opts.startDate, '--start-date');
  const endDate = validateDate(opts.endDate, '--end-date');

  if (startDate > endDate) {
    console.error(`Error: --start-date (${opts.startDate}) must be before or equal to --end-date (${opts.endDate})`);
    process.exit(1);
  }

  const projects = opts.projects.split(',').map(p => p.trim()).filter(Boolean);
  const regions = opts.regions.split(',').map(r => r.trim()).filter(Boolean);

  if (projects.length === 0) {
    console.error('Error: --projects must contain at least one project ID');
    process.exit(1);
  }
  if (regions.length === 0) {
    console.error('Error: --regions must contain at least one region');
    process.exit(1);
  }

  return {
    startDate: opts.startDate,
    endDate: opts.endDate,
    projects,
    regions,
  };
}

module.exports = { parseArgs };
