"""Shared business logic: costing, invoice numbers, financial aggregates."""
from database import (products, sales, purchases, payments, capital_entries,
                      expenses, customers, suppliers, settings_col, day_close)

CASH_IN_CAPITAL = {'Opening Capital', 'Owner Investment', 'Loan Received'}
CASH_OUT_CAPITAL = {'Owner Drawing', 'Loan Repayment'}


async def next_invoice_no():
    s = await settings_col.find_one({'id': 'shop'}) or {}
    prefix = s.get('invoice_prefix', 'INV-')
    count = await sales.count_documents({})
    return f"{prefix}{1001 + count}"


def compute_sale_totals(items, product_map, discount_type, discount_value, tax_percent):
    """subtotal -> discount -> taxable -> tax -> total. Also COGS via weighted avg."""
    subtotal = sum(i['qty'] * i['price'] for i in items)
    if discount_type == 'percent':
        discount = round(subtotal * (discount_value or 0) / 100, 2)
    else:
        discount = round(discount_value or 0, 2)
    discount = min(discount, subtotal)
    taxable = round(subtotal - discount, 2)
    tax_amount = round(taxable * (tax_percent or 0) / 100, 2)
    total = round(taxable + tax_amount, 2)
    cogs = 0
    for i in items:
        p = product_map.get(i['product_id'])
        if p:
            cogs += (p.get('avg_cost', 0) or 0) * i['qty']
    return {
        'subtotal': round(subtotal, 2), 'discount': discount, 'taxable': taxable,
        'tax_amount': tax_amount, 'total': total, 'cogs': round(cogs, 2),
    }


async def get_tax_percent():
    s = await settings_col.find_one({'id': 'shop'}) or {}
    return s.get('tax_percent', 0) or 0


async def compute_cash():
    cash = 0.0
    async for c in capital_entries.find():
        if c['type'] in CASH_IN_CAPITAL:
            cash += c['amount']
        elif c['type'] in CASH_OUT_CAPITAL:
            cash -= c['amount']
    async for s in sales.find():
        cash += s.get('amount_paid', 0)
    async for p in purchases.find():
        cash -= p.get('amount_paid', 0)
    async for pay in payments.find():
        if pay['direction'] == 'customer':
            cash += pay['amount']
        else:
            cash -= pay['amount']
    async for e in expenses.find():
        cash -= e.get('amount', 0)
    return round(cash, 2)


async def compute_stock_value():
    val = 0.0
    async for p in products.find():
        val += (p.get('stock', 0) or 0) * (p.get('avg_cost', 0) or 0)
    return round(val, 2)


async def compute_ar():
    total = 0.0
    async for c in customers.find():
        total += c.get('balance', 0) or 0
    return round(total, 2)


async def compute_ap():
    total = 0.0
    async for s in suppliers.find():
        total += s.get('balance', 0) or 0
    return round(total, 2)


async def compute_working_capital():
    cash = await compute_cash()
    stock = await compute_stock_value()
    ar = await compute_ar()
    ap = await compute_ap()
    wc = round(cash + stock + ar - ap, 2)
    return {'cash': cash, 'stock_value': stock, 'accounts_receivable': ar,
            'accounts_payable': ap, 'working_capital': wc}
