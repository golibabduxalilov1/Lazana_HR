from __future__ import annotations

from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware
from aiogram.types import CallbackQuery, Message, TelegramObject
from redis.asyncio import Redis

from app.bot.texts import t


class ThrottlingMiddleware(BaseMiddleware):
    """Redis asosidagi oddiy rate limiting: bir foydalanuvchi daqiqasiga cheklangan sondan ko'p so'rov yubora olmaydi."""

    def __init__(self, redis: Redis, limit_per_minute: int) -> None:
        self.redis = redis
        self.limit_per_minute = limit_per_minute

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        tg_user = data.get("event_from_user")
        if tg_user is None:
            return await handler(event, data)

        key = f"throttle:{tg_user.id}"
        count = await self.redis.incr(key)
        if count == 1:
            await self.redis.expire(key, 60)

        if count > self.limit_per_minute:
            notify_key = f"throttle_notified:{tg_user.id}"
            already_notified = await self.redis.get(notify_key)
            if not already_notified:
                await self.redis.set(notify_key, "1", ex=60)
                db_user = data.get("db_user")
                lang = db_user.language if db_user else "uz"
                message_text = t(lang, "rate_limited")
                if isinstance(event, Message):
                    await event.answer(message_text)
                elif isinstance(event, CallbackQuery):
                    await event.answer(message_text, show_alert=True)
            return None

        return await handler(event, data)
