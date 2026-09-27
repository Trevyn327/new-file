from fastapi import APIRouter, HTTPException, Depends
from database import (products, sales, purchases, customers, suppliers,
                      stock_adjustments, returns_col, clean, now_iso, log_activity)
from auth import get_current_user, new_id
from models import PurchaseInput, SaleInput, StockAdjustInput, ReturnInput
from logic import compute_sale_totals, next_invoice_no, get_tax_percent
import datetime as dt

router = APIRouter(prefix='/api', tags=['transactions'])


def today():
    return dt.date.today().isoformat()


# ================= PURCHASES =================
@router.get('/purchases')
async def list_purchases(user: dict = Depends(get_current_user)):
    sup = {s['id']: s['name'] async for s in suppliers.find()}
    out = []
    async for p in purchases.find().sort('created_at', -1):
        d = clean(p)
        d['supplier_name'] = sup.get(d.get('supplier_id'), 'Cash Supplier')
        out.append(d)
    return out


@router.post('/purchases')
async def create_purchase(body: PurchaseInput, user: dict = Depends(get_current_user)):
    if not body.items:
        raise HTTPException(status_code=400, detail='Add at least one item')
    items = [i.dict() for i in body.items]
    # validate products first (atomic: validate all, then commit)
    prod_map = {}
    for i in items:
        p = await products.find_one({'id': i['product_id']})
        if not p:
            raise HTTPException(status_code=400, detail='One of the products no longer exists')
        if i['qty'] <= 0 or i['price'] < 0:
            raise HTTPException(status_code=400, detail='Quantity and cost must be valid numbers')
        prod_map[i['product_id']] = p

    total = round(sum(i['qty'] * i['price'] for i in items), 2)
    amount_paid = total if body.payment_type == 'cash' else round(body.amount_paid or 0, 2)
    amount_paid = min(amount_paid, total)
    balance = round(total - amount_paid, 2)

    # commit: re-average cost + increase stock
    for i in items:
        p = prod_map[i['product_id']]
        old_stock = p.get('stock', 0) or 0
        old_avg = p.get('avg_cost', 0) or 0
        new_stock = old_stock + i['qty']
        new_avg = round(((old_stock * old_avg) + (i['qty'] * i['price'])) / new_stock, 4) if new_stock else old_avg
        await products.update_one({'id': p['id']}, {'$set': {'stock': new_stock, 'avg_cost': new_avg, 'purchase_price': i['price']}})

    if balance > 0 and body.supplier_id:
        await suppliers.update_one({'id': body.supplier_id}, {'$inc': {'balance': balance}})

    doc = {
        'id': new_id(), 'supplier_id': body.supplier_id, 'date': body.date or today(),
        'items': items, 'total': total, 'payment_type': body.payment_type,
        'amount_paid': amount_paid, 'balance_due': balance,
        'status': 'paid' if balance == 0 else ('partial' if amount_paid > 0 else 'unpaid'),
        'created_by': user['id'], 'created_by_name': user['name'], 'created_at': now_iso(),
    }
    await purchases.insert_one(doc)
    await log_activity(user, 'create', 'purchase', doc['id'], {'total': total})
    return clean(doc)


# ================= SALES =================
@router.get('/sales')
async def list_sales(user: dict = Depends(get_current_user)):
    cust = {c['id']: c['name'] async for c in customers.find()}
    out = []
    async for s in sales.find().sort('created_at', -1):
        d = clean(s)
        d['customer_name'] = cust.get(d.get('customer_id'), 'Walk-in')
        out.append(d)
    return out


@router.get('/sales/{sid}')
async def get_sale(sid: str, user: dict = Depends(get_current_user)):
    s = await sales.find_one({'id': sid})
    if not s:
        raise HTTPException(status_code=404, detail='Sale not found')
    d = clean(s)
    if d.get('customer_id'):
        c = await customers.find_one({'id': d['customer_id']})
        d['customer'] = clean(c) if c else None
    # attach product names
    for it in d['items']:
        p = await products.find_one({'id': it['product_id']})
        it['name'] = p['name'] if p else 'Item'
        it['unit'] = p.get('unit', '') if p else ''
    return d


