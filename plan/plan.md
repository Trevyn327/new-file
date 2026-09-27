# Shop ERP — Final Build Plan (from scratch)

Single retail/hardware shop. Owner + Employee roles. Everything in ₹ with correct
Indian grouping (₹1,00,300 — lakh/crore style). Orange + blue + white "Shop ERP" theme,
one coherent product across all screens. Weighted-average costing. Built fresh, not from
any prior code or zip.

This plan confirms the full 18-section specification is understood and will be built in
full. Nothing below is dropped, simplified, or faked. Section-by-section confirmation and
the few honest build caveats are listed at the end.

## Visual quality bar (polished, professional — not plain)

The app must look like a premium retail product the owner is proud to run on the shop
counter — modern and polished, while staying uncluttered and easy to use. Concretely:
- Clean card-based layouts, generous spacing, clear visual hierarchy; big bold ₹ figures
  as the hero of every screen.
- A refined orange/blue/white palette with soft shadows and rounded corners, a proper
  branded sidebar and top bar, and consistent components everywhere (same buttons, tables,
  cards, inputs, empty states, loaders).
- Real charts on the Dashboard (sales trend, category mix), status pills/badges, subtle
  hover and transition micro-interactions, and a persistent low-stock badge.
- Fully responsive for a shop tablet/counter screen as well as a desktop.
- "Cool" means quality and polish, never cluttered — one obvious primary action per
  screen, plain-language labels, advanced fields tucked away. Polish and simplicity
  together, not at odds.

---

## Section-by-section confirmation

1. **Currency, theme, feel** — ₹ Indian grouping everywhere (including placeholders, errors,
   exports); no $ or Western grouping. Orange/blue/white, grouped sidebar (Inventory,
   Transactions/Money, Finance, Reports, Administration). One primary action per screen,
   plain labels, and a one-line explanation on hover/at top of each page for what a number
   means. Big bold numbers. Advanced fields (opening balance, GSTIN) behind an "Advanced"
   toggle.

2. **Login, roles, access control** — Individual email+password logins.
   - Owner: full access (Capital/Working Capital, Expenses, Credit Ledger, Reports/P&L,
     Shop Settings, Team/Staff, Activity Log).
   - Employee: Sales, Purchases, Products & Categories, view Customers/Suppliers, Stock
     Adjustments, Day-End Cash Close only.
   - Restricted pages blocked at the URL level (not just hidden in the menu) with a clear
     "you don't have permission" message.
   - Every Sale, Purchase, Stock Adjustment, Return, Payment, Day-End Close stores who did
     it. Owner-only Activity Log of who did what and when.
   - First-run "Create your Owner account" screen when no owner exists. One preloaded test
     Owner for internal testing, removed before handoff.
   - **Forgot password / reset flow** for both Owner and Employee logins: a "Forgot
     password?" link on the sign-in screen that lets a user request a reset and set a new
     password via a time-limited reset token; the Owner can also directly reset any
     employee's password from the Team/Staff screen.

3. **Dashboard** — Live from DB: cash in hand, stock value, total liabilities, Working
   Capital, total sales, total purchases, net profit, invoice/payment status breakdown
   (paid/partial/unpaid counts), 7-day sales trend chart, low-stock list. Persistent
   low-stock badge with count on EVERY screen; clicking opens the low-stock list.

4. **Products / Inventory** — SKU, Name, Category, Barcode (optional), Unit of Measure
   (pcs/kg/box/meter/dozen), Purchase Price, Selling Price, Stock Qty, Image URL with live
   preview, per-product Low-Stock Threshold. Bulk CSV/Excel upload with downloadable
   template, SKU-based update-or-create, and a post-upload summary (added / updated /
   failed-with-reason). Stock never directly editable to an arbitrary number — only via
   Purchases, Sales, Returns, Stock Adjustments. Barcode/SKU scan field on Sales works with
   a standard USB scanner (types like a keyboard, auto-adds item).

