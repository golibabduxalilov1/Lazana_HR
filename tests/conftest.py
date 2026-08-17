from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from admin_panel.deps import get_session
from admin_panel.main import app
from admin_panel.security import create_access_token, hash_password
from app.db.base import Base
from app.db.models import Admin, AuditLog

_TABLES = [Admin.__table__, AuditLog.__table__]


@pytest_asyncio.fixture
async def session_maker() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        for table in _TABLES:
            await conn.run_sync(table.create)
    maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    try:
        yield maker
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all, tables=_TABLES)
        await engine.dispose()


@pytest_asyncio.fixture
async def client(session_maker: async_sessionmaker[AsyncSession]) -> AsyncIterator[AsyncClient]:
    async def override_get_session() -> AsyncIterator[AsyncSession]:
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


async def make_admin(
    session_maker: async_sessionmaker[AsyncSession],
    *,
    telegram_id: int | None,
    role: str,
    full_name: str | None = None,
    with_login: bool = True,
) -> Admin:
    async with session_maker() as session:
        admin = Admin(
            telegram_id=telegram_id,
            role=role,
            full_name=full_name,
            is_active=True,
            phone=f"+99890{telegram_id:07d}" if with_login and telegram_id is not None else None,
            password_hash=hash_password("Passw0rd!") if with_login else None,
        )
        session.add(admin)
        await session.commit()
        await session.refresh(admin)
        return admin


def auth_headers(admin: Admin) -> dict[str, str]:
    token = create_access_token(admin.id, admin.role)
    return {"Authorization": f"Bearer {token}"}
