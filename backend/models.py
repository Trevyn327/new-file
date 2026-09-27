from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional


# ---------- Auth ----------
class FirstRunOwner(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=4)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionInput(BaseModel):
    session_id: str


class ForgotInput(BaseModel):
    email: EmailStr


class ResetInput(BaseModel):
    token: str
    password: str = Field(min_length=4)


class StaffCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=4)
    role: str = 'employee'


class StaffPasswordReset(BaseModel):
    password: str = Field(min_length=4)


# ---------- Settings ----------
class ShopSettings(BaseModel):
    name: str = 'My Shop'
    address: str = ''
    gstin: str = ''
    tax_percent: float = 0
    invoice_prefix: str = 'INV-'
    upi_id: str = ''


# ---------- Catalog ----------
class CategoryInput(BaseModel):
    name: str


class PartyInput(BaseModel):
    name: str
    phone: str = ''
    address: str = ''
    gstin: str = ''
    opening_balance: float = 0


# ---------- Products ----------
class ProductInput(BaseModel):
    sku: str = ''
    name: str
    category_id: Optional[str] = None
    barcode: str = ''
    unit: str = 'pcs'
    purchase_price: float = 0
    selling_price: float = 0
    opening_stock: float = 0
    image_url: str = ''
    low_stock_threshold: float = 5


class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    category_id: Optional[str] = None
    barcode: Optional[str] = None
    unit: Optional[str] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    image_url: Optional[str] = None
    low_stock_threshold: Optional[float] = None


# ---------- Transactions ----------
class LineItem(BaseModel):
    product_id: str
    qty: float
    price: float  # unit cost (purchase) or unit sell price (sale)


class PurchaseInput(BaseModel):
    supplier_id: Optional[str] = None
    date: Optional[str] = None
    items: List[LineItem]
    payment_type: str = 'cash'      # cash | credit
    amount_paid: float = 0          # for credit/partial


class SaleInput(BaseModel):
    customer_id: Optional[str] = None
    date: Optional[str] = None
    items: List[LineItem]
    discount_type: str = 'flat'     # flat | percent
    discount_value: float = 0
    payment_type: str = 'cash'      # cash | credit | partial
    payment_mode: str = 'Cash'      # Cash | UPI | Card | Bank Transfer
    amount_paid: float = 0          # used for partial; auto for cash/credit


class StockAdjustInput(BaseModel):
    product_id: str
    change: float                   # +ve increase, -ve decrease
    reason: str                     # Damage | Loss | Theft | Recount | Other
    note: str = ''


class ReturnInput(BaseModel):
    kind: str                       # customer | supplier
    ref_id: Optional[str] = None    # original sale/purchase id
    party_id: Optional[str] = None
    items: List[LineItem]
    refund_mode: str = 'Cash'       # Cash | Store Credit (customer)


# ---------- Finance ----------
class PaymentInput(BaseModel):
    direction: str                  # customer | supplier
    party_id: str
    sale_id: Optional[str] = None
    purchase_id: Optional[str] = None
    amount: float
    mode: str = 'Cash'
    note: str = ''


class CapitalInput(BaseModel):
    type: str                       # Opening Capital | Owner Investment | Owner Drawing | Loan Received | Loan Repayment
    amount: float
    note: str = ''
    date: Optional[str] = None


class ExpenseInput(BaseModel):
    category: str
    amount: float
    mode: str = 'Cash'
    note: str = ''
    date: Optional[str] = None


class DayCloseInput(BaseModel):
    date: Optional[str] = None
    counted_cash: float
