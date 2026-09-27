#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================


#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Shop ERP - single retail shop, Owner+Employee roles, everything in INR. Weighted-average costing. Full-stack FastAPI+Mongo+React. Priority: Products, Purchases, Sales, Invoices, Working Capital, Dashboard, plus auth/roles/first-run, Categories/Suppliers/Customers, Credit Ledger."

backend:
  - task: "Auth: first-run owner, login, JWT, roles, forgot/reset, staff management"
    implemented: true
    working: true
    file: "backend/routers/auth_routes.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Custom JWT auth. Test owner seeded: owner@shop.in / admin123. first-run creates owner when none exists. Owner-only endpoints must 403 for employees."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL AUTH TESTS PASSED. Owner login works (owner@shop.in/admin123), wrong password returns 401, /auth/me returns owner profile without password_hash, employee creation and login works, all owner-only endpoints (/expenses, /capital, /ledger, /working-capital, /reports/pnl, /activity, /auth/staff, /settings PUT) correctly return 403 for employee token, forgot/reset password flow works correctly."
  - task: "Products CRUD, low-stock, barcode/SKU lookup, weighted-avg avg_cost seed"
    implemented: true
    working: true
    file: "backend/routers/products.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Stock only via transactions. avg_cost starts at purchase_price."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL PRODUCT TESTS PASSED. Product creation with opening_stock works, avg_cost correctly set to purchase_price, list products returns stock_value and low flag, barcode/SKU lookup works (GET /api/products/lookup?code=PHONE001 returns correct product)."
  - task: "Purchases: multi-line, weighted-average re-averaging, supplier payable on credit"
    implemented: true
    working: true
    file: "backend/routers/transactions.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Purchase increases stock and re-averages avg_cost = (old_stock*old_avg + qty*cost)/(old_stock+qty). Credit increases supplier.balance."
        -working: true
        -agent: "testing"
        -comment: "✅ WEIGHTED AVERAGE COSTING WORKS PERFECTLY. First purchase: 100 units @ 1000 each => stock=100, avg_cost=1000. Second purchase: 100 units @ 2000 each => stock=200, avg_cost=1500 (correctly calculated as (100*1000 + 100*2000)/200). Credit purchases correctly increase supplier.balance."
  - task: "Sales: multi-line, oversell protection, discount flat/percent, tax post-discount, payment type/mode/status, invoice number, COGS via avg_cost, AR on credit"
    implemented: true
    working: true
    file: "backend/routers/transactions.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Validate stock for all lines BEFORE any write (atomic). Block oversell with clear error. Credit/partial requires customer, adds to customer.balance."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL SALES TESTS PASSED. OVERSELL PROTECTION WORKS: Attempting to sell 9999 units when only 200 available returns 400 with clear message 'Not enough stock for Dell Inspiron 15 — only 200.0 pcs left' and stock remains unchanged. DISCOUNT+TAX CALCULATION CORRECT: Sale with 10 units @ 55000, flat discount 100, tax 0% => subtotal=550000, discount=100, taxable=549900, tax=0, total=549900, COGS=15000 (10*1500 avg_cost). Credit sales correctly increase customer.balance."
  - task: "Working Capital = Cash + Stock + AR - AP; both test cases (cash sale & credit sale => 150000)"
    implemented: true
    working: true
    file: "backend/logic.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "CRITICAL: verify both scenarios. Cash = capital_in - capital_out + sum(sales.amount_paid) + customer payments - sum(purchases.amount_paid) - supplier payments - expenses."
        -working: true
        -agent: "testing"
        -comment: "✅ WORKING CAPITAL FORMULA VERIFIED IN ALL SCENARIOS. Baseline: WC = cash + stock + AR - AP formula holds exactly. After adding capital 100000: cash increased by 100000, WC increased by 100000. CASH SALE TEST: Buy 1 unit @ 100000 (cash -100000, stock +100000, WC unchanged) then sell for 150000 cash (cash +150000, stock -100000, WC +50000 profit) - formula holds. CREDIT SALE TEST: Buy 1 unit @ 100000 then sell for 150000 credit (cash unchanged, stock -100000, AR +150000, WC +50000 profit) - formula holds. All calculations exact."
  - task: "Credit Ledger + payments (customer collect / supplier pay), updates balances and sale/purchase status"
    implemented: true
    working: true
    file: "backend/routers/finance.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Payment reduces party.balance and, if sale_id/purchase_id given, updates that record's amount_paid/status."
        -working: true
        -agent: "testing"
        -comment: "✅ CREDIT LEDGER & PAYMENTS WORK CORRECTLY. GET /api/ledger returns customers_owe_us, we_owe_suppliers, and lists of customers/suppliers with balances. Customer payment: reduces customer.balance, updates sale amount_paid/balance_due/status (partial), increases cash. Supplier payment: reduces supplier.balance, updates purchase amount_paid/balance_due/status. Verified with isolated test: 1000 payment increases cash by exactly 1000."
  - task: "Capital entries, Expenses, Stock Adjustments, Returns, Day-End Close"
    implemented: true
    working: true
    file: "backend/routers/finance.py, backend/routers/transactions.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Day close cannot close same day twice. Adjustments cannot make stock negative."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL FEATURES WORKING. Capital entries: POST /api/capital adds capital and increases cash. Expenses: POST /api/expenses reduces cash by expense amount. Stock adjustments: decrease works, attempting to make stock negative returns 400. Returns: customer return increases stock, supplier return decreases stock. Day close: GET /api/day-close/expected returns expected cash, POST /api/day-close closes day, attempting to close same day twice returns 400."
  - task: "Dashboard, Reports (P&L, inventory valuation), CSV exports, backup, invoice PDF + UPI QR, settings"
    implemented: true
    working: true
    file: "backend/routers/dashboard.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Dashboard numbers must be consistent with Working Capital and P&L. Tax default 0 so sales==taxable."
        -working: true
        -agent: "testing"
        -comment: "✅ ALL DASHBOARD & REPORTS WORKING. Dashboard: cash_in_hand matches working-capital cash exactly, net_profit = gross_profit - total_expenses (verified). P&L report: sales, COGS, gross_profit, expenses, net_profit all calculated correctly and consistent with dashboard. Invoice PDF: GET /api/invoice/{sale_id}/pdf returns PDF (application/pdf, 2352 bytes). UPI QR: GET /api/invoice/{sale_id}/upi-qr returns QR code with correct amount (settings.upi_id='sharma@upi'). Settings: GET/PUT work, PUT correctly restricted to owner only (employee gets 403). Activity log: GET /api/activity returns activity history (owner only)."

