/**
 * ChequeSlip Main Application Controller
 * Wires state, live preview, batch entry table, modals, Google Sheets sync, and print engine.
 */

import { Storage } from './storage.js';
import { amountToIndianWords, formatIndianCurrency } from './indian-currency.js';
import { generateBankSlipHtml, generateBulkAnnexureHtml, BANK_THEMES } from './slip-templates.js';
import { parsePastedCheques } from './excel-import.js';
import { GoogleSheets, GOOGLE_APPS_SCRIPT_TEMPLATE } from './google-sheets.js';

// Application State
const state = {
  activeAccount: null,
  cheques: [],
  depositDate: new Date().toISOString().split('T')[0],
  viewMode: 'slip', // 'slip' or 'annexure'
  selectedTheme: 'hdfc',
  themeMode: localStorage.getItem('chequeslip_theme_mode') || 'light'
};

// Demo / Sample Cheques
const SAMPLE_CHEQUES = [
  {
    id: 'chq_1',
    chequeNo: '045129',
    chequeDate: new Date().toISOString().split('T')[0],
    partyName: 'Reliance Retail Ltd',
    draweeBank: 'HDFC Bank, Fort',
    amount: 145000
  },
  {
    id: 'chq_2',
    chequeNo: '882104',
    chequeDate: new Date().toISOString().split('T')[0],
    partyName: 'Apex Logistics Solutions',
    draweeBank: 'ICICI Bank, Nariman Point',
    amount: 87500
  },
  {
    id: 'chq_3',
    chequeNo: '519022',
    chequeDate: new Date().toISOString().split('T')[0],
    partyName: 'Dr. Rahul S. Sharma',
    draweeBank: 'State Bank of India',
    amount: 22000
  }
];

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initThemeMode();
  initState();
  initEventListeners();
  renderAll();
});

/**
 * Initialize State from LocalStorage
 */
function initState() {
  state.activeAccount = Storage.getActiveAccount();
  state.selectedTheme = state.activeAccount.theme || 'hdfc';

  // Set default deposit date input
  const dateInput = document.getElementById('depositDateInput');
  if (dateInput) {
    dateInput.value = state.depositDate;
  }

  // Pre-fill Google Apps Script code snippet in modal
  const codeBlock = document.getElementById('googleScriptCodePreview');
  if (codeBlock) {
    codeBlock.textContent = GOOGLE_APPS_SCRIPT_TEMPLATE;
  }

  // Load saved Google Webhook URL
  const settings = Storage.getSettings();
  const webhookInput = document.getElementById('inputGoogleWebhook');
  if (webhookInput && settings.googleWebhookUrl) {
    webhookInput.value = settings.googleWebhookUrl;
  }

  // Start with 2 blank rows if empty
  if (state.cheques.length === 0) {
    addChequeRow();
    addChequeRow();
  }
}

/**
 * Theme Mode (Dark / Light)
 */
function initThemeMode() {
  document.documentElement.setAttribute('data-theme', state.themeMode);
  const btn = document.getElementById('btnThemeToggle');
  if (btn) {
    btn.textContent = state.themeMode === 'dark' ? '🌙' : '☀️';
  }
}

function toggleThemeMode() {
  state.themeMode = state.themeMode === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.themeMode);
  localStorage.setItem('chequeslip_theme_mode', state.themeMode);
  const btn = document.getElementById('btnThemeToggle');
  if (btn) {
    btn.textContent = state.themeMode === 'dark' ? '🌙' : '☀️';
  }
}

/**
 * Event Listeners Wiring
 */
