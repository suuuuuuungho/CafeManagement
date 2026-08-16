from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import get_venue_by_slug
from app.models import ConfirmMethod, DepositLog, MatchStatus, Order, OrderStatus
from app.routers.orders import broadcast_order_event
from app.schemas import DepositWebhookIn

router = APIRouter(prefix="/api/webhook", tags=["webhook"])


@router.post("/deposit/{slug}")
async def receive_deposit(
    slug: str,
    body: DepositWebhookIn,
    x_webhook_secret: str = Header(..., alias="X-Webhook-Secret"),
    db: AsyncSession = Depends(get_db),
):
    venue = await get_venue_by_slug(slug, db)
    if x_webhook_secret != venue.webhook_secret:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid webhook secret")

    cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.deposit_match_window_minutes)
    result = await db.execute(
        select(Order).where(
            Order.venue_id == venue.id,
            Order.status == OrderStatus.payment_pending,
            Order.unique_amount == body.amount,
            Order.created_at >= cutoff,
        )
    )
    candidates = result.scalars().all()

    log = DepositLog(
        venue_id=venue.id,
        raw_amount=body.amount,
        raw_sender_name=body.sender_name,
        raw_text=body.raw_text,
    )

    if len(candidates) == 1:
        order = candidates[0]
        order.status = OrderStatus.payment_confirmed
        order.confirmed_method = ConfirmMethod.auto
        order.confirmed_at = datetime.now(timezone.utc)
        log.matched_order_id = order.id
        log.match_status = MatchStatus.matched
        db.add(log)
        await db.commit()
        await db.refresh(order, attribute_names=["items"])
        await broadcast_order_event(venue.id, "order_updated", order)
        await broadcast_order_event(venue.id, "deposit_matched", order)
        return {"matched": True, "order_id": order.id}

    log.match_status = MatchStatus.unmatched
    db.add(log)
    await db.commit()
    await manager_broadcast_unmatched(venue.id, body.amount)
    return {"matched": False, "candidate_count": len(candidates)}


async def manager_broadcast_unmatched(venue_id: str, amount: int) -> None:
    from app.websocket_manager import manager

    await manager.broadcast(venue_id, {"type": "deposit_unmatched", "amount": amount})
