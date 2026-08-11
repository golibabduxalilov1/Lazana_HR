from __future__ import annotations

import datetime as dt
import logging
import math

from aiogram import Bot, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot.handlers.menu import get_bot_text, show_main_menu
from app.bot.keyboards import (
    category_keyboard,
    category_label,
    choice_keyboard,
    confirm_keyboard,
    main_menu_keyboard,
    multiselect_keyboard,
    phone_request_keyboard,
    position_label,
    positions_keyboard,
    remove_reply_keyboard,
    text_step_keyboard,
)
from app.bot.states import ApplicationStates
from app.bot.steps import STEP_KEY_TO_CONFIRM_LABEL, Step, find_step, next_step, option_label
from app.bot.texts import t
from app.bot.validators import validate_birth_date, validate_phone
from app.config import get_settings
from app.db.models import Application, ApplicationStatusHistory, Position, PositionCategory, User
from app.services.notifications import notify_hr

logger = logging.getLogger(__name__)
router = Router(name="application")


# ---------------------------------------------------------------------------
# Yordamchi funksiyalar
# ---------------------------------------------------------------------------

async def load_active_categories(session: AsyncSession) -> list[PositionCategory]:
    result = await session.scalars(
        select(PositionCategory).where(PositionCategory.is_active.is_(True)).order_by(PositionCategory.sort_order)
    )
    return list(result)


async def load_active_positions(session: AsyncSession, category_id: int) -> list[Position]:
    result = await session.scalars(
        select(Position)
        .where(Position.category_id == category_id, Position.is_active.is_(True))
        .order_by(Position.sort_order)
    )
    return list(result)


async def ask_step(msg_target: Message, state: FSMContext, lang: str, step: Step, answers: dict) -> None:
    prompt = t(lang, step.prompt_key)

    if step.kind == "phone":
        await msg_target.answer(prompt, reply_markup=phone_request_keyboard(lang))
        await state.update_data(current_step_key=step.key)
    elif step.kind in ("text", "date"):
        await msg_target.answer(prompt, reply_markup=text_step_keyboard(lang))
        await state.update_data(current_step_key=step.key)
    elif step.kind == "choice":
        await msg_target.answer(prompt, reply_markup=choice_keyboard(lang, step.options or []))
        await state.update_data(current_step_key=step.key)
    elif step.kind == "multiselect":
        selected = set(answers.get(step.key) or [])
        await msg_target.answer(
            prompt, reply_markup=multiselect_keyboard(lang, step.options or [], selected, prefix=f"ans:{step.key}")
        )
        await state.update_data(current_step_key=step.key, ms_selected=list(selected))


async def advance(msg_target: Message, state: FSMContext, session: AsyncSession, db_user: User) -> None:
    lang = db_user.language
    data = await state.get_data()
    question_set = data["question_set"]
    answers = data.get("answers", {})
    order = data.get("order", [])
    step = next_step(question_set, answers, order)
    if step is None:
        await show_confirmation(msg_target, state, session, db_user)
    else:
        await ask_step(msg_target, state, lang, step, answers)


def format_answer(lang: str, step: Step, value, answers: dict) -> str:
    if step.kind == "date":
        return dt.date.fromisoformat(value).strftime("%d.%m.%Y")
    if step.kind == "choice":
        label_key = option_label(step.options or [], value)
        return t(lang, label_key) if label_key else str(value)
    if step.kind == "multiselect":
        labels = []
        for v in value or []:
            if v == "other":
                other_text = answers.get("languages_other")
                labels.append(f"{t(lang, 'lang_other')} ({other_text})" if other_text else t(lang, "lang_other"))
            else:
                label_key = option_label(step.options or [], v)
                labels.append(t(lang, label_key) if label_key else v)
        return ", ".join(labels)
    return str(value)


async def show_confirmation(msg_target: Message, state: FSMContext, session: AsyncSession, db_user: User) -> None:
    lang = db_user.language
    data = await state.get_data()
    question_set = data["question_set"]
    answers = data.get("answers", {})
    order = data.get("order", [])

    category = await session.get(PositionCategory, data["category_id"])
    position = await session.get(Position, data["position_id"])

    lines = [t(lang, "confirm_title"), ""]
    lines.append(f"{t(lang, 'confirm_category')}: {category_label(lang, category)}")
    lines.append(f"{t(lang, 'confirm_position')}: {position_label(lang, position)}")

    for key in order:
        if key == "languages_other":
            continue
        step = find_step(question_set, key)
        label_key = STEP_KEY_TO_CONFIRM_LABEL.get(key)
        if step is None or label_key is None:
            continue
        lines.append(f"{t(lang, label_key)}: {format_answer(lang, step, answers.get(key), answers)}")

    await state.set_state(ApplicationStates.confirming)
    await msg_target.answer("\n".join(lines), reply_markup=confirm_keyboard(lang))


