from fastapi import APIRouter, HTTPException, Depends
from database import users, settings_col, clean, now_iso, log_activity
from auth import (hash_password, verify_password, create_token, get_current_user,
                  require_owner, new_id, make_reset_token, decode_reset_token)
from models import (FirstRunOwner, LoginInput, ForgotInput, ResetInput,
                    StaffCreate, StaffPasswordReset, GoogleSessionInput)
import requests

router = APIRouter(prefix='/api/auth', tags=['auth'])


@router.get('/status')
async def status():
    owner = await users.find_one({'role': 'owner'})
    return {'has_owner': bool(owner)}


@router.post('/first-run')
async def first_run(body: FirstRunOwner):
    if await users.find_one({'role': 'owner'}):
        raise HTTPException(status_code=400, detail='Owner already exists. Please sign in.')
    user = {
        'id': new_id(), 'name': body.name, 'email': body.email.lower(),
        'password_hash': hash_password(body.password), 'role': 'owner',
        'active': True, 'created_at': now_iso(),
    }
    await users.insert_one(user)
    if not await settings_col.find_one({'id': 'shop'}):
        await settings_col.insert_one({'id': 'shop', 'name': 'My Shop', 'address': '',
                                       'gstin': '', 'tax_percent': 0, 'invoice_prefix': 'INV-', 'upi_id': ''})
    return {'token': create_token(user), 'user': _safe(user)}


@router.post('/login')
async def login(body: LoginInput):
    user = await users.find_one({'email': body.email.lower()})
    if not user or not verify_password(body.password, user['password_hash']):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    if not user.get('active', True):
        raise HTTPException(status_code=403, detail='Account disabled. Contact the owner.')
    return {'token': create_token(user), 'user': _safe(user)}


@router.get('/me')
async def me(user: dict = Depends(get_current_user)):
    return _safe(user)


@router.post('/google/session')
async def google_session(body: GoogleSessionInput):
    try:
        r = requests.get('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data',
                         headers={'X-Session-ID': body.session_id}, timeout=15)
    except Exception:
        raise HTTPException(status_code=502, detail='Could not reach Google sign-in. Please try again.')
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail='Google sign-in failed or expired. Please try again.')
    data = r.json()
    email = (data.get('email') or '').lower()
    name = data.get('name') or email.split('@')[0]
    picture = data.get('picture', '')
    if not email:
        raise HTTPException(status_code=401, detail='Google did not return an email.')

    user = await users.find_one({'email': email})
    if not user:
        owner_exists = await users.find_one({'role': 'owner'})
        if owner_exists:
            raise HTTPException(status_code=403,
                detail="This Google account isn't registered yet. Ask the shop owner to add you to the Team.")
        user = {
            'id': new_id(), 'name': name, 'email': email, 'password_hash': '',
            'role': 'owner', 'active': True, 'picture': picture,
            'auth': 'google', 'created_at': now_iso(),
        }
        await users.insert_one(user)
        if not await settings_col.find_one({'id': 'shop'}):
            await settings_col.insert_one({'id': 'shop', 'name': 'My Shop', 'address': '',
                                           'gstin': '', 'tax_percent': 0, 'invoice_prefix': 'INV-', 'upi_id': ''})
    if not user.get('active', True):
        raise HTTPException(status_code=403, detail='Account disabled. Contact the owner.')
    return {'token': create_token(user), 'user': _safe(user)}


@router.post('/forgot')
async def forgot(body: ForgotInput):
    user = await users.find_one({'email': body.email.lower()})
    # Always return ok (don't leak accounts). Return token for demo (no email service).
    if not user:
        return {'ok': True, 'reset_token': None}
    return {'ok': True, 'reset_token': make_reset_token(user['id'])}


@router.post('/reset')
async def reset(body: ResetInput):
    uid = decode_reset_token(body.token)
    if not uid:
        raise HTTPException(status_code=400, detail='Reset link is invalid or expired.')
    await users.update_one({'id': uid}, {'$set': {'password_hash': hash_password(body.password)}})
    return {'ok': True}


# ---------- Team / Staff (owner only) ----------
@router.get('/staff')
async def list_staff(user: dict = Depends(require_owner)):
    out = []
    async for u in users.find().sort('created_at', 1):
        out.append(_safe(u))
    return out


@router.post('/staff')
async def create_staff(body: StaffCreate, user: dict = Depends(require_owner)):
    if await users.find_one({'email': body.email.lower()}):
        raise HTTPException(status_code=400, detail='A user with this email already exists.')
    role = 'employee' if body.role not in ('owner', 'employee') else body.role
    nu = {
        'id': new_id(), 'name': body.name, 'email': body.email.lower(),
        'password_hash': hash_password(body.password), 'role': role,
        'active': True, 'created_at': now_iso(),
    }
    await users.insert_one(nu)
    await log_activity(user, 'create', 'staff', nu['id'], {'name': body.name, 'role': role})
    return _safe(nu)


@router.post('/staff/{uid}/reset-password')
async def reset_staff_password(uid: str, body: StaffPasswordReset, user: dict = Depends(require_owner)):
    target = await users.find_one({'id': uid})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')
    await users.update_one({'id': uid}, {'$set': {'password_hash': hash_password(body.password)}})
    await log_activity(user, 'reset_password', 'staff', uid)
    return {'ok': True}


@router.post('/staff/{uid}/toggle')
async def toggle_staff(uid: str, user: dict = Depends(require_owner)):
    target = await users.find_one({'id': uid})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')
    if target['role'] == 'owner':
        raise HTTPException(status_code=400, detail='Cannot disable the owner account.')
    await users.update_one({'id': uid}, {'$set': {'active': not target.get('active', True)}})
    return {'ok': True}


def _safe(u):
    u = clean(u)
    u.pop('password_hash', None)
    return u