5. **Categories, Suppliers, Customers** — Full add/edit/list/delete for all three. Deleting
   a category detaches it from products (no cascade delete). Opening Balance on Customers
   and Suppliers for pre-existing dues. Customer profile shows past purchase history.

6. **Purchases** — Multi-line, cash or credit. Increases stock, re-averages cost (weighted
   average). Credit purchase increases supplier payable. Cancel/return reverses stock and
   money correctly (never a bare delete).

7. **Sales** — Multi-line. Payment Type Cash/Credit/Partial; Payment Mode Cash/UPI/Card/
   Bank Transfer; Status Paid/Partial/Unpaid with current Balance Due. Discounts as flat ₹
   or % applied by the system (no manual total editing). Oversell protection (block or loud
   warning; never silent). Every sale generates a real invoice.

8. **Invoices & Shop Settings** — Print-friendly invoice + Download PDF, showing shop name,
   address, GSTIN (if set), auto invoice number, date, customer, line items
   (qty/price/subtotal), discount, tax, grand total, amount paid, balance due, payment mode.
   Shop Settings (owner): name, address, GSTIN, single tax %, invoice number format/prefix,
   UPI ID. UPI QR generated from UPI ID + amount using the standard UPI payment-link format
   (not a live gateway; payments still recorded manually).
   **Tax calculation basis:** tax % is applied on the **post-discount** amount — i.e.
   taxable value = (line subtotal − discount), then tax on that, then grand total =
   taxable value + tax. This same order is used everywhere an invoice total is computed
   (invoices, Sales screen, Dashboard, Reports/P&L) so figures never diverge.

9. **Stock Adjustments** — Manual increase/decrease with required reason (Damage, Loss,
   Theft, Recount, Other) + optional note, date-stamped, permanent viewable history.

10. **Returns / Refunds** — Customer Return (stock up, refund or store-credit, adjusts
    customer balance). Supplier Return (stock down, adjusts supplier payable/credit). Both
    keep inventory and money consistent; never implemented as deleting the original record.

11. **Expenses** — Date, category (Rent/Electricity/Wages/Transport/Misc + add new),
    amount, payment mode, optional note. Feeds the P&L expense figure directly.

12. **Credit Ledger (Owner-only)** — Two totals side by side: what customers owe (net of
    payments) and what shop owes suppliers (net of payments). Combined chronological payment
    history both directions. "Record Payment" for customer-received or supplier-paid with
    payment mode, immediately updating balance, cash position, and payment status.

13. **Capital & Working Capital** — Corrected formula:
    **Working Capital = Cash + Stock Value + Accounts Receivable (what customers owe us)
    − Accounts Payable (what we owe suppliers).**
    Accounts Receivable comes from the same credit/partial-sale balances the Section 12
    Credit Ledger tracks; Accounts Payable from credit-purchase balances. Verified against
    BOTH test cases:
    - **Cash sale:** ₹1,00,000 capital → buy ₹1,00,000 stock → sell all for ₹1,50,000 cash →
      Cash ₹1,50,000 + Stock ₹0 + AR ₹0 − AP ₹0 = **₹1,50,000**. ✓
    - **Credit sale:** same, but the ₹1,50,000 sale is on credit (unpaid) → Cash ₹0 + Stock
      ₹0 + AR ₹1,50,000 − AP ₹0 = **₹1,50,000** (held as receivable, not ₹0). ✓
    Profit = ₹50,000 in both. Capital entry types logged explicitly: Opening Capital,
    Owner Investment, Owner Drawing, Loan Received, Loan Repayment, with running
    balance/history. Costing = weighted-average (moving average); every purchase re-averages,
    every sale uses current average as COGS. No FIFO/LIFO/last-price.