function initEventListeners() {
  // Theme Toggle
  document.getElementById('btnThemeToggle')?.addEventListener('click', toggleThemeMode);

  // Account Dropdown Switcher
  document.getElementById('accountDropdown')?.addEventListener('change', (e) => {
    const accId = e.target.value;
    Storage.setActiveAccountId(accId);
    state.activeAccount = Storage.getActiveAccount();
    state.selectedTheme = state.activeAccount.theme || 'hdfc';
    renderAccountBanner();
    updateLivePreview();
    showToast(`Switched account to ${state.activeAccount.accountHolderName}`, 'info');
  });

  // Date Change
  document.getElementById('depositDateInput')?.addEventListener('change', (e) => {
    state.depositDate = e.target.value || new Date().toISOString().split('T')[0];
    updateLivePreview();
  });

  // Toolbar Actions
  document.getElementById('btnAddRow')?.addEventListener('click', () => {
    addChequeRow();
    renderChequeTable();
    updateSummaryAndPreview();
  });

  document.getElementById('btnDemoData')?.addEventListener('click', () => {
    state.cheques = JSON.parse(JSON.stringify(SAMPLE_CHEQUES));
    renderChequeTable();
    updateSummaryAndPreview();
    showToast('Loaded 3 sample cheques for preview!', 'success');
  });

  document.getElementById('btnClearBatch')?.addEventListener('click', () => {
    if (confirm('Clear all cheque rows in this batch?')) {
      state.cheques = [];
      addChequeRow();
      renderChequeTable();
      updateSummaryAndPreview();
      showToast('Cleared batch table.', 'info');
    }
  });

  // Segmented Mode Switcher (Bank Slip vs Annexure)
  document.getElementById('segSlipMode')?.addEventListener('click', () => {
    state.viewMode = 'slip';
    document.getElementById('segSlipMode')?.classList.add('active');
    document.getElementById('segAnnexureMode')?.classList.remove('active');
    updateLivePreview();
  });

  document.getElementById('segAnnexureMode')?.addEventListener('click', () => {
    state.viewMode = 'annexure';
    document.getElementById('segAnnexureMode')?.classList.add('active');
    document.getElementById('segSlipMode')?.classList.remove('active');
    updateLivePreview();
  });

  // Bank Theme Dropdown
  document.getElementById('bankThemeSelect')?.addEventListener('change', (e) => {
    state.selectedTheme = e.target.value;
    updateLivePreview();
  });

  // Print Buttons
  document.getElementById('btnPrintBankSlip')?.addEventListener('click', () => {
    triggerPrint('slip');
  });

  document.getElementById('btnPrintAnnexure')?.addEventListener('click', () => {
    triggerPrint('annexure');
  });

  // Google Sheets Sync
  document.getElementById('btnSyncToGoogle')?.addEventListener('click', handleGoogleSheetsSync);

  // Modals Open / Close
  setupModalTriggers();

  // Excel Paste Process
  document.getElementById('btnProcessExcelPaste')?.addEventListener('click', handleProcessExcelPaste);

  // Google Script Copy Code
  document.getElementById('btnCopyScriptCode')?.addEventListener('click', () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE).then(() => {
      showToast('Google Apps Script code copied to clipboard!', 'success');
    });
  });

  // Google Webhook Save & Test
  document.getElementById('btnSaveGoogleSettings')?.addEventListener('click', () => {
    const url = document.getElementById('inputGoogleWebhook')?.value.trim();
    Storage.saveSettings({ googleWebhookUrl: url });
    showToast('Google Sheets Webhook URL saved!', 'success');
    closeAllModals();
  });

  document.getElementById('btnTestWebhook')?.addEventListener('click', async () => {
    const url = document.getElementById('inputGoogleWebhook')?.value.trim();
    const statusEl = document.getElementById('webhookTestStatus');
    if (!url) {
      statusEl.textContent = '❌ Please enter a URL';
      statusEl.style.color = 'var(--accent-rose)';
      return;
    }
    statusEl.textContent = '⏳ Testing connection...';
    statusEl.style.color = 'var(--accent-primary)';
    const res = await GoogleSheets.testConnection(url);
    if (res.success) {
      statusEl.textContent = '✅ ' + res.message;
      statusEl.style.color = 'var(--accent-emerald)';
    } else {
      statusEl.textContent = '❌ ' + res.message;
      statusEl.style.color = 'var(--accent-rose)';
    }
  });

  // Account Profile Form Submit
  document.getElementById('accountProfileForm')?.addEventListener('submit', handleAccountFormSubmit);
  document.getElementById('btnResetAccountForm')?.addEventListener('click', resetAccountForm);

  // History Search & Export
  document.getElementById('historySearchInput')?.addEventListener('input', (e) => {
    renderHistoryTable(e.target.value);
  });

  document.getElementById('btnExportCSV')?.addEventListener('click', () => {
    const csvContent = Storage.exportHistoryCSV();
    if (!csvContent) {
      showToast('No history records to export.', 'info');
      return;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ChequeSlip_Deposits_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported history to CSV!', 'success');
  });

  document.getElementById('btnClearHistory')?.addEventListener('click', () => {
    if (confirm('Clear all saved deposit history? This cannot be undone.')) {
      Storage.clearHistory();
      renderHistoryTable();
      showToast('Deposit history cleared.', 'info');
    }
  });

  // Live Zoom Controls
  document.getElementById('btnZoomFit')?.addEventListener('click', () => {
    currentZoomMode = 'fit';
    updateZoomToolbarButtons();
    updatePreviewScale();
  });

  document.getElementById('btnZoom100')?.addEventListener('click', () => {
    currentZoomMode = '100';
    updateZoomToolbarButtons();
    updatePreviewScale();
  });

  document.getElementById('btnZoomIn')?.addEventListener('click', () => {
    const container = document.querySelector('.preview-container-box');
    const availableWidth = Math.max(260, (container?.clientWidth || 500) - 20);
    let cur = currentZoomMode === 'fit' ? (availableWidth / 820) : (currentZoomMode === '100' ? 1 : currentZoomMode);
    currentZoomMode = Math.min(1.6, cur + 0.1);
    updateZoomToolbarButtons();
    updatePreviewScale();
  });

  document.getElementById('btnZoomOut')?.addEventListener('click', () => {
    const container = document.querySelector('.preview-container-box');
    const availableWidth = Math.max(260, (container?.clientWidth || 500) - 20);
    let cur = currentZoomMode === 'fit' ? (availableWidth / 820) : (currentZoomMode === '100' ? 1 : currentZoomMode);
    currentZoomMode = Math.max(0.35, cur - 0.1);
    updateZoomToolbarButtons();
    updatePreviewScale();
  });

  document.getElementById('btnFullscreenPreview')?.addEventListener('click', () => {
    const modalContainer = document.getElementById('modalPrintAreaContainer');
    const printArea = document.getElementById('printArea');
    if (modalContainer && printArea) {
      modalContainer.innerHTML = printArea.innerHTML;
      document.getElementById('modalFullscreenPreview')?.classList.add('active');
    }
  });

  document.getElementById('btnPrintFromModal')?.addEventListener('click', () => {
    triggerPrint(state.viewMode);
  });

  // Auto-resize observer to dynamically adjust scale when window or layout changes
  const previewBox = document.querySelector('.preview-container-box');
  if (previewBox && window.ResizeObserver) {
    new ResizeObserver(() => {
      if (currentZoomMode === 'fit') {
        updatePreviewScale();
      }
    }).observe(previewBox);
  }
  window.addEventListener('resize', () => {
    if (currentZoomMode === 'fit') updatePreviewScale();
  });
}

