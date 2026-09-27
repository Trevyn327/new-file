import io
import csv
import base64
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse, Response
from database import (products, sales, purchases, expenses, customers, suppliers,
                      categories, settings_col, activity_log, clean, log_activity)
from auth import get_current_user, require_owner
from models import ShopSettings
from logic import (compute_working_capital, compute_cash, compute_stock_value,
                   compute_ar, compute_ap)
import datetime as dt

router = APIRouter(prefix='/api', tags=['dashboard'])


# ================= SETTINGS =================
@router.get('/settings')
async def get_settings(user: dict = Depends(get_current_user)):
    s = await settings_col.find_one({'id': 'shop'})
    if not s:
        s = {'id': 'shop', 'name': 'My Shop', 'address': '', 'gstin': '', 'tax_percent': 0,
             'invoice_prefix': 'INV-', 'upi_id': ''}
        await settings_col.insert_one(s)
    return clean(s)


@router.put('/settings')
async def update_settings(body: ShopSettings, user: dict = Depends(require_owner)):
    await settings_col.update_one({'id': 'shop'}, {'$set': body.dict()}, upsert=True)
    await log_activity(user, 'update', 'settings')
    s = await settings_col.find_one({'id': 'shop'})
    return clean(s)


# ================= DASHBOARD =================
@router.get('/dashboard')
async def dashboard(user: dict = Depends(get_current_user)):
    wc = await compute_working_capital()
    total_sales = 0.0
    total_cogs = 0.0
    paid = partial = unpaid = 0
    async for s in sales.find():
        total_sales += s.get('taxable', s.get('total', 0))
        total_cogs += s.get('cogs', 0)
        st = s.get('status')
        if st == 'paid':
            paid += 1
        elif st == 'partial':
            partial += 1
        else:
            unpaid += 1
    total_purchases = 0.0
    async for p in purchases.find():
        total_purchases += p.get('total', 0)
    total_expenses = 0.0
    async for e in expenses.find():
        total_expenses += e.get('amount', 0)
    gross_profit = round(total_sales - total_cogs, 2)
    net_profit = round(gross_profit - total_expenses, 2)

    # 7-day sales trend
    today = dt.date.today()
    days = [(today - dt.timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    trend_map = {d: 0.0 for d in days}
    async for s in sales.find():
        if s.get('date') in trend_map:
            trend_map[s['date']] += s.get('total', 0)
    trend = [{'date': d, 'label': d[5:], 'amount': round(trend_map[d], 2)} for d in days]

    # category mix
    cat_names = {c['id']: c['name'] async for c in categories.find()}
    cat_map = {}
    async for s in sales.find():
        for it in s['items']:
            p = await products.find_one({'id': it['product_id']})
            cat = cat_names.get(p.get('category_id'), 'Other') if p else 'Other'
            cat_map[cat] = cat_map.get(cat, 0) + it['qty'] * it['price']
    category_mix = [{'name': k, 'value': round(v, 2)} for k, v in sorted(cat_map.items(), key=lambda x: -x[1])]

    low = []
    async for p in products.find():
        if (p.get('stock', 0) or 0) <= (p.get('low_stock_threshold', 5) or 0):
            low.append({'id': p['id'], 'name': p['name'], 'stock': p.get('stock', 0), 'unit': p.get('unit', '')})

    return {
        'cash_in_hand': wc['cash'], 'stock_value': wc['stock_value'],
        'total_liabilities': wc['accounts_payable'], 'accounts_receivable': wc['accounts_receivable'],
        'working_capital': wc['working_capital'],
        'total_sales': round(total_sales, 2), 'total_purchases': round(total_purchases, 2),
        'gross_profit': gross_profit, 'net_profit': net_profit, 'total_expenses': round(total_expenses, 2),
        'invoice_status': {'paid': paid, 'partial': partial, 'unpaid': unpaid},
        'trend': trend, 'category_mix': category_mix, 'low_stock': low,
    }


# ================= REPORTS =================
@router.get('/reports/pnl')
async def pnl(start: str = '', end: str = '', user: dict = Depends(require_owner)):
    def in_range(d):
        if start and d < start:
            return False
        if end and d > end:
            return False
        return True
    sales_total = cogs = 0.0
    async for s in sales.find():
        if in_range(s.get('date', '')):
            sales_total += s.get('taxable', s.get('total', 0))
            cogs += s.get('cogs', 0)
    exp_total = 0.0
    exp_by_cat = {}
    async for e in expenses.find():
        if in_range(e.get('date', '')):
            exp_total += e.get('amount', 0)
            exp_by_cat[e['category']] = exp_by_cat.get(e['category'], 0) + e['amount']
    gross = round(sales_total - cogs, 2)
    net = round(gross - exp_total, 2)
    return {'sales': round(sales_total, 2), 'cogs': round(cogs, 2), 'gross_profit': gross,
            'expenses': round(exp_total, 2), 'net_profit': net,
            'expenses_by_category': [{'name': k, 'value': round(v, 2)} for k, v in exp_by_cat.items()]}


@router.get('/reports/inventory-valuation')
async def inventory_valuation(user: dict = Depends(require_owner)):
    rows = []
    total = 0.0
    async for p in products.find().sort('name', 1):
        val = round((p.get('stock', 0) or 0) * (p.get('avg_cost', 0) or 0), 2)
        total += val
        rows.append({'name': p['name'], 'sku': p['sku'], 'stock': p.get('stock', 0),
                     'unit': p.get('unit', ''), 'avg_cost': round(p.get('avg_cost', 0), 2), 'value': val})
    return {'rows': rows, 'total': round(total, 2)}


# ================= EXPORTS =================
def _csv_response(rows, header, filename):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    w.writerows(rows)
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type='text/csv',
                             headers={'Content-Disposition': f'attachment; filename={filename}'})


@router.get('/export/products')
async def export_products(user: dict = Depends(require_owner)):
    rows = []
    async for p in products.find().sort('name', 1):
        rows.append([p['sku'], p['name'], p.get('unit', ''), p.get('purchase_price', 0),
                     p.get('selling_price', 0), p.get('stock', 0), round(p.get('avg_cost', 0), 2)])
    return _csv_response(rows, ['SKU', 'Name', 'Unit', 'Purchase Price', 'Selling Price', 'Stock', 'Avg Cost'], 'products.csv')


@router.get('/export/sales')
async def export_sales(user: dict = Depends(require_owner)):
    cust = {c['id']: c['name'] async for c in customers.find()}
    rows = []
    async for s in sales.find().sort('date', -1):
        rows.append([s['invoice_no'], s['date'], cust.get(s.get('customer_id'), 'Walk-in'),
                     s.get('total', 0), s.get('amount_paid', 0), s.get('balance_due', 0), s.get('status', '')])
    return _csv_response(rows, ['Invoice', 'Date', 'Customer', 'Total', 'Paid', 'Balance', 'Status'], 'sales.csv')


@router.get('/export/customers')
async def export_customers(user: dict = Depends(require_owner)):
    rows = []
    async for c in customers.find().sort('name', 1):
        rows.append([c['name'], c.get('phone', ''), c.get('address', ''), round(c.get('balance', 0), 2)])
    return _csv_response(rows, ['Name', 'Phone', 'Address', 'Balance Owed'], 'customers.csv')


@router.get('/export/backup')
async def backup(user: dict = Depends(require_owner)):
    import json
    data = {}
    for name, col in [('products', products), ('sales', sales), ('purchases', purchases),
                      ('customers', customers), ('suppliers', suppliers), ('categories', categories),
                      ('expenses', expenses), ('settings', settings_col)]:
        data[name] = [clean(d) async for d in col.find()]
    payload = json.dumps(data, indent=2, default=str)
    return Response(content=payload, media_type='application/json',
                    headers={'Content-Disposition': 'attachment; filename=shop_backup.json'})


# ================= ACTIVITY LOG =================
@router.get('/activity')
async def get_activity(user: dict = Depends(require_owner)):
    return [clean(a) async for a in activity_log.find().sort('timestamp', -1).limit(200)]


# ================= INVOICE (PDF + UPI QR) =================
@router.get('/invoice/{sid}/upi-qr')
async def upi_qr(sid: str, user: dict = Depends(get_current_user)):
    import qrcode
    s = await sales.find_one({'id': sid})
    if not s:
        raise HTTPException(status_code=404, detail='Sale not found')
    st = await settings_col.find_one({'id': 'shop'}) or {}
    upi = st.get('upi_id', '')
    if not upi:
        return {'has_upi': False}
    amt = s.get('balance_due', 0) or s.get('total', 0)
    link = f"upi://pay?pa={upi}&pn={st.get('name','Shop')}&am={amt}&cu=INR"
    img = qrcode.make(link)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    b64 = base64.b64encode(buf.getvalue()).decode()
    return {'has_upi': True, 'link': link, 'qr': f'data:image/png;base64,{b64}', 'amount': amt}


@router.get('/invoice/{sid}/pdf')
async def invoice_pdf(sid: str, user: dict = Depends(get_current_user)):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    s = await sales.find_one({'id': sid})
    if not s:
        raise HTTPException(status_code=404, detail='Sale not found')
    st = await settings_col.find_one({'id': 'shop'}) or {}
    cust = await customers.find_one({'id': s.get('customer_id')}) if s.get('customer_id') else None

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    y = h - 25 * mm
    c.setFont('Helvetica-Bold', 18)
    c.drawString(20 * mm, y, st.get('name', 'My Shop'))
    c.setFont('Helvetica', 9)
    y -= 6 * mm
    if st.get('address'):
        c.drawString(20 * mm, y, st['address']); y -= 5 * mm
    if st.get('gstin'):
        c.drawString(20 * mm, y, f"GSTIN: {st['gstin']}"); y -= 5 * mm
    c.setFont('Helvetica-Bold', 12)
    c.drawRightString(w - 20 * mm, h - 25 * mm, 'TAX INVOICE')
    c.setFont('Helvetica', 9)
    c.drawRightString(w - 20 * mm, h - 31 * mm, f"Invoice: {s['invoice_no']}")
    c.drawRightString(w - 20 * mm, h - 36 * mm, f"Date: {s['date']}")

    y -= 6 * mm
    c.drawString(20 * mm, y, f"Bill To: {cust['name'] if cust else 'Walk-in Customer'}")
    y -= 8 * mm
    c.setFont('Helvetica-Bold', 9)
    c.drawString(20 * mm, y, 'Item')
    c.drawString(110 * mm, y, 'Qty')
    c.drawString(135 * mm, y, 'Price')
    c.drawRightString(w - 20 * mm, y, 'Amount')
    y -= 2 * mm
    c.line(20 * mm, y, w - 20 * mm, y)
    y -= 6 * mm
    c.setFont('Helvetica', 9)
    for it in s['items']:
        p = await products.find_one({'id': it['product_id']})
        c.drawString(20 * mm, y, (p['name'] if p else 'Item')[:45])
        c.drawString(110 * mm, y, str(it['qty']))
        c.drawString(135 * mm, y, f"{it['price']:.2f}")
        c.drawRightString(w - 20 * mm, y, f"{it['qty'] * it['price']:.2f}")
        y -= 6 * mm
    y -= 2 * mm
    c.line(110 * mm, y, w - 20 * mm, y)
    y -= 6 * mm

    def row(label, val, bold=False):
        nonlocal y
        c.setFont('Helvetica-Bold' if bold else 'Helvetica', 10 if bold else 9)
        c.drawString(120 * mm, y, label)
        c.drawRightString(w - 20 * mm, y, f"Rs {val:,.2f}")
        y -= 6 * mm
    row('Subtotal', s.get('subtotal', 0))
    if s.get('discount', 0):
        row('Discount', -s.get('discount', 0))
    if s.get('tax_amount', 0):
        row(f"Tax ({s.get('tax_percent',0)}%)", s.get('tax_amount', 0))
    row('Grand Total', s.get('total', 0), bold=True)
    row('Paid', s.get('amount_paid', 0))
    row('Balance Due', s.get('balance_due', 0), bold=True)
    y -= 4 * mm
    c.setFont('Helvetica', 9)
    c.drawString(20 * mm, y, f"Payment Mode: {s.get('payment_mode', 'Cash')}   Status: {s.get('status','').title()}")
    y -= 12 * mm
    c.setFont('Helvetica-Oblique', 9)
    c.drawString(20 * mm, y, 'Thank you for your business!')
    c.showPage()
    c.save()
    buf.seek(0)
    return StreamingResponse(buf, media_type='application/pdf',
                             headers={'Content-Disposition': f"attachment; filename={s['invoice_no']}.pdf"})
