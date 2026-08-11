"""Web-admin panel uchun login/parol o'rnatadi (mavjud yoki yangi admin qatoriga).

Ishga tushirish:
    python -m app.db.create_web_admin --telegram-id 123456789 --username hr_admin --password "StrongPass123" --role super_admin --full-name "Ism Familiya"
"""

import argparse
import asyncio

from sqlalchemy import select

from admin_panel.security import hash_password
from app.db.models import Admin
from app.db.session import async_session_maker


async def create_or_update(telegram_id: int, username: str, password: str, role: str, full_name: str | None) -> None:
    async with async_session_maker() as session:
        admin = await session.scalar(select(Admin).where(Admin.telegram_id == telegram_id))
        if admin is None:
            admin = Admin(telegram_id=telegram_id, role=role, full_name=full_name)
            session.add(admin)
        else:
            admin.role = role
            if full_name:
                admin.full_name = full_name

        admin.username = username
        admin.password_hash = hash_password(password)
        admin.is_active = True
        await session.commit()
        print(f"OK: admin '{username}' (telegram_id={telegram_id}, role={role}) tayyor.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--telegram-id", type=int, required=True)
    parser.add_argument("--username", type=str, required=True)
    parser.add_argument("--password", type=str, required=True)
    parser.add_argument("--role", type=str, default="hr", choices=["super_admin", "hr", "viewer"])
    parser.add_argument("--full-name", type=str, default=None)
    args = parser.parse_args()

    asyncio.run(
        create_or_update(args.telegram_id, args.username, args.password, args.role, args.full_name)
    )