async def go_back_one_step(
    event: Message | CallbackQuery, state: FSMContext, session: AsyncSession, db_user: User
) -> None:
    """Oxirgi javob berilgan savolga qaytadi (filling_step va confirming holatlaridan chaqiriladi)."""
    lang = db_user.language
    data = await state.get_data()
    order = data.get("order", [])
    answers = data.get("answers", {})
    question_set = data["question_set"]

    target = event.message if isinstance(event, CallbackQuery) else event

    if not order:
        category = await session.get(PositionCategory, data["category_id"])
        positions = await load_active_positions(session, category.id)
        await state.set_state(ApplicationStates.choosing_position)
        await target.answer(t(lang, "position_prompt"), reply_markup=positions_keyboard(lang, positions))
        if isinstance(event, CallbackQuery):
            await event.answer()
        return

    popped_key = order.pop()
    answers.pop(popped_key, None)
    await state.update_data(order=order, answers=answers)
    await state.set_state(ApplicationStates.filling_step)
    if isinstance(event, CallbackQuery):
        await event.answer()
    step = find_step(question_set, popped_key)
    await ask_step(target, state, lang, step, answers)


async def cancel_application(event: Message | CallbackQuery, state: FSMContext, db_user: User) -> None:
    await state.clear()
    lang = db_user.language
    text = t(lang, "application_cancelled")
    kb = main_menu_keyboard(lang)
    if isinstance(event, CallbackQuery):
        await event.message.answer(text, reply_markup=kb)
        await event.answer()
    else:
        await event.answer(text, reply_markup=kb)


# ---------------------------------------------------------------------------
# Kirish nuqtasi: "Hujjat topshirish"
# ---------------------------------------------------------------------------

@router.message(F.text.in_({t(lang, "menu_apply") for lang in ("uz", "ru")}))
async def msg_menu_apply(message: Message, state: FSMContext, session: AsyncSession, db_user: User) -> None:
    lang = db_user.language
    settings = get_settings()

    if settings.reapply_cooldown_hours > 0:
        threshold = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=settings.reapply_cooldown_hours)
        recent = await session.scalar(
            select(Application)
            .where(
                Application.user_id == db_user.id,
                Application.status != "draft",
                Application.submitted_at.is_not(None),
                Application.submitted_at >= threshold,
            )
            .order_by(Application.submitted_at.desc())
        )
        if recent is not None:
            elapsed_hours = (dt.datetime.now(dt.timezone.utc) - recent.submitted_at).total_seconds() / 3600
            remaining = max(1, math.ceil(settings.reapply_cooldown_hours - elapsed_hours))
            await message.answer(t(lang, "cooldown_active", hours=remaining))
            return

    categories = await load_active_categories(session)
    await state.set_state(ApplicationStates.choosing_category)
    await state.update_data(answers={}, order=[])
    await message.answer(t(lang, "category_prompt"), reply_markup=category_keyboard(lang, categories))


@router.message(ApplicationStates.choosing_category, F.text)
async def msg_category_selected(
    message: Message, state: FSMContext, session: AsyncSession, db_user: User
) -> None:
    lang = db_user.language
    text = (message.text or "").strip()

    if text in (t(lang, "btn_back"), t(lang, "btn_cancel")):
        await state.clear()
        await show_main_menu(message, lang)
        return

    categories = await load_active_categories(session)
    category = next((c for c in categories if category_label(lang, c) == text), None)
    if category is None:
        await message.answer(t(lang, "err_generic_choice"), reply_markup=category_keyboard(lang, categories))
        return

    positions = await load_active_positions(session, category.id)
    if not positions:
        await state.clear()
        await message.answer(t(lang, "no_positions"), reply_markup=main_menu_keyboard(lang))
        return

    await state.update_data(category_code=category.code, category_id=category.id, question_set=category.question_set)
    await state.set_state(ApplicationStates.choosing_position)
    await message.answer(t(lang, "position_prompt"), reply_markup=positions_keyboard(lang, positions))


