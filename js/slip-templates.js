/**
 * Slip Templates Generator
 * Produces standard Indian Bank Deposit Slips & Bulk Cheque Deposit Annexures
 */

import { amountToIndianWords, formatIndianCurrency } from './indian-currency.js';

// Bank Themes and Color Accents
export const BANK_THEMES = {
  universal: {
    name: 'Universal Standard',
    primary: '#1e293b',
    secondary: '#475569',
    accent: '#0f172a',
    border: '#334155',
    logoText: 'PAY-IN SLIP / CHEQUE DEPOSIT'
  },
  hdfc: {
    name: 'HDFC Bank Style',
    primary: '#004c8f',
    secondary: '#ed232a',
    accent: '#002e5b',
    border: '#004c8f',
    logoText: 'HDFC BANK'
  },
  sbi: {
    name: 'State Bank of India Style',
    primary: '#1d4f91',
    secondary: '#280071',
    accent: '#0072bc',
    border: '#1d4f91',
    logoText: 'STATE BANK OF INDIA'
  },
  icici: {
    name: 'ICICI Bank Style',
    primary: '#b02a30',
    secondary: '#f37024',
    accent: '#8c1d23',
    border: '#b02a30',
    logoText: 'ICICI BANK'
  },
  axis: {
    name: 'Axis Bank Style',
    primary: '#861f41',
    secondary: '#97144d',
    accent: '#65142e',
    border: '#861f41',
    logoText: 'AXIS BANK'
  },
  kotak: {
    name: 'Kotak Mahindra Style',
    primary: '#ed1c24',
    secondary: '#003366',
    accent: '#b8141a',
    border: '#ed1c24',
    logoText: 'KOTAK MAHINDRA BANK'
  }
};

/**
 * Creates digit boxes for Account Number
 * @param {string} accNo 
 * @param {number} totalBoxes 
 */
function renderAccountDigitBoxes(accNo = '', totalBoxes = 16) {
  const cleanAcc = (accNo || '').replace(/\D/g, '');
  const chars = cleanAcc.split('');
  let html = '<div class="digit-boxes">';
  for (let i = 0; i < totalBoxes; i++) {
    const val = chars[i] || '';
    html += `<span class="digit-box">${val}</span>`;
  }
  html += '</div>';
  return html;
}

/**
 * Format date nicely for slip display (DD/MM/YYYY)
 */
