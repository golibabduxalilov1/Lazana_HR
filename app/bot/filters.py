from __future__ import annotations

from typing import Any

from aiogram.filters import BaseFilter
from aiogram.types import TelegramObject
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Admin


class IsAdmin(BaseFilter):
    """Faqat `admins` jadvalida ro'yxatdan o'tgan va faol foydalanuvchilarga ruxsat beradi.

    O'tsa, aniqlangan Admin qatorini `admin` nomi bilan handler kontekstiga qo'shadi.
    """

    async def __call__(self, event: TelegramObject, session: AsyncSession, event_from_user) -> bool | dict[str, Any]:
        if event_from_user is None:
            return False
        admin = await session.scalar(
            select(Admin).where(Admin.telegram_id == event_from_user.id, Admin.is_active.is_(True))
        )
        if admin is None:
            return False
        return {"admin": admin}


def can_manage(admin: Admin) -> bool:
    """Arizalar statusini o'zgartirish va eksport qilish huquqi (super_admin, admin, hr)."""
    return admin.role in ("super_admin", "admin", "hr")


def can_configure(admin: Admin) -> bool:
    """Lavozimlar, matnlar va xodimlarni boshqarish huquqi (super_admin, admin)."""
    return admin.role in ("super_admin", "admin")
