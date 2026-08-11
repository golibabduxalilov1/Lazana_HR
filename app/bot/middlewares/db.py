from __future__ import annotations

from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject
from sqlalchemy import select

from app.bot.texts import t
from app.db.models import User
from app.db.session import async_session_maker


class DbSessionMiddleware(BaseMiddleware):
    """Har bir update uchun AsyncSession ochadi va joriy Telegram foydalanuvchisini (users jadvali) yuklaydi/yaratadi."""

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        async with async_session_maker() as session:
            data["session"] = session

            tg_user = data.get("event_from_user")
            if tg_user is not None:
                db_user = await session.scalar(select(User).where(User.telegram_id == tg_user.id))
                if db_user is None:
                    db_user = User(
                        telegram_id=tg_user.id,
                        username=tg_user.username,
                        first_name=tg_user.first_name,
                        last_name=tg_user.last_name,
                    )
                    session.add(db_user)
                    await session.commit()
                    await session.refresh(db_user)
                    data["is_new_user"] = True
                else:
                    data["is_new_user"] = False
                    changed = False
                    for field_name, value in (
                        ("username", tg_user.username),
                        ("first_name", tg_user.first_name),
                        ("last_name", tg_user.last_name),
                    ):
                        if getattr(db_user, field_name) != value:
                            setattr(db_user, field_name, value)
                            changed = True
                    if changed:
                        await session.commit()

                data["db_user"] = db_user

                if db_user.is_blocked:
                    lang = db_user.language or "uz"
                    if isinstance(event, Message):
                        await event.answer(t(lang, "blocked_user"))
                    elif isinstance(event, CallbackQuery):
                        await event.answer(t(lang, "blocked_user"), show_alert=True)
                    return None

            return await handler(event, data)
