from fastapi import APIRouter, HTTPException, Depends
from database import (capital_entries, expenses, payments, sales, purchases,
                      customers, suppliers, day_close, clean, now_iso, log_activity)
from auth import get_current_user, require_owner, new_id
from models import CapitalInput, ExpenseInput, PaymentInput, DayCloseInput
from logic import (compute_working_capital, compute_cash, CASH_IN_CAPITAL, CASH_OUT_CAPITAL)
import datetime as dt

router = APIRouter(prefix='/api', tags=['finance'])


def today():
    return dt.date.today().isoformat()


# ================= EXPENSES =================
@router.get('/expenses')
async def list_expenses(user: dict = Depends(require_owner)):
    return [clean(e) async for e in expenses.find().sort('created_at', -1)]


@router.post('/expenses')
async def create_expense(body: ExpenseInput, user: dict = Depends(get_current_user)):
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail='Enter an amount greater than zero')
    doc = {'id': new_id(), 'category': body.category, 'amount': round(body.amount, 2),
           'mode': body.mode, 'note': body.note, 'date': body.date or today(),
           'created_by': user['id'], 'created_by_name': user['name'], 'created_at': now_iso()}
    await expenses.insert_one(doc)
    await log_activity(user, 'create', 'expense', doc['id'], {'amount': body.amount})
    return clean(doc)


# ================= CAPITAL =================
CAPITAL_TYPES = ['Opening Capital', 'Owner Investment', 'Owner Drawing', 'Loan Received', 'Loan Repayment']


@router.get('/capital')
async def list_capital(user: dict = Depends(require_owner)):
    entries = [clean(c) async for c in capital_entries.find().sort('created_at', 1)]
    running = 0.0
    for e in entries:
        if e['type'] in CASH_IN_CAPITAL:
            running += e['amount']
        elif e['type'] in CASH_OUT_CAPITAL:
            running -= e['amount']
        e['running_balance'] = round(running, 2)
    total_in = sum(e['amount'] for e in entries if e['type'] in CASH_IN_CAPITAL)
    total_out = sum(e['amount'] for e in entries if e['type'] in CASH_OUT_CAPITAL)
    return {'entries': list(reversed(entries)), 'net_capital': round(total_in - total_out, 2),
            'types': CAPITAL_TYPES}


@router.post('/capital')
async def add_capital(body: CapitalInput, user: dict = Depends(require_owner)):
    if body.type not in CAPITAL_TYPES:
        raise HTTPException(status_code=400, detail='Invalid capital entry type')
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail='Enter an amount greater than zero')
    doc = {'id': new_id(), 'type': body.type, 'amount': round(body.amount, 2),
           'note': body.note, 'date': body.date or today(),
           'created_by': user['id'], 'created_by_name': user['name'], 'created_at': now_iso()}
    await capital_entries.insert_one(doc)
    await log_activity(user, 'create', 'capital', doc['id'], {'type': body.type, 'amount': body.amount})
    return clean(doc)


# ================= CREDIT LEDGER + PAYMENTS =================
@router.get('/ledger')
async def credit_ledger(user: dict = Depends(require_owner)):
    ar = 0.0
    cust_out = []
    async for c in customers.find():
        bal = c.get('balance', 0) or 0
        ar += bal
        if abs(bal) > 0.001:
            cust_out.append({'id': c['id'], 'name': c['name'], 'balance': round(bal, 2)})
    ap = 0.0
    sup_out = []
    async for s in suppliers.find():
        bal = s.get('balance', 0) or 0
        ap += bal
        if abs(bal) > 0.001:
            sup_out.append({'id': s['id'], 'name': s['name'], 'balance': round(bal, 2)})
    hist = [clean(p) async for p in payments.find().sort('created_at', -1)]
    return {'customers_owe_us': round(ar, 2), 'we_owe_suppliers': round(ap, 2),
            'customers': cust_out, 'suppliers': sup_out, 'history': hist}


