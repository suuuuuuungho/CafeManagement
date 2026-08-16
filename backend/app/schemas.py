from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models import ConfirmMethod, OrderStatus, UserRole

# ---- Auth ----


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    venue_name: str
    venue_slug: str = Field(pattern=r"^[a-z0-9-]{3,40}$")
    bank_name: str = ""
    bank_account_no: str = ""
    bank_account_holder: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    venue_id: str | None
    venue_slug: str | None


# ---- Venue ----


class VenueOut(BaseModel):
    id: str
    name: str
    slug: str
    bank_name: str
    bank_account_no: str
    bank_account_holder: str
    is_active: bool

    model_config = {"from_attributes": True}


class VenueUpdate(BaseModel):
    name: str | None = None
    bank_name: str | None = None
    bank_account_no: str | None = None
    bank_account_holder: str | None = None


# ---- Tables ----


class TableOut(BaseModel):
    id: str
    table_no: int
    qr_token: str

    model_config = {"from_attributes": True}


class TableCreate(BaseModel):
    table_no: int


# ---- Menu ----


class MenuItemOut(BaseModel):
    id: str
    category_id: str | None
    name: str
    price: int
    is_available: bool

    model_config = {"from_attributes": True}


class MenuItemCreate(BaseModel):
    category_id: str | None = None
    name: str
    price: int = Field(ge=0)


class MenuItemUpdate(BaseModel):
    name: str | None = None
    price: int | None = None
    is_available: bool | None = None
    category_id: str | None = None


class CategoryOut(BaseModel):
    id: str
    name: str
    sort_order: int

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str
    sort_order: int = 0


# ---- Orders ----


class OrderItemIn(BaseModel):
    menu_item_id: str
    qty: int = Field(ge=1)


class OrderCreate(BaseModel):
    table_id: str
    items: list[OrderItemIn]


class OrderItemOut(BaseModel):
    id: str
    menu_item_id: str
    name_snapshot: str
    qty: int
    unit_price: int

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: str
    venue_id: str
    table_id: str
    status: OrderStatus
    subtotal: int
    unique_amount: int
    order_seq: int
    confirmed_method: ConfirmMethod | None
    confirmed_at: datetime | None
    visible_on_display: bool
    created_at: datetime
    items: list[OrderItemOut]

    model_config = {"from_attributes": True}


class DepositWebhookIn(BaseModel):
    amount: int
    sender_name: str | None = None
    raw_text: str = ""
    received_at: datetime | None = None
