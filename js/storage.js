/**
 * Storage Manager for ChequeSlip
 * Manages local persistence for Accounts, History, and Settings.
 * 100% Client-side. No external servers or tracking.
 */

const STORAGE_KEYS = {
  ACCOUNTS: 'chequeslip_accounts',
  ACTIVE_ACCOUNT_ID: 'chequeslip_active_account_id',
  HISTORY: 'chequeslip_history',
  SETTINGS: 'chequeslip_settings'
};

const DEFAULT_SETTINGS = {
  googleWebhookUrl: '',
  bankTheme: 'universal', // 'universal', 'hdfc', 'sbi', 'icici', 'axis', 'kotak'
  autoSyncGoogle: false,
  autoNumberWordCase: 'TitleCase'
};

const SAMPLE_ACCOUNT = {
  id: 'acc_default_1',
  label: 'HDFC Bank - Current Account (Primary)',
  bankName: 'HDFC Bank',
  theme: 'hdfc',
  accountNumber: '50200045892147',
  accountHolderName: 'Apex Infotech Solutions Pvt Ltd',
  branch: 'Fort, Mumbai',
  ifsc: 'HDFC0000060',
  mobile: '9820123456',
  email: 'accounts@apexsolutions.in'
};

export const Storage = {
  // --- SETTINGS ---
  getSettings() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS };
    } catch (e) {
      console.error('Error reading settings', e);
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings(settings) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error saving settings', e);
    }
  },

  // --- ACCOUNTS ---
  getAccounts() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
      if (!data) {
        // Seed default sample account
        const initial = [SAMPLE_ACCOUNT];
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(initial));
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID, SAMPLE_ACCOUNT.id);
        return initial;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading accounts', e);
      return [SAMPLE_ACCOUNT];
    }
  },

  saveAccount(account) {
    const accounts = this.getAccounts();
    if (account.id) {
      const idx = accounts.findIndex(a => a.id === account.id);
      if (idx !== -1) {
        accounts[idx] = { ...accounts[idx], ...account };
      } else {
        accounts.push(account);
      }
    } else {
      account.id = 'acc_' + Date.now();
      accounts.push(account);
    }
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    return account;
  },

  deleteAccount(id) {
    let accounts = this.getAccounts();
    accounts = accounts.filter(a => a.id !== id);
    if (accounts.length === 0) {
      accounts = [SAMPLE_ACCOUNT];
    }
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    if (this.getActiveAccountId() === id) {
      this.setActiveAccountId(accounts[0].id);
    }
    return accounts;
  },

  getActiveAccountId() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID) || SAMPLE_ACCOUNT.id;
  },

  setActiveAccountId(id) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID, id);
  },

  getActiveAccount() {
    const accounts = this.getAccounts();
    const activeId = this.getActiveAccountId();
    return accounts.find(a => a.id === activeId) || accounts[0] || SAMPLE_ACCOUNT;
  },

  // --- HISTORY / AUDIT TRAIL ---
  getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading history', e);
      return [];
    }
  },

  saveBatch(batch) {
    const history = this.getHistory();
    // Add unique batch ID and timestamp if not present
    if (!batch.id) {
      batch.id = 'BATCH-' + Date.now().toString(36).toUpperCase();
    }
    if (!batch.createdAt) {
      batch.createdAt = new Date().toISOString();
    }
    // Prepend to top
    history.unshift(batch);
    // Keep max 500 batches
    if (history.length > 500) history.pop();

    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    return batch;
  },

  deleteBatch(batchId) {
    let history = this.getHistory();
    history = history.filter(b => b.id !== batchId);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    return history;
  },

  clearHistory() {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  },

  exportHistoryCSV() {
    const history = this.getHistory();
    if (!history.length) return '';

    const headers = [
      'Batch ID', 'Deposit Date', 'Account Name', 'Account No', 'Bank',
      'Cheque No', 'Cheque Date', 'Party / Drawer Name', 'Drawee Bank & Branch', 'Amount (INR)', 'Synced to Sheets'
    ];

    const rows = [];
    history.forEach(batch => {
      const depositDate = new Date(batch.createdAt).toLocaleDateString('en-IN');
      const synced = batch.syncedToSheets ? 'Yes' : 'No';
      batch.cheques.forEach(ch => {
        rows.push([
          `"${batch.id}"`,
          `"${depositDate}"`,
          `"${(batch.account?.accountHolderName || '').replace(/"/g, '""')}"`,
          `"'${batch.account?.accountNumber || ''}"`,
          `"${(batch.account?.bankName || '').replace(/"/g, '""')}"`,
          `"'${ch.chequeNo || ''}"`,
          `"${ch.chequeDate || ''}"`,
          `"${(ch.partyName || '').replace(/"/g, '""')}"`,
          `"${(ch.draweeBank || '').replace(/"/g, '""')}"`,
          Number(ch.amount || 0).toFixed(2),
          `"${synced}"`
        ].join(','));
      });
    });

    return [headers.join(','), ...rows].join('\n');
  }
};
