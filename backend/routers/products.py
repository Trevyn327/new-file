from fastapi import APIRouter, HTTPException, Depends
from database import products, categories, clean, now_iso, log_activity
from auth import get_current_user, new_id
from models import ProductInput, ProductUpdate

router = APIRouter(prefix='/api/products', tags=['products'])


async def _decorate(p):
    p = clean(p)
    p['stock_value'] = round((p.get('stock', 0) or 0) * (p.get('avg_cost', 0) or 0), 2)
    p['low'] = (p.get('stock', 0) or 0) <= (p.get('low_stock_threshold', 5) or 0)
    return p


@router.get('')
async def list_products(user: dict = Depends(get_current_user)):
    cats = {c['id']: c['name'] async for c in categories.find()}
    out = []
    async for p in products.find().sort('name', 1):
        d = await _decorate(p)
        d['category_name'] = cats.get(d.get('category_id'))
        out.append(d)
    return out


@router.get('/low-stock')
async def low_stock(user: dict = Depends(get_current_user)):
    out = []
    async for p in products.find():
        if (p.get('stock', 0) or 0) <= (p.get('low_stock_threshold', 5) or 0):
            out.append(await _decorate(p))
    return out


@router.get('/lookup')
async def lookup(code: str, user: dict = Depends(get_current_user)):
    """Barcode/SKU scan lookup."""
    code = (code or '').strip()
    p = await products.find_one({'$or': [{'barcode': code}, {'sku': code}]})
    if not p:
        raise HTTPException(status_code=404, detail='No product with that code')
    return await _decorate(p)


@router.post('')
async def create_product(body: ProductInput, user: dict = Depends(get_current_user)):
    sku = (body.sku or '').strip() or body.name[:6].upper().replace(' ', '')
    if await products.find_one({'sku': sku}):
        raise HTTPException(status_code=400, detail=f'SKU "{sku}" already exists')
    doc = {
        'id': new_id(), 'sku': sku, 'name': body.name.strip(),
        'category_id': body.category_id, 'barcode': body.barcode, 'unit': body.unit,
        'purchase_price': body.purchase_price, 'selling_price': body.selling_price,
        'stock': body.opening_stock, 'avg_cost': body.purchase_price,
        'image_url': body.image_url, 'low_stock_threshold': body.low_stock_threshold,
        'created_at': now_iso(),
    }
    await products.insert_one(doc)
    await log_activity(user, 'create', 'product', doc['id'], {'name': doc['name']})
    return await _decorate(doc)


@router.put('/{pid}')
async def update_product(pid: str, body: ProductUpdate, user: dict = Depends(get_current_user)):
    existing = await products.find_one({'id': pid})
    if not existing:
        raise HTTPException(status_code=404, detail='Product not found')
    updates = {k: v for k, v in body.dict().items() if v is not None}
    # stock is never directly editable here
    updates.pop('stock', None)
    if 'sku' in updates:
        clash = await products.find_one({'sku': updates['sku'], 'id': {'$ne': pid}})
        if clash:
            raise HTTPException(status_code=400, detail='Another product already uses this SKU')
    await products.update_one({'id': pid}, {'$set': updates})
    await log_activity(user, 'update', 'product', pid, updates)
    p = await products.find_one({'id': pid})
    return await _decorate(p)


@router.delete('/{pid}')
async def delete_product(pid: str, user: dict = Depends(get_current_user)):
    await products.delete_one({'id': pid})
    await log_activity(user, 'delete', 'product', pid)
    return {'ok': True}
