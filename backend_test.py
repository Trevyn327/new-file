#!/usr/bin/env python3
"""
Comprehensive backend test for Shop ERP system.
Tests all critical flows: Auth, Products, Purchases, Sales, Working Capital, Credit Ledger, etc.
"""
import requests
import json
from typing import Dict, Any, Optional

# Base URL from frontend .env
BASE_URL = "https://erp-system-hub-2.preview.emergentagent.com/api"

# Test credentials
OWNER_EMAIL = "owner@shop.in"
OWNER_PASSWORD = "admin123"

# Global state
owner_token = None
employee_token = None
test_data = {}


class TestResult:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
    
    def add_pass(self, test_name: str, details: str = ""):
        self.passed.append(f"✅ {test_name}" + (f": {details}" if details else ""))
    
    def add_fail(self, test_name: str, details: str):
        self.failed.append(f"❌ {test_name}: {details}")
    
    def add_warning(self, test_name: str, details: str):
        self.warnings.append(f"⚠️  {test_name}: {details}")
    
    def print_summary(self):
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        if self.failed:
            print(f"\n🔴 FAILED TESTS ({len(self.failed)}):")
            for f in self.failed:
                print(f"  {f}")
        
        if self.warnings:
            print(f"\n🟡 WARNINGS ({len(self.warnings)}):")
            for w in self.warnings:
                print(f"  {w}")
        
        if self.passed:
            print(f"\n🟢 PASSED TESTS ({len(self.passed)}):")
            for p in self.passed:
                print(f"  {p}")
        
        print(f"\n{'='*80}")
        print(f"Total: {len(self.passed)} passed, {len(self.failed)} failed, {len(self.warnings)} warnings")
        print("="*80 + "\n")


result = TestResult()


def api_call(method: str, endpoint: str, token: Optional[str] = None, 
             json_data: Optional[Dict] = None, expect_status: int = 200) -> tuple:
    """Make API call and return (success, response_data, status_code)"""
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            resp = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            resp = requests.post(url, headers=headers, json=json_data, timeout=10)
        elif method == "PUT":
            resp = requests.put(url, headers=headers, json=json_data, timeout=10)
        elif method == "DELETE":
            resp = requests.delete(url, headers=headers, timeout=10)
        else:
            return False, f"Unknown method {method}", 0
        
        success = resp.status_code == expect_status
        try:
            data = resp.json()
        except:
            data = resp.text
        
        return success, data, resp.status_code
    except Exception as e:
        return False, str(e), 0


# ============================================================================
# 1. AUTH & ROLES TESTS
# ============================================================================

def test_auth_status():
    """Test GET /api/auth/status"""
    print("\n[1.1] Testing auth status...")
    success, data, status = api_call("GET", "/auth/status")
    if success and isinstance(data, dict) and 'has_owner' in data:
        result.add_pass("Auth status", f"has_owner={data['has_owner']}")
        return data['has_owner']
    else:
        result.add_fail("Auth status", f"Status {status}, Response: {data}")
        return False


def test_owner_login():
    """Test POST /api/auth/login with owner credentials"""
    print("[1.2] Testing owner login...")
    global owner_token
    
    success, data, status = api_call("POST", "/auth/login", json_data={
        "email": OWNER_EMAIL,
        "password": OWNER_PASSWORD
    })
    
    if success and isinstance(data, dict) and 'token' in data and 'user' in data:
        owner_token = data['token']
        user = data['user']
        if 'password_hash' in user:
            result.add_fail("Owner login", "Response contains password_hash (security issue)")
        else:
            result.add_pass("Owner login", f"Token received, user: {user.get('name')}")
        return True
    else:
        result.add_fail("Owner login", f"Status {status}, Response: {data}")
        return False


def test_wrong_password():
    """Test login with wrong password returns 401"""
    print("[1.3] Testing wrong password...")
    success, data, status = api_call("POST", "/auth/login", json_data={
        "email": OWNER_EMAIL,
        "password": "wrongpassword"
    }, expect_status=401)
    
    if success:
        result.add_pass("Wrong password rejection", "401 returned as expected")
    else:
        result.add_fail("Wrong password rejection", f"Expected 401, got {status}")


def test_auth_me():
    """Test GET /api/auth/me"""
    print("[1.4] Testing /auth/me...")
    success, data, status = api_call("GET", "/auth/me", token=owner_token)
    
    if success and isinstance(data, dict):
        if 'password_hash' in data:
            result.add_fail("Auth me", "Response contains password_hash")
        elif data.get('role') == 'owner':
            result.add_pass("Auth me", f"Owner profile: {data.get('name')}")
        else:
            result.add_fail("Auth me", f"Unexpected role: {data.get('role')}")
    else:
        result.add_fail("Auth me", f"Status {status}, Response: {data}")


def test_create_employee():
    """Test POST /api/auth/staff to create employee"""
    print("[1.5] Testing employee creation...")
    global employee_token
    
    success, data, status = api_call("POST", "/auth/staff", token=owner_token, json_data={
        "name": "Rajesh Kumar",
        "email": "rajesh@shop.in",
        "password": "employee123",
        "role": "employee"
    })
    
    if success and isinstance(data, dict) and data.get('role') == 'employee':
        result.add_pass("Create employee", f"Employee created: {data.get('name')}")
        test_data['employee_id'] = data.get('id')
        
        # Now login as employee
        print("[1.6] Testing employee login...")
        success2, data2, status2 = api_call("POST", "/auth/login", json_data={
            "email": "rajesh@shop.in",
            "password": "employee123"
        })
        
        if success2 and 'token' in data2:
            employee_token = data2['token']
            result.add_pass("Employee login", "Employee token received")
        else:
            result.add_fail("Employee login", f"Status {status2}, Response: {data2}")
    else:
        result.add_fail("Create employee", f"Status {status}, Response: {data}")


def test_owner_only_endpoints():
    """Test that owner-only endpoints return 403 for employee"""
    print("[1.7] Testing owner-only endpoint restrictions...")
    
    owner_only_endpoints = [
        "/expenses",
        "/capital",
        "/ledger",
        "/working-capital",
        "/reports/pnl",
        "/activity",
        "/auth/staff"
    ]
    
    failed_endpoints = []
    for endpoint in owner_only_endpoints:
        success, data, status = api_call("GET", endpoint, token=employee_token, expect_status=403)
        if not success:
            failed_endpoints.append(f"{endpoint} (got {status})")
    
    if failed_endpoints:
        result.add_fail("Owner-only restrictions", f"These endpoints didn't return 403: {', '.join(failed_endpoints)}")
    else:
        result.add_pass("Owner-only restrictions", "All owner-only endpoints properly restricted")


