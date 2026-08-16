from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.database import async_session_factory
from app.models import Venue
from app.websocket_manager import manager

router = APIRouter(tags=["ws"])


@router.websocket("/ws/{slug}")
async def venue_events(ws: WebSocket, slug: str):
    async with async_session_factory() as db:
        result = await db.execute(select(Venue).where(Venue.slug == slug))
        venue = result.scalar_one_or_none()

    if venue is None:
        await ws.close(code=4404)
        return

    await manager.connect(venue.id, ws)
    try:
        while True:
            # Admin/display clients don't send anything meaningful; this just
            # keeps the connection open and lets us detect disconnects.
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(venue.id, ws)