# ---------------------------------------------------------------------------
# Lavozim tanlash
# ---------------------------------------------------------------------------

@router.message(ApplicationStates.choosing_position, F.text)
async def msg_position_selected(
    message: Message, state: FSMContext, session: AsyncSession, db_user: User
) -> None:
    lang = db_user.language
    text = (message.text or "").strip()

    if text == t(lang, "btn_cancel"):
        await cancel_application(message, state, db_user)
        return
    if text == t(lang, "btn_back"):
        categories = await load_active_categories(session)
        await state.set_state(ApplicationStates.choosing_category)
        await message.answer(t(lang, "category_prompt"), reply_markup=category_keyboard(lang, categories))
        return

    data = await state.get_data()
    positions = await load_active_positions(session, data.get("category_id"))
    position = next((p for p in positions if position_label(lang, p) == text), None)
    if position is None:
        await message.answer(t(lang, "err_generic_choice"), reply_markup=positions_keyboard(lang, positions))
        return

    await state.update_data(position_id=position.id, answers={}, order=[])
    await state.set_state(ApplicationStates.filling_step)

    step = next_step(data["question_set"], {}, [])
    await ask_step(message, state, lang, step, {})


# ---------------------------------------------------------------------------
# Savol-javob (filling_step)
# ---------------------------------------------------------------------------

@router.callback_query(ApplicationStates.filling_step, F.data == "nav:cancel")
async def cb_fill_cancel(callback: CallbackQuery, state: FSMContext, db_user: User) -> None:
    await cancel_application(callback, state, db_user)


@router.callback_query(ApplicationStates.filling_step, F.data == "nav:back")
async def cb_fill_back(callback: CallbackQuery, state: FSMContext, session: AsyncSession, db_user: User) -> None:
    await go_back_one_step(callback, state, session, db_user)


@router.callback_query(ApplicationStates.filling_step, F.data.startswith("ans:"))
async def cb_multiselect_toggle(callback: CallbackQuery, state: FSMContext, session: AsyncSession, db_user: User) -> None:
    """Faqat ko'p tanlovli (multiselect) savollar uchun — bitta xabar ichida ✅ belgilanadi."""
    lang = db_user.language
    _, step_key, value = callback.data.split(":", 2)
    data = await state.get_data()
    question_set = data["question_set"]
    step = find_step(question_set, step_key)

    if step is None or step.kind != "multiselect" or data.get("current_step_key") != step_key:
        await callback.answer()
        return

    answers = data.get("answers", {})
    order = data.get("order", [])
    selected = set(data.get("ms_selected") or [])

    if value == "done":
        if not selected:
            await callback.answer(t(lang, "err_languages_empty"), show_alert=True)
            return
        answers[step.key] = sorted(selected)
        order.append(step.key)
        await state.update_data(answers=answers, order=order, ms_selected=[])
        await callback.answer()
        await advance(callback.message, state, session, db_user)
        return

    valid_values = {v for v, _ in (step.options or [])}
    if value not in valid_values:
        await callback.answer()
        return
    if value in selected:
        selected.discard(value)
    else:
        selected.add(value)
    await state.update_data(ms_selected=list(selected))
    await callback.message.edit_reply_markup(
        reply_markup=multiselect_keyboard(lang, step.options or [], selected, prefix=f"ans:{step.key}")
    )
    await callback.answer()


@router.message(ApplicationStates.filling_step, F.contact)
async def msg_answer_contact(message: Message, state: FSMContext, session: AsyncSession, db_user: User) -> None:
    lang = db_user.language
    data = await state.get_data()
    step = find_step(data["question_set"], data.get("current_step_key") or "")
    if step is None or step.kind != "phone":
        return

    raw_phone = message.contact.phone_number
    if not raw_phone.startswith("+"):
        raw_phone = "+" + raw_phone
    result = validate_phone(raw_phone)
    if not result.ok:
        await message.answer(t(lang, "err_phone"), reply_markup=phone_request_keyboard(lang))
        return

    answers = data.get("answers", {})
    order = data.get("order", [])
    answers[step.key] = result.value
    order.append(step.key)
    await state.update_data(answers=answers, order=order)
    await message.answer(t(lang, "confirm_phone") + " ✅", reply_markup=remove_reply_keyboard())
    await advance(message, state, session, db_user)