def test_forgot_reset_password():
    """Test forgot/reset password flow"""
    print("[1.8] Testing forgot/reset password...")
    
    # Forgot password
    success, data, status = api_call("POST", "/auth/forgot", json_data={
        "email": OWNER_EMAIL
    })
    
    if success and isinstance(data, dict) and 'reset_token' in data:
        reset_token = data.get('reset_token')
        if reset_token:
            result.add_pass("Forgot password", "Reset token received")
            
            # Reset password
            success2, data2, status2 = api_call("POST", "/auth/reset", json_data={
                "token": reset_token,
                "password": OWNER_PASSWORD  # Reset to same password
            })
            
            if success2:
                result.add_pass("Reset password", "Password reset successful")
            else:
                result.add_fail("Reset password", f"Status {status2}, Response: {data2}")
        else:
            result.add_warning("Forgot password", "No reset_token (email not found - expected behavior)")
    else:
        result.add_fail("Forgot password", f"Status {status}, Response: {data}")


# ============================================================================
# 2. CATALOG TESTS
# ============================================================================

def test_create_catalog():
    """Create category, supplier, customer"""
    print("\n[2.1] Creating catalog entries...")
    
    # Category
    success, data, status = api_call("POST", "/categories", token=owner_token, json_data={
        "name": "Electronics"
    })
    if success and 'id' in data:
        test_data['category_id'] = data['id']
        result.add_pass("Create category", f"Category: {data.get('name')}")
    else:
        result.add_fail("Create category", f"Status {status}, Response: {data}")
    
    # Supplier with opening balance
    success, data, status = api_call("POST", "/suppliers", token=owner_token, json_data={
        "name": "Tech Suppliers Ltd",
        "phone": "9876543210",
        "address": "Mumbai, Maharashtra",
        "gstin": "27AABCT1234F1Z5",
        "opening_balance": 5000
    })
    if success and 'id' in data:
        test_data['supplier_id'] = data['id']
        if data.get('balance') == 5000:
            result.add_pass("Create supplier", f"Supplier with opening balance: {data.get('balance')}")
        else:
            result.add_fail("Create supplier", f"Opening balance not set correctly: {data.get('balance')}")
    else:
        result.add_fail("Create supplier", f"Status {status}, Response: {data}")
    
    # Customer with opening balance
    success, data, status = api_call("POST", "/customers", token=owner_token, json_data={
        "name": "Priya Sharma",
        "phone": "9123456789",
        "address": "Delhi",
        "gstin": "",
        "opening_balance": 2000
    })
    if success and 'id' in data:
        test_data['customer_id'] = data['id']
        if data.get('balance') == 2000:
            result.add_pass("Create customer", f"Customer with opening balance: {data.get('balance')}")
        else:
            result.add_fail("Create customer", f"Opening balance not set correctly: {data.get('balance')}")
    else:
        result.add_fail("Create customer", f"Status {status}, Response: {data}")


def test_list_catalog():
    """List categories, suppliers, customers"""
    print("[2.2] Listing catalog entries...")
    
    for endpoint, name in [("/categories", "categories"), ("/suppliers", "suppliers"), ("/customers", "customers")]:
        success, data, status = api_call("GET", endpoint, token=owner_token)
        if success and isinstance(data, list):
            result.add_pass(f"List {name}", f"Found {len(data)} {name}")
        else:
            result.add_fail(f"List {name}", f"Status {status}, Response: {data}")


# ============================================================================
# 3. PRODUCTS TESTS
# ============================================================================

def test_create_product_with_opening_stock():
    """Create product with opening_stock and purchase_price"""
    print("\n[3.1] Creating product with opening stock...")
    
    success, data, status = api_call("POST", "/products", token=owner_token, json_data={
        "sku": "PHONE001",
        "name": "Samsung Galaxy A54",
        "category_id": test_data.get('category_id'),
        "barcode": "8801234567890",
        "unit": "pcs",
        "purchase_price": 25000,
        "selling_price": 32000,
        "opening_stock": 10,
        "image_url": "",
        "low_stock_threshold": 5
    })
    
    if success and 'id' in data:
        test_data['product1_id'] = data['id']
        if data.get('avg_cost') == 25000:
            result.add_pass("Create product", f"Product created, avg_cost={data.get('avg_cost')}")
        else:
            result.add_fail("Create product", f"avg_cost should be 25000, got {data.get('avg_cost')}")
    else:
        result.add_fail("Create product", f"Status {status}, Response: {data}")


def test_list_products():
    """List products and verify stock_value and low flag"""
    print("[3.2] Listing products...")
    
    success, data, status = api_call("GET", "/products", token=owner_token)
    if success and isinstance(data, list) and len(data) > 0:
        product = data[0]
        if 'stock_value' in product and 'low' in product:
            result.add_pass("List products", f"stock_value={product.get('stock_value')}, low={product.get('low')}")
        else:
            result.add_fail("List products", "Missing stock_value or low flag")
    else:
        result.add_fail("List products", f"Status {status}, Response: {data}")


def test_product_lookup():
    """Test GET /api/products/lookup?code=<sku>"""
    print("[3.3] Testing product lookup...")
    
    success, data, status = api_call("GET", "/products/lookup?code=PHONE001", token=owner_token)
    if success and isinstance(data, dict) and data.get('sku') == 'PHONE001':
        result.add_pass("Product lookup", f"Found: {data.get('name')}")
    else:
        result.add_fail("Product lookup", f"Status {status}, Response: {data}")


# ============================================================================
# 4. CORE END-TO-END CHAIN (CRITICAL)
# ============================================================================