/**
 * Sets up Modal Dialog handlers
 */
function setupModalTriggers() {
  const openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  };

  document.getElementById('btnManageAccounts')?.addEventListener('click', () => {
    renderAccountsManagerList();
    openModal('modalAccounts');
  });

  document.getElementById('btnPasteExcel')?.addEventListener('click', () => {
    document.getElementById('rawExcelPasteInput').value = '';
    document.getElementById('pasteErrorSummary').style.display = 'none';
    openModal('modalExcelPaste');
  });

  document.getElementById('btnOpenGoogleSheets')?.addEventListener('click', () => {
    openModal('modalGoogleSheets');
  });

  document.getElementById('btnOpenHistory')?.addEventListener('click', () => {
    renderHistoryTable();
    openModal('modalHistory');
  });

  document.getElementById('btnOpenGuide')?.addEventListener('click', () => {
    openModal('modalGuide');
  });

  // Close modals
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  // Close on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.remove('active'));
}

/**
 * Add a new cheque row to state
 */
function addChequeRow(initialData = null) {
  const newRow = initialData || {
    id: 'chq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    chequeNo: '',
    chequeDate: state.depositDate,
    partyName: '',
    draweeBank: '',
    amount: ''
  };
  state.cheques.push(newRow);
  return newRow;
}

/**
 * Render Cheque Entry Table
 */
