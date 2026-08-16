from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import resolve_venue_id
from app.models import Table
from app.schemas import TableCreate, TableOut

router = APIRouter(prefix="/api/admin/tables", tags=["tables"])


@router.get("", response_model=list[TableOut])
async def list_tables(venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Table).where(Table.venue_id == venue_id).order_by(Table.table_no))
    return result.scalars().all()


@router.post("", response_model=TableOut)
async def create_table(
    body: TableCreate, venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)
):
    table = Table(venue_id=venue_id, table_no=body.table_no)
    db.add(table)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Table number already exists for this venue")
    await db.refresh(table)
    return table


@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_table(table_id: str, venue_id: str = Depends(resolve_venue_id), db: AsyncSession = Depends(get_db)):
    table = await db.get(Table, table_id)
    if table is None or table.venue_id != venue_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Table not found")
    await db.delete(table)
    await db.commit()
