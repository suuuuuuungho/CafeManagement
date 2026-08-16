from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import decode_access_token
from app.database import get_db
from app.models import User, UserRole, Venue

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_access_token(creds.credentials)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = await db.get(User, payload.get("sub"))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


async def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.super_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Super admin only")
    return user


async def resolve_venue_id(
    venue_id: str | None = Query(None, description="Required for super_admin, ignored for venue_owner"),
    user: User = Depends(get_current_user),
) -> str:
    """Every venue-scoped admin route depends on this instead of reading
    venue_id off the request directly — it's the single place tenancy
    isolation is enforced, so a venue_owner can never act on another venue's
    data no matter what a client sends.
    """
    if user.role == UserRole.venue_owner:
        if user.venue_id is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Account has no venue")
        return user.venue_id
    # super_admin must explicitly choose which venue to operate on
    if not venue_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "venue_id query param is required for super_admin")
    return venue_id


async def get_venue_by_slug(slug: str, db: AsyncSession) -> Venue:
    result = await db.execute(select(Venue).where(Venue.slug == slug))
    venue = result.scalar_one_or_none()
    if venue is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Venue not found")
    return venue