function renderChequeTable() {
  const tbody = document.getElementById('chequeTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  state.cheques.forEach((ch, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.id = ch.id;

    tr.innerHTML = `
      <td style="text-align: center; color: var(--text-muted); font-size: 0.75rem;">${idx + 1}</td>
      <td>
        <input type="text" class="table-input mono" placeholder="045129" maxlength="10" 
               value="${ch.chequeNo || ''}" data-field="chequeNo">
      </td>
      <td>
        <input type="date" class="table-input" value="${ch.chequeDate || state.depositDate}" data-field="chequeDate">
      </td>
      <td>
        <input type="text" class="table-input" placeholder="Party / Drawer Name" 
               value="${ch.partyName || ''}" data-field="partyName">
      </td>
      <td>
        <input type="text" class="table-input" placeholder="Bank & Branch" 
               value="${ch.draweeBank || ''}" data-field="draweeBank">
      </td>
      <td>
        <input type="number" step="0.01" class="table-input amount-input" placeholder="0.00" 
               value="${ch.amount || ''}" data-field="amount">
      </td>
      <td style="text-align: center;">
        <button class="btn btn-ghost btn-icon btn-sm btn-delete-row" title="Delete Row" data-id="${ch.id}" style="color: var(--text-muted);">
          ✕
        </button>
      </td>
    `;

    // Row input changes
    tr.querySelectorAll('.table-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const field = e.target.dataset.field;
        ch[field] = e.target.value;
        updateSummaryAndPreview();
      });
    });

    // Delete row
    tr.querySelector('.btn-delete-row')?.addEventListener('click', () => {
      state.cheques = state.cheques.filter(item => item.id !== ch.id);
      if (state.cheques.length === 0) addChequeRow();
      renderChequeTable();
      updateSummaryAndPreview();
    });

    tbody.appendChild(tr);
  });
}

/**
 * Updates Summary Stats Bar and Live Print Preview
 */
function updateSummaryAndPreview() {
  const validCheques = state.cheques.filter(ch => (parseFloat(ch.amount) || 0) > 0 || ch.chequeNo || ch.partyName);
  const totalAmount = validCheques.reduce((sum, ch) => sum + (parseFloat(ch.amount) || 0), 0);
  const words = amountToIndianWords(totalAmount);

  // Update stats
  const countEl = document.getElementById('statChequeCount');
  const totalEl = document.getElementById('statGrandTotal');
  const wordsEl = document.getElementById('statWordsPreview');

  if (countEl) countEl.textContent = validCheques.length;
  if (totalEl) totalEl.textContent = formatIndianCurrency(totalAmount);
  if (wordsEl) wordsEl.textContent = words;

  // Auto-switch mode suggestion: 3+ cheques look great in annexure
  if (validCheques.length >= 4 && state.viewMode === 'slip') {
    // Optional gentle recommendation
  }

  updateLivePreview();
}

/**
 * Updates the Live Print Preview container
 */
function updateLivePreview() {
  const printArea = document.getElementById('printArea');
  if (!printArea) return;

  const validCheques = state.cheques.filter(ch => (parseFloat(ch.amount) || 0) > 0 || ch.chequeNo || ch.partyName);
  const chequesToRender = validCheques.length > 0 ? validCheques : [
    { chequeNo: '000000', chequeDate: state.depositDate, partyName: 'Sample Party', draweeBank: 'Bank Name', amount: 0 }
  ];

  if (state.viewMode === 'slip') {
    printArea.innerHTML = generateBankSlipHtml(
      state.activeAccount,
      chequesToRender,
      state.depositDate,
      state.selectedTheme
    );
  } else {
    printArea.innerHTML = generateBulkAnnexureHtml(
      state.activeAccount,
      chequesToRender,
      state.depositDate,
      state.selectedTheme
    );
  }

  // Auto-scale to ensure 100% full visibility without clipping
  requestAnimationFrame(updatePreviewScale);
}

// Dynamic Zoom & Scale Engine for Live Preview
let currentZoomMode = 'fit'; // 'fit', '100', or numeric scale

