from __future__ import annotations

import logging

from aiogram import Bot
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot.texts import t
from app.db.models import Admin, Application, BotText, Position, PositionCategory, User

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


async def notify_candidate_rejected(bot: Bot, session: AsyncSession, application: Application) -> None:
    user = await session.get(User, application.user_id)
    if user is None:
        return

    row = await session.scalar(select(BotText).where(BotText.key == "rejection_message"))
    if row is None:
        text = t(user.language, "rejection_message_fallback")
    else:
        text = row.text_uz if user.language == "uz" else row.text_ru

    try:
        await bot.send_message(chat_id=user.telegram_id, text=text)
    except Exception:
        logger.exception(
            "Nomzodga rad etish bildirishnomasini yuborishda xatolik (application_id=%s, user_id=%s)",
            application.id,
            user.id,
        )
