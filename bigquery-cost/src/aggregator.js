'use strict';

function aggregateUserSpend(resultSets) {
  const map = new Map();

  for (const rows of resultSets) {
    if (!rows) continue;
    for (const row of rows) {
      if (!row || !row.user_email) continue;
      const key = row.user_email;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.total_queries_executed += row.total_queries_executed;
        existing.total_tib_billed += row.total_tib_billed;
        existing.estimated_cost_usd += row.estimated_cost_usd;
      } else {
        map.set(key, {
          user_email: row.user_email,
          total_queries_executed: row.total_queries_executed,
          total_tib_billed: row.total_tib_billed,
          estimated_cost_usd: row.estimated_cost_usd,
        });
      }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.estimated_cost_usd - a.estimated_cost_usd);
}

function aggregateQueryPatterns(resultSets) {
  const map = new Map();

  for (const rows of resultSets) {
    if (!rows) continue;
    for (const row of rows) {
      if (!row || !row.normalized_blueprint) continue;
      const key = row.normalized_blueprint;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.execution_count += row.execution_count;
        existing.total_tib_billed += row.total_tib_billed;
        existing.estimated_cost_usd += row.estimated_cost_usd;
        if (row.user_emails) {
          for (const email of row.user_emails) {
            existing.userEmailSet.add(email);
          }
        }
      } else {
        const userEmailSet = new Set();
        if (row.user_emails) {
          for (const email of row.user_emails) {
            userEmailSet.add(email);
          }
        }
        map.set(key, {
          normalized_blueprint: row.normalized_blueprint,
          execution_count: row.execution_count,
          total_tib_billed: row.total_tib_billed,
          estimated_cost_usd: row.estimated_cost_usd,
          userEmailSet,
        });
      }
    }
  }

  return Array.from(map.values())
    .filter(r => r.execution_count > 5)
    .map(r => ({
      normalized_blueprint: r.normalized_blueprint,
      execution_count: r.execution_count,
      unique_users: r.userEmailSet.size,
      total_tib_billed: r.total_tib_billed,
      estimated_cost_usd: r.estimated_cost_usd,
      avg_cost_per_run_usd: r.execution_count > 0 ? r.estimated_cost_usd / r.execution_count : 0,
    }))
    .sort((a, b) => b.estimated_cost_usd - a.estimated_cost_usd)
    .slice(0, 100);
}

function aggregateUserQueryMatrix(resultSets) {
  const map = new Map();

  for (const rows of resultSets) {
    if (!rows) continue;
    for (const row of rows) {
      if (!row || !row.user_email || !row.normalized_blueprint) continue;
      const key = `${row.user_email}::${row.normalized_blueprint}`;
      if (map.has(key)) {
        const existing = map.get(key);
        existing.execution_count += row.execution_count;
        existing.estimated_cost_usd += row.estimated_cost_usd;
        existing.total_bytes_billed += (row.total_bytes_billed || 0);
      } else {
        map.set(key, {
          user_email: row.user_email,
          normalized_blueprint: row.normalized_blueprint,
          execution_count: row.execution_count,
          estimated_cost_usd: row.estimated_cost_usd,
          total_bytes_billed: row.total_bytes_billed || 0,
        });
      }
    }
  }

  const byUser = new Map();
  for (const entry of map.values()) {
    if (!byUser.has(entry.user_email)) {
      byUser.set(entry.user_email, []);
    }
    byUser.get(entry.user_email).push(entry);
  }

  const result = [];
  for (const [userEmail, entries] of byUser) {
    entries.sort((a, b) => b.total_bytes_billed - a.total_bytes_billed);
    const top5 = entries.slice(0, 5);
    for (let i = 0; i < top5.length; i++) {
      result.push({
        user_email: userEmail,
        query_rank: i + 1,
        normalized_blueprint: top5[i].normalized_blueprint,
        execution_count: top5[i].execution_count,
        estimated_cost_usd: top5[i].estimated_cost_usd,
      });
    }
  }

  result.sort((a, b) => {
    if (a.user_email < b.user_email) return -1;
    if (a.user_email > b.user_email) return 1;
    return a.query_rank - b.query_rank;
  });

  return result;
}

module.exports = { aggregateUserSpend, aggregateQueryPatterns, aggregateUserQueryMatrix };