function updatePreviewScale() {
  const container = document.querySelector('.preview-container-box');
  const printArea = document.getElementById('printArea');
  const wrapper = document.getElementById('printAreaScaleWrapper');
  if (!container || !printArea) return;

  const targetWidth = 820; // Full native width of the bank slip & annexure
  const availableWidth = Math.max(260, container.clientWidth - 20);

  let scale = 1;

  if (currentZoomMode === 'fit') {
    scale = Math.min(1, availableWidth / targetWidth);
  } else if (currentZoomMode === '100') {
    scale = 1;
  } else if (typeof currentZoomMode === 'number') {
    scale = Math.max(0.35, Math.min(1.8, currentZoomMode));
  }

  printArea.style.transform = `scale(${scale})`;
  printArea.style.transformOrigin = 'top center';

  if (wrapper) {
    const slipEl = printArea.firstElementChild;
    const naturalHeight = slipEl ? slipEl.offsetHeight : 420;
    wrapper.style.width = `${Math.round(targetWidth * scale)}px`;
    wrapper.style.height = `${Math.round(naturalHeight * scale)}px`;
  }
}

function updateZoomToolbarButtons() {
  document.getElementById('btnZoomFit')?.classList.toggle('active', currentZoomMode === 'fit');
  document.getElementById('btnZoom100')?.classList.toggle('active', currentZoomMode === '100');
}

/**
 * Trigger native browser Print
 */
function triggerPrint(mode) {
  const validCheques = state.cheques.filter(ch => (parseFloat(ch.amount) || 0) > 0);
  if (validCheques.length === 0) {
    alert('Please enter at least one cheque with an amount before printing.');
    return;
  }

  state.viewMode = mode;
  updateLivePreview();

  // Save to history automatically upon print
  saveCurrentBatchToHistory();

  // Delay slightly to let DOM settle, then invoke window.print
  setTimeout(() => {
    window.print();
  }, 100);
}

/**
 * Save current batch to local history
 */
function saveCurrentBatchToHistory(syncedToSheets = false) {
  const validCheques = state.cheques.filter(ch => (parseFloat(ch.amount) || 0) > 0);
  if (validCheques.length === 0) return null;

  const totalAmount = validCheques.reduce((sum, ch) => sum + (parseFloat(ch.amount) || 0), 0);
  
  const batch = {
    account: state.activeAccount,
    cheques: validCheques,
    depositDate: state.depositDate,
    totalAmount: totalAmount,
    syncedToSheets: syncedToSheets
  };

  return Storage.saveBatch(batch);
}

/**
 * Handle Google Sheets Sync
 */
async function handleGoogleSheetsSync() {
  const validCheques = state.cheques.filter(ch => (parseFloat(ch.amount) || 0) > 0);
  if (validCheques.length === 0) {
    showToast('Please add cheques with valid amounts first.', 'error');
    return;
  }

  const batch = saveCurrentBatchToHistory(false);
  const syncBtn = document.getElementById('btnSyncToGoogle');
  if (syncBtn) {
    syncBtn.disabled = true;
    syncBtn.textContent = '⏳ Syncing...';
  }

  const res = await GoogleSheets.syncBatch(batch);
  if (res.success) {
    showToast(res.message, 'success');
  } else {
    showToast(res.message, 'error');
    // Open Google Sheets modal to help user configure
    const modal = document.getElementById('modalGoogleSheets');
    if (modal) modal.classList.add('active');
  }

  if (syncBtn) {
    syncBtn.disabled = false;
    syncBtn.textContent = '☁️ Sync to Google Sheet';
  }
}

/**
 * Handle Process Excel / Sheets Paste
 */
function handleProcessExcelPaste() {
  const raw = document.getElementById('rawExcelPasteInput')?.value || '';
  const result = parsePastedCheques(raw);

  if (result.errors && result.errors.length > 0) {
    const errSummary = document.getElementById('pasteErrorSummary');
    errSummary.textContent = result.errors.join(' | ');
    errSummary.style.display = 'block';
  }

  if (result.cheques && result.cheques.length > 0) {
    // Clear initial blank rows if only empty rows existed
    const isOnlyBlank = state.cheques.every(ch => !ch.chequeNo && !ch.partyName && !ch.amount);
    if (isOnlyBlank) {
      state.cheques = [];
    }

    result.cheques.forEach(ch => {
      addChequeRow({
        id: 'chq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        chequeNo: ch.chequeNo,
        chequeDate: ch.chequeDate,
        partyName: ch.partyName,
        draweeBank: ch.draweeBank,
        amount: ch.amount
      });
    });

    renderChequeTable();
    updateSummaryAndPreview();
    closeAllModals();
    showToast(`Successfully parsed and added ${result.cheques.length} cheque(s)!`, 'success');
  } else if (!result.errors || result.errors.length === 0) {
    showToast('No valid rows could be identified. Please check your data format.', 'error');
  }
}

