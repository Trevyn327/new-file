import os
import uuid
import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import users, clean

JWT_SECRET = os.environ.get('JWT_SECRET', 'dev_secret')
JWT_ALGO = 'HS256'
TOKEN_HOURS = 24 * 7

security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_token(user: dict) -> str:
    payload = {
        'sub': user['id'],
        'email': user['email'],
        'role': user['role'],
        'exp': datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def make_reset_token(user_id: str) -> str:
    payload = {
        'sub': user_id,
        'kind': 'reset',
        'exp': datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_reset_token(token: str):
    try:
        data = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        if data.get('kind') != 'reset':
            return None
        return data.get('sub')
    except Exception:
        return None


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail='Not authenticated')
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        raise HTTPException(status_code=401, detail='Session expired. Please sign in again.')
    user = await users.find_one({'id': payload.get('sub')})
    if not user or not user.get('active', True):
        raise HTTPException(status_code=401, detail='Account not found or disabled')
    return clean(user)


async def require_owner(user: dict = Depends(get_current_user)) -> dict:
    if user.get('role') != 'owner':
        raise HTTPException(status_code=403, detail="You don't have permission to view this page.")
    return user


def new_id() -> str:
    return uuid.uuid4().hex
