#!/usr/bin/env python3
"""Quick test to verify payment cash increase"""
import requests

BASE_URL = "https://erp-system-hub-2.preview.emergentagent.com/api"
OWNER_EMAIL = "owner@shop.in"
OWNER_PASSWORD = "admin123"

# Login
resp = requests.post(f"{BASE_URL}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD})
token = resp.json()['token']
headers = {"Authorization": f"Bearer {token}"}

# Get WC before
wc_before = requests.get(f"{BASE_URL}/working-capital", headers=headers).json()
print(f"Before payment: cash={wc_before['cash']}")

# Get ledger to find a customer with balance
ledger = requests.get(f"{BASE_URL}/ledger", headers=headers).json()
if ledger['customers']:
    customer = ledger['customers'][0]
    print(f"Customer: {customer['name']}, balance={customer['balance']}")
    
    # Record a small payment
    payment_amount = 1000
    payment = requests.post(f"{BASE_URL}/payments", headers=headers, json={
        "direction": "customer",
        "party_id": customer['id'],
        "sale_id": None,
        "purchase_id": None,
        "amount": payment_amount,
        "mode": "Cash",
        "note": "Test payment"
    })
    
    if payment.status_code == 200:
        print(f"Payment recorded: {payment_amount}")
        
        # Get WC after
        wc_after = requests.get(f"{BASE_URL}/working-capital", headers=headers).json()
        print(f"After payment: cash={wc_after['cash']}")
        
        cash_increase = wc_after['cash'] - wc_before['cash']
        print(f"Cash increase: {cash_increase} (expected {payment_amount})")
        
        if abs(cash_increase - payment_amount) < 0.01:
            print("✅ PASS: Cash increased correctly")
        else:
            print(f"❌ FAIL: Cash increased by {cash_increase}, expected {payment_amount}")
    else:
        print(f"Payment failed: {payment.status_code}, {payment.text}")
else:
    print("No customers with balance found")