@router.post('/sales')
async def create_sale(body: SaleInput, user: dict = Depends(get_current_user)):
    if not body.items:
        raise HTTPException(status_code=400, detail='Add at least one item')
    items = [i.dict() for i in body.items]
    # validate all first (oversell protection) BEFORE any write
    prod_map = {}
    for i in items:
        p = await products.find_one({'id': i['product_id']})
        if not p:
            raise HTTPException(status_code=400, detail='One of the products no longer exists')
        if i['qty'] <= 0:
            raise HTTPException(status_code=400, detail='Quantity must be greater than zero')
        if (p.get('stock', 0) or 0) < i['qty']:
            raise HTTPException(status_code=400,
                detail=f"Not enough stock for {p['name']} — only {p.get('stock',0)} {p.get('unit','')} left")
        prod_map[i['product_id']] = p

    tax_percent = await get_tax_percent()
    t = compute_sale_totals(items, prod_map, body.discount_type, body.discount_value, tax_percent)

    if body.payment_type == 'cash':
        amount_paid = t['total']
    elif body.payment_type == 'credit':
        amount_paid = 0
    else:  # partial
        amount_paid = min(round(body.amount_paid or 0, 2), t['total'])
    balance = round(t['total'] - amount_paid, 2)

    if balance > 0 and not body.customer_id:
        raise HTTPException(status_code=400, detail='Choose a customer for credit / partial sales')

    # commit: reduce stock
    for i in items:
        p = prod_map[i['product_id']]
        await products.update_one({'id': p['id']}, {'$set': {'stock': (p.get('stock', 0) or 0) - i['qty']}})

    if balance > 0 and body.customer_id:
        await customers.update_one({'id': body.customer_id}, {'$inc': {'balance': balance}})

    invoice_no = await next_invoice_no()
    doc = {
        'id': new_id(), 'invoice_no': invoice_no, 'customer_id': body.customer_id,
        'date': body.date or today(), 'items': items,
        'subtotal': t['subtotal'], 'discount_type': body.discount_type,
        'discount_value': body.discount_value, 'discount': t['discount'],
        'taxable': t['taxable'], 'tax_percent': tax_percent, 'tax_amount': t['tax_amount'],
        'total': t['total'], 'cogs': t['cogs'],
        'payment_type': body.payment_type, 'payment_mode': body.payment_mode,
        'amount_paid': amount_paid, 'balance_due': balance,
        'status': 'paid' if balance == 0 else ('partial' if amount_paid > 0 else 'unpaid'),
        'created_by': user['id'], 'created_by_name': user['name'], 'created_at': now_iso(),
    }
    await sales.insert_one(doc)
    await log_activity(user, 'create', 'sale', doc['id'], {'invoice_no': invoice_no, 'total': t['total']})
    return clean(doc)


# ================= STOCK ADJUSTMENTS =================
@router.get('/stock-adjustments')
async def list_adjustments(user: dict = Depends(get_current_user)):
    pm = {p['id']: p['name'] async for p in products.find()}
    out = []
    async for a in stock_adjustments.find().sort('created_at', -1):
        d = clean(a)
        d['product_name'] = pm.get(d['product_id'], 'Item')
        out.append(d)
    return out


@router.post('/stock-adjustments')
async def create_adjustment(body: StockAdjustInput, user: dict = Depends(get_current_user)):
    p = await products.find_one({'id': body.product_id})
    if not p:
        raise HTTPException(status_code=404, detail='Product not found')
    new_stock = (p.get('stock', 0) or 0) + body.change
    if new_stock < 0:
        raise HTTPException(status_code=400, detail='Adjustment would make stock negative')
    await products.update_one({'id': body.product_id}, {'$set': {'stock': new_stock}})
    doc = {'id': new_id(), 'product_id': body.product_id, 'change': body.change,
           'reason': body.reason, 'note': body.note, 'date': today(),
           'created_by': user['id'], 'created_by_name': user['name'], 'created_at': now_iso()}
    await stock_adjustments.insert_one(doc)
    await log_activity(user, 'adjust', 'stock', body.product_id, {'change': body.change, 'reason': body.reason})
    return clean(doc)


# ================= RETURNS =================
@router.get('/returns')
async def list_returns(user: dict = Depends(get_current_user)):
    return [clean(r) async for r in returns_col.find().sort('created_at', -1)]


@router.post('/returns')
async def create_return(body: ReturnInput, user: dict = Depends(get_current_user)):
    if not body.items:
        raise HTTPException(status_code=400, detail='Add at least one item to return')
    items = [i.dict() for i in body.items]
    amount = round(sum(i['qty'] * i['price'] for i in items), 2)
    for i in items:
        p = await products.find_one({'id': i['product_id']})
        if not p:
            raise HTTPException(status_code=400, detail='Product not found')
        if body.kind == 'customer':
            await products.update_one({'id': p['id']}, {'$set': {'stock': (p.get('stock', 0) or 0) + i['qty']}})
        else:  # supplier return - stock goes down
            if (p.get('stock', 0) or 0) < i['qty']:
                raise HTTPException(status_code=400, detail=f"Not enough stock to return {p['name']}")
            await products.update_one({'id': p['id']}, {'$set': {'stock': (p.get('stock', 0) or 0) - i['qty']}})

    if body.party_id:
        if body.kind == 'customer':
            # store credit / refund reduces what customer owes
            await customers.update_one({'id': body.party_id}, {'$inc': {'balance': -amount}})
        else:
            await suppliers.update_one({'id': body.party_id}, {'$inc': {'balance': -amount}})

    doc = {'id': new_id(), 'kind': body.kind, 'ref_id': body.ref_id, 'party_id': body.party_id,
           'items': items, 'amount': amount, 'refund_mode': body.refund_mode,
           'date': today(), 'created_by': user['id'], 'created_by_name': user['name'], 'created_at': now_iso()}
    await returns_col.insert_one(doc)
    await log_activity(user, 'create', 'return', doc['id'], {'kind': body.kind, 'amount': amount})
    return clean(doc)
