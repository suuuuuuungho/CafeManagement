from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_venue_by_slug, resolve_venue_id
from app.models import ConfirmMethod, MenuItem, Order, OrderItem, OrderStatus, Table
from app.schemas import OrderCreate, OrderOut
from app.websocket_manager import manager

router = APIRouter(tags=["orders"])


def compute_unique_amount(subtotal: int, order_seq: int) -> int:
    """Replace the last 3 digits of the rounded-down subtotal with the day's
    order sequence number (000-999) so concurrent orders rarely collide on
    the exact deposit amount a customer is asked to send.
    """
    base = (subtotal // 1000) * 1000
    return base + (order_seq % 1000)


async def next_order_seq(db: AsyncSession, venue_id: str, today: date) -> int:
    result = await db.execute(
        select(func.count()).select_from(Order).where(Order.venue_id == venue_id, Order.order_date == today)
    )
    return result.scalar_one() % 1000


async def broadcast_order_event(venue_id: str, event: str, order: Order) -> None:
    await manager.broadcast(
        venue_id,
        {
            "type": event,
            "order": {
                "id": order.id,
                "status": order.status.value,
                "table_id": order.table_id,
                "subtotal": order.subtotal,
                "unique_amount": order.unique_amount,
                "visible_on_display": order.visible_on_display,
            },
        },
    )


# ---- Public: customer order page ----


@router.get("/api/venues/{slug}/tables/{table_no}")
async def get_table_for_order(slug: str, table_no: int, db: AsyncSession = Depends(get_db)):
    venue = await get_venue_by_slug(slug, db)
    result = await db.execute(select(Table).where(Table.venue_id == venue.id, Table.table_no == table_no))
    table = result.scalar_one_or_none()
    if table is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Table not found")
    return {
        "table_id": table.id,
        "table_no": table.table_no,
        "venue": {
            "id": venue.id,
            "name": venue.name,
            "slug": venue.slug,
            "bank_name": venue.bank_name,
            "bank_account_no": venue.bank_account_no,
            "bank_account_holder": venue.bank_account_holder,
        },
    }


@router.post("/api/venues/{slug}/orders", response_model=OrderOut)
async def create_order(slug: str, body: OrderCreate, db: AsyncSession = Depends(get_db)):
    venue = await get_venue_by_slug(slug, db)

    table = await db.get(Table, body.table_id)
    if table is None or table.venue_id != venue.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Table not found for this venue")
    if not body.items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cart is empty")

    menu_item_ids = [i.menu_item_id for i in body.items]
    result = await db.execute(select(MenuItem).where(MenuItem.id.in_(menu_item_ids)))
    menu_items = {m.id: m for m in result.scalars().all()}

    subtotal = 0
    order_items: list[OrderItem] = []
    for line in body.items:
        menu_item = menu_items.get(line.menu_item_id)
        if menu_item is None or menu_item.venue_id != venue.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid menu item: {line.menu_item_id}")
        if not menu_item.is_available:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"'{menu_item.name}' is sold out")
        subtotal += menu_item.price * line.qty
        order_items.append(
            OrderItem(
                menu_item_id=menu_item.id,
                name_snapshot=menu_item.name,
                qty=line.qty,
                unit_price=menu_item.price,
            )
        )

    today = date.today()
    seq = await next_order_seq(db, venue.id, today)
    unique_amount = compute_unique_amount(subtotal, seq)

    order = Order(
        venue_id=venue.id,
        table_id=table.id,
        status=OrderStatus.payment_pending,
        subtotal=subtotal,
        unique_amount=unique_amount,
        order_seq=seq,
        order_date=today,
        items=order_items,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order, attribute_names=["items"])

    await broadcast_order_event(venue.id, "order_created", order)
    return order


@router.get("/api/venues/{slug}/orders/{order_id}", response_model=OrderOut)
async def get_order_status(slug: str, order_id: str, db: AsyncSession = Depends(get_db)):
    venue = await get_venue_by_slug(slug, db)
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id, Order.venue_id == venue.id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return order


# ---- Admin: venue-scoped order management ----


async def _get_admin_order(db: AsyncSession, venue_id: str, order_id: str) -> Order:
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id, Order.venue_id == venue_id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return order


@router.get("/api/admin/orders", response_model=list[OrderOut])
async def list_admin_orders(venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.venue_id == venue_id)
        .order_by(Order.created_at.desc())
    )
    return result.scalars().all()


@router.post("/api/admin/orders/{order_id}/confirm-payment", response_model=OrderOut)
async def confirm_payment(order_id: str, venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)):
    order = await _get_admin_order(db, venue_id, order_id)
    if order.status != OrderStatus.payment_pending:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Order is '{order.status.value}', not payment_pending")
    order.status = OrderStatus.payment_confirmed
    order.confirmed_method = ConfirmMethod.manual
    order.confirmed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(order, attribute_names=["items"])
    await broadcast_order_event(venue_id, "order_updated", order)
    return order


@router.post("/api/admin/orders/{order_id}/start-preparing", response_model=OrderOut)
async def start_preparing(order_id: str, venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)):
    order = await _get_admin_order(db, venue_id, order_id)
    if order.status != OrderStatus.payment_confirmed:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Order is '{order.status.value}', not payment_confirmed")
    order.status = OrderStatus.preparing
    await db.commit()
    await db.refresh(order, attribute_names=["items"])
    await broadcast_order_event(venue_id, "order_updated", order)
    return order


@router.post("/api/admin/orders/{order_id}/complete", response_model=OrderOut)
async def complete_order(order_id: str, venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)):
    order = await _get_admin_order(db, venue_id, order_id)
    if order.status != OrderStatus.preparing:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Order is '{order.status.value}', not preparing")
    order.status = OrderStatus.completed
    await db.commit()
    await db.refresh(order, attribute_names=["items"])
    await broadcast_order_event(venue_id, "order_updated", order)
    return order


@router.post("/api/admin/orders/{order_id}/mark-picked-up", response_model=OrderOut)
async def mark_picked_up(order_id: str, venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)):
    """The '수령완료' button — clears the card off the 제조현황 display."""
    order = await _get_admin_order(db, venue_id, order_id)
    if order.status != OrderStatus.completed:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Order is '{order.status.value}', not completed")
    order.visible_on_display = False
    order.picked_up_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(order, attribute_names=["items"])
    await broadcast_order_event(venue_id, "order_updated", order)
    return order


# ---- Public: 제조현황 display board ----


@router.get("/api/venues/{slug}/display", response_model=list[OrderOut])
async def get_display_board(slug: str, db: AsyncSession = Depends(get_db)):
    venue = await get_venue_by_slug(slug, db)
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(
            Order.venue_id == venue.id,
            Order.status.in_([OrderStatus.preparing, OrderStatus.completed]),
            Order.visible_on_display.is_(True),
        )
        .order_by(Order.created_at.asc())
    )
    return result.scalars().all()
