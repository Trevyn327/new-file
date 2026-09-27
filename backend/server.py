from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import logging

from database import client
from routers import auth_routes, catalog, products, transactions, finance, dashboard, imports

app = FastAPI(title='Shop ERP API')

health = APIRouter(prefix='/api')


@health.get('/')
async def root():
    return {'message': 'Shop ERP API running'}


app.include_router(health)
app.include_router(auth_routes.router)
app.include_router(catalog.router)
app.include_router(products.router)
app.include_router(transactions.router)
app.include_router(finance.router)
app.include_router(dashboard.router)
app.include_router(imports.router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()