@router.message(ApplicationStates.filling_step, F.text, ~F.text.startswith("/"))
async def msg_answer_text(message: Message, state: FSMContext, session: AsyncSession, db_user: User) -> None:
    lang = db_user.language
    text = (message.text or "").strip()

    if text == t(lang, "btn_cancel"):
        await cancel_application(message, state, db_user)
        return
    if text == t(lang, "btn_back"):
        await go_back_one_step(message, state, session, db_user)
        return

    settings = get_settings()
    data = await state.get_data()
    step_key = data.get("current_step_key")
    step = find_step(data["question_set"], step_key) if step_key else None

    if step is None or step.kind not in ("text", "phone", "date", "choice"):
        await message.answer(t(lang, "unexpected_input"))
        return

    if step.kind == "choice":
        value = next((v for v, label_key in (step.options or []) if t(lang, label_key) == text), None)
        if value is None:
            await message.answer(t(lang, "err_generic_choice"), reply_markup=choice_keyboard(lang, step.options or []))
            return
        answers = data.get("answers", {})
        order = data.get("order", [])
        answers[step.key] = value
        order.append(step.key)
        await state.update_data(answers=answers, order=order)
        await advance(message, state, session, db_user)
        return

    raw = message.text or ""
    if step.kind == "phone":
        result = validate_phone(raw)
    elif step.kind == "date":
        result = validate_birth_date(raw, settings.min_age_years, settings.max_age_years)
    else:
        result = step.validator(raw)

    if not result.ok:
        kb = phone_request_keyboard(lang) if step.kind == "phone" else text_step_keyboard(lang)
        await message.answer(t(lang, result.error_key, **result.error_kwargs), reply_markup=kb)
        return

    answers = data.get("answers", {})
    order = data.get("order", [])
    value = result.value.isoformat() if step.kind == "date" else result.value
    answers[step.key] = value
    order.append(step.key)
    await state.update_data(answers=answers, order=order)

    if step.kind == "phone":
        await message.answer(t(lang, "confirm_phone") + " ✅", reply_markup=remove_reply_keyboard())

    await advance(message, state, session, db_user)


# ---------------------------------------------------------------------------
# Yakuniy tasdiqlash
# ---------------------------------------------------------------------------

@router.callback_query(ApplicationStates.confirming, F.data == "confirm:cancel")
async def cb_confirm_cancel(callback: CallbackQuery, state: FSMContext, db_user: User) -> None:
    await cancel_application(callback, state, db_user)


@router.callback_query(ApplicationStates.confirming, F.data == "confirm:back")
async def cb_confirm_back(callback: CallbackQuery, state: FSMContext, session: AsyncSession, db_user: User) -> None:
    await go_back_one_step(callback, state, session, db_user)


@router.callback_query(ApplicationStates.confirming, F.data == "confirm:submit")
async def cb_confirm_submit(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession, db_user: User, bot: Bot
) -> None:
    lang = db_user.language
    data = await state.get_data()
    answers = data.get("answers", {})

    position = await session.get(Position, data["position_id"])
    category = await session.get(PositionCategory, data["category_id"])
    now = dt.datetime.now(dt.timezone.utc)

    application = Application(
        user_id=db_user.id,
        position_id=position.id,
        status="submitted",
        full_name=answers.get("full_name"),
        phone=answers.get("phone"),
        address=answers.get("address"),
        birth_date=dt.date.fromisoformat(answers["birth_date"]) if answers.get("birth_date") else None,
        work_experience_text=answers.get("work_experience_text"),
        experience_years_range=answers.get("experience_years_range"),
        education_level=answers.get("education_level"),
        education_institution=answers.get("education_institution"),
        languages=answers.get("languages"),
        languages_other=answers.get("languages_other"),
        expected_salary_range=answers.get("expected_salary_range"),
        computer_skills=answers.get("computer_skills"),
        key_skills=answers.get("key_skills"),
        source=db_user.source,
        submitted_at=now,
    )
    session.add(application)
    await session.flush()
    session.add(ApplicationStatusHistory(application_id=application.id, old_status=None, new_status="submitted"))
    await session.commit()
    await state.clear()

    thanks_text = await get_bot_text(session, "thanks_message", lang, fallback_key="application_saved_thanks_fallback")
    await callback.message.answer(thanks_text, reply_markup=main_menu_keyboard(lang))
    await callback.answer()

    await notify_hr(bot, session, application, position, category)
    logger.info("Yangi ariza qabul qilindi: application_id=%s user_id=%s", application.id, db_user.id)
