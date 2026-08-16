from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models import User, UserRole, Venue
from app.schemas import LoginRequest, SignupRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    existing_email = await db.execute(select(User).where(User.email == body.email))
    if existing_email.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    existing_slug = await db.execute(select(Venue).where(Venue.slug == body.venue_slug))
    if existing_slug.scalar_one_or_none():
        raise HTTPException(status.HTTP_409_CONFLICT, "Venue URL(slug) already taken")

    venue = Venue(
        name=body.venue_name,
        slug=body.venue_slug,
        bank_name=body.bank_name,
        bank_account_no=body.bank_account_no,
        bank_account_holder=body.bank_account_holder,
    )
    db.add(venue)
    await db.flush()

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=UserRole.venue_owner,
        venue_id=venue.id,
    )
    db.add(user)
    await db.commit()

    token = create_access_token(sub=user.id, role=user.role.value, venue_id=venue.id)
    return TokenResponse(access_token=token, role=user.role, venue_id=venue.id, venue_slug=venue.slug)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    venue_slug = None
    if user.venue_id:
        venue = await db.get(Venue, user.venue_id)
        venue_slug = venue.slug if venue else None

    token = create_access_token(sub=user.id, role=user.role.value, venue_id=user.venue_id)
    return TokenResponse(access_token=token, role=user.role, venue_id=user.venue_id, venue_slug=venue_slug)
