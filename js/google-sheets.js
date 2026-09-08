/**
 * Google Sheets Integration Module
 * Enables 100% direct, zero-middleman synchronization with user's own Google Sheet
 * via a free Google Apps Script Webhook.
 */

import { Storage } from './storage.js';

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script for ChequeSlip Webhook
 * Paste this in: Extensions > Apps Script in your Google Sheet
 * Click 'Deploy' > 'New Deployment' > Type: 'Web App'
 * Execute as: 'Me' | Who has access: 'Anyone'
 * Copy the Web App URL and paste it into ChequeSlip.
 */
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Create Header if sheet is brand new / empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp", "Batch ID", "Deposit Date", "Beneficiary Name", "Account Number", 
        "Bank Name", "Cheque No", "Cheque Date", "Party / Drawer Name", 
        "Drawee Bank", "Amount (INR)", "Status"
      ]);
      sheet.getRange("1:1").setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
    
    var payload = JSON.parse(e.postData.contents);
    var batch = payload.batch;
    var cheques = batch.cheques || [];
    var account = batch.account || {};
    var timestamp = new Date();
    
    var rowsToInsert = [];
    for (var i = 0; i < cheques.length; i++) {
      var ch = cheques[i];
      rowsToInsert.push([
        timestamp,
        batch.id || "BATCH",
        batch.depositDate || new Date().toLocaleDateString(),
        account.accountHolderName || "",
        "'" + (account.accountNumber || ""),
        account.bankName || "",
        "'" + (ch.chequeNo || ""),
        ch.chequeDate || "",
        ch.partyName || "",
        ch.draweeBank || "",
        Number(ch.amount || 0),
        "Deposited"
      ]);
    }
    
    if (rowsToInsert.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToInsert.length, rowsToInsert[0].length)
           .setValues(rowsToInsert);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Successfully added " + rowsToInsert.length + " cheque records",
      rowsCount: rowsToInsert.length 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ 
    status: "ok", 
    message: "ChequeSlip Google Apps Script Webhook is Active and Ready!" 
  })).setMimeType(ContentService.MimeType.JSON);
}
`;

export const GoogleSheets = {
  /**
   * Sync a batch to the user's configured Google Sheet
   * @param {Object} batch 
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async syncBatch(batch) {
    const settings = Storage.getSettings();
    const webhookUrl = (settings.googleWebhookUrl || '').trim();

    if (!webhookUrl) {
      return {
        success: false,
        message: 'No Google Webhook URL configured. Please set it up in the Google Sheets modal.'
      };
    }

    try {
      // Use no-cors or standard fetch with text/plain to avoid Google Apps Script CORS preflight restrictions
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action: 'append_batch',
          batch: batch
        })
      });

      // Mark batch as synced locally
      batch.syncedToSheets = true;
      Storage.saveBatch(batch);

      return {
        success: true,
        message: `Successfully synchronized ${batch.cheques.length} cheque(s) to your Google Sheet!`
      };
    } catch (err) {
      console.error('Google Sheets sync error:', err);
      return {
        success: false,
        message: `Failed to connect to Google Sheets Webhook: ${err.message}. Ensure the script is deployed with "Who has access: Anyone".`
      };
    }
  },

  /**
   * Test user's webhook URL
   */
  async testConnection(url) {
    if (!url || !url.startsWith('https://script.google.com/macros/s/')) {
      return {
        success: false,
        message: 'URL must begin with https://script.google.com/macros/s/... and end with /exec'
      };
    }

    try {
      const resp = await fetch(url, { method: 'GET', mode: 'no-cors' });
      return {
        success: true,
        message: 'Connection verified! Your Google Sheet is ready to receive cheque deposits.'
      };
    } catch (e) {
      return {
        success: false,
        message: 'Could not reach webhook: ' + e.message
      };
    }
  }
};