/**
 * Render Account Banner and Dropdown
 */
function renderAccountBanner() {
  const acc = state.activeAccount;
  if (!acc) return;

  const avatar = document.getElementById('bankAvatar');
  const title = document.getElementById('displayAccountName');
  const accNo = document.getElementById('displayAccountNo');
  const sub = document.getElementById('displayAccountSub');

  if (avatar) {
    const initials = (acc.bankName || 'BK').split(' ').map(w => w[0]).join('').substring(0, 4);
    avatar.textContent = initials;
  }
  if (title) title.textContent = acc.accountHolderName;
  if (accNo) accNo.textContent = acc.accountNumber;
  if (sub) {
    sub.textContent = `${acc.bankName} • ${acc.branch || ''} • Phone: ${acc.mobile || 'N/A'}`;
  }

  // Populate Accounts dropdown
  const dropdown = document.getElementById('accountDropdown');
  if (dropdown) {
    const accounts = Storage.getAccounts();
    dropdown.innerHTML = accounts.map(a => `
      <option value="${a.id}" ${a.id === acc.id ? 'selected' : ''}>
        ${a.label || a.accountHolderName} (${a.accountNumber})
      </option>
    `).join('');
  }

  // Sync bank theme select
  const themeSelect = document.getElementById('bankThemeSelect');
  if (themeSelect && acc.theme) {
    themeSelect.value = acc.theme;
    state.selectedTheme = acc.theme;
  }
}

/**
 * Render Accounts Manager Modal List
 */
function renderAccountsManagerList() {
  const container = document.getElementById('accountsListContainer');
  if (!container) return;

  const accounts = Storage.getAccounts();
  const activeId = Storage.getActiveAccountId();

  container.innerHTML = accounts.map(a => `
    <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface-elevated); padding: 0.75rem 1rem; border-radius: var(--radius-md); margin-bottom: 0.5rem; border: 1px solid ${a.id === activeId ? 'var(--accent-primary)' : 'var(--border-subtle)'};">
      <div>
        <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
          ${a.label || a.accountHolderName}
          ${a.id === activeId ? '<span class="badge-free" style="font-size: 0.65rem;">ACTIVE</span>' : ''}
        </div>
        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
          ${a.bankName} • A/c: <span class="mono">${a.accountNumber}</span> • Branch: ${a.branch || '-'}
        </div>
      </div>
      <div style="display: flex; gap: 0.4rem;">
        ${a.id !== activeId ? `
          <button class="btn btn-secondary btn-sm btn-set-active" data-id="${a.id}">Set Active</button>
        ` : ''}
        <button class="btn btn-ghost btn-sm btn-edit-acc" data-id="${a.id}">Edit</button>
        ${accounts.length > 1 ? `
          <button class="btn btn-ghost btn-sm btn-delete-acc" data-id="${a.id}" style="color: var(--accent-rose);">✕</button>
        ` : ''}
      </div>
    </div>
  `).join('');

  // Attach button events
  container.querySelectorAll('.btn-set-active').forEach(btn => {
    btn.addEventListener('click', () => {
      Storage.setActiveAccountId(btn.dataset.id);
      state.activeAccount = Storage.getActiveAccount();
      renderAccountBanner();
      renderAccountsManagerList();
      updateLivePreview();
      showToast('Active account updated', 'info');
    });
  });

  container.querySelectorAll('.btn-edit-acc').forEach(btn => {
    btn.addEventListener('click', () => {
      const acc = Storage.getAccounts().find(a => a.id === btn.dataset.id);
      if (acc) populateAccountForm(acc);
    });
  });

  container.querySelectorAll('.btn-delete-acc').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this account profile?')) {
        Storage.deleteAccount(btn.dataset.id);
        state.activeAccount = Storage.getActiveAccount();
        renderAccountBanner();
        renderAccountsManagerList();
        updateLivePreview();
        showToast('Account profile deleted', 'info');
      }
    });
  });
}

