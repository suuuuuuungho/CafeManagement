import enum
import uuid
from datetime import datetime, date

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    venue_owner = "venue_owner"


class OrderStatus(str, enum.Enum):
    payment_pending = "payment_pending"
    payment_confirmed = "payment_confirmed"
    preparing = "preparing"
    completed = "completed"
    cancelled = "cancelled"


class ConfirmMethod(str, enum.Enum):
    auto = "auto"
    manual = "manual"


class MatchStatus(str, enum.Enum):
    matched = "matched"
    unmatched = "unmatched"
    manual_override = "manual_override"


class Venue(Base):
    __tablename__ = "venues"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    bank_account_no: Mapped[str] = mapped_column(String(60), default="")
    bank_account_holder: Mapped[str] = mapped_column(String(60), default="")
    bank_name: Mapped[str] = mapped_column(String(60), default="")
    webhook_secret: Mapped[str] = mapped_column(String(64), default=gen_uuid)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    users: Mapped[list["User"]] = relationship(back_populates="venue")
    tables: Mapped[list["Table"]] = relationship(back_populates="venue")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.venue_owner)
    venue_id: Mapped[str | None] = mapped_column(ForeignKey("venues.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    venue: Mapped[Venue | None] = relationship(back_populates="users")


class Table(Base):
    __tablename__ = "tables"
    __table_args__ = (UniqueConstraint("venue_id", "table_no", name="uq_table_venue_no"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    table_no: Mapped[int] = mapped_column(Integer)
    qr_token: Mapped[str] = mapped_column(String(36), default=gen_uuid, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    venue: Mapped[Venue] = relationship(back_populates="tables")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(120))
    price: Mapped[int] = mapped_column(Integer)  # KRW, no decimals
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    table_id: Mapped[str] = mapped_column(ForeignKey("tables.id"))
    status: Mapped[OrderStatus] = mapped_column(Enum(OrderStatus), default=OrderStatus.payment_pending)
    subtotal: Mapped[int] = mapped_column(Integer)
    unique_amount: Mapped[int] = mapped_column(Integer, index=True)
    order_seq: Mapped[int] = mapped_column(Integer)
    order_date: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    confirmed_method: Mapped[ConfirmMethod | None] = mapped_column(Enum(ConfirmMethod), nullable=True)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Stays true after status becomes "completed" until the owner taps "수령완료" on
    # the admin page — that's what actually clears the card off the display board.
    visible_on_display: Mapped[bool] = mapped_column(Boolean, default=True)
    picked_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id"), index=True)
    menu_item_id: Mapped[str] = mapped_column(ForeignKey("menu_items.id"))
    name_snapshot: Mapped[str] = mapped_column(String(120))
    qty: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[int] = mapped_column(Integer)

    order: Mapped[Order] = relationship(back_populates="items")


class DepositLog(Base):
    __tablename__ = "deposit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    venue_id: Mapped[str] = mapped_column(ForeignKey("venues.id"), index=True)
    raw_amount: Mapped[int] = mapped_column(Integer)
    raw_sender_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    raw_text: Mapped[str] = mapped_column(String(500), default="")
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    matched_order_id: Mapped[str | None] = mapped_column(ForeignKey("orders.id"), nullable=True)
    match_status: Mapped[MatchStatus] = mapped_column(Enum(MatchStatus), default=MatchStatus.unmatched)
