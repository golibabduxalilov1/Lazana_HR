from __future__ import annotations

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot.keyboards import back_to_menu_keyboard, main_menu_keyboard
from app.bot.render import send_or_edit
from app.bot.texts import t
from app.db.models import BotText, User

router = Router(name="menu")


async def get_bot_text(session: AsyncSession, key: str, lang: str, fallback_key: str | None = None) -> str:
    row = await session.scalar(select(BotText).where(BotText.key == key))
    if row is None:
        return t(lang, fallback_key or key)
    return row.text_uz if lang == "uz" else row.text_ru


async def show_main_menu(event: Message | CallbackQuery, lang: str) -> None:
    await send_or_edit(event, t(lang, "main_menu_title"), main_menu_keyboard(lang))


@router.callback_query(F.data == "menu:root")
async def cb_menu_root(callback: CallbackQuery, state: FSMContext, db_user: User) -> None:
    await state.clear()
    await show_main_menu(callback, db_user.language)


@router.callback_query(F.data == "menu:about")
async def cb_menu_about(callback: CallbackQuery, session: AsyncSession, db_user: User) -> None:
    lang = db_user.language
    text = await get_bot_text(session, "about_us", lang)
    await send_or_edit(callback, text, back_to_menu_keyboard(lang))


@router.message(Command("menu"))
async def cmd_menu(message: Message, state: FSMContext, db_user: User) -> None:
    await state.clear()
    await show_main_menu(message, db_user.language)
