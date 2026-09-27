"""Seed a coherent demo dataset through the real API so all balances stay consistent."""
import requests

BASE = 'http://localhost:8001/api'


def main():
    r = requests.post(f'{BASE}/auth/login', json={'email': 'owner@shop.in', 'password': 'admin123'})
    token = r.json()['token']
    h = {'Authorization': f'Bearer {token}'}

    # settings
    requests.put(f'{BASE}/settings', headers=h, json={
        'name': 'Sharma General Store', 'address': '12 Market Road, Pune 411001',
        'gstin': '27ABCDE1234F1Z5', 'tax_percent': 0, 'invoice_prefix': 'INV-', 'upi_id': 'sharma@upi'})

    # skip if already seeded
    if len(requests.get(f'{BASE}/products', headers=h).json()) > 3:
        print('already seeded'); return

    cats = {}
    for c in ['Grocery', 'Beverage', 'Household', 'Snacks', 'Dairy']:
        cats[c] = requests.post(f'{BASE}/categories', headers=h, json={'name': c}).json()['id']

    sup = {}
    for name in ['Agro Distributors', 'FMCG Wholesale', 'Daily Needs Supply']:
        sup[name] = requests.post(f'{BASE}/suppliers', headers=h, json={'name': name, 'phone': '98765xxxxx'}).json()['id']

    cust = {}
    for name in ['Ramesh Store', 'Sunita Devi', 'Mohan Kirana']:
        cust[name] = requests.post(f'{BASE}/customers', headers=h, json={'name': name, 'phone': '99999xxxxx'}).json()['id']

    P = [
        ('Basmati Rice 5kg', 'Grocery', 'bag', 520, 15),
        ('Sunflower Oil 1L', 'Grocery', 'bottle', 165, 20),
        ('Toor Dal 1kg', 'Grocery', 'kg', 145, 25),
        ('Wheat Flour 10kg', 'Grocery', 'bag', 450, 10),
        ('Tea Powder 500g', 'Beverage', 'pack', 240, 15),
        ('Sugar 1kg', 'Grocery', 'kg', 52, 30),
        ('Detergent 1kg', 'Household', 'pack', 130, 12),
        ('Biscuits Pack', 'Snacks', 'pack', 30, 40),
        ('Milk Powder 500g', 'Dairy', 'pack', 315, 10),
        ('Salt 1kg', 'Grocery', 'kg', 25, 30),
    ]
    prod = {}
    for name, cat, unit, sell, thr in P:
        prod[name] = requests.post(f'{BASE}/products', headers=h, json={
            'name': name, 'category_id': cats[cat], 'unit': unit, 'selling_price': sell,
            'purchase_price': 0, 'opening_stock': 0, 'low_stock_threshold': thr}).json()['id']

    # capital
    requests.post(f'{BASE}/capital', headers=h, json={'type': 'Opening Capital', 'amount': 300000, 'note': 'Business start'})

    # purchases (paid) to stock up + set weighted-avg cost
    def buy(supplier, items, pay='cash'):
        requests.post(f'{BASE}/purchases', headers=h, json={
            'supplier_id': sup[supplier], 'payment_type': pay,
            'items': [{'product_id': prod[n], 'qty': q, 'price': c} for n, q, c in items]})

    buy('Agro Distributors', [('Basmati Rice 5kg', 60, 420), ('Wheat Flour 10kg', 20, 380)])
    buy('FMCG Wholesale', [('Sunflower Oil 1L', 50, 135), ('Detergent 1kg', 30, 95), ('Tea Powder 500g', 40, 190)], pay='credit')
    buy('Daily Needs Supply', [('Toor Dal 1kg', 80, 118), ('Sugar 1kg', 120, 42), ('Salt 1kg', 100, 18),
                               ('Biscuits Pack', 200, 22), ('Milk Powder 500g', 25, 260)])

    # sales (use real selling prices)
    sell_price = {name: sell for name, cat, unit, sell, thr in P}

    def sell(items, customer=None, ptype='cash', mode='Cash'):
        body = {'items': [{'product_id': prod[n], 'qty': q, 'price': sell_price[n]} for n, q in items],
                'payment_type': ptype, 'payment_mode': mode}
        if customer:
            body['customer_id'] = cust[customer]
        requests.post(f'{BASE}/sales', headers=h, json=body)

    sell([('Basmati Rice 5kg', 3), ('Sugar 1kg', 5), ('Toor Dal 1kg', 4)])
    sell([('Wheat Flour 10kg', 5), ('Sunflower Oil 1L', 6)], customer='Ramesh Store', ptype='credit')
    sell([('Tea Powder 500g', 4)], mode='UPI')
    sell([('Milk Powder 500g', 5)], customer='Sunita Devi', ptype='credit')
    sell([('Biscuits Pack', 21)], mode='Cash')
    sell([('Basmati Rice 5kg', 5)], customer='Mohan Kirana', ptype='partial', mode='UPI')

    # expenses
    for cat, amt, mode, note in [('Rent', 15000, 'Bank', 'Shop rent'), ('Electricity', 3200, 'UPI', 'Power bill'),
                                 ('Wages', 9000, 'Cash', 'Helper salary'), ('Transport', 1800, 'Cash', 'Delivery fuel')]:
        requests.post(f'{BASE}/expenses', headers=h, json={'category': cat, 'amount': amt, 'mode': mode, 'note': note})

    print('demo seeded successfully')


if __name__ == '__main__':
    main()
