"""Boshlang'ich ma'lumotlarni (kategoriyalar, lavozimlar, statik matnlar, super-admin) bazaga yuklaydi.

Ishga tushirish:
    python -m app.db.seed
"""

import asyncio
import logging

from sqlalchemy import select

from admin_panel.security import hash_password
from app.config import get_settings
from app.db.models import Admin, BotText, Position, PositionCategory
from app.db.seed_data import BOT_TEXTS, CATEGORIES, POSITIONS
from app.db.session import async_session_maker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def seed() -> None:
    settings = get_settings()

    async with async_session_maker() as session:
        category_by_code: dict[str, PositionCategory] = {}

        for cat in CATEGORIES:
            existing = await session.scalar(select(PositionCategory).where(PositionCategory.code == cat["code"]))
            if existing:
                category_by_code[cat["code"]] = existing
                continue
            new_cat = PositionCategory(**cat)
            session.add(new_cat)
            await session.flush()
            category_by_code[cat["code"]] = new_cat
            logger.info("Kategoriya qo'shildi: %s", cat["code"])

        for code, positions in POSITIONS.items():
            category = category_by_code[code]
            for sort_order, (name_uz, name_ru) in enumerate(positions, start=1):
                existing = await session.scalar(
                    select(Position).where(Position.category_id == category.id, Position.name_uz == name_uz)
                )
                if existing:
                    continue
                session.add(
                    Position(
                        category_id=category.id,
                        name_uz=name_uz,
                        name_ru=name_ru,
                        sort_order=sort_order,
                    )
                )
            logger.info("%s toifasi uchun lavozimlar tekshirildi/qo'shildi (%d ta)", code, len(positions))

        for key, texts in BOT_TEXTS.items():
            existing = await session.scalar(select(BotText).where(BotText.key == key))
            if existing:
                continue
            session.add(BotText(key=key, text_uz=texts["text_uz"], text_ru=texts["text_ru"]))
            logger.info("Matn qo'shildi: %s", key)

        if settings.bootstrap_super_admin_id:
            existing_admin = await session.scalar(
                select(Admin).where(Admin.telegram_id == settings.bootstrap_super_admin_id)
            )
            if not existing_admin:
                existing_admin = Admin(
                    telegram_id=settings.bootstrap_super_admin_id,
                    full_name="Bootstrap Super Admin",
                    role="super_admin",
                )
                session.add(existing_admin)
                logger.info("Bootstrap super_admin qo'shildi: %s", settings.bootstrap_super_admin_id)

            existing_admin.role = "super_admin"
            existing_admin.is_active = True
            if settings.bootstrap_super_admin_phone:
                existing_admin.phone = settings.bootstrap_super_admin_phone
            if settings.bootstrap_super_admin_password:
                existing_admin.password_hash = hash_password(settings.bootstrap_super_admin_password)

        await session.commit()
        logger.info("Seed muvaffaqiyatli yakunlandi.")


if __name__ == "__main__":
    asyncio.run(seed())