function formatDate(dateStr) {
  if (!dateStr) {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Generates Standard Indian Bank Cheque Deposit Slip (Counterfoil + Bank Copy)
 * Designed to fit standard A4 paper (prints 1 or 2 per page)
 */
export function generateBankSlipHtml(account, cheques, depositDate, themeKey = 'universal') {
  const theme = BANK_THEMES[themeKey] || BANK_THEMES.universal;
  const formattedDate = formatDate(depositDate);
  
  // Calculate totals
  const totalAmount = cheques.reduce((sum, ch) => sum + (parseFloat(ch.amount) || 0), 0);
  const totalWords = amountToIndianWords(totalAmount);
  const formattedTotal = formatIndianCurrency(totalAmount);

  // Prepare up to 4 cheque rows for single slip
  const maxRows = Math.max(3, cheques.length);
  let counterfoilChequeRows = '';
  let bankCopyChequeRows = '';

  for (let i = 0; i < maxRows; i++) {
    const ch = cheques[i] || {};
    const chNo = ch.chequeNo ? String(ch.chequeNo).padStart(6, '0') : '';
    const chDate = ch.chequeDate ? formatDate(ch.chequeDate) : '';
    const bankDetails = [ch.draweeBank, ch.partyName].filter(Boolean).join(' - ');
    const amt = ch.amount ? parseFloat(ch.amount).toFixed(2) : '';

    counterfoilChequeRows += `
      <tr>
        <td class="col-sr">${i + 1}</td>
        <td class="col-chno">${chNo}</td>
        <td class="col-bank">${bankDetails || '-'}</td>
        <td class="col-amt">${amt ? '₹ ' + amt : ''}</td>
      </tr>
    `;

    bankCopyChequeRows += `
      <tr>
        <td class="col-sr">${i + 1}</td>
        <td class="col-chno">${chNo}</td>
        <td class="col-date">${chDate}</td>
        <td class="col-bank">${ch.draweeBank || '-'}</td>
        <td class="col-party">${ch.partyName || '-'}</td>
        <td class="col-amt">${amt ? '₹ ' + amt : ''}</td>
      </tr>
    `;
  }

  return `
    <div class="printable-slip-wrapper theme-${themeKey}">
      <div class="bank-deposit-slip">
        
        <!-- LEFT PART: CUSTOMER COUNTERFOIL (ACKNOWLEDGMENT) -->
        <div class="slip-counterfoil">
          <div class="slip-header">
            <div class="bank-brand">
              <span class="bank-title">${account.bankName || theme.logoText}</span>
              <span class="slip-type-badge">CUSTOMER'S RECORD</span>
            </div>
            <div class="slip-meta">
              <span class="meta-label">Date:</span>
              <span class="meta-value underline">${formattedDate}</span>
            </div>
          </div>

          <div class="slip-field-group">
            <div class="field-row">
              <span class="field-label">Branch:</span>
              <span class="field-value">${account.branch || '-'}</span>
            </div>
            <div class="field-row">
              <span class="field-label">A/c No:</span>
              <span class="field-value mono bold highlight">${account.accountNumber || '-'}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Name:</span>
              <span class="field-value bold">${account.accountHolderName || '-'}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Mobile:</span>
              <span class="field-value">${account.mobile || '-'}</span>
            </div>
          </div>

          <!-- Counterfoil Cheques Table -->
          <table class="mini-table">
            <thead>
              <tr>
                <th style="width: 24px;">#</th>
                <th style="width: 75px;">Chq No.</th>
                <th>Drawee Bank / Party</th>
                <th style="width: 80px; text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${counterfoilChequeRows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="text-right bold">TOTAL:</td>
                <td class="text-right bold highlight">${formattedTotal}</td>
              </tr>
            </tfoot>
          </table>

          <div class="words-box">
            <span class="words-label">Amount in words:</span>
            <div class="words-text">${totalWords}</div>
          </div>

          <div class="stamp-section">
            <div class="stamp-box">
              <span>Bank Receiving Stamp & Signature</span>
            </div>
          </div>
        </div>

        <!-- PERFORATION / SCISSOR CUT LINE -->
        <div class="slip-perforation">
          <div class="cut-line"></div>
          <div class="scissor-icon">✂</div>
          <div class="cut-line"></div>
        </div>

        <!-- RIGHT PART: BANK'S RECORD (MAIN DEPOSIT SLIP) -->
        <div class="slip-bank-copy">
          <div class="slip-header">
            <div class="bank-brand">
              <span class="bank-title">${account.bankName || theme.logoText}</span>
              <span class="slip-type-badge main">BANK'S RECORD / PAY-IN SLIP</span>
            </div>
            <div class="slip-meta">
              <span class="meta-label">Branch:</span>
              <span class="meta-value">${account.branch || '-'}</span>
              <span class="meta-label" style="margin-left: 12px;">Date:</span>
              <span class="meta-value underline bold">${formattedDate}</span>
            </div>
          </div>

          <!-- Account Grid -->
          <div class="account-box-section">
            <div class="acc-box-label">
              <span>Credit to Account Number:</span>
              <span class="account-type-tag">SAVINGS / CURRENT / OD / CC</span>
            </div>
            ${renderAccountDigitBoxes(account.accountNumber, 16)}
          </div>

          <div class="slip-field-group dual-col">
            <div class="field-row">
              <span class="field-label">Beneficiary Name:</span>
              <span class="field-value bold uppercase highlight-name">${account.accountHolderName || '-'}</span>
            </div>
            <div class="field-row">
              <span class="field-label">Depositor Mobile:</span>
              <span class="field-value bold">${account.mobile || '-'}</span>
            </div>
          </div>

          <!-- Main Cheques Table -->
          <table class="main-table">
            <thead>
              <tr>
                <th style="width: 26px;">#</th>
                <th style="width: 80px;">Cheque No.</th>
                <th style="width: 85px;">Cheque Date</th>
                <th style="width: 130px;">Drawee Bank</th>
                <th>Drawee / Party Name</th>
                <th style="width: 100px; text-align: right;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${bankCopyChequeRows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" class="text-right bold">GRAND TOTAL:</td>
                <td class="text-right bold highlight">${formattedTotal}</td>
              </tr>
            </tfoot>
          </table>

          <div class="words-box">
            <span class="words-label">Amount in Words (Rupees):</span>
            <div class="words-text bold">${totalWords}</div>
          </div>

          <!-- Signatures & Verification footer -->
          <div class="slip-signatures">
            <div class="sig-col">
              <div class="sig-note">Cheque(s) subject to CTS Clearing</div>
              <div class="sig-line"></div>
              <span class="sig-title">Teller / Cashier Stamp & Sign</span>
            </div>
            <div class="sig-col right">
              <div class="sig-space"></div>
              <div class="sig-line"></div>
              <span class="sig-title">Signature of Depositor / Accountholder</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  `;
}

/**
 * Generates Bulk Cheque Deposit Annexure / Schedule
 * Standard A4 layout accepted by Indian Banks for depositing 3+ cheques at once.
 */
export function generateBulkAnnexureHtml(account, cheques, depositDate, themeKey = 'universal') {
  const formattedDate = formatDate(depositDate);
  const totalAmount = cheques.reduce((sum, ch) => sum + (parseFloat(ch.amount) || 0), 0);
  const totalWords = amountToIndianWords(totalAmount);
  const formattedTotal = formatIndianCurrency(totalAmount);

  const rows = cheques.map((ch, index) => {
    const chNo = ch.chequeNo ? String(ch.chequeNo).padStart(6, '0') : '-';
    const chDate = ch.chequeDate ? formatDate(ch.chequeDate) : '-';
    const amt = parseFloat(ch.amount || 0).toFixed(2);
    return `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td class="text-center mono bold">${chNo}</td>
        <td class="text-center">${chDate}</td>
        <td class="bold">${ch.partyName || '-'}</td>
        <td>${ch.draweeBank || '-'}</td>
        <td class="text-right mono bold">₹ ${amt}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="printable-annexure-wrapper theme-${themeKey}">
      <div class="annexure-sheet">
        
        <!-- Header -->
        <div class="annexure-header">
          <div class="org-title">BULK CHEQUE DEPOSIT SCHEDULE / ANNEXURE</div>
          <div class="org-subtitle">To be submitted along with Pay-in Slip / Drop-Box Deposit</div>
        </div>

        <!-- Bank & Account Summary Card -->
        <div class="annexure-details-grid">
          <div class="detail-box">
            <span class="detail-label">To Branch Manager:</span>
            <span class="detail-value bold">${account.bankName || 'The Bank'}</span>
            <span class="detail-sub">${account.branch ? 'Branch: ' + account.branch : ''}</span>
          </div>
          <div class="detail-box">
            <span class="detail-label">Deposit Date:</span>
            <span class="detail-value bold">${formattedDate}</span>
            <span class="detail-sub">Total Cheques: ${cheques.length} Nos.</span>
          </div>
          <div class="detail-box wide">
            <span class="detail-label">Credit Beneficiary Account:</span>
            <div class="beneficiary-flex">
              <span class="acc-name bold uppercase">${account.accountHolderName}</span>
              <span class="acc-num mono bold highlight">A/c: ${account.accountNumber}</span>
            </div>
            <div class="beneficiary-sub">
              ${account.ifsc ? '<span>IFSC: ' + account.ifsc + '</span>' : ''}
              ${account.mobile ? '<span>Phone: ' + account.mobile + '</span>' : ''}
            </div>
          </div>
        </div>

        <div class="annexure-preamble">
          Dear Sir/Madam, please find enclosed herewith <strong>${cheques.length} cheque(s)</strong> aggregating to 
          <strong class="highlight">${formattedTotal}</strong> for clearing and credit to our above-mentioned account:
        </div>

        <!-- Itemized Cheque Schedule Table -->
        <table class="annexure-table">
          <thead>
            <tr>
              <th style="width: 35px;" class="text-center">Sr</th>
              <th style="width: 95px;" class="text-center">Cheque No.</th>
              <th style="width: 95px;" class="text-center">Cheque Date</th>
              <th>Drawee / Party / Drawer Name</th>
              <th style="width: 170px;">Drawee Bank & Branch</th>
              <th style="width: 120px;" class="text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="5" class="text-right bold">GRAND TOTAL (${cheques.length} Cheques):</td>
              <td class="text-right bold highlight mono">${formattedTotal}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Amount in words banner -->
        <div class="annexure-words-card">
          <span class="words-label">Amount in Words:</span>
          <span class="words-content bold">${totalWords}</span>
        </div>

        <!-- Declaration -->
        <div class="annexure-declaration">
          <p><strong>Declaration:</strong> I/We confirm that all the cheques listed above are genuine, CTS-2010 compliant, properly crossed and endorsed in favor of the account holder. The credit is subject to realization in clearing.</p>
        </div>

        <!-- Signatures & Stamp block -->
        <div class="annexure-footer">
          <div class="footer-box bank-stamp">
            <div class="box-title">Bank Receiving Stamp & Date</div>
            <div class="stamp-area">
              <span class="stamp-hint">Bank Officer Stamp & Initials</span>
            </div>
          </div>

          <div class="footer-box customer-sig">
            <div class="box-title">For ${account.accountHolderName}</div>
            <div class="sig-area">
              <span class="sig-hint">Authorized Signatory / Rubber Stamp</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}
