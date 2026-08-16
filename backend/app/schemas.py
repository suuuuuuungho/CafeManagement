from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.constants import KOREAN_BANKS
from app.models import ConfirmMethod, OrderStatus, UserRole

# ---- Auth ----


class SignupRequest(BaseModel):
    username: str = Field(pattern=r"^[a-zA-Z0-9_]{4,20}$")
    password: str = Field(min_length=8)
    venue_name: str
    bank_name: str
    bank_account_no: str = ""
    bank_account_holder: str = ""

    @field_validator("bank_name")
    @classmethod
    def bank_name_must_be_known(cls, v: str) -> str:
        if v not in KOREAN_BANKS:
            raise ValueError(f"Unknown bank: {v}")
        return v


class LoginRequest(BaseModel):
    username: str
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
    webhook_secret: str
    is_active: bool

    model_config = {"from_attributes": True}


class VenueUpdate(BaseModel):
    name: str | None = None
    bank_name: str | None = None
    bank_account_no: str | None = None
    bank_account_holder: str | None = None

    @field_validator("bank_name")
    @classmethod
    def bank_name_must_be_known(cls, v: str | None) -> str | None:
        if v is not None and v not in KOREAN_BANKS:
            raise ValueError(f"Unknown bank: {v}")
        return v


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
