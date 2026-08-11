from __future__ import annotations

import logging

from aiogram import Bot

from app.db.models import Application, Position, PositionCategory

logger = logging.getLogger(__name__)


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
    bot: Bot, chat_id: int, application: Application, position: Position, category: PositionCategory
) -> None:
    text = build_hr_notification_text(application, position, category)
    try:
        await bot.send_message(chat_id=chat_id, text=text)
    except Exception:
        logger.exception("HR guruhiga bildirishnoma yuborishda xatolik (application_id=%s)", application.id)
