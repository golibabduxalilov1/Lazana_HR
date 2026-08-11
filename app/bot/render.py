from __future__ import annotations

from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message


async def send_or_edit(
    event: Message | CallbackQuery, text: str, reply_markup: InlineKeyboardMarkup | None = None
) -> None:
    """Xabarni yuboradi (Message bo'lsa) yoki mavjud xabarni tahrirlaydi (CallbackQuery bo'lsa).

    Faqat InlineKeyboardMarkup bilan ishlatiladi — Telegram xabarni tahrirlashda
    ReplyKeyboardMarkup biriktirishga ruxsat bermaydi.
    """
    if isinstance(event, CallbackQuery):
        try:
            await event.message.edit_text(text, reply_markup=reply_markup)
        except Exception:
            await event.message.answer(text, reply_markup=reply_markup)
        await event.answer()
    else:
        await event.answer(text, reply_markup=reply_markup)
