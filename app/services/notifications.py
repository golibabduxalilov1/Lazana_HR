from __future__ import annotations

import logging

from aiogram import Bot
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Admin, Application, Position, PositionCategory

logger = logging.getLogger(__name__)

NOTIFY_ROLES = ("super_admin", "admin", "hr")


def build_hr_notification_text(application: Application, position: Position, category: PositionCategory) -> str:
    submitted = application.submitted_at.strftime("%d.%m.%Y %H:%M") if application.submitted_at else "-"
    return (
        f"🆕 Yangi ariza — #{application.id}\n"
        f"Lavozim: {category.name_uz} / {position.name_uz}\n"
        f"F.I.Sh.: {application.full_name}\n"
        f"Telefon: {application.phone}\n"
        f"Manzil: {application.address}\n"
        f"Tug'ilgan sana: {application.birth_date.strftime('%d.%m.%Y') if application.birth_date else '-'}\n"
        f"Yuborilgan vaqt: {submitted}\n"
        f"\nBatafsil: bot ichida /admin buyrug'i orqali ko'ring."
    )


async def notify_hr(
    bot: Bot,
    session: AsyncSession,
    application: Application,
    position: Position,
    category: PositionCategory,
) -> None:
    text = build_hr_notification_text(application, position, category)
    recipients = await session.scalars(
        select(Admin.telegram_id).where(Admin.role.in_(NOTIFY_ROLES), Admin.is_active.is_(True))
    )
    for chat_id in recipients:
        try:
            await bot.send_message(chat_id=chat_id, text=text)
        except Exception:
            logger.exception(
                "Xodimga bildirishnoma yuborishda xatolik (application_id=%s, chat_id=%s)", application.id, chat_id
            )
