from __future__ import annotations

from functools import lru_cache

from aiogram import Bot

from app.config import get_settings


@lru_cache
def get_bot() -> Bot:
    return Bot(token=get_settings().bot_token)


async def close_bot() -> None:
    bot = get_bot()
    await bot.session.close()
