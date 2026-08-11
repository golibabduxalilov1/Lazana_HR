from __future__ import annotations

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot.handlers.menu import show_main_menu
from app.bot.keyboards import language_keyboard
from app.bot.render import send_or_edit
from app.bot.states import LanguageStates
from app.bot.texts import t
from app.db.models import User

router = Router(name="language")


@router.callback_query(F.data == "menu:lang")
async def cb_menu_change_lang(callback: CallbackQuery, state: FSMContext, db_user: User) -> None:
    await state.set_state(LanguageStates.choosing)
    await send_or_edit(callback, t(db_user.language, "choose_language"), language_keyboard())


@router.callback_query(LanguageStates.choosing, F.data.startswith("lang:"))
async def cb_language_selected(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession, db_user: User
) -> None:
    lang = callback.data.split(":", 1)[1]
    if lang not in ("uz", "ru"):
        lang = "uz"
    db_user.language = lang
    await session.commit()
    await state.clear()
    await show_main_menu(callback, lang)
