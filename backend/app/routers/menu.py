from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_venue_by_slug, resolve_venue_id
from app.models import Category, MenuItem
from app.schemas import CategoryCreate, CategoryOut, MenuItemCreate, MenuItemOut, MenuItemUpdate

router = APIRouter(tags=["menu"])


# ---- Public: order page menu ----


@router.get("/api/venues/{slug}/menu")
async def get_public_menu(slug: str, db: AsyncSession = Depends(get_db)):
    venue = await get_venue_by_slug(slug, db)
    cat_result = await db.execute(
        select(Category).where(Category.venue_id == venue.id).order_by(Category.sort_order)
    )
    categories = cat_result.scalars().all()
    item_result = await db.execute(
        select(MenuItem).where(MenuItem.venue_id == venue.id, MenuItem.is_available.is_(True))
    )
    items = item_result.scalars().all()
    return {
        "categories": [CategoryOut.model_validate(c) for c in categories],
        "items": [MenuItemOut.model_validate(i) for i in items],
    }


# ---- Admin: menu management ----


@router.get("/api/admin/menu-items", response_model=list[MenuItemOut])
async def list_menu_items(venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MenuItem).where(MenuItem.venue_id == venue_id))
    return result.scalars().all()


@router.post("/api/admin/menu-items", response_model=MenuItemOut)
async def create_menu_item(
    body: MenuItemCreate, venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)
):
    item = MenuItem(venue_id=venue_id, **body.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/api/admin/menu-items/{item_id}", response_model=MenuItemOut)
async def update_menu_item(
    item_id: str,
    body: MenuItemUpdate,
    venue_id: str = Depends(resolve_venue_id),
    db: AsyncSession = Depends(get_db),
):
    item = await db.get(MenuItem, item_id)
    if item is None or item.venue_id != venue_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Menu item not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/api/admin/menu-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_item(item_id: str, venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)):
    item = await db.get(MenuItem, item_id)
    if item is None or item.venue_id != venue_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Menu item not found")
    await db.delete(item)
    await db.commit()


@router.get("/api/admin/categories", response_model=list[CategoryOut])
async def list_categories(venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).where(Category.venue_id == venue_id).order_by(Category.sort_order))
    return result.scalars().all()


@router.post("/api/admin/categories", response_model=CategoryOut)
async def create_category(
    body: CategoryCreate, venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)
):
    category = Category(venue_id=venue_id, **body.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category
