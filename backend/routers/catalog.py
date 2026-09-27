from fastapi import APIRouter, HTTPException, Depends
from database import (categories, suppliers, customers, products, sales, clean, now_iso, log_activity)
from auth import get_current_user, new_id
from models import CategoryInput, PartyInput

router = APIRouter(prefix='/api', tags=['catalog'])


# ---------- Categories ----------
@router.get('/categories')
async def list_categories(user: dict = Depends(get_current_user)):
    return [clean(c) async for c in categories.find().sort('name', 1)]


@router.post('/categories')
async def create_category(body: CategoryInput, user: dict = Depends(get_current_user)):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail='Category name is required')
    doc = {'id': new_id(), 'name': body.name.strip(), 'created_at': now_iso()}
    await categories.insert_one(doc)
    return clean(doc)


@router.put('/categories/{cid}')
async def update_category(cid: str, body: CategoryInput, user: dict = Depends(get_current_user)):
    await categories.update_one({'id': cid}, {'$set': {'name': body.name.strip()}})
    return {'ok': True}


@router.delete('/categories/{cid}')
async def delete_category(cid: str, user: dict = Depends(get_current_user)):
    # detach from products (no cascade delete)
    await products.update_many({'category_id': cid}, {'$set': {'category_id': None}})
    await categories.delete_one({'id': cid})
    return {'ok': True}


# ---------- Generic party helpers ----------
def _party_router(col, kind):
    async def list_all(user: dict = Depends(get_current_user)):
        return [clean(x) async for x in col.find().sort('name', 1)]

    async def create(body: PartyInput, user: dict = Depends(get_current_user)):
        if not body.name.strip():
            raise HTTPException(status_code=400, detail='Name is required')
        doc = {'id': new_id(), 'name': body.name.strip(), 'phone': body.phone,
               'address': body.address, 'gstin': body.gstin,
               'opening_balance': body.opening_balance,
               'balance': body.opening_balance, 'created_at': now_iso()}
        await col.insert_one(doc)
        await log_activity(user, 'create', kind, doc['id'], {'name': doc['name']})
        return clean(doc)

    async def update(pid: str, body: PartyInput, user: dict = Depends(get_current_user)):
        existing = await col.find_one({'id': pid})
        if not existing:
            raise HTTPException(status_code=404, detail='Not found')
        delta = body.opening_balance - existing.get('opening_balance', 0)
        await col.update_one({'id': pid}, {'$set': {
            'name': body.name.strip(), 'phone': body.phone, 'address': body.address,
            'gstin': body.gstin, 'opening_balance': body.opening_balance,
            'balance': existing.get('balance', 0) + delta,
        }})
        return {'ok': True}

    async def remove(pid: str, user: dict = Depends(get_current_user)):
        await col.delete_one({'id': pid})
        return {'ok': True}

    return list_all, create, update, remove


s_list, s_create, s_update, s_delete = _party_router(suppliers, 'supplier')
router.add_api_route('/suppliers', s_list, methods=['GET'])
router.add_api_route('/suppliers', s_create, methods=['POST'])
router.add_api_route('/suppliers/{pid}', s_update, methods=['PUT'])
router.add_api_route('/suppliers/{pid}', s_delete, methods=['DELETE'])

c_list, c_create, c_update, c_delete = _party_router(customers, 'customer')
router.add_api_route('/customers', c_list, methods=['GET'])
router.add_api_route('/customers', c_create, methods=['POST'])
router.add_api_route('/customers/{pid}', c_update, methods=['PUT'])
router.add_api_route('/customers/{pid}', c_delete, methods=['DELETE'])


@router.get('/customers/{pid}/history')
async def customer_history(pid: str, user: dict = Depends(get_current_user)):
    cust = await customers.find_one({'id': pid})
    if not cust:
        raise HTTPException(status_code=404, detail='Customer not found')
    hist = [clean(s) async for s in sales.find({'customer_id': pid}).sort('date', -1)]
    return {'customer': clean(cust), 'sales': hist}
