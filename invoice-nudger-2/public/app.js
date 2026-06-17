document.addEventListener('DOMContentLoaded', () => {
    const showChatBtn = document.getElementById('showChat');
    const showManagerBtn = document.getElementById('showManager');
    const chatView = document.getElementById('chatView');
    const managerView = document.getElementById('managerView');
    const nudgeList = document.getElementById('nudgeList');
    const completionRateEl = document.getElementById('completionRate');
    const rankingList = document.getElementById('rankingList');
    const toastMessage = document.getElementById('toastMessage');
    const actionToast = new bootstrap.Toast(document.getElementById('actionToast'));

    // Navigation
    showChatBtn.addEventListener('click', () => {
        chatView.classList.remove('d-none');
        managerView.classList.add('d-none');
        loadNudges();
    });

    showManagerBtn.addEventListener('click', () => {
        managerView.classList.remove('d-none');
        chatView.classList.add('d-none');
        loadStats();
    });

    // Load Nudges
    async function loadNudges() {
        const response = await fetch('/api/nudges');
        const nudges = await response.json();
        
        nudgeList.innerHTML = '';
        if (nudges.length === 0) {
            nudgeList.innerHTML = '<div class="text-center text-muted p-5">No pending nudges. Great job!</div>';
            return;
        }

        nudges.forEach(nudge => {
            const card = document.createElement('div');
            card.className = 'nudge-card';
            card.innerHTML = `
                <div class="nudge-type">${nudge.type}</div>
                <div class="nudge-message">${nudge.message}</div>
                <div class="nudge-actions">
                    ${nudge.actions.map(action => `
                        <button class="btn btn-primary" onclick="handleAction('${nudge.invoiceId}', '${action.action}')">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            `;
            nudgeList.appendChild(card);
        });
    }

    // Load Stats
    async function loadStats() {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        completionRateEl.textContent = `${stats.completionRate}%`;
        
        rankingList.innerHTML = '';
        stats.rankings.forEach((rank, index) => {
            const item = document.createElement('li');
            item.className = 'list-group-item';
            item.innerHTML = `
                <span>${index + 1}. ${rank.name}</span>
                <span class="ranking-score">${rank.score}% Efficiency</span>
            `;
            rankingList.appendChild(item);
        });
    }

    // Handle Nudge Action
    window.handleAction = async (invoiceId, action) => {
        const response = await fetch('/api/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoiceId, action })
        });
        
        const result = await response.json();
        if (result.success) {
            toastMessage.textContent = result.message;
            actionToast.show();
            loadNudges(); // Refresh
        }
    };

    // Initial Load
    loadNudges();
});
