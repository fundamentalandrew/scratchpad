# Product Brief: CSV Export for Analytics Dashboard

## Overview
We want to let users export their analytics data as CSV files from the dashboard. This should be a simple button click that generates the file and downloads it.

## Requirements
- Add a "Export CSV" button to the analytics dashboard page
- Use our existing MongoDB aggregation pipeline to pull the data
- Generate the CSV server-side and stream it to the user
- Support date range filtering (last 7 days, 30 days, custom range)
- Include all metrics: page views, unique visitors, bounce rate, avg session duration

## Technical Notes
- Just add a new REST endpoint at `/api/v1/analytics/export`
- Use the `json2csv` npm package for conversion
- Store a copy of each export in S3 for auditing
- No need for auth since the dashboard is already behind our login

## Timeline
- Should be a 2-day task for one engineer
- Ship by end of sprint

## Acceptance Criteria
- User clicks button, CSV downloads
- CSV contains correct data matching the dashboard
- Works for all time ranges
