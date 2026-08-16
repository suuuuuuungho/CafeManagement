from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import KOREAN_BANKS
from app.database import get_db
from app.deps import require_super_admin, resolve_venue_id
from app.models import Venue
from app.schemas import VenueOut, VenueUpdate

router = APIRouter(prefix="/api/admin", tags=["venues"])

meta_router = APIRouter(prefix="/api/meta", tags=["meta"])


@meta_router.get("/banks")
async def list_banks():
    return KOREAN_BANKS


@router.get("/venues", response_model=list[VenueOut])
async def list_all_venues(db: AsyncSession = Depends(get_db), _admin=Depends(require_super_admin)):
    """super_admin only — the platform-wide venue list."""
    result = await db.execute(select(Venue).order_by(Venue.created_at.desc()))
    return result.scalars().all()


@router.get("/venue", response_model=VenueOut)
async def get_current_venue(venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)):
    venue = await db.get(Venue, venue_id)
    if venue is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Venue not found")
    return venue


@router.patch("/venue", response_model=VenueOut)
async def update_current_venue(
    body: VenueUpdate, venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)
):
    venue = await db.get(Venue, venue_id)
    if venue is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Venue not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(venue, field, value)
    await db.commit()
    await db.refresh(venue)
    return venue
