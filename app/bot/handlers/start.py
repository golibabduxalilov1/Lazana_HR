from __future__ import annotations

from aiogram import Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot.handlers.menu import get_bot_text, show_main_menu
from app.bot.keyboards import language_keyboard
from app.bot.states import LanguageStates
from app.db.models import User

router = Router(name="start")


@router.message(CommandStart())
async def cmd_start(
    message: Message,
    command: CommandObject,
    state: FSMContext,
    session: AsyncSession,
    db_user: User,
    is_new_user: bool,
) -> None:
    await state.clear()

    if db_user.source is None:
        db_user.source = command.args or "direct"
        await session.commit()

    if is_new_user:
        welcome_uz = await get_bot_text(session, "welcome_message", "uz", fallback_key="welcome_message")
        welcome_ru = await get_bot_text(session, "welcome_message", "ru", fallback_key="welcome_message")
        text = f"{welcome_uz}\n\n{welcome_ru}"
        await state.set_state(LanguageStates.choosing)
        await message.answer(text, reply_markup=language_keyboard())
    else:
        await show_main_menu(message, db_user.language)