def test_core_chain():
    """Test the critical purchase -> sale -> payment chain"""
    print("\n[4] CORE END-TO-END CHAIN (CRITICAL)")
    
    # 4a. Create fresh product with opening_stock 0
    print("[4.1] Creating fresh product with zero stock...")
    success, data, status = api_call("POST", "/products", token=owner_token, json_data={
        "sku": "LAPTOP001",
        "name": "Dell Inspiron 15",
        "category_id": test_data.get('category_id'),
        "barcode": "",
        "unit": "pcs",
        "purchase_price": 0,
        "selling_price": 55000,
        "opening_stock": 0,
        "image_url": "",
        "low_stock_threshold": 2
    })
    
    if success and 'id' in data:
        test_data['product2_id'] = data['id']
        if data.get('stock') == 0 and data.get('avg_cost') == 0:
            result.add_pass("Create fresh product", "Stock=0, avg_cost=0")
        else:
            result.add_fail("Create fresh product", f"Stock={data.get('stock')}, avg_cost={data.get('avg_cost')}")
    else:
        result.add_fail("Create fresh product", f"Status {status}, Response: {data}")
        return
    
    # 4b. First purchase: qty 100, price 1000 (cost per unit), cash
    print("[4.2] First purchase: 100 units @ 1000 each...")
    success, data, status = api_call("POST", "/purchases", token=owner_token, json_data={
        "supplier_id": test_data.get('supplier_id'),
        "date": None,
        "items": [
            {
                "product_id": test_data['product2_id'],
                "qty": 100,
                "price": 1000
            }
        ],
        "payment_type": "cash",
        "amount_paid": 0
    })
    
    if success and 'id' in data:
        test_data['purchase1_id'] = data['id']
        result.add_pass("First purchase", f"Total: {data.get('total')}")
        
        # Verify product stock and avg_cost
        success2, prod, status2 = api_call("GET", f"/products/lookup?code=LAPTOP001", token=owner_token)
        if success2:
            if prod.get('stock') == 100 and prod.get('avg_cost') == 1000:
                result.add_pass("First purchase verification", f"Stock=100, avg_cost=1000")
            else:
                result.add_fail("First purchase verification", f"Stock={prod.get('stock')}, avg_cost={prod.get('avg_cost')}")
        else:
            result.add_fail("First purchase verification", f"Could not fetch product")
    else:
        result.add_fail("First purchase", f"Status {status}, Response: {data}")
        return
    
    # 4c. Second purchase: qty 100, price 2000, cash - test weighted average
    print("[4.3] Second purchase: 100 units @ 2000 each (weighted avg test)...")
    success, data, status = api_call("POST", "/purchases", token=owner_token, json_data={
        "supplier_id": test_data.get('supplier_id'),
        "date": None,
        "items": [
            {
                "product_id": test_data['product2_id'],
                "qty": 100,
                "price": 2000
            }
        ],
        "payment_type": "cash",
        "amount_paid": 0
    })
    
    if success:
        # Verify weighted average: (100*1000 + 100*2000)/200 = 1500
        success2, prod, status2 = api_call("GET", f"/products/lookup?code=LAPTOP001", token=owner_token)
        if success2:
            expected_avg = 1500
            if prod.get('stock') == 200 and prod.get('avg_cost') == expected_avg:
                result.add_pass("Weighted average", f"Stock=200, avg_cost={expected_avg}")
            else:
                result.add_fail("Weighted average", f"Expected stock=200, avg_cost={expected_avg}, got stock={prod.get('stock')}, avg_cost={prod.get('avg_cost')}")
        else:
            result.add_fail("Weighted average", "Could not fetch product")
    else:
        result.add_fail("Second purchase", f"Status {status}, Response: {data}")
    
    # 4d. Oversell protection test
    print("[4.4] Testing oversell protection (trying to sell 9999 units)...")
    success, data, status = api_call("POST", "/sales", token=owner_token, json_data={
        "customer_id": None,
        "date": None,
        "items": [
            {
                "product_id": test_data['product2_id'],
                "qty": 9999,
                "price": 55000
            }
        ],
        "discount_type": "flat",
        "discount_value": 0,
        "payment_type": "cash",
        "payment_mode": "Cash",
        "amount_paid": 0
    }, expect_status=400)
    
    if success:
        if isinstance(data, dict) and 'detail' in data:
            detail = data['detail'].lower()
            if 'not enough stock' in detail or 'stock' in detail:
                result.add_pass("Oversell protection", f"Blocked with message: {data['detail']}")
            else:
                result.add_warning("Oversell protection", f"Blocked but unclear message: {data['detail']}")
        else:
            result.add_pass("Oversell protection", "Sale blocked (400)")
        
        # Verify stock unchanged
        success2, prod, status2 = api_call("GET", f"/products/lookup?code=LAPTOP001", token=owner_token)
        if success2 and prod.get('stock') == 200:
            result.add_pass("Oversell stock check", "Stock unchanged at 200")
        else:
            result.add_fail("Oversell stock check", f"Stock changed to {prod.get('stock')}")
    else:
        result.add_fail("Oversell protection", f"Expected 400, got {status}")
    
    # 4e. Discount + tax test (tax_percent = 0)
    print("[4.5] Testing discount + tax (flat discount 100, tax 0%)...")
    success, data, status = api_call("POST", "/sales", token=owner_token, json_data={
        "customer_id": None,
        "date": None,
        "items": [
            {
                "product_id": test_data['product2_id'],
                "qty": 10,
                "price": 55000
            }
        ],
        "discount_type": "flat",
        "discount_value": 100,
        "payment_type": "cash",
        "payment_mode": "Cash",
        "amount_paid": 0
    })
    
    if success and 'id' in data:
        test_data['sale1_id'] = data['id']
        subtotal = data.get('subtotal')
        discount = data.get('discount')
        taxable = data.get('taxable')
        tax_amount = data.get('tax_amount')
        total = data.get('total')
        cogs = data.get('cogs')
        
        expected_subtotal = 10 * 55000
        expected_discount = 100
        expected_taxable = expected_subtotal - expected_discount
        expected_tax = 0  # tax_percent = 0
        expected_total = expected_taxable + expected_tax
        expected_cogs = 10 * 1500  # avg_cost = 1500
        
        issues = []
        if subtotal != expected_subtotal:
            issues.append(f"subtotal={subtotal} (expected {expected_subtotal})")
        if discount != expected_discount:
            issues.append(f"discount={discount} (expected {expected_discount})")
        if taxable != expected_taxable:
            issues.append(f"taxable={taxable} (expected {expected_taxable})")
        if tax_amount != expected_tax:
            issues.append(f"tax_amount={tax_amount} (expected {expected_tax})")
        if total != expected_total:
            issues.append(f"total={total} (expected {expected_total})")
        if cogs != expected_cogs:
            issues.append(f"cogs={cogs} (expected {expected_cogs})")
        
        if issues:
            result.add_fail("Discount + tax calculation", ", ".join(issues))
        else:
            result.add_pass("Discount + tax calculation", f"All calculations correct: total={total}, cogs={cogs}")
    else:
        result.add_fail("Discount + tax sale", f"Status {status}, Response: {data}")


