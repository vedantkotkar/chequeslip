# PEETHMART DEVELOPER & ARCHITECTURE GUIDE (AI SELF-PRESERVATION GUIDE)

> **CRITICAL DIRECTIVE FOR FUTURE AGENTS / SESSIONS:**
> Do NOT break, overwrite, or revert any features, accounting records, merged SKUs, or POS capabilities documented in this guide. This is the single source of truth for the PeethMart ERPNext & POS ecosystem.

---

## 1. System Overview & Infrastructure

- **Company:** PeethMart Pvt Ltd (`PPL`)
- **Key Leadership:** Vedant Kotkar (Director / Owner)
- **Primary Export Partner:** Pooja Raut / Import Eats LLC (USA)
- **Production Server:** `107.172.30.167` (Ubuntu Linux)
- **Container Environment:** Docker container `erpnext-backend-1`
- **Frappe Bench Site:** `peethmart.local`
- **Bench Root Directory:** `/home/frappe/frappe-bench`
- **Public POS Web Asset:** `/home/frappe/frappe-bench/sites/peethmart.local/public/files/billing.html`
- **Live POS URL:** `http://107.172.30.167/files/billing.html`
- **Backend API Module:** `/home/frappe/frappe-bench/apps/frappe/frappe/peethmart_api.py` (called via `/api/method/frappe.peethmart_api.<endpoint>`)
- **Language / Communication Rule:** Always communicate with the user in English.

---

## 2. Accounting & Bank Reconciliation Invariants (DO NOT TOUCH)

1. **Reconciliation Status is 100% COMPLETE:**
   - **Punjab National Bank (PNB Current Account):** Fully reconciled to ₹0.00 difference.
   - **Bank of India (BOI CC & Term Loan Accounts):** Fully reconciled to ₹0.00 difference.
   - **DO NOT** re-import bank statements, re-run bank ledger creation scripts, or modify reconciled Payment Entries / Journal Entries.
2. **Director Drawings & Pooja Raut (Import Eats LLC):**
   - Inflows from `Pooja Raut` are export remittances for `Import Eats LLC` and are mapped to Debtors / Sales Invoices.
   - Director personal account outflows labeled "Drawings" were largely company operational expenses paid out-of-pocket because UPI was unavailable on the company current account.
3. **Sales Invoice Numbering:**
   - Active sequential series: `ACC-SINV-2026-00001` through `ACC-SINV-2026-00360+`.
   - Tax Template: Standard `GST 5% Maharashtra - PPL - PPL` (item tax `GST 5% - PPL`).
   - Never tamper with existing invoice numbers or ledger postings.

---

## 3. SKU & Catalog Master Architecture

1. **Zero Duplicate SKUs:**
   - On 2026-09-28, all 14 duplicate SKU pairs (caused by lowercase/uppercase or missing `-MIX-`) were merged into single canonical master records using `frappe.rename_doc("Item", old, master, merge=True)`.
   - Re-linked historical sales invoices and updated master pricing.
   - **Canonical SKU format:** `PM-FG-[COMMODITY]-[VARIANT]-[PACK_SIZE]` (e.g. `PM-FG-MULTIGRAIN-DOSA-MIX-500G`, `PM-FG-RAGI-IDLI-DHOKLA-MIX-500G`).
2. **Adding New Products:**
   - Always verify if an item already exists in ERPNext before adding. Never create duplicates with minor naming variations.

---

## 4. POS Frontend (`billing.html`) Architecture & Features

The POS interface is built for ultra-fast, high-volume counter and wholesale billing. Every feature below is essential and must be preserved:

### A. Editable Selling Rate & Margin Calculation
- **Retail vs. Wholesale:** Counter operators sell to retail walk-ins (standard MRP) and wholesale B2B buyers (PMD, Aditya, S Mart, Sona Super Shop) at discounted rates.
- **Cart Item Data Structure:**
  ```javascript
  {
    code: "PM-FG-MULTIGRAIN-DOSA-MIX-500G",
    name: "Multigrain Dosa Mix 500G",
    name_mr: "मल्टीग्रेन डोसा मिक्स 500G",
    mrp: 150.00,       // Standard Master MRP
    rate: 135.00,      // Actual Selling Rate (editable!)
    qty: 20,           // Quantity
    unit: "Nos",
    icon: "🥣"
  }
  ```
- **Margin / Discount Calculation:**
  - Margin Percentage: `((mrp - rate) / mrp) * 100` (e.g. `₹150 -> ₹135 = 10% Margin`).
  - Unit Savings: `mrp - rate` (e.g. `₹15.00 off/unit`).
  - Line Total: `rate * qty`.
  - Gross MRP Subtotal: `sum(mrp * qty)`.
  - Net Payable: `sum(rate * qty) - invoice_discount`.
  - Total Margin / Savings Badge: Displays total customer savings across the bill.
