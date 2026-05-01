const ACTIVE_STATUSES = new Set(["unsent", "sent_unpaid"]);
const COMPLETED_STATUSES = new Set(["paid", "sent", "follow_up_logged", "escalated"]);

function indexById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(amount);
}

function roundToNearestFive(value) {
  return Math.max(5, Math.min(100, Math.round(value / 5) * 5));
}

function getTier(invoice) {
  if (invoice.status === "unsent" && invoice.days_pending >= 0 && invoice.days_pending <= 5) {
    return 1;
  }

  if (ACTIVE_STATUSES.has(invoice.status) && invoice.days_pending >= 6 && invoice.days_pending <= 14) {
    return 2;
  }

  if (invoice.status === "sent_unpaid" && invoice.days_pending >= 15) {
    return 3;
  }

  return null;
}

function computeMetrics(db) {
  const teamMembers = indexById(db.teamMembers);
  const invoicesByGroup = new Map();

  for (const group of db.clientGroups) {
    invoicesByGroup.set(group.id, []);
  }

  for (const invoice of db.invoices) {
    const groupInvoices = invoicesByGroup.get(invoice.clientGroupId);
    if (groupInvoices) {
      groupInvoices.push(invoice);
    }
  }

  const groupMetrics = db.clientGroups.map((group) => {
    const groupInvoices = invoicesByGroup.get(group.id) || [];
    const activeInvoices = groupInvoices.filter((invoice) => ACTIVE_STATUSES.has(invoice.status));
    const completedInvoices = groupInvoices.filter((invoice) => COMPLETED_STATUSES.has(invoice.status));
    const outstandingAmount = activeInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const oldestPendingDays = activeInvoices.reduce((max, invoice) => Math.max(max, invoice.days_pending), 0);
    const totalInvoices = groupInvoices.length;
    const completedCount = completedInvoices.length;
    const completionRate = totalInvoices === 0 ? 100 : Math.round((completedCount / totalInvoices) * 100);

    return {
      id: group.id,
      name: group.name,
      owner: teamMembers.get(group.ownerId) || null,
      intelligencePath: group.intelligencePath,
      quarterlyCashTarget: group.quarterlyCashTarget,
      totalInvoices,
      completedCount,
      activeCount: activeInvoices.length,
      unsentCount: activeInvoices.filter((invoice) => invoice.status === "unsent").length,
      unpaidCount: activeInvoices.filter((invoice) => invoice.status === "sent_unpaid").length,
      outstandingAmount,
      outstandingAmountLabel: formatCurrency(outstandingAmount),
      oldestPendingDays,
      completionRate
    };
  });

  const rankedGroups = [...groupMetrics]
    .sort((first, second) => {
      if (second.completionRate !== first.completionRate) {
        return second.completionRate - first.completionRate;
      }

      if (first.outstandingAmount !== second.outstandingAmount) {
        return first.outstandingAmount - second.outstandingAmount;
      }

      return first.name.localeCompare(second.name);
    })
    .map((group, index, ranked) => {
      const rank = index + 1;
      const rankFromBottom = ranked.length - index;

      return {
        ...group,
        rank,
        rankLabel: `#${rank} of ${ranked.length}`,
        bottomPercent: roundToNearestFive((rankFromBottom / ranked.length) * 100)
      };
    });

  const groupMetricsById = indexById(rankedGroups);
  const activeInvoices = db.invoices.filter((invoice) => ACTIVE_STATUSES.has(invoice.status));
  const completedInvoices = db.invoices.filter((invoice) => COMPLETED_STATUSES.has(invoice.status));
  const totalOutstanding = activeInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const overdueInvoices = activeInvoices.filter((invoice) => invoice.days_pending >= 15);
  const totalInvoices = db.invoices.length;
  const overallCompletionRate = totalInvoices === 0 ? 100 : Math.round((completedInvoices.length / totalInvoices) * 100);

  return {
    overall: {
      totalInvoices,
      activeInvoices: activeInvoices.length,
      completedInvoices: completedInvoices.length,
      completionRate: overallCompletionRate,
      totalOutstanding,
      totalOutstandingLabel: formatCurrency(totalOutstanding),
      overdueCount: overdueInvoices.length,
      overdueAmount: overdueInvoices.reduce((sum, invoice) => sum + invoice.amount, 0),
      overdueAmountLabel: formatCurrency(overdueInvoices.reduce((sum, invoice) => sum + invoice.amount, 0))
    },
    clientGroups: rankedGroups,
    clientGroupsById: groupMetricsById
  };
}