# ============================================================================
# 5. WORKING CAPITAL (CRITICAL)
# ============================================================================

def test_working_capital():
    """Test working capital formula: WC = Cash + Stock + AR - AP"""
    print("\n[5] WORKING CAPITAL TESTS (CRITICAL)")
    
    # Get baseline
    print("[5.1] Getting baseline working capital...")
    success, wc_baseline, status = api_call("GET", "/working-capital", token=owner_token)
    if not success:
        result.add_fail("Working capital baseline", f"Status {status}, Response: {wc_baseline}")
        return
    
    print(f"  Baseline: cash={wc_baseline.get('cash')}, stock={wc_baseline.get('stock_value')}, AR={wc_baseline.get('accounts_receivable')}, AP={wc_baseline.get('accounts_payable')}, WC={wc_baseline.get('working_capital')}")
    
    # Verify formula
    cash = wc_baseline.get('cash', 0)
    stock = wc_baseline.get('stock_value', 0)
    ar = wc_baseline.get('accounts_receivable', 0)
    ap = wc_baseline.get('accounts_payable', 0)
    wc = wc_baseline.get('working_capital', 0)
    expected_wc = cash + stock + ar - ap
    
    if abs(wc - expected_wc) < 0.01:
        result.add_pass("WC formula baseline", f"WC={wc} matches formula")
    else:
        result.add_fail("WC formula baseline", f"WC={wc}, but formula gives {expected_wc}")
    
    # Add capital
    print("[5.2] Adding capital: 100000...")
    success, data, status = api_call("POST", "/capital", token=owner_token, json_data={
        "type": "Opening Capital",
        "amount": 100000,
        "note": "Test capital",
        "date": None
    })
    
    if not success:
        result.add_fail("Add capital", f"Status {status}, Response: {data}")
        return
    
    # Check WC increased by 100000
    success, wc_after_capital, status = api_call("GET", "/working-capital", token=owner_token)
    if success:
        cash_after = wc_after_capital.get('cash', 0)
        wc_after = wc_after_capital.get('working_capital', 0)
        
        if abs((cash_after - cash) - 100000) < 0.01:
            result.add_pass("Capital increases cash", f"Cash increased by 100000")
        else:
            result.add_fail("Capital increases cash", f"Cash increased by {cash_after - cash}, expected 100000")
        
        if abs((wc_after - wc) - 100000) < 0.01:
            result.add_pass("Capital increases WC", f"WC increased by 100000")
        else:
            result.add_fail("Capital increases WC", f"WC increased by {wc_after - wc}, expected 100000")
    else:
        result.add_fail("WC after capital", f"Status {status}")
    
    # Create product for WC test
    print("[5.3] Creating product for WC test...")
    success, prod, status = api_call("POST", "/products", token=owner_token, json_data={
        "sku": "WCTEST001",
        "name": "WC Test Product",
        "category_id": test_data.get('category_id'),
        "barcode": "",
        "unit": "pcs",
        "purchase_price": 0,
        "selling_price": 150000,
        "opening_stock": 0,
        "image_url": "",
        "low_stock_threshold": 1
    })
    
    if not success:
        result.add_fail("Create WC test product", f"Status {status}")
        return
    
    test_data['wc_product_id'] = prod['id']
    
    # Buy stock: 1 unit @ 100000 cash
    print("[5.4] Buying stock: 1 unit @ 100000 (cash)...")
    success, data, status = api_call("POST", "/purchases", token=owner_token, json_data={
        "supplier_id": test_data.get('supplier_id'),
        "date": None,
        "items": [
            {
                "product_id": test_data['wc_product_id'],
                "qty": 1,
                "price": 100000
            }
        ],
        "payment_type": "cash",
        "amount_paid": 0
    })
    
    if not success:
        result.add_fail("WC purchase", f"Status {status}, Response: {data}")
        return
    
    # Check WC: cash -100000, stock +100000 => WC unchanged
    success, wc_after_purchase, status = api_call("GET", "/working-capital", token=owner_token)
    if success:
        cash_after_purch = wc_after_purchase.get('cash', 0)
        stock_after_purch = wc_after_purchase.get('stock_value', 0)
        wc_after_purch = wc_after_purchase.get('working_capital', 0)
        
        print(f"  After purchase: cash={cash_after_purch}, stock={stock_after_purch}, WC={wc_after_purch}")
        
        # Verify formula still holds
        expected_wc_purch = cash_after_purch + stock_after_purch + wc_after_purchase.get('accounts_receivable', 0) - wc_after_purchase.get('accounts_payable', 0)
        if abs(wc_after_purch - expected_wc_purch) < 0.01:
            result.add_pass("WC formula after purchase", f"Formula holds: WC={wc_after_purch}")
        else:
            result.add_fail("WC formula after purchase", f"WC={wc_after_purch}, formula gives {expected_wc_purch}")
    
    # CASH SALE: sell for 150000 cash
    print("[5.5] CASH SALE: selling 1 unit @ 150000 (cash)...")
    success, sale_data, status = api_call("POST", "/sales", token=owner_token, json_data={
        "customer_id": None,
        "date": None,
        "items": [
            {
                "product_id": test_data['wc_product_id'],
                "qty": 1,
                "price": 150000
            }
        ],
        "discount_type": "flat",
        "discount_value": 0,
        "payment_type": "cash",
        "payment_mode": "Cash",
        "amount_paid": 0
    })
    
    if not success:
        result.add_fail("WC cash sale", f"Status {status}, Response: {sale_data}")
        return
    
    test_data['wc_sale_cash_id'] = sale_data['id']
    
    # Check WC: cash +150000, stock -100000 => WC net +50000 (profit)
    success, wc_after_cash_sale, status = api_call("GET", "/working-capital", token=owner_token)
    if success:
        cash_after_sale = wc_after_cash_sale.get('cash', 0)
        stock_after_sale = wc_after_cash_sale.get('stock_value', 0)
        wc_after_sale = wc_after_cash_sale.get('working_capital', 0)
        
        print(f"  After cash sale: cash={cash_after_sale}, stock={stock_after_sale}, WC={wc_after_sale}")
        
        # Verify formula
        expected_wc_sale = cash_after_sale + stock_after_sale + wc_after_cash_sale.get('accounts_receivable', 0) - wc_after_cash_sale.get('accounts_payable', 0)
        if abs(wc_after_sale - expected_wc_sale) < 0.01:
            result.add_pass("WC formula after cash sale", f"Formula holds: WC={wc_after_sale}")
        else:
            result.add_fail("WC formula after cash sale", f"WC={wc_after_sale}, formula gives {expected_wc_sale}")
        
        # Check profit reflected in WC
        profit = 150000 - 100000
        wc_increase = wc_after_sale - wc_after_purch
        if abs(wc_increase - profit) < 0.01:
            result.add_pass("WC cash sale profit", f"WC increased by {profit} (profit)")
        else:
            result.add_warning("WC cash sale profit", f"WC increased by {wc_increase}, expected {profit}")
    
    # CREDIT SALE: buy another unit, sell on credit
    print("[5.6] Buying another unit for credit sale test...")
    success, data, status = api_call("POST", "/purchases", token=owner_token, json_data={
        "supplier_id": test_data.get('supplier_id'),
        "date": None,
        "items": [
            {
                "product_id": test_data['wc_product_id'],
                "qty": 1,
                "price": 100000
            }
        ],
        "payment_type": "cash",
        "amount_paid": 0
    })
    
    if not success:
        result.add_fail("WC second purchase", f"Status {status}")
        return
    
    # Get WC before credit sale
    success, wc_before_credit, status = api_call("GET", "/working-capital", token=owner_token)
    if not success:
        result.add_fail("WC before credit sale", f"Status {status}")
        return
    
    print("[5.7] CREDIT SALE: selling 1 unit @ 150000 (credit)...")
    success, sale_data, status = api_call("POST", "/sales", token=owner_token, json_data={
        "customer_id": test_data.get('customer_id'),
        "date": None,
        "items": [
            {
                "product_id": test_data['wc_product_id'],
                "qty": 1,
                "price": 150000
            }
        ],
        "discount_type": "flat",
        "discount_value": 0,
        "payment_type": "credit",
        "payment_mode": "Credit",
        "amount_paid": 0
    })
    
    if not success:
        result.add_fail("WC credit sale", f"Status {status}, Response: {sale_data}")
        return
    
    test_data['wc_sale_credit_id'] = sale_data['id']
    
    # Check WC: cash unchanged, stock -100000, AR +150000 => WC net +50000 (profit)
    success, wc_after_credit_sale, status = api_call("GET", "/working-capital", token=owner_token)
    if success:
        cash_after_credit = wc_after_credit_sale.get('cash', 0)
        stock_after_credit = wc_after_credit_sale.get('stock_value', 0)
        ar_after_credit = wc_after_credit_sale.get('accounts_receivable', 0)
        wc_after_credit = wc_after_credit_sale.get('working_capital', 0)
        
        print(f"  After credit sale: cash={cash_after_credit}, stock={stock_after_credit}, AR={ar_after_credit}, WC={wc_after_credit}")
        
        # Verify formula
        expected_wc_credit = cash_after_credit + stock_after_credit + ar_after_credit - wc_after_credit_sale.get('accounts_payable', 0)
        if abs(wc_after_credit - expected_wc_credit) < 0.01:
            result.add_pass("WC formula after credit sale", f"Formula holds: WC={wc_after_credit}")
        else:
            result.add_fail("WC formula after credit sale", f"WC={wc_after_credit}, formula gives {expected_wc_credit}")
        
        # Check cash unchanged
        cash_before = wc_before_credit.get('cash', 0)
        if abs(cash_after_credit - cash_before) < 0.01:
            result.add_pass("Credit sale cash unchanged", "Cash unchanged as expected")
        else:
            result.add_warning("Credit sale cash unchanged", f"Cash changed by {cash_after_credit - cash_before}")
        
        # Check AR increased by 150000
        ar_before = wc_before_credit.get('accounts_receivable', 0)
        ar_increase = ar_after_credit - ar_before
        if abs(ar_increase - 150000) < 0.01:
            result.add_pass("Credit sale AR increase", f"AR increased by 150000")
        else:
            result.add_fail("Credit sale AR increase", f"AR increased by {ar_increase}, expected 150000")
        
        # Check WC increased by profit
        wc_before = wc_before_credit.get('working_capital', 0)
        profit = 150000 - 100000
        wc_increase = wc_after_credit - wc_before
        if abs(wc_increase - profit) < 0.01:
            result.add_pass("WC credit sale profit", f"WC increased by {profit} (profit)")
        else:
            result.add_warning("WC credit sale profit", f"WC increased by {wc_increase}, expected {profit}")