- **Interactive Rate & Margin Controls:**
  - Direct editable input: `Rate: ₹ [ 135.00 ]` with auto-select on focus.
  - **Trade Margin Presets:** Available per cart item AND as a cart-wide quick bar:
    - `[ MRP ]` (0% standard retail)
    - `[ -5% ]` (5% small retail discount)
    - `[ -10% ]` (10% wholesale tier 1)
    - `[ ★-15% ]` (**★ HIGHLIGHTED:** Standard Retailer margin tier)
    - `[ -20% ]` (20% dealer margin)
    - `[ ★-25% ]` (**★ HIGHLIGHTED:** Wholesale Distributor margin tier)
    - `[ -30% ]` (30% bulk margin)
    - `[ ★-35% ]` (**★ HIGHLIGHTED:** Super Stockist / Master Wholesale margin tier)
  - **Cart-Wide Quick Margin Bar:** Located directly under the cart header (`Bill Margin: [MRP] [-5%] [-10%] [★-15%] [-20%] [★-25%] [-30%] [★-35%]`), allowing operators to apply a wholesale discount across all items in the invoice with 1 tap.

### B. High-Speed Quantity Multipliers (Derived from Historical Invoices)
Based on empirical transaction analysis across all historical PeethMart invoices:
- **Top Invoiced Quantities:**
  - `6`: 622 times (**#1 Most Popular:** Half-dozen inner pack)
  - `10`: 514 times (**#2 Most Popular:** Standard 10-pack crate)
  - `12`: 292 times (**#3 Most Popular:** Full dozen wholesale master pack)
  - `5`: 252 times (5-pack retail bundle)
  - `3`: 224 times (Quarter-dozen pack)
  - `20`: 116 times (20-pack double crate)
  - `1`: 78 times (Single item walk-in)
  - `30`: 30 times (30-pack bulk sack)
- **Top-Seller Highlighting (`.highlight-qty`):** Quantities `6`, `10`, and `12` are highlighted with emerald styling and `★` star indicator:
  - **Header Action Bar:** `+1`, `+3`, `+5`, `★6`, `★10`, `★12`, `+20`, `+30`.
  - **Product Card Dual-Row Quick Chips:**
    - Row 1 (Dozen / Retail): `+1`, `+3`, `★6`, `★12`
    - Row 2 (Metric / Wholesale): `+5`, `★10`, `+20`, `+30`
  - **In-Cart Boost Chips:** `+1`, `+3`, `+5`, `★6`, `★10`, `★12`, `+20`, `+30`.
  - **Direct Numeric Input:** Numeric input with `onfocus="this.select()"` for custom arbitrary quantities.

### C. Smart Search Engine (Synonyms, Acronyms & Typo-Tolerance)
1. **Agro-Commodity Synonym Dictionaries:**
   - `Nachani` = `Nagli` = `Ragi` = `Finger Millet`
   - `Gehu` = `Wheat` = `Atta` = `Sharbati` = `Khapli` = `Flour`
   - `Besan` = `Chana` = `Harbhara` = `Chickpea` = `Gram Flour`
   - `Jowar` = `Jwari` = `Sorghum`
   - `Bajri` = `Bajra` = `Pearl Millet`
   - `Moong` = `Mung` = `Green Gram`
   - `Udad` = `Udid` = `Black Gram`
   - `Rice` = `Tandul` = `Chawal`
   - `Bhagar` = `Varai` = `Samak` = `Upvas` = `Vrat`
   - `Rajgira` = `Amaranth`
   - `Singhada` = `Water Chestnut`
   - `Kulith` = `Kulhid` = `Horse Gram`
   - `Chakli` = `Bhajni` = `Thalipeeth`
   - `Dhokla` = `Khaman` = `Idli`
   - `Dosa` = `Appe` = `Amboli`
   - `Sattu` = `Chana Sattu`
2. **Acronym & Short-Name Matching:**
   - `m dosa` $\rightarrow$ `Multigrain Dosa Mix`
   - `m atta` $\rightarrow$ `Multigrain Atta`
   - `w flour` $\rightarrow$ `Wheat Flour`
   - `r idli` or `r dhokla` $\rightarrow$ `Ragi Idli / Dhokla Mix`
   - `k bhakri` $\rightarrow$ `Kalnyache Bhakri Mix`
   - `g moong` $\rightarrow$ `Green Moong Flour`
   - `t bhajni` $\rightarrow$ `Thalipeeth Bhajni Mix`
   - `c bhajni` $\rightarrow$ `Chakli Bhajni Mix`
3. **Typo Tolerance & Fuzzy Search:**
   - Levenshtein distance matching for tokens (e.g. `sharbthi` $\rightarrow$ `Sharbati`, `raggi` $\rightarrow$ `Ragi`, `thalipeet` $\rightarrow$ `Thalipeeth`).
   - Multi-token ranking with relevance scoring.

### D. Navigation & PeethMart OS Integration
- **HOME INVARIANT:** Whenever the user refers to "Home", it ALWAYS means the **PeethMart OS Hub (`/files/index.html`)**, NEVER ERPNext `/app`.
- **Brand Logo & Home Button:** Both point to `/files/index.html` (labeled `🌾 PeethMart OS` / `🏠 OS Hub`).
- **PeethMart OS App Switcher:** Dropdown menu in header providing 1-tap switching between all OS modules:
  - 🏠 **OS Hub (मुख्य पान):** `/files/index.html`
  - 🛒 **POS Fast Billing:** `/files/billing.html`
  - ⚙️ **Factory Production:** `/files/production.html`
  - 📦 **Raw Material Inward:** `/files/purchase.html`
  - 📋 **Packing & Dispatch:** `/files/packing.html`
  - 💸 **Daily Operating Expenses:** `/files/expenses.html`
  - 🖥️ **ERPNext Admin Desk:** `/app` (strictly for director/admin accounting operations)
- **Live Clock:** Real-time counter clock (`liveClock`).
- **Language Switcher:** Pure English (`en`) and natural colloquial business Maranglish (`mr`).
- **Recent Invoices:** Modal showing latest generated invoices with instant A5 PDF reprint link.

### E. Progressive Disclosure
- Non-essential fields (Payment mode tabs, WhatsApp customer number, cash received & change calculator, invoice remarks) live inside the collapsible `More Options` drawer, keeping the primary billing workflow clean and distraction-free.

### F. Per-Customer Per-SKU Fixed Pricing & Margin Policy
- **Granular Pricing Invariant:** Trade margins and selling rates are defined **per customer per SKU** (every single product can have its own distinct rate/margin for each customer).
- **Persistent Memory (`localStorage`):**
  - SKU pricing overrides are saved under `pm_customer_sku_pricing` mapping `customer -> item_code -> { rate, marginPct }`.
  - Built-in historical seed rates (`SEED_CUSTOMER_SKU_PRICING`) provide actual empirical wholesale prices from ERPNext for top clients (`PMD SUPERMARKET LLP - 1 & 2`, `Aditya Enterprises`, `S MART`, `Kankariya Hypermarket`).
- **Immediate Lock on Edit:**
  - Whenever an operator types a new selling rate in the line-item rate box or taps an item margin chip (`MRP`, `-5%`, `-10%`, `★-15%`, `-20%`, `★-25%`, `-30%`, `★-35%`), that rate is **instantly and permanently locked for that customer and SKU**!
  - Displays a visual `🔒 Fixed` lock tag next to the rate on the cart item row.
- **Auto-Pricing on Product Add:** Adding any product to the bill for a customer automatically retrieves `getCustomerSkuRate(customer, item_code, mrp)`.
- **Customer Switch Re-Rating:** Switching customers automatically re-rates every item in the cart to that product's specific saved rate for the new customer.
- **Permanent Lock Guarantee:** Rates NEVER change until the operator explicitly edits them.

---

## 5. PeethMart OS Multi-Role Architecture

PeethMart OS is designed as an all-in-one, role-based operating system where different operators interact with dedicated touch-friendly screens:

| Role / Persona | Dedicated Screen | Key Responsibilities |
|---|---|---|
| **Cashier / Counter Sales** | `/files/billing.html` | Fast POS billing, Marathi/English, crate quantity batches, wholesale margins, A5 tax invoice prints |
| **Factory / Chakki Manager** | `/files/production.html` | Grain milling batches, recipe formulas, FSSAI compliance registers, bottleneck analysis |
| **Store / Inward Receiver** | `/files/purchase.html` | APMC mandi arrivals, raw grain bags inward, vendor lot tracking, bill photo capture |
| **Warehouse Packing & Dispatch** | `/files/packing.html` | WhatsApp order fulfillment, crate bundling (15/25/35), delivery parcel slips |
| **Petty Cash / Expense Handler** | `/files/expenses.html` | Hamali, diesel, daily maintenance expenses, voucher image attachments |
| **Director / Master Owner** | `/files/index.html` & `/app` | Live overview digest, daily P&L, bank reconciliation, master catalog administration |

---

## 6. Deployment Protocol

Whenever changes are made to `billing.html` or `peethmart_api.py`:
1. Modify the local copy in `/Users/vedantkotkar/Cheque/`.
2. Sync to the server via SSH/SCP:
   ```bash
   scp billing.html root@107.172.30.167:/tmp/billing.html
   ssh root@107.172.30.167 "docker cp /tmp/billing.html erpnext-backend-1:/home/frappe/frappe-bench/sites/peethmart.local/public/files/billing.html && docker exec -u root erpnext-backend-1 chown frappe:frappe /home/frappe/frappe-bench/sites/peethmart.local/public/files/billing.html && docker exec -u root erpnext-backend-1 chmod 644 /home/frappe/frappe-bench/sites/peethmart.local/public/files/billing.html"
   ```
3. Flush cache if APIs changed:
   ```bash
   ssh root@107.172.30.167 "docker exec -i erpnext-backend-1 bench --site peethmart.local clear-cache"
   ```
4. Test and verify in the live environment (`https://billing.peethmart.in/files/billing.html`).