function populateAccountForm(acc) {
  document.getElementById('editAccountId').value = acc.id;
  document.getElementById('accInputLabel').value = acc.label || '';
  document.getElementById('accInputBankName').value = acc.bankName || '';
  document.getElementById('accInputTheme').value = acc.theme || 'universal';
  document.getElementById('accInputNumber').value = acc.accountNumber || '';
  document.getElementById('accInputHolder').value = acc.accountHolderName || '';
  document.getElementById('accInputBranch').value = acc.branch || '';
  document.getElementById('accInputIfsc').value = acc.ifsc || '';
  document.getElementById('accInputMobile').value = acc.mobile || '';

  document.getElementById('accountFormTitle').textContent = 'Edit Bank Account';
}

function resetAccountForm() {
  document.getElementById('editAccountId').value = '';
  document.getElementById('accountProfileForm').reset();
  document.getElementById('accountFormTitle').textContent = 'Add New Bank Account';
}

function handleAccountFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('editAccountId').value;
  const acc = {
    id: id || undefined,
    label: document.getElementById('accInputLabel').value.trim(),
    bankName: document.getElementById('accInputBankName').value.trim(),
    theme: document.getElementById('accInputTheme').value,
    accountNumber: document.getElementById('accInputNumber').value.trim(),
    accountHolderName: document.getElementById('accInputHolder').value.trim(),
    branch: document.getElementById('accInputBranch').value.trim(),
    ifsc: document.getElementById('accInputIfsc').value.trim(),
    mobile: document.getElementById('accInputMobile').value.trim()
  };

  Storage.saveAccount(acc);
  if (!id) {
    Storage.setActiveAccountId(acc.id);
  }
  state.activeAccount = Storage.getActiveAccount();

  renderAccountBanner();
  renderAccountsManagerList();
  resetAccountForm();
  updateLivePreview();
  showToast('Account profile saved successfully!', 'success');
}

/**
 * Render History / Audit Log Table
 */
function renderHistoryTable(query = '') {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;

  const history = Storage.getHistory();
  const q = (query || '').toLowerCase().trim();

  const filtered = history.filter(batch => {
    if (!q) return true;
    const matchAcc = (batch.account?.accountHolderName || '').toLowerCase().includes(q) ||
                     (batch.account?.accountNumber || '').includes(q);
    const matchBatch = (batch.id || '').toLowerCase().includes(q);
    const matchCheque = (batch.cheques || []).some(ch => 
      (ch.partyName || '').toLowerCase().includes(q) || (ch.chequeNo || '').includes(q)
    );
    return matchAcc || matchBatch || matchCheque;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          No deposit batches found. Printed and synced batches will appear here.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(batch => {
    const depositDate = new Date(batch.createdAt).toLocaleDateString('en-IN');
    return `
      <tr>
        <td style="font-size: 0.8rem;">${depositDate}</td>
        <td><span class="acc-num-badge" style="font-size: 0.75rem;">${batch.id}</span></td>
        <td>
          <div style="font-weight: 600; font-size: 0.82rem;">${batch.account?.accountHolderName || '-'}</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${batch.account?.bankName || ''}</div>
        </td>
        <td style="text-align: center; font-weight: 700;">${batch.cheques?.length || 0}</td>
        <td style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-emerald);">
          ${formatIndianCurrency(batch.totalAmount)}
        </td>
        <td style="text-align: center;">
          ${batch.syncedToSheets 
            ? '<span style="color: var(--accent-emerald); font-size: 0.85rem;">✓ Synced</span>' 
            : '<span style="color: var(--text-muted); font-size: 0.85rem;">Local</span>'}
        </td>
        <td style="text-align: center;">
          <button class="btn btn-secondary btn-sm btn-restore-batch" data-id="${batch.id}" title="Load into Editor">
            Load
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Attach restore events
  tbody.querySelectorAll('.btn-restore-batch').forEach(btn => {
    btn.addEventListener('click', () => {
      const b = history.find(item => item.id === btn.dataset.id);
      if (b) {
        state.cheques = JSON.parse(JSON.stringify(b.cheques || []));
        state.depositDate = b.depositDate || state.depositDate;
        renderChequeTable();
        updateSummaryAndPreview();
        closeAllModals();
        showToast(`Loaded Batch ${b.id} with ${b.cheques?.length} cheque(s)`, 'info');
      }
    });
  });
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

/**
 * Initial Render
 */
function renderAll() {
  renderAccountBanner();
  renderChequeTable();
  updateSummaryAndPreview();
}
