import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Collections
users = db.users
settings_col = db.shop_settings
categories = db.categories
suppliers = db.suppliers
customers = db.customers
products = db.products
purchases = db.purchases
sales = db.sales
payments = db.payments
capital_entries = db.capital_entries
expenses = db.expenses
stock_adjustments = db.stock_adjustments
returns_col = db.returns
day_close = db.day_close
activity_log = db.activity_log


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def clean(doc):
    """Remove Mongo _id for JSON responses."""
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop('_id', None)
    return doc


async def log_activity(user, action, entity, entity_id=None, details=None):
    await activity_log.insert_one({
        'id': __import__('uuid').uuid4().hex,
        'user_id': user.get('id'),
        'user_name': user.get('name'),
        'action': action,
        'entity': entity,
        'entity_id': entity_id,
        'details': details or {},
        'timestamp': now_iso(),
    })
