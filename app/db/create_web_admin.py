"""Web-admin panel uchun login/parol o'rnatadi (mavjud yoki yangi admin qatoriga).

Ishga tushirish:
    python -m app.db.create_web_admin --phone "+998901234567" --password "StrongPass123" --role super_admin --full-name "Ism Familiya" [--telegram-id 123456789]
"""

import argparse
import asyncio

from sqlalchemy import select

from admin_panel.security import hash_password
from app.db.models import Admin
from app.db.session import async_session_maker


async def create_or_update(
    phone: str, password: str, role: str, full_name: str | None, telegram_id: int | None
) -> None:
    async with async_session_maker() as session:
        admin = await session.scalar(select(Admin).where(Admin.phone == phone))
        if admin is None and telegram_id is not None:
            # Bootstrap super-admin (app/db/seed.py) is created by telegram_id only, without a
            # phone yet — match on it too so this script upgrades that row instead of colliding
            # with its unique telegram_id constraint by inserting a duplicate.
            admin = await session.scalar(select(Admin).where(Admin.telegram_id == telegram_id))

        if admin is None:
            admin = Admin(phone=phone, role=role, full_name=full_name, telegram_id=telegram_id)
            session.add(admin)
        else:
            admin.phone = phone
            admin.role = role
            if full_name:
                admin.full_name = full_name
            if telegram_id is not None:
                admin.telegram_id = telegram_id

        admin.password_hash = hash_password(password)
        admin.is_active = True
        await session.commit()
        print(f"OK: admin '{phone}' (telegram_id={telegram_id}, role={role}) tayyor.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--phone", type=str, required=True)
    parser.add_argument("--password", type=str, required=True)
    parser.add_argument("--role", type=str, default="admin", choices=["super_admin", "admin", "hr"])
    parser.add_argument("--full-name", type=str, default=None)
    parser.add_argument("--telegram-id", type=int, default=None)
    args = parser.parse_args()

    asyncio.run(
        create_or_update(args.phone, args.password, args.role, args.full_name, args.telegram_id)
    )