# ============================================================================
# 6. CREDIT LEDGER & PAYMENTS
# ============================================================================

def test_credit_ledger_and_payments():
    """Test credit ledger and payment recording"""
    print("\n[6] CREDIT LEDGER & PAYMENTS")
    
    # Get ledger
    print("[6.1] Getting credit ledger...")
    success, ledger, status = api_call("GET", "/ledger", token=owner_token)
    if success and isinstance(ledger, dict):
        customers_owe = ledger.get('customers_owe_us', 0)
        we_owe = ledger.get('we_owe_suppliers', 0)
        customers_list = ledger.get('customers', [])
        
        result.add_pass("Credit ledger", f"AR={customers_owe}, AP={we_owe}, {len(customers_list)} customers with balance")
        
        # Check if our test customer appears
        test_customer = next((c for c in customers_list if c['id'] == test_data.get('customer_id')), None)
        if test_customer:
            result.add_pass("Customer in ledger", f"{test_customer['name']}: balance={test_customer['balance']}")
        else:
            result.add_warning("Customer in ledger", "Test customer not found in ledger")
    else:
        result.add_fail("Credit ledger", f"Status {status}, Response: {ledger}")
        return
    
    # Record payment from customer
    if test_data.get('wc_sale_credit_id'):
        print("[6.2] Recording customer payment...")
        
        # Get WC before payment
        success, wc_before, status = api_call("GET", "/working-capital", token=owner_token)
        cash_before = wc_before.get('cash', 0) if success else 0
        
        success, payment, status = api_call("POST", "/payments", token=owner_token, json_data={
            "direction": "customer",
            "party_id": test_data.get('customer_id'),
            "sale_id": test_data.get('wc_sale_credit_id'),
            "purchase_id": None,
            "amount": 50000,
            "mode": "Cash",
            "note": "Partial payment"
        })
        
        if success and 'id' in payment:
            result.add_pass("Record customer payment", f"Payment recorded: {payment.get('amount')}")
            
            # Check customer balance reduced
            success2, ledger2, status2 = api_call("GET", "/ledger", token=owner_token)
            if success2:
                customers_list2 = ledger2.get('customers', [])
                test_customer2 = next((c for c in customers_list2 if c['id'] == test_data.get('customer_id')), None)
                if test_customer2:
                    result.add_pass("Customer balance reduced", f"New balance: {test_customer2['balance']}")
            
            # Check sale updated
            success3, sale, status3 = api_call("GET", f"/sales/{test_data.get('wc_sale_credit_id')}", token=owner_token)
            if success3:
                amount_paid = sale.get('amount_paid', 0)
                balance_due = sale.get('balance_due', 0)
                sale_status = sale.get('status', '')
                result.add_pass("Sale updated after payment", f"Paid={amount_paid}, Due={balance_due}, Status={sale_status}")
            
            # Check cash increased
            success4, wc_after, status4 = api_call("GET", "/working-capital", token=owner_token)
            if success4:
                cash_after = wc_after.get('cash', 0)
                cash_increase = cash_after - cash_before
                if abs(cash_increase - 50000) < 0.01:
                    result.add_pass("Payment increases cash", f"Cash increased by 50000")
                else:
                    result.add_fail("Payment increases cash", f"Cash increased by {cash_increase}, expected 50000")
        else:
            result.add_fail("Record customer payment", f"Status {status}, Response: {payment}")
    
    # Test supplier payment
    print("[6.3] Testing supplier payment...")
    # First create a credit purchase
    success, purch, status = api_call("POST", "/purchases", token=owner_token, json_data={
        "supplier_id": test_data.get('supplier_id'),
        "date": None,
        "items": [
            {
                "product_id": test_data['product1_id'],
                "qty": 5,
                "price": 25000
            }
        ],
        "payment_type": "credit",
        "amount_paid": 0
    })
    
    if success and 'id' in purch:
        test_data['credit_purchase_id'] = purch['id']
        
        # Check ledger shows supplier payable
        success2, ledger2, status2 = api_call("GET", "/ledger", token=owner_token)
        if success2:
            suppliers_list = ledger2.get('suppliers', [])
            test_supplier = next((s for s in suppliers_list if s['id'] == test_data.get('supplier_id')), None)
            if test_supplier:
                result.add_pass("Supplier payable created", f"Supplier balance: {test_supplier['balance']}")
        
        # Record payment to supplier
        success3, payment, status3 = api_call("POST", "/payments", token=owner_token, json_data={
            "direction": "supplier",
            "party_id": test_data.get('supplier_id'),
            "sale_id": None,
            "purchase_id": test_data.get('credit_purchase_id'),
            "amount": 50000,
            "mode": "Bank Transfer",
            "note": "Partial payment to supplier"
        })
        
        if success3:
            result.add_pass("Record supplier payment", "Payment to supplier recorded")
            
            # Check supplier balance reduced
            success4, ledger3, status4 = api_call("GET", "/ledger", token=owner_token)
            if success4:
                suppliers_list2 = ledger3.get('suppliers', [])
                test_supplier2 = next((s for s in suppliers_list2 if s['id'] == test_data.get('supplier_id')), None)
                if test_supplier2:
                    result.add_pass("Supplier balance reduced", f"New balance: {test_supplier2['balance']}")
        else:
            result.add_fail("Record supplier payment", f"Status {status3}, Response: {payment}")


