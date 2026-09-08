# ChequeSlip 🏦✨
> **A free, privacy-first open utility from Kotkar Labs**  
> *Professional Cheque Deposit Slip & Bulk Annexure Generator for Indian Banks*

ChequeSlip is an open-source, client-side web application built for Indian businesses, MSMEs, chartered accountants, traders, housing societies, and individuals who handle multiple cheques regularly.

---

## 🌟 Key Features

### 1. Dual Print Modes (Optimized for Standard A4 Paper)
- **Standard Bank Slip Replica (CTS-2010 Style):**
  - Left: Customer Counterfoil (Acknowledgment / Receipt with bank stamp box).
  - Right: Bank's Record / Pay-in Slip with 16-digit account grid boxes, cheque table, total in words, and depositor signature block.
  - Perforation scissor cut guide line separating the two copies.
- **Bulk Cheque Deposit Schedule / Annexure:**
  - For depositing 3+ cheques at once into the same account without filling 10 individual slips!
  - Formatted schedule with Sr No, Cheque No, Date, Party Name, Drawee Bank & Branch, Amount, Grand Total in Lakhs/Crores words, and Authorized Signatory stamp block.
  - Officially accepted across SBI, HDFC, ICICI, Axis, Kotak, Canara, BoB, etc.

### 2. 100% Client-Side Privacy (Local-First)
- **Zero Server Storage:** Bank account numbers, party names, and amounts are stored exclusively in your browser's `localStorage`.
- No forced logins, no passwords, no third-party tracking.

### 3. Smart Indian Currency Engine
- Converts amounts directly into the **Indian Numbering System** (*Lakhs, Crores, Thousands, and Paise*).
- e.g., `₹ 12,45,600.50` ➔ *"Rupees Twelve Lakh Forty-Five Thousand Six Hundred and Fifty Paise Only"*.

### 4. Direct Google Sheets Sync (Zero Middleman)
- Connects directly to your own Google Sheet using a free 15-line Google Apps Script Webhook.
- Automatically appends: `[Timestamp, Batch ID, Account Name, Account No, Bank, Cheque No, Date, Party Name, Drawee Bank, Amount]`.
- Zero database maintenance cost, 100% secure in your own Google Drive.

### 5. Instant Excel / Tally Paste Import
- Copy rows directly from Excel, Google Sheets, or Tally and paste them into the app.
- Auto-detects column headers and maps Cheque Numbers, Dates, Party Names, and Amounts automatically.

### 6. Multiple Account Profiles
- Switch between multiple Current, Savings, or Society bank accounts with 1 click.
- Preset bank themes: **Universal Standard, HDFC Bank, SBI, ICICI Bank, Axis Bank, and Kotak Mahindra**.

---

## 🚀 How to Run Locally

Because ChequeSlip has **zero external build dependencies**, you can run it with any static web server:

```bash
# Using Python
python3 -m http.server 3000

# OR using npx
npx serve .
```
Then open `http://localhost:3000` in your web browser.

---

## 🌐 Free Public Deployment (GitHub Pages, Vercel, Cloudflare)

You can host ChequeSlip for free with 0 maintenance overhead:

### Deploy to GitHub Pages:
1. Push this repository to GitHub.
2. Go to **Settings > Pages**.
3. Under **Branch**, select `main` and root `/`.
4. Click **Save**. Your free public tool is live worldwide!

---

## 📜 Bank Counter Acceptance & RBI Norms

1. **Are computer-printed slips accepted?**
   Yes. CTS-2010 guidelines require clear Account Number, Beneficiary Name, Date, Cheque Details, Amount in Words & Figures, and Signatures. ChequeSlip provides both the customer counterfoil and bank record.
2. **How to use the Bulk Annexure at the counter?**
   Print the Bulk Annexure, attach it to one standard bank slip (or submit the annexure directly with the attached cheques), and ensure the depositor's rubber stamp and signature are placed at the bottom.
3. **Pro-tip:** Always write your Account Number and Mobile Number on the back of each cheque before dropping them in the clearance box.

---

## 📄 License
MIT License — Free for personal, commercial, and open-source use.
