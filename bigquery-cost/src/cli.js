'use strict';

const { Command } = require('commander');

function parseArgs(argv) {
  const program = new Command();

  program
    .name('bq-analyzer')
    .description('BigQuery FinOps Cost Analytics CLI')
    .requiredOption('--start-date <date>', 'Start date (YYYY-MM-DD)')
    .requiredOption('--end-date <date>', 'End date (YYYY-MM-DD)')
    .requiredOption('--projects <items>', 'Comma-separated GCP Project IDs')
    .requiredOption('--regions <items>', 'Comma-separated BigQuery regions');

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

  const startDate = new Date(opts.startDate);
  const endDate = new Date(opts.endDate);

  if (isNaN(startDate.getTime())) {
    console.error(`Error: Invalid date for --start-date: "${opts.startDate}"`);
    process.exit(1);
  }
  if (isNaN(endDate.getTime())) {
    console.error(`Error: Invalid date for --end-date: "${opts.endDate}"`);
    process.exit(1);
  }

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