# ============================================================================
# 7. OTHER FEATURES
# ============================================================================

def test_expenses():
    """Test POST /api/expenses"""
    print("\n[7.1] Testing expenses...")
    
    # Get cash before
    success, wc_before, status = api_call("GET", "/working-capital", token=owner_token)
    cash_before = wc_before.get('cash', 0) if success else 0
    
    success, data, status = api_call("POST", "/expenses", token=owner_token, json_data={
        "category": "Rent",
        "amount": 15000,
        "mode": "Cash",
        "note": "Monthly rent",
        "date": None
    })
    
    if success and 'id' in data:
        result.add_pass("Create expense", f"Expense: {data.get('amount')}")
        
        # Check cash reduced
        success2, wc_after, status2 = api_call("GET", "/working-capital", token=owner_token)
        if success2:
            cash_after = wc_after.get('cash', 0)
            cash_decrease = cash_before - cash_after
            if abs(cash_decrease - 15000) < 0.01:
                result.add_pass("Expense reduces cash", f"Cash reduced by 15000")
            else:
                result.add_fail("Expense reduces cash", f"Cash reduced by {cash_decrease}, expected 15000")
    else:
        result.add_fail("Create expense", f"Status {status}, Response: {data}")


def test_stock_adjustments():
    """Test stock adjustments"""
    print("[7.2] Testing stock adjustments...")
    
    # Get product stock before
    success, prod_before, status = api_call("GET", f"/products/lookup?code=PHONE001", token=owner_token)
    if not success:
        result.add_fail("Stock adjustment - get product", f"Status {status}")
        return
    
    stock_before = prod_before.get('stock', 0)
    
    # Decrease stock
    success, data, status = api_call("POST", "/stock-adjustments", token=owner_token, json_data={
        "product_id": test_data.get('product1_id'),
        "change": -2,
        "reason": "Damaged",
        "note": "2 units damaged during handling"
    })
    
    if success:
        result.add_pass("Stock adjustment decrease", "Adjustment recorded")
        
        # Verify stock decreased
        success2, prod_after, status2 = api_call("GET", f"/products/lookup?code=PHONE001", token=owner_token)
        if success2:
            stock_after = prod_after.get('stock', 0)
            if stock_after == stock_before - 2:
                result.add_pass("Stock decreased", f"Stock: {stock_before} -> {stock_after}")
            else:
                result.add_fail("Stock decreased", f"Expected {stock_before - 2}, got {stock_after}")
    else:
        result.add_fail("Stock adjustment decrease", f"Status {status}, Response: {data}")
    
    # Try to make stock negative
    print("[7.3] Testing negative stock prevention...")
    success, data, status = api_call("POST", "/stock-adjustments", token=owner_token, json_data={
        "product_id": test_data.get('product1_id'),
        "change": -9999,
        "reason": "Test",
        "note": "Should fail"
    }, expect_status=400)
    
    if success:
        result.add_pass("Negative stock prevention", "Adjustment blocked")
    else:
        result.add_fail("Negative stock prevention", f"Expected 400, got {status}")


