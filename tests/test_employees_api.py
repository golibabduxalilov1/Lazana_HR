from __future__ import annotations

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import Admin
from tests.conftest import auth_headers, make_admin


async def test_list_employees_requires_auth(client: AsyncClient) -> None:
    res = await client.get("/api/employees")
    assert res.status_code == 401


async def test_list_employees_rejects_hr(client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]) -> None:
    hr = await make_admin(session_maker, telegram_id=1, role="hr", with_login=False)
    res = await client.get("/api/employees", headers=auth_headers(hr))
    assert res.status_code == 403


async def test_list_employees_allows_admin_and_super_admin(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    super_admin = await make_admin(session_maker, telegram_id=2, role="super_admin")
    admin = await make_admin(session_maker, telegram_id=3, role="admin")

    res = await client.get("/api/employees", headers=auth_headers(super_admin))
    assert res.status_code == 200
    assert len(res.json()) == 2

    res = await client.get("/api/employees", headers=auth_headers(admin))
    assert res.status_code == 200


async def test_super_admin_cannot_create_super_admin(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    super_admin = await make_admin(session_maker, telegram_id=10, role="super_admin")
    res = await client.post(
        "/api/employees",
        headers=auth_headers(super_admin),
        json={
            "full_name": "Yangi Super",
            "phone": "+998901112233",
            "password": "Passw0rd1",
            "telegram_id": 999,
            "role": "super_admin",
        },
    )
    assert res.status_code == 403


async def test_admin_cannot_create_super_admin(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    admin = await make_admin(session_maker, telegram_id=11, role="admin")
    res = await client.post(
        "/api/employees",
        headers=auth_headers(admin),
        json={
            "full_name": "X",
            "phone": "+998901112211",
            "password": "Passw0rd1",
            "telegram_id": 1000,
            "role": "super_admin",
        },
    )
    assert res.status_code == 403


async def test_admin_can_create_hr_and_admin(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    admin = await make_admin(session_maker, telegram_id=12, role="admin")
    res = await client.post(
        "/api/employees",
        headers=auth_headers(admin),
        json={
            "full_name": "HR odam",
            "phone": "+998901112212",
            "password": "Passw0rd1",
            "telegram_id": 1001,
            "role": "hr",
        },
    )
    assert res.status_code == 201
    body = res.json()
    assert body["role"] == "hr"


async def test_create_employee_without_telegram_id_has_no_bot_role(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    admin = await make_admin(session_maker, telegram_id=13, role="admin")
    res = await client.post(
        "/api/employees",
        headers=auth_headers(admin),
        json={"full_name": "Web-only HR", "phone": "+998901112213", "password": "Passw0rd1", "role": "hr"},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["telegram_id"] is None


async def test_create_employee_duplicate_telegram_id_rejected(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    super_admin = await make_admin(session_maker, telegram_id=20, role="super_admin")
    existing = await make_admin(session_maker, telegram_id=21, role="hr", with_login=False)
    res = await client.post(
        "/api/employees",
        headers=auth_headers(super_admin),
        json={
            "full_name": "Dup",
            "phone": "+998901112220",
            "password": "Passw0rd1",
            "telegram_id": existing.telegram_id,
            "role": "hr",
        },
    )
    assert res.status_code == 400


async def test_create_employee_duplicate_phone_rejected(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    super_admin = await make_admin(session_maker, telegram_id=22, role="super_admin")
    res = await client.post(
        "/api/employees",
        headers=auth_headers(super_admin),
        json={
            "full_name": "Dup Phone",
            "phone": super_admin.phone,
            "password": "Passw0rd1",
            "telegram_id": 1002,
            "role": "hr",
        },
    )
    assert res.status_code == 400


async def test_admin_cannot_modify_existing_super_admin(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    admin = await make_admin(session_maker, telegram_id=30, role="admin")
    target_super = await make_admin(session_maker, telegram_id=31, role="super_admin")
    res = await client.patch(
        f"/api/employees/{target_super.id}",
        headers=auth_headers(admin),
        json={"full_name": "Renamed"},
    )
    assert res.status_code == 403


async def test_admin_cannot_promote_target_to_super_admin(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    admin = await make_admin(session_maker, telegram_id=32, role="admin")
    target_hr = await make_admin(session_maker, telegram_id=33, role="hr", with_login=False)
    res = await client.patch(
        f"/api/employees/{target_hr.id}",
        headers=auth_headers(admin),
        json={"role": "super_admin"},
    )
    assert res.status_code == 403


async def test_cannot_deactivate_self(client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]) -> None:
    super_admin = await make_admin(session_maker, telegram_id=40, role="super_admin")
    res = await client.patch(
        f"/api/employees/{super_admin.id}",
        headers=auth_headers(super_admin),
        json={"is_active": False},
    )
    assert res.status_code == 403


async def test_can_edit_own_profile_with_unchanged_role(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    super_admin = await make_admin(session_maker, telegram_id=42, role="super_admin")
    res = await client.patch(
        f"/api/employees/{super_admin.id}",
        headers=auth_headers(super_admin),
        json={"full_name": "Yangilangan ism", "phone": "+998900000000", "role": "super_admin"},
    )
    assert res.status_code == 200
    assert res.json()["full_name"] == "Yangilangan ism"


async def test_cannot_change_own_role(client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]) -> None:
    admin = await make_admin(session_maker, telegram_id=41, role="admin")
    res = await client.patch(
        f"/api/employees/{admin.id}",
        headers=auth_headers(admin),
        json={"role": "hr"},
    )
    assert res.status_code == 403


async def test_delete_employee_hard_deletes(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    super_admin = await make_admin(session_maker, telegram_id=50, role="super_admin")
    target = await make_admin(session_maker, telegram_id=51, role="hr", with_login=False)
    res = await client.delete(f"/api/employees/{target.id}", headers=auth_headers(super_admin))
    assert res.status_code == 204

    async with session_maker() as session:
        assert await session.get(Admin, target.id) is None


async def test_delete_self_blocked(client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]) -> None:
    super_admin = await make_admin(session_maker, telegram_id=52, role="super_admin")
    res = await client.delete(f"/api/employees/{super_admin.id}", headers=auth_headers(super_admin))
    assert res.status_code == 403


async def test_admin_cannot_delete_super_admin(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    admin = await make_admin(session_maker, telegram_id=53, role="admin")
    target_super = await make_admin(session_maker, telegram_id=54, role="super_admin")
    res = await client.delete(f"/api/employees/{target_super.id}", headers=auth_headers(admin))
    assert res.status_code == 403


async def test_bootstrap_admin_cannot_be_deleted(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession], monkeypatch
) -> None:
    from admin_panel.routers import employees as employees_router

    bootstrap = await make_admin(session_maker, telegram_id=70, role="super_admin")
    other_super_admin = await make_admin(session_maker, telegram_id=71, role="super_admin")
    monkeypatch.setattr(
        employees_router,
        "get_settings",
        lambda: type("S", (), {"bootstrap_super_admin_id": bootstrap.telegram_id})(),
    )

    res = await client.delete(f"/api/employees/{bootstrap.id}", headers=auth_headers(other_super_admin))
    assert res.status_code == 403


async def test_bootstrap_admin_cannot_be_deactivated(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession], monkeypatch
) -> None:
    from admin_panel.routers import employees as employees_router

    bootstrap = await make_admin(session_maker, telegram_id=72, role="super_admin")
    other_super_admin = await make_admin(session_maker, telegram_id=73, role="super_admin")
    monkeypatch.setattr(
        employees_router,
        "get_settings",
        lambda: type("S", (), {"bootstrap_super_admin_id": bootstrap.telegram_id})(),
    )

    res = await client.patch(
        f"/api/employees/{bootstrap.id}",
        headers=auth_headers(other_super_admin),
        json={"is_active": False},
    )
    assert res.status_code == 403


async def test_hr_login_succeeds(client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]) -> None:
    hr = await make_admin(session_maker, telegram_id=60, role="hr", with_login=True)
    res = await client.post(
        "/api/auth/login",
        json={"phone": hr.phone, "password": "Passw0rd!"},
    )
    assert res.status_code == 200
    assert res.json()["role"] == "hr"


async def test_admin_login_succeeds(client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]) -> None:
    admin = await make_admin(session_maker, telegram_id=61, role="admin", with_login=True)
    res = await client.post(
        "/api/auth/login",
        json={"phone": admin.phone, "password": "Passw0rd!"},
    )
    assert res.status_code == 200
    assert res.json()["role"] == "admin"


async def test_login_wrong_password_rejected(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    admin = await make_admin(session_maker, telegram_id=62, role="admin", with_login=True)
    res = await client.post(
        "/api/auth/login",
        json={"phone": admin.phone, "password": "wrong"},
    )
    assert res.status_code == 401


async def test_login_without_password_set_rejected(
    client: AsyncClient, session_maker: async_sessionmaker[AsyncSession]
) -> None:
    hr = await make_admin(session_maker, telegram_id=63, role="hr", with_login=False)
    hr_phone = f"+99890{hr.telegram_id:07d}"
    res = await client.post(
        "/api/auth/login",
        json={"phone": hr_phone, "password": "whatever"},
    )
    assert res.status_code == 401
