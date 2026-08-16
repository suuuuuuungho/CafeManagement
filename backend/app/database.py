from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.database_url, echo=False)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


async def init_db() -> None:
    """Create tables from models if they don't exist yet.

    MVP-level bootstrap. Swap for Alembic migrations before this has real
    production data to preserve.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