14. **Day-End Cash Close** — Expected cash = opening cash (prior day's counted) + today's
    cash sales − today's cash expenses − today's cash paid to suppliers. Owner/employee
    enters counted cash; system computes and saves variance with dated history. Same
    calendar day cannot be closed twice.

15. **Reports & Data Export** — P&L over a date range (Sales, COGS, Gross Profit, Expenses,
    Net Profit) internally consistent with Dashboard and Capital for the same period.
    Sales-by-category. Separate Inventory Valuation report (total stock value at cost).
    Individual CSV/Excel export for Sales, Products, Customers. Full database backup as one
    downloadable file.

16. **Reliability** — Dropped connection (especially mid-sale) fails safely with a clear
    message ("Connection lost — sale not saved"), never silently, never leaving a partial or
    corrupted record. Full offline mode not required.

17. **Quality & testing (non-negotiable)** — Every button/link/form works and is clicked
    through; all numbers live from DB and update immediately; forms reject invalid input
    with visible specific errors; empty lists show a "nothing here yet" message and loaders
    show while loading; consistent styling everywhere; every nav link leads to a real page
    (unbuilt = no link). End-to-end chain tested: create product → credit sale → supplier
    purchase → record payment on the credit sale → stock adjustment → day close → confirm
    Working Capital, Dashboard, and Reports all agree.

18. **Scope — not building** (unless later asked): multi-location/branch, batch/expiry,
    HSN codes, multi-slab GST engine (single tax % only), quotations, credit notes, live
    payment gateway, SMS/WhatsApp, e-invoice/e-way-bill, Tally/accounting sync, online
    storefront.

---

## Honest build caveats (flagged, not skipped)

- **Mid-save atomicity (section 16):** a sale touches several things (the sale record, stock
  quantities, customer balance, cash). To guarantee "never a partial/corrupted record", the
  save is done as a single server-side operation that validates everything first (including
  oversell) and only then commits; if anything fails, nothing is written and the clear error
  is returned. If the underlying database supports multi-document transactions they are used;
  if not, the same guarantee is achieved by storing each transaction's line items inside one
  document and deriving balances from those records, so a failed save can never leave
  half-applied numbers. This is fully buildable — noting the approach so the reliability
  guarantee is real, not assumed.

- **"Download PDF" invoice:** delivered as a real downloadable PDF (generated from the
  print-friendly invoice layout), not just a browser print dialog.

- **Bulk upload format:** both CSV and Excel (.xlsx) accepted; the downloadable template is
  provided in the same format.

- **Full database backup file:** a single downloadable file containing all shop data in a
  documented, re-importable structure, so data is never locked in.

## Build status (as of now) & priority order

**Honest status: nothing from this specification has been built or tested yet.** We are
still at the planning/approval stage. The only code that exists is the earlier throwaway
frontend-only mock demo, which is being discarded and rebuilt from scratch — so there is
**nothing from this spec safe to demo tomorrow until the build runs.**

Agreed priority (build and harden these first for tomorrow's demo):
1. Products / Inventory (Section 4 core: add/edit/list, stock via transactions only)
2. Purchases (Section 6, with weighted-average cost re-averaging)
3. Sales (Section 7, oversell protection, discounts, payment type/mode/status)
4. Invoices (Section 8, print + Download PDF + UPI QR + Shop Settings)
5. Capital & Working Capital (Section 13, corrected formula, both test cases)
6. Dashboard (Section 3, live numbers consistent with the above)

Plus the foundations these depend on: login + roles + first-run owner (Section 2),
Categories/Suppliers/Customers (Section 5), Credit Ledger balances feeding AR/AP
(Section 12). These six are the "rock-solid for demo" set.

Can follow after tomorrow if time/credits run short (explicitly deferrable per request):
bulk CSV/Excel import (Section 4), Day-End Cash Close (Section 14), full database backup
export (Section 15), and the Activity Log (Section 2). Stock Adjustments (9), Returns (10),
Expenses (11), Forgot-password (2), Reports/exports (15) sit between — built if time allows,
otherwise queued right after the priority set.

---


- Single shop, single location, exactly two role levels (Owner, Employee).
- Test Owner account is preloaded only for internal testing and removed before handoff, after
  which the first-run setup screen creates the real owner.
- Tax is a single configurable percentage applied per invoice (per spec section 8/18).
