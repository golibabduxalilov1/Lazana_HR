import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.storage.redis import RedisStorage
from aiogram.types import BotCommand
from redis.asyncio import Redis

from app.bot.handlers import admin, application, language, menu, start
from app.bot.middlewares.db import DbSessionMiddleware
from app.bot.middlewares.throttling import ThrottlingMiddleware
from app.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


async def set_bot_commands(bot: Bot) -> None:
    await bot.set_my_commands(
        [
            BotCommand(command="start", description="Botni ishga tushirish / Запустить бота"),
            BotCommand(command="menu", description="Asosiy menyu / Главное меню"),
            BotCommand(command="admin", description="Admin panel (faqat adminlar uchun)"),
        ]
    )


async def main() -> None:
    settings = get_settings()

    if settings.sentry_dsn:
        import sentry_sdk

        sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.environment, traces_sample_rate=0.1)

    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    storage = RedisStorage(redis)

    bot = Bot(token=settings.bot_token, default=DefaultBotProperties())
    dp = Dispatcher(storage=storage)

    db_middleware = DbSessionMiddleware()
    throttling_middleware = ThrottlingMiddleware(redis=redis, limit_per_minute=settings.rate_limit_per_minute)

    for observer in (dp.message, dp.callback_query):
        observer.outer_middleware(db_middleware)
        observer.outer_middleware(throttling_middleware)

    dp.include_router(start.router)
    dp.include_router(language.router)
    dp.include_router(menu.router)
    dp.include_router(application.router)
    dp.include_router(admin.router)

    await set_bot_commands(bot)

    logger.info("LAZANA HR bot ishga tushmoqda (environment=%s)...", settings.environment)
    try:
        await bot.delete_webhook(drop_pending_updates=True)
        await dp.start_polling(bot)
    finally:
        await bot.session.close()
        await redis.aclose()


if __name__ == "__main__":
    asyncio.run(main())
