let dashboardState = null;
let activeView = "chat";

const elements = {
  updatedAt: document.querySelector("#updatedAt"),
  resetData: document.querySelector("#resetData"),
  tabs: document.querySelectorAll(".tab"),
  views: {
    chat: document.querySelector("#chatView"),
    manager: document.querySelector("#managerView")
  },
  queueStats: document.querySelector("#queueStats"),
  nudgeCount: document.querySelector("#nudgeCount"),
  nudgeList: document.querySelector("#nudgeList"),
  metricGrid: document.querySelector("#metricGrid"),
  rankingBody: document.querySelector("#rankingBody"),
  toast: document.querySelector("#toast")
};

const moneyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0
});

function formatMoney(value) {
  return moneyFormatter.format(value || 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusText(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function setView(view) {
  activeView = view;

  for (const tab of elements.tabs) {
    tab.classList.toggle("is-active", tab.dataset.view === view);
  }

  for (const [viewName, element] of Object.entries(elements.views)) {
    element.classList.toggle("is-active", viewName === view);
  }
}

function showToast(title, message) {
  elements.toast.innerHTML = `
    <strong>${escapeHtml(title)}</strong>
    <span>${escapeHtml(message)}</span>
  `;
  elements.toast.classList.add("is-visible");

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 4200);
}

async function fetchState() {
  const response = await fetch("/api/state");
  if (!response.ok) {
    throw new Error("Unable to load dashboard state.");
  }

  dashboardState = await response.json();
  render();
}

async function postAction(nudgeId, action, button) {
  button.disabled = true;
  button.textContent = "Recording...";

  try {
    const response = await fetch(`/api/nudges/${encodeURIComponent(nudgeId)}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to record action.");
    }

    dashboardState = payload.state;
    render();
    showToast(payload.confirmation.title, payload.confirmation.message);
  } catch (error) {
    showToast("Action failed", error.message);
    render();
  }
}

async function resetData() {
  elements.resetData.disabled = true;
  elements.resetData.textContent = "Resetting...";

  try {
    const response = await fetch("/api/reset", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Unable to reset data.");
    }

    dashboardState = payload.state;
    render();
    showToast(payload.confirmation.title, payload.confirmation.message);
  } catch (error) {
    showToast("Reset failed", error.message);
  } finally {
    elements.resetData.disabled = false;
    elements.resetData.textContent = "Reset Demo Data";
  }
}

function renderQueueStats() {
  const { nudges, metrics } = dashboardState;
  const byTier = nudges.reduce(
    (summary, nudge) => {
      summary[nudge.tier] += 1;
      return summary;
    },
    { 1: 0, 2: 0, 3: 0 }
  );

  elements.queueStats.innerHTML = `
    <div class="queue-stat">
      <span>Total active nudges</span>
      <strong>${nudges.length}</strong>
    </div>
    <div class="queue-stat">
      <span>Tier 3 escalations</span>
      <strong>${byTier[3]}</strong>
    </div>
    <div class="queue-stat">
      <span>Tier 2 ranking alerts</span>
      <strong>${byTier[2]}</strong>
    </div>
    <div class="queue-stat">
      <span>Tier 1 send prompts</span>
      <strong>${byTier[1]}</strong>
    </div>
    <div class="queue-stat">
      <span>Outstanding exposure</span>
      <strong>${escapeHtml(metrics.overall.totalOutstandingLabel)}</strong>
    </div>
  `;
}

function renderNudges() {
  const { nudges } = dashboardState;
  elements.nudgeCount.textContent = statusText(nudges.length, "active", "active");

  if (nudges.length === 0) {
    elements.nudgeList.innerHTML = `
      <div class="empty-state">
        <strong>No active nudges</strong>
        <span>All currently actionable invoices have been sent, followed up, or escalated.</span>
      </div>
    `;
    return;
  }

  elements.nudgeList.innerHTML = nudges
    .map((nudge) => {
      return `
        <article class="nudge-card severity-${escapeHtml(nudge.severity)}">
          <div class="bot-avatar">SN</div>
          <div class="nudge-content">
            <div class="nudge-meta">
              <span>Smart Nudge Bot</span>
              <span>Tier ${nudge.tier}</span>
              <span>${escapeHtml(nudge.psychology)}</span>
            </div>
            <h2>${escapeHtml(nudge.title)}</h2>
            <p class="nudge-message">${escapeHtml(nudge.message)}</p>
            <div class="evidence-row">
              <span>${escapeHtml(nudge.clientGroup)}</span>
              <span>${escapeHtml(nudge.owner)}</span>
              <span>${escapeHtml(nudge.rankLabel)}</span>
              <span>${escapeHtml(nudge.evidence)}</span>
            </div>
            <div class="action-row">
              <button class="primary-button" type="button" data-nudge-id="${escapeHtml(nudge.id)}" data-action="${escapeHtml(nudge.action.apiAction)}">
                ${escapeHtml(nudge.action.label)}
              </button>
              <a class="text-link" href="${escapeHtml(nudge.action.url)}" target="_blank" rel="noreferrer">Internal record</a>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  for (const button of elements.nudgeList.querySelectorAll("[data-nudge-id]")) {
    button.addEventListener("click", () => {
      postAction(button.dataset.nudgeId, button.dataset.action, button);
    });
  }
}

function renderMetrics() {
  const { overall } = dashboardState.metrics;
  elements.metricGrid.innerHTML = `
    <article class="metric-card">
      <span>Overall Completion</span>
      <strong>${overall.completionRate}%</strong>
      <p>${overall.completedInvoices} of ${overall.totalInvoices} invoices no longer need action.</p>
    </article>
    <article class="metric-card">
      <span>Outstanding Exposure</span>
      <strong>${escapeHtml(overall.totalOutstandingLabel)}</strong>
      <p>${overall.activeInvoices} invoices are still active in the nudge queue.</p>
    </article>
    <article class="metric-card">
      <span>15+ Day Exposure</span>
      <strong>${escapeHtml(overall.overdueAmountLabel)}</strong>
      <p>${overall.overdueCount} invoices require escalation-level attention.</p>
    </article>
    <article class="metric-card">
      <span>Client Groups</span>
      <strong>${dashboardState.metrics.clientGroups.length}</strong>
      <p>Ranked against the current media team sample set.</p>
    </article>
  `;
}

function renderRankings() {
  const groups = dashboardState.metrics.clientGroups;
  elements.rankingBody.innerHTML = groups
    .map((group) => {
      return `
        <tr>
          <td><span class="rank-badge">${group.rankLabel}</span></td>
          <td>
            <strong>${escapeHtml(group.name)}</strong>
            <span>${escapeHtml(group.owner.channel)}</span>
          </td>
          <td>${escapeHtml(group.owner.name)}</td>
          <td>
            <div class="completion-cell">
              <span>${group.completionRate}%</span>
              <div class="progress-track" aria-hidden="true">
                <div class="progress-fill" style="width: ${group.completionRate}%"></div>
              </div>
            </div>
          </td>
          <td>${escapeHtml(group.outstandingAmountLabel)}</td>
          <td>${group.activeCount}</td>
          <td>${group.oldestPendingDays || "-"}${group.oldestPendingDays ? " days" : ""}</td>
        </tr>
      `;
    })
    .join("");
}

function render() {
  if (!dashboardState) {
    return;
  }

  const updatedAt = new Date(dashboardState.updatedAt);
  elements.updatedAt.textContent = `Updated ${updatedAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })}`;

  renderQueueStats();
  renderNudges();
  renderMetrics();
  renderRankings();
  setView(activeView);
}

for (const tab of elements.tabs) {
  tab.addEventListener("click", () => setView(tab.dataset.view));
}

elements.resetData.addEventListener("click", resetData);

fetchState().catch((error) => {
  showToast("Load failed", error.message);
});
