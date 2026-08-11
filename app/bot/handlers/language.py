from __future__ import annotations

from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot.handlers.menu import show_main_menu
from app.bot.keyboards import language_keyboard
from app.bot.states import LanguageStates
from app.bot.texts import t
from app.db.models import User

router = Router(name="language")

LANG_BY_LABEL = {
    t("uz", "btn_lang_uz"): "uz",
    t("uz", "btn_lang_ru"): "ru",
}


@router.message(F.text.in_({t(lang, "menu_change_lang") for lang in ("uz", "ru")}))
async def msg_menu_change_lang(message: Message, state: FSMContext, db_user: User) -> None:
    await state.set_state(LanguageStates.choosing)
    await message.answer(t(db_user.language, "choose_language"), reply_markup=language_keyboard())


@router.message(LanguageStates.choosing, F.text.in_(LANG_BY_LABEL))
async def msg_language_selected(
    message: Message, state: FSMContext, session: AsyncSession, db_user: User
) -> None:
    lang = LANG_BY_LABEL[message.text]
    db_user.language = lang
    await session.commit()
    await state.clear()
    await show_main_menu(message, lang)
