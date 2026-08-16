"""One-off CLI to create the platform super_admin account.

Deliberately not exposed via the signup API — super_admin should never be
reachable through open registration. Run from backend/:

    python -m scripts.create_super_admin admin <password>
"""

import asyncio
import sys

sys.path.insert(0, ".")

from app.auth import hash_password  # noqa: E402
from app.database import async_session_factory, init_db  # noqa: E402
from app.models import User, UserRole  # noqa: E402


async def main(username: str, password: str) -> None:
    await init_db()
    async with async_session_factory() as db:
        user = User(username=username, password_hash=hash_password(password), role=UserRole.super_admin, venue_id=None)
        db.add(user)
        await db.commit()
        print(f"Created super_admin: {username}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python -m scripts.create_super_admin <username> <password>")
        raise SystemExit(1)
    asyncio.run(main(sys.argv[1], sys.argv[2]))