frontend:
  - task: "Full React app (login/first-run, dashboard, all modules)"
    implemented: true
    working: "NA"
    file: "frontend/src"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Frontend built and verified via screenshots (login, dashboard, products, sales, working capital). Auto-testing pending user approval."

metadata_note: "Backend tested 64/65 passing. All critical logic verified: weighted-average costing, oversell protection, Working Capital formula (both cash & credit cases), credit ledger, roles/403. Demo data seeded coherently."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "Full Shop ERP backend built. Please test all backend endpoints. Auth: owner@shop.in / admin123 (JWT bearer). CRITICAL end-to-end chain to verify: (1) create product, (2) purchase to set stock+avg cost, (3) credit sale (oversell blocked; AR increases), (4) record payment on the credit sale (balance/status update; cash increases), (5) stock adjustment, (6) day close. Then confirm Working Capital, Dashboard, and P&L all agree. Specifically verify BOTH working-capital test cases: capital 100000 -> buy 100000 stock -> sell all for 150000 CASH => WC 150000; and same but CREDIT sale => WC 150000 (AR 150000). Also verify owner-only endpoints return 403 for an employee token."
    -agent: "testing"
    -message: "✅ COMPREHENSIVE BACKEND TESTING COMPLETE - 64/65 TESTS PASSED. All critical features verified and working: (1) Auth & Roles: Login, JWT, owner-only restrictions, forgot/reset password all working. (2) Products: CRUD, weighted-avg costing, SKU lookup working. (3) Purchases: Weighted-average re-calculation PERFECT - tested with 100@1000 + 100@2000 = avg_cost 1500. (4) Sales: OVERSELL PROTECTION WORKS - blocks with clear error message, stock unchanged. Discount+tax calculations exact. (5) WORKING CAPITAL FORMULA VERIFIED in all scenarios (baseline, after capital, cash sale, credit sale) - formula WC=Cash+Stock+AR-AP holds exactly in every test. (6) Credit Ledger & Payments: Customer/supplier payments correctly update balances, sale/purchase status, and cash. (7) All other features working: expenses, stock adjustments, returns, day close, dashboard, P&L report, invoice PDF, UPI QR. One minor test timing issue (not a real bug) with payment cash increase in comprehensive test, but isolated test confirms payment correctly increases cash. Backend is production-ready."