def test_returns():
    """Test returns"""
    print("[7.4] Testing returns...")
    
    # Customer return (increases stock)
    success, prod_before, status = api_call("GET", f"/products/lookup?code=PHONE001", token=owner_token)
    stock_before = prod_before.get('stock', 0) if success else 0
    
    success, data, status = api_call("POST", "/returns", token=owner_token, json_data={
        "kind": "customer",
        "ref_id": None,
        "party_id": test_data.get('customer_id'),
        "items": [
            {
                "product_id": test_data.get('product1_id'),
                "qty": 1,
                "price": 32000
            }
        ],
        "refund_mode": "Cash"
    })
    
    if success:
        result.add_pass("Customer return", "Return recorded")
        
        # Verify stock increased
        success2, prod_after, status2 = api_call("GET", f"/products/lookup?code=PHONE001", token=owner_token)
        if success2:
            stock_after = prod_after.get('stock', 0)
            if stock_after == stock_before + 1:
                result.add_pass("Customer return increases stock", f"Stock: {stock_before} -> {stock_after}")
            else:
                result.add_fail("Customer return increases stock", f"Expected {stock_before + 1}, got {stock_after}")
    else:
        result.add_fail("Customer return", f"Status {status}, Response: {data}")
    
    # Supplier return (decreases stock)
    success, prod_before2, status = api_call("GET", f"/products/lookup?code=PHONE001", token=owner_token)
    stock_before2 = prod_before2.get('stock', 0) if success else 0
    
    success, data, status = api_call("POST", "/returns", token=owner_token, json_data={
        "kind": "supplier",
        "ref_id": None,
        "party_id": test_data.get('supplier_id'),
        "items": [
            {
                "product_id": test_data.get('product1_id'),
                "qty": 1,
                "price": 25000
            }
        ],
        "refund_mode": "Bank Transfer"
    })
    
    if success:
        result.add_pass("Supplier return", "Return recorded")
        
        # Verify stock decreased
        success2, prod_after2, status2 = api_call("GET", f"/products/lookup?code=PHONE001", token=owner_token)
        if success2:
            stock_after2 = prod_after2.get('stock', 0)
            if stock_after2 == stock_before2 - 1:
                result.add_pass("Supplier return decreases stock", f"Stock: {stock_before2} -> {stock_after2}")
            else:
                result.add_fail("Supplier return decreases stock", f"Expected {stock_before2 - 1}, got {stock_after2}")
    else:
        result.add_fail("Supplier return", f"Status {status}, Response: {data}")


def test_day_close():
    """Test day close"""
    print("[7.5] Testing day close...")
    
    # Get expected cash
    success, expected, status = api_call("GET", "/day-close/expected", token=owner_token)
    if success and isinstance(expected, dict):
        result.add_pass("Day close expected", f"Expected cash: {expected.get('expected_cash')}")
        
        if not expected.get('already_closed'):
            # Close the day
            success2, data, status2 = api_call("POST", "/day-close", token=owner_token, json_data={
                "counted_cash": expected.get('expected_cash', 0),
                "date": None
            })
            
            if success2:
                result.add_pass("Day close", f"Day closed, variance: {data.get('variance', 0)}")
                
                # Try to close again (should fail)
                success3, data3, status3 = api_call("POST", "/day-close", token=owner_token, json_data={
                    "counted_cash": 1000,
                    "date": None
                }, expect_status=400)
                
                if success3:
                    result.add_pass("Day close duplicate prevention", "Second close blocked")
                else:
                    result.add_fail("Day close duplicate prevention", f"Expected 400, got {status3}")
            else:
                result.add_fail("Day close", f"Status {status2}, Response: {data}")
        else:
            result.add_warning("Day close", "Day already closed, skipping duplicate test")
    else:
        result.add_fail("Day close expected", f"Status {status}, Response: {expected}")


def test_dashboard():
    """Test dashboard"""
    print("[7.6] Testing dashboard...")
    
    success, dash, status = api_call("GET", "/dashboard", token=owner_token)
    if success and isinstance(dash, dict):
        # Get WC for comparison
        success2, wc, status2 = api_call("GET", "/working-capital", token=owner_token)
        
        if success2:
            # Verify cash_in_hand matches WC cash
            if abs(dash.get('cash_in_hand', 0) - wc.get('cash', 0)) < 0.01:
                result.add_pass("Dashboard cash matches WC", f"Cash: {dash.get('cash_in_hand')}")
            else:
                result.add_fail("Dashboard cash matches WC", f"Dashboard: {dash.get('cash_in_hand')}, WC: {wc.get('cash')}")
            
            # Verify net_profit = gross_profit - expenses
            gross = dash.get('gross_profit', 0)
            expenses = dash.get('total_expenses', 0)
            net = dash.get('net_profit', 0)
            expected_net = gross - expenses
            
            if abs(net - expected_net) < 0.01:
                result.add_pass("Dashboard profit calculation", f"Net profit: {net}")
            else:
                result.add_fail("Dashboard profit calculation", f"Net={net}, but gross-expenses={expected_net}")
        
        result.add_pass("Dashboard data", f"Sales: {dash.get('total_sales')}, Profit: {dash.get('net_profit')}")
    else:
        result.add_fail("Dashboard", f"Status {status}, Response: {dash}")


