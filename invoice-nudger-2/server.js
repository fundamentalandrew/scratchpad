const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper to read data
const readData = () => {
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data);
};

// Helper to write data
const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Nudge Logic Engine
const generateNudges = (data) => {
  const nudges = [];
  
  // Calculate rankings based on clearance rate (mocked)
  // For this prototype, we'll just use the pre-defined rankings in clientGroups
  
  data.invoices.forEach(inv => {
    if (inv.status === 'cleared') return;

    let nudge = {
      invoiceId: inv.id,
      clientName: inv.clientName,
      amount: inv.amount,
      daysPending: inv.daysPending,
      type: '',
      message: '',
      actions: []
    };

    if (inv.daysPending <= 5) {
      nudge.type = 'Friction Reduction';
      nudge.message = `You have ${inv.status === 'unsent' ? 'an unsent' : 'a pending'} invoice for ${inv.clientName}. It is waiting in our Intelligence platform ready to ${inv.status === 'unsent' ? 'send' : 'follow up'}.`;
      nudge.actions = [{ label: 'Go to Intelligence Platform', action: 'send' }];
    } else if (inv.daysPending <= 14) {
      const group = data.clientGroups.find(g => g.id === inv.clientGroupId);
      const percentile = Math.round((1 - group.ranking) * 100);
      nudge.type = 'Social Proof & Gamification';
      nudge.message = `Performance Alert: The ${inv.clientName} group is currently in the bottom ${percentile}% for invoice clearance across the media team. You have this unpaid invoice remaining to improve your client group's ranking this week.`;
      nudge.actions = [{ label: 'Follow Up Now', action: 'send' }];
    } else {
      nudge.type = 'Loss Aversion & Real Stakes';
      nudge.message = `Action Required: £${inv.amount.toLocaleString()} remains uncollected from ${inv.clientName} for ${inv.daysPending}+ days. Leaving this pending jeopardizes the CFO's quarterly cash flow targets and puts the department's bonus pool at risk. Please escalate to Account Direction or follow up today.`;
      nudge.actions = [
        { label: 'Follow Up Today', action: 'send' },
        { label: 'Escalate to Account Direction', action: 'escalate' }
      ];
    }
    nudges.push(nudge);
  });

  return nudges;
};

// API: Get all nudges
app.get('/api/nudges', (req, res) => {
  const data = readData();
  const nudges = generateNudges(data);
  res.json(nudges);
});

// API: Update invoice status
app.post('/api/action', (req, res) => {
  const { invoiceId, action } = req.body;
  const data = readData();
  const invoice = data.invoices.find(inv => inv.id === invoiceId);

  if (invoice) {
    if (action === 'send') {
      invoice.status = 'cleared'; // In a real app, this might go to 'sent_unpaid' then 'cleared'
    } else if (action === 'escalate') {
      invoice.status = 'escalated';
    }
    writeData(data);
    res.json({ success: true, message: `Invoice ${invoiceId} ${action === 'send' ? 'processed' : 'escalated'} successfully.` });
  } else {
    res.status(404).json({ success: false, message: 'Invoice not found' });
  }
});

// API: Manager Stats
app.get('/api/stats', (req, res) => {
  const data = readData();
  const total = data.invoices.length;
  const cleared = data.invoices.filter(inv => inv.status === 'cleared').length;
  const completionRate = Math.round((cleared / total) * 100);
  
  const rankings = data.clientGroups
    .map(g => ({
      name: g.name,
      score: Math.round(g.ranking * 100)
    }))
    .sort((a, b) => b.score - a.score);

  res.json({
    completionRate,
    rankings
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
