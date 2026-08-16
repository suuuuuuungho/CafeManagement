from collections.abc import AsyncGenerator
from urllib.parse import parse_qs, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings


def _build_engine(database_url: str):
    """asyncpg's connect() doesn't understand libpq-style query params like
    Neon's `sslmode`/`channel_binding` — passing them through raises
    TypeError at connect time. Strip them from the URL and pass `ssl`
    via connect_args instead, which asyncpg does understand.
    """
    connect_args: dict = {}
    engine_kwargs: dict = {}
    if database_url.startswith("postgresql+asyncpg://"):
        parts = urlsplit(database_url)
        query = parse_qs(parts.query)
        if "sslmode" in query or "channel_binding" in query:
            connect_args["ssl"] = "require"
            database_url = urlunsplit((parts.scheme, parts.netloc, parts.path, "", parts.fragment))
        if "-pooler" in (parts.hostname or ""):
            # Neon's "-pooler" endpoint routes through PgBouncer in
            # transaction-pooling mode. Layering SQLAlchemy's own connection
            # pool on top of that means a single physical connection gets
            # reused across unrelated logical "sessions" from PgBouncer's
            # point of view — if any one of them hits a stale prepared-
            # statement plan, every later request that reuses that same
            # pooled connection keeps failing with it too. NullPool opens a
            # fresh asyncpg connection per checkout instead, leaving pooling
            # entirely to PgBouncer. Direct (non "-pooler") endpoints don't
            # need this — use normal pooling there.
            connect_args["statement_cache_size"] = 0
            engine_kwargs["poolclass"] = NullPool
    return create_async_engine(database_url, echo=False, connect_args=connect_args, **engine_kwargs)


engine = _build_engine(settings.database_url)
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