function buildNudgeFromInvoices({ tier, invoices, db, metrics }) {
  const clientGroups = indexById(db.clientGroups);
  const teamMembers = indexById(db.teamMembers);
  const firstInvoice = invoices[0];
  const group = clientGroups.get(firstInvoice.clientGroupId);
  const owner = teamMembers.get(firstInvoice.ownerId || group.ownerId);
  const groupMetric = metrics.clientGroupsById.get(group.id);
  const amount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const maxDaysPending = invoices.reduce((max, invoice) => Math.max(max, invoice.days_pending), 0);
  const count = invoices.length;
  const plural = count === 1 ? "invoice" : "invoices";

  if (tier === 1) {
    return {
      id: `tier-1-${group.id}-${owner.id}`,
      tier,
      severity: "standard",
      psychology: "Friction reduction",
      title: "Invoices Ready To Send",
      message: `You have ${count} ${plural} generated but unsent for ${group.name}. They are waiting in the Intelligence platform ready to send.`,
      evidence: `${formatCurrency(amount)} ready for dispatch. Oldest item: ${maxDaysPending} days pending.`,
      clientGroup: group.name,
      owner: owner.name,
      rankLabel: groupMetric.rankLabel,
      amount,
      amountLabel: formatCurrency(amount),
      maxDaysPending,
      invoiceIds: invoices.map((invoice) => invoice.id),
      action: {
        label: "Go to Intelligence Platform",
        apiAction: "go_to_platform",
        url: group.intelligencePath
      }
    };
  }

  if (tier === 2) {
    const standingText =
      groupMetric.bottomPercent <= 50
        ? `currently in the bottom ${groupMetric.bottomPercent}%`
        : `ranked ${groupMetric.rankLabel}`;

    return {
      id: `tier-2-${group.id}-${owner.id}`,
      tier,
      severity: "elevated",
      psychology: "Social proof and ranking",
      title: "Performance Alert",
      message: `The ${group.name} group is ${standingText} for invoice clearance across the media team. You have ${count} pending ${plural} remaining to improve the client group's ranking this week.`,
      evidence: `${formatCurrency(amount)} pending across ${count} ${plural}. Current completion rate: ${groupMetric.completionRate}%.`,
      clientGroup: group.name,
      owner: owner.name,
      rankLabel: groupMetric.rankLabel,
      amount,
      amountLabel: formatCurrency(amount),
      maxDaysPending,
      invoiceIds: invoices.map((invoice) => invoice.id),
      action: {
        label: "Go to Intelligence Platform",
        apiAction: "go_to_platform",
        url: group.intelligencePath
      }
    };
  }

  return {
    id: `tier-3-${group.id}-${owner.id}`,
    tier,
    severity: "critical",
    psychology: "Loss aversion and business stakes",
    title: "Action Required",
    message: `${formatCurrency(amount)} remains uncollected from ${group.name} for ${maxDaysPending}+ days. Leaving this pending jeopardizes the CFO's quarterly cash flow targets and puts the department's bonus pool at risk. Please escalate to Account Direction or follow up today.`,
    evidence: `${count} unpaid ${plural}. Client group rank: ${groupMetric.rankLabel}.`,
    clientGroup: group.name,
    owner: owner.name,
    rankLabel: groupMetric.rankLabel,
    amount,
    amountLabel: formatCurrency(amount),
    maxDaysPending,
    invoiceIds: invoices.map((invoice) => invoice.id),
    action: {
      label: "Escalate",
      apiAction: "escalate",
      url: group.intelligencePath
    }
  };
}

function buildNudges(db, metrics = computeMetrics(db)) {
  const buckets = new Map();

  for (const invoice of db.invoices) {
    const tier = getTier(invoice);
    if (!tier) {
      continue;
    }

    const ownerKey = invoice.ownerId || "unassigned";
    const key = `${tier}:${invoice.clientGroupId}:${ownerKey}`;
    const bucket = buckets.get(key) || { tier, invoices: [] };
    bucket.invoices.push(invoice);
    buckets.set(key, bucket);
  }

  return [...buckets.values()]
    .map((bucket) => buildNudgeFromInvoices({ ...bucket, db, metrics }))
    .sort((first, second) => {
      if (second.tier !== first.tier) {
        return second.tier - first.tier;
      }

      if (second.maxDaysPending !== first.maxDaysPending) {
        return second.maxDaysPending - first.maxDaysPending;
      }

      return second.amount - first.amount;
    });
}

function buildDashboardState(db) {
  const metrics = computeMetrics(db);
  const nudges = buildNudges(db, metrics);

  return {
    updatedAt: db.updatedAt,
    teamMembers: db.teamMembers,
    clientGroups: db.clientGroups,
    invoices: db.invoices,
    metrics: {
      overall: metrics.overall,
      clientGroups: metrics.clientGroups
    },
    nudges
  };
}

function applyNudgeAction(db, nudgeId, action) {
  const nudges = buildNudges(db);
  const nudge = nudges.find((item) => item.id === nudgeId);

  if (!nudge) {
    const error = new Error("Nudge not found or already resolved.");
    error.statusCode = 404;
    throw error;
  }

  if (action !== nudge.action.apiAction) {
    const error = new Error("Unsupported action for this nudge.");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const invoiceIds = new Set(nudge.invoiceIds);
  const nextInvoices = db.invoices.map((invoice) => {
    if (!invoiceIds.has(invoice.id)) {
      return invoice;
    }

    if (action === "escalate") {
      return {
        ...invoice,
        status: "escalated",
        lastAction: "Escalated to Account Direction",
        actionedAt: now
      };
    }

    return {
      ...invoice,
      status: invoice.status === "unsent" ? "sent" : "follow_up_logged",
      lastAction: invoice.status === "unsent" ? "Opened in Intelligence Platform and marked sent" : "Follow-up logged in Intelligence Platform",
      actionedAt: now
    };
  });

  return {
    db: {
      ...db,
      invoices: nextInvoices
    },
    confirmation: {
      title: "Action recorded",
      message: `${nudge.action.label} completed for ${nudge.clientGroup}. ${nudge.invoiceIds.length} ${nudge.invoiceIds.length === 1 ? "invoice has" : "invoices have"} been updated in the mock database.`,
      nudgeId,
      clientGroup: nudge.clientGroup,
      invoiceIds: nudge.invoiceIds
    }
  };
}

module.exports = {
  ACTIVE_STATUSES,
  buildDashboardState,
  buildNudges,
  applyNudgeAction,
  computeMetrics,
  formatCurrency
};
