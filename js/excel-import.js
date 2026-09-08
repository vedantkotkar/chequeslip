/**
 * Excel / Google Sheets Clipboard Import Parser
 * Automatically parses Tab-separated (TSV) or Comma-separated (CSV) rows
 * copied from Excel, Google Sheets, Tally, or accounting software.
 */

/**
 * Parses raw text from clipboard into clean cheque objects
 * @param {string} rawText 
 * @returns {{ cheques: Array, errors: Array }}
 */
export function parsePastedCheques(rawText) {
  if (!rawText || !rawText.trim()) {
    return { cheques: [], errors: ['No data provided. Please paste rows from Excel or Sheets.'] };
  }

  const lines = rawText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) {
    return { cheques: [], errors: ['No valid rows detected.'] };
  }

  const cheques = [];
  const errors = [];

  // Determine separator: Tab is standard for Excel/Sheets copy-paste
  const sampleLine = lines[0];
  const separator = sampleLine.includes('\t') ? '\t' : (sampleLine.includes(',') ? ',' : null);

  if (!separator) {
    // Single column or whitespace-separated
    return parseSpaceOrSingleColumn(lines);
  }

  // Check if line 0 looks like a header (must contain header keywords AND have no numeric amount)
  let startIndex = 0;
  const firstRowCols = sampleLine.split(separator).map(c => c.trim().toLowerCase());
  const headerExactKeywords = ['cheque no', 'cheque number', 'chq no', 'amount', 'amt', 'party name', 'drawer name', 'cheque date', 'sr no', 'sr.'];
  const hasHeaderKeyword = firstRowCols.some(col => 
    headerExactKeywords.some(kw => col === kw || col.startsWith(kw))
  );
  
  // Check if line 0 contains an actual monetary amount
  const hasNumericAmount = firstRowCols.some(val => {
    const cleaned = val.replace(/[₹$,\s]/g, '');
    return !isNaN(parseFloat(cleaned)) && isFinite(cleaned) && parseFloat(cleaned) > 0;
  });

  // If it has header keywords and NO monetary amount, treat as header row
  if (hasHeaderKeyword && !hasNumericAmount) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const cols = splitLineWithQuotes(rawLine, separator);
    if (cols.length < 2) continue;

    try {
      const parsed = mapColumnsToCheque(cols);
      if (parsed.amount > 0 || parsed.chequeNo || parsed.partyName) {
        cheques.push(parsed);
      }
    } catch (err) {
      errors.push(`Row ${i + 1}: Could not parse line "${rawLine.substring(0, 30)}..."`);
    }
  }

  return { cheques, errors };
}

/**
 * Handle CSV quotes properly e.g. "Apex, Inc."
 */
function splitLineWithQuotes(line, separator) {
  if (separator === '\t') {
    return line.split('\t').map(cleanCell);
  }

  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      result.push(cleanCell(current));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(cleanCell(current));
  return result;
}

function cleanCell(cell) {
  return (cell || '').trim().replace(/^["']|["']$/g, '').trim();
}

/**
 * Smart column mapper
 * Identifies Cheque No, Date, Party Name, Bank, and Amount regardless of order
 */
function mapColumnsToCheque(cols) {
  let chequeNo = '';
  let chequeDate = '';
  let partyName = '';
  let draweeBank = '';
  let amount = 0;

  // Track assigned column indices
  const assigned = new Set();

  // 1. Identify Amount (usually contains currency symbol or is float/number, often last column)
  for (let idx = cols.length - 1; idx >= 0; idx--) {
    const val = cols[idx];
    const cleaned = val.replace(/[₹$,\s]/g, '');
    if (!isNaN(parseFloat(cleaned)) && isFinite(cleaned) && (cleaned.includes('.') || parseFloat(cleaned) >= 100)) {
      amount = parseFloat(cleaned);
      assigned.add(idx);
      break;
    }
  }

  // 2. Identify Cheque Number (typically 6 digits, or labelled)
  for (let idx = 0; idx < cols.length; idx++) {
    if (assigned.has(idx)) continue;
    const val = cols[idx];
    const digitsOnly = val.replace(/\D/g, '');
    if (digitsOnly.length >= 4 && digitsOnly.length <= 8) {
      chequeNo = digitsOnly.padStart(6, '0');
      assigned.add(idx);
      break;
    }
  }

  // 3. Identify Date (contains /, -, or matches date patterns)
  const dateRegex = /(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})/;
  for (let idx = 0; idx < cols.length; idx++) {
    if (assigned.has(idx)) continue;
    const val = cols[idx];
    if (dateRegex.test(val)) {
      chequeDate = normalizeDate(val);
      assigned.add(idx);
      break;
    }
  }

  // 4. Remaining columns for Party Name and Bank
  const unassigned = cols.map((col, idx) => ({ col, idx })).filter(item => !assigned.has(item.idx));

  if (unassigned.length >= 1) {
    partyName = unassigned[0].col;
  }
  if (unassigned.length >= 2) {
    draweeBank = unassigned[1].col;
  }

  // Default date to today if not found
  if (!chequeDate) {
    const today = new Date();
    chequeDate = today.toISOString().split('T')[0];
  }

  return {
    chequeNo: chequeNo || '',
    chequeDate: chequeDate,
    partyName: partyName || 'Client / Party',
    draweeBank: draweeBank || 'HDFC Bank',
    amount: amount || 0
  };
}

/**
 * Fallback parser for single column or space separated
 */
function parseSpaceOrSingleColumn(lines) {
  const cheques = [];
  lines.forEach((line, idx) => {
    const parts = line.split(/\s{2,}/); // 2 or more spaces
    if (parts.length >= 2) {
      cheques.push(mapColumnsToCheque(parts));
    }
  });
  return { cheques, errors: [] };
}

/**
 * Normalizes varied date strings (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD) into YYYY-MM-DD
 */
function normalizeDate(raw) {
  try {
    const clean = raw.trim().replace(/[.]/g, '/').replace(/[-]/g, '/');
    const parts = clean.split('/');
    if (parts.length === 3) {
      // Check if YYYY/MM/DD
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      // Assuming DD/MM/YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  } catch (e) {
    // ignore
  }
  return new Date().toISOString().split('T')[0];
}