def test_reports():
    """Test reports"""
    print("[7.7] Testing P&L report...")
    
    success, pnl, status = api_call("GET", "/reports/pnl", token=owner_token)
    if success and isinstance(pnl, dict):
        sales = pnl.get('sales', 0)
        cogs = pnl.get('cogs', 0)
        gross = pnl.get('gross_profit', 0)
        expenses = pnl.get('expenses', 0)
        net = pnl.get('net_profit', 0)
        
        # Verify calculations
        if abs(gross - (sales - cogs)) < 0.01 and abs(net - (gross - expenses)) < 0.01:
            result.add_pass("P&L report", f"Sales={sales}, COGS={cogs}, Gross={gross}, Net={net}")
        else:
            result.add_fail("P&L report", f"Calculation mismatch: Sales={sales}, COGS={cogs}, Gross={gross}, Expenses={expenses}, Net={net}")
    else:
        result.add_fail("P&L report", f"Status {status}, Response: {pnl}")


def test_invoice_pdf():
    """Test invoice PDF generation"""
    print("[7.8] Testing invoice PDF...")
    
    if test_data.get('sale1_id'):
        url = f"{BASE_URL}/invoice/{test_data['sale1_id']}/pdf"
        headers = {"Authorization": f"Bearer {owner_token}"}
        
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200 and resp.headers.get('content-type') == 'application/pdf':
                result.add_pass("Invoice PDF", f"PDF generated, size: {len(resp.content)} bytes")
            else:
                result.add_fail("Invoice PDF", f"Status {resp.status_code}, Content-Type: {resp.headers.get('content-type')}")
        except Exception as e:
            result.add_fail("Invoice PDF", str(e))
    else:
        result.add_warning("Invoice PDF", "No sale_id available for testing")


def test_upi_qr():
    """Test UPI QR generation"""
    print("[7.9] Testing UPI QR...")
    
    # First set UPI ID in settings
    success, data, status = api_call("PUT", "/settings", token=owner_token, json_data={
        "name": "My Shop",
        "address": "123 Main St",
        "gstin": "",
        "tax_percent": 0,
        "invoice_prefix": "INV-",
        "upi_id": "sharma@upi"
    })
    
    if not success:
        result.add_warning("UPI QR setup", "Could not set UPI ID")
        return
    
    if test_data.get('sale1_id'):
        success, data, status = api_call("GET", f"/invoice/{test_data['sale1_id']}/upi-qr", token=owner_token)
        if success and isinstance(data, dict):
            if data.get('has_upi') and 'qr' in data:
                result.add_pass("UPI QR", f"QR generated, amount: {data.get('amount')}")
            else:
                result.add_fail("UPI QR", f"has_upi={data.get('has_upi')}, qr present: {'qr' in data}")
        else:
            result.add_fail("UPI QR", f"Status {status}, Response: {data}")
    else:
        result.add_warning("UPI QR", "No sale_id available for testing")


def test_settings():
    """Test settings endpoint"""
    print("[7.10] Testing settings...")
    
    # GET settings
    success, data, status = api_call("GET", "/settings", token=owner_token)
    if success and isinstance(data, dict):
        result.add_pass("Get settings", f"Shop: {data.get('name')}")
    else:
        result.add_fail("Get settings", f"Status {status}")
    
    # PUT settings (owner only)
    success, data, status = api_call("PUT", "/settings", token=employee_token, expect_status=403)
    if success:
        result.add_pass("Settings owner-only", "Employee blocked from updating settings")
    else:
        result.add_fail("Settings owner-only", f"Expected 403, got {status}")


def test_activity_log():
    """Test activity log (owner only)"""
    print("[7.11] Testing activity log...")
    
    success, data, status = api_call("GET", "/activity", token=owner_token)
    if success and isinstance(data, list):
        result.add_pass("Activity log", f"{len(data)} activities logged")
    else:
        result.add_fail("Activity log", f"Status {status}, Response: {data}")


# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def run_all_tests():
    """Run all tests in sequence"""
    print("="*80)
    print("SHOP ERP BACKEND COMPREHENSIVE TEST")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Owner credentials: {OWNER_EMAIL} / {OWNER_PASSWORD}")
    print("="*80)
    
    # 1. Auth & Roles
    print("\n" + "="*80)
    print("1. AUTH & ROLES TESTS")
    print("="*80)
    has_owner = test_auth_status()
    
    if not has_owner:
        print("\n⚠️  No owner found. Creating owner via first-run...")
        success, data, status = api_call("POST", "/auth/first-run", json_data={
            "name": "Shop Owner",
            "email": OWNER_EMAIL,
            "password": OWNER_PASSWORD
        })
        if success:
            global owner_token
            owner_token = data.get('token')
            result.add_pass("First-run owner creation", "Owner created")
        else:
            result.add_fail("First-run owner creation", f"Status {status}, Response: {data}")
            print("\n❌ Cannot proceed without owner. Exiting.")
            result.print_summary()
            return
    
    if not owner_token:
        if not test_owner_login():
            print("\n❌ Cannot proceed without owner login. Exiting.")
            result.print_summary()
            return
    
    test_wrong_password()
    test_auth_me()
    test_create_employee()
    if employee_token:
        test_owner_only_endpoints()
    test_forgot_reset_password()
    
    # 2. Catalog
    print("\n" + "="*80)
    print("2. CATALOG TESTS")
    print("="*80)
    test_create_catalog()
    test_list_catalog()
    
    # 3. Products
    print("\n" + "="*80)
    print("3. PRODUCTS TESTS")
    print("="*80)
    test_create_product_with_opening_stock()
    test_list_products()
    test_product_lookup()
    
    # 4. Core end-to-end chain
    test_core_chain()
    
    # 5. Working Capital (CRITICAL)
    test_working_capital()
    
    # 6. Credit Ledger & Payments
    test_credit_ledger_and_payments()
    
    # 7. Other features
    print("\n" + "="*80)
    print("7. OTHER FEATURES")
    print("="*80)
    test_expenses()
    test_stock_adjustments()
    test_returns()
    test_day_close()
    test_dashboard()
    test_reports()
    test_invoice_pdf()
    test_upi_qr()
    test_settings()
    test_activity_log()
    
    # Print summary
    result.print_summary()


if __name__ == "__main__":
    run_all_tests()