@router.post('/payments')
async def record_payment(body: PaymentInput, user: dict = Depends(get_current_user)):
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail='Enter an amount greater than zero')
    amount = round(body.amount, 2)
    if body.direction == 'customer':
        c = await customers.find_one({'id': body.party_id})
        if not c:
            raise HTTPException(status_code=404, detail='Customer not found')
        await customers.update_one({'id': body.party_id}, {'$inc': {'balance': -amount}})
        party_name = c['name']
        # apply to the specific unpaid sale if provided
        if body.sale_id:
            s = await sales.find_one({'id': body.sale_id})
            if s:
                new_paid = min(s['total'], s.get('amount_paid', 0) + amount)
                bal = round(s['total'] - new_paid, 2)
                await sales.update_one({'id': body.sale_id}, {'$set': {
                    'amount_paid': new_paid, 'balance_due': bal,
                    'status': 'paid' if bal == 0 else ('partial' if new_paid > 0 else 'unpaid')}})
    else:
        sup = await suppliers.find_one({'id': body.party_id})
        if not sup:
            raise HTTPException(status_code=404, detail='Supplier not found')
        await suppliers.update_one({'id': body.party_id}, {'$inc': {'balance': -amount}})
        party_name = sup['name']
        if body.purchase_id:
            pu = await purchases.find_one({'id': body.purchase_id})
            if pu:
                new_paid = min(pu['total'], pu.get('amount_paid', 0) + amount)
                bal = round(pu['total'] - new_paid, 2)
                await purchases.update_one({'id': body.purchase_id}, {'$set': {
                    'amount_paid': new_paid, 'balance_due': bal,
                    'status': 'paid' if bal == 0 else ('partial' if new_paid > 0 else 'unpaid')}})

    doc = {'id': new_id(), 'direction': body.direction, 'party_id': body.party_id,
           'party_name': party_name, 'sale_id': body.sale_id, 'purchase_id': body.purchase_id,
           'amount': amount, 'mode': body.mode, 'note': body.note, 'date': today(),
           'created_by': user['id'], 'created_by_name': user['name'], 'created_at': now_iso()}
    await payments.insert_one(doc)
    await log_activity(user, 'payment', body.direction, body.party_id, {'amount': amount})
    return clean(doc)


# ================= WORKING CAPITAL =================
@router.get('/working-capital')
async def working_capital(user: dict = Depends(require_owner)):
    wc = await compute_working_capital()
    cap = await capital_entries.find().to_list(1000)
    return wc


# ================= DAY-END CASH CLOSE =================
@router.get('/day-close')
async def list_day_close(user: dict = Depends(get_current_user)):
    return [clean(d) async for d in day_close.find().sort('date', -1)]


@router.get('/day-close/expected')
async def expected_cash(user: dict = Depends(get_current_user)):
    d = today()
    last = await day_close.find_one({}, sort=[('date', -1)])
    opening = last.get('counted_cash', 0) if last else 0
    cash_sales = 0.0
    async for s in sales.find({'date': d}):
        if s.get('payment_mode') == 'Cash':
            cash_sales += s.get('amount_paid', 0)
    cash_exp = 0.0
    async for e in expenses.find({'date': d}):
        if e.get('mode') == 'Cash':
            cash_exp += e.get('amount', 0)
    cash_purch = 0.0
    async for p in purchases.find({'date': d}):
        cash_purch += p.get('amount_paid', 0)
    expected = round(opening + cash_sales - cash_exp - cash_purch, 2)
    already = await day_close.find_one({'date': d})
    return {'date': d, 'opening_cash': round(opening, 2), 'cash_sales': round(cash_sales, 2),
            'cash_expenses': round(cash_exp, 2), 'cash_purchases': round(cash_purch, 2),
            'expected_cash': expected, 'already_closed': bool(already)}


@router.post('/day-close')
async def do_day_close(body: DayCloseInput, user: dict = Depends(get_current_user)):
    d = body.date or today()
    if await day_close.find_one({'date': d}):
        raise HTTPException(status_code=400, detail='This day has already been closed.')
    info = await expected_cash(user)
    variance = round(body.counted_cash - info['expected_cash'], 2)
    doc = {'id': new_id(), 'date': d, 'opening_cash': info['opening_cash'],
           'expected_cash': info['expected_cash'], 'counted_cash': round(body.counted_cash, 2),
           'variance': variance, 'created_by': user['id'], 'created_by_name': user['name'],
           'created_at': now_iso()}
    await day_close.insert_one(doc)
    await log_activity(user, 'day_close', 'cash', doc['id'], {'variance': variance})
    return clean(doc)
