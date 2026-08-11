from __future__ import annotations

import datetime as dt

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import (
    BufferedInputFile,
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
)
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot.filters import IsAdmin, can_configure, can_manage
from app.bot.render import send_or_edit
from app.bot.states import AdminStates
from app.db.models import (
    Admin,
    Application,
    ApplicationStatusHistory,
    BotText,
    Position,
    PositionCategory,
)
from app.services.export import applications_to_csv, export_filename

router = Router(name="admin")
router.message.filter(IsAdmin())
router.callback_query.filter(IsAdmin())

PAGE_SIZE = 5
NO_PERMISSION_TEXT = "Sizda bu amal uchun ruxsat yo'q."

STATUS_LABELS = {
    "submitted": "🆕 Yuborilgan",
    "reviewed": "👀 Ko'rib chiqilgan",
    "invited": "✅ Taklif qilingan",
    "rejected": "❌ Rad etilgan",
}
STATUS_FILTERS = ["all", "submitted", "reviewed", "invited", "rejected"]
NEXT_STATUS = {"submitted": ["reviewed"], "reviewed": ["invited", "rejected"]}

MENU_APPS = "📋 Arizalar"
MENU_STATS = "📊 Statistika"
MENU_EXPORT = "📤 Eksport (CSV)"
MENU_POSITIONS = "🏷 Lavozimlar"
MENU_TEXTS = "📝 Matnlar"
MENU_ADMINS = "👤 Xodimlar"
BTN_BACK = "⬅️ Orqaga"


def _reply_kb(rows: list[list[str]]) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(keyboard=[[KeyboardButton(text=x) for x in row] for row in rows], resize_keyboard=True)


def admin_menu_kb(admin: Admin) -> ReplyKeyboardMarkup:
    rows = [[MENU_APPS], [MENU_STATS]]
    if can_manage(admin):
        rows.append([MENU_EXPORT])
    if can_configure(admin):
        rows.append([MENU_POSITIONS])
        rows.append([MENU_TEXTS])
        rows.append([MENU_ADMINS])
    return _reply_kb(rows)


def back_row(callback_data: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="⬅️ Orqaga", callback_data=callback_data)]])


async def render_admin_menu(target: Message | CallbackQuery, admin: Admin) -> None:
    text = f"🛠 Admin panel\nRol: {admin.role}"
    kb = admin_menu_kb(admin)
    if isinstance(target, CallbackQuery):
        await target.message.answer(text, reply_markup=kb)
        await target.answer()
    else:
        await target.answer(text, reply_markup=kb)


@router.message(Command("admin"))
async def cmd_admin(message: Message, admin: Admin) -> None:
    await render_admin_menu(message, admin)


@router.callback_query(F.data == "adm:root")
async def cb_admin_root(callback: CallbackQuery, admin: Admin, state: FSMContext) -> None:
    await state.clear()
    await render_admin_menu(callback, admin)


# ---------------------------------------------------------------------------
# Arizalar ro'yxati va tafsiloti
# (Sahifalash va filtr tugmalari — bitta xabar ichida, shu sababli Inline)
# ---------------------------------------------------------------------------

async def render_apps_list(
    target: Message | CallbackQuery,
    session: AsyncSession,
    status_filter: str,
    page: int,
    category_code: str = "all",
) -> None:
    query = select(Application).order_by(Application.created_at.desc())
    if status_filter != "all":
        query = query.where(Application.status == status_filter)
    else:
        query = query.where(Application.status != "draft")

    if category_code != "all":
        query = (
            query.join(Position, Application.position_id == Position.id)
            .join(PositionCategory, Position.category_id == PositionCategory.id)
            .where(PositionCategory.code == category_code)
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = await session.scalar(count_query) or 0

    query = query.offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
    applications = list(await session.scalars(query))

    title_filter = STATUS_LABELS.get(status_filter, "Barchasi") if status_filter != "all" else "Barchasi"
    categories = await _load_categories(session)
    cat_label = next((c.name_uz for c in categories if c.code == category_code), "Barchasi")
    lines = [f"📋 Arizalar ({title_filter} · {cat_label}) — jami: {total}"]
    rows = []
    for app_ in applications:
        position = await session.get(Position, app_.position_id)
        label = f"#{app_.id} {app_.full_name or '-'} — {position.name_uz if position else '-'}"
        rows.append([InlineKeyboardButton(text=label, callback_data=f"adm:app:{app_.id}")])

    filter_row = [
        InlineKeyboardButton(
            text=("• " if s == status_filter else "") + STATUS_LABELS.get(s, "Barchasi"),
            callback_data=f"adm:apps:{s}:1:{category_code}",
        )
        for s in STATUS_FILTERS
    ]
    rows.append(filter_row[:3])
    rows.append(filter_row[3:])

    cat_row = [
        InlineKeyboardButton(
            text=("• " if category_code == "all" else "") + "Barchasi",
            callback_data=f"adm:apps:{status_filter}:1:all",
        )
    ]
    for c in categories:
        cat_row.append(
            InlineKeyboardButton(
                text=("• " if category_code == c.code else "") + c.code,
                callback_data=f"adm:apps:{status_filter}:1:{c.code}",
            )
        )
    rows.append(cat_row)

    nav = []
    if page > 1:
        nav.append(InlineKeyboardButton(text="⬅️", callback_data=f"adm:apps:{status_filter}:{page - 1}:{category_code}"))
    if page * PAGE_SIZE < total:
        nav.append(InlineKeyboardButton(text="➡️", callback_data=f"adm:apps:{status_filter}:{page + 1}:{category_code}"))
    if nav:
        rows.append(nav)

    rows.append([InlineKeyboardButton(text="🏠 Admin menyu", callback_data="adm:root")])

    await send_or_edit(target, "\n".join(lines), InlineKeyboardMarkup(inline_keyboard=rows))


@router.message(F.text == MENU_APPS)
async def msg_apps_list(message: Message, session: AsyncSession, admin: Admin) -> None:
    await render_apps_list(message, session, "all", 1)


@router.callback_query(F.data.startswith("adm:apps:"))
async def cb_apps_list(callback: CallbackQuery, session: AsyncSession, admin: Admin) -> None:
    parts = callback.data.split(":")
    _, _, status_filter, page_str = parts[:4]
    category_code = parts[4] if len(parts) > 4 else "all"
    await render_apps_list(callback, session, status_filter, int(page_str), category_code)


def format_application_detail(app_: Application, position: Position, category: PositionCategory) -> str:
    lines = [
        f"📄 Ariza #{app_.id}",
        f"Holat: {STATUS_LABELS.get(app_.status, app_.status)}",
        f"Yo'nalish/Lavozim: {category.name_uz} / {position.name_uz}",
        f"F.I.Sh.: {app_.full_name or '-'}",
        f"Telefon: {app_.phone or '-'}",
        f"Manzil: {app_.address or '-'}",
        f"Tug'ilgan sana: {app_.birth_date.strftime('%d.%m.%Y') if app_.birth_date else '-'}",
        f"Mehnat faoliyati: {app_.work_experience_text or '-'}",
    ]
    if app_.experience_years_range:
        lines.append(f"Ish staji: {app_.experience_years_range}")
    if app_.education_level:
        lines.append(f"Ma'lumoti: {app_.education_level}")
    if app_.education_institution:
        lines.append(f"Ta'lim muassasasi: {app_.education_institution}")
    if app_.languages:
        extra = f" ({app_.languages_other})" if app_.languages_other else ""
        lines.append(f"Tillar: {', '.join(app_.languages)}{extra}")
    if app_.expected_salary_range:
        lines.append(f"Kutilayotgan maosh: {app_.expected_salary_range}")
    if app_.computer_skills:
        lines.append(f"Kompyuter ko'nikmalari: {app_.computer_skills}")
    if app_.key_skills:
        lines.append(f"Asosiy ko'nikmalar: {app_.key_skills}")
    lines.append(f"Manba: {app_.source or '-'}")
    lines.append(f"Yuborilgan: {app_.submitted_at.strftime('%d.%m.%Y %H:%M') if app_.submitted_at else '-'}")
    return "\n".join(lines)


@router.callback_query(F.data.startswith("adm:app:"))
async def cb_app_detail(callback: CallbackQuery, session: AsyncSession, admin: Admin) -> None:
    app_id = int(callback.data.split(":")[2])
    application = await session.get(Application, app_id)
    if application is None:
        await callback.answer("Ariza topilmadi.", show_alert=True)
        return
    position = await session.get(Position, application.position_id)
    category = await session.get(PositionCategory, position.category_id)

    text = format_application_detail(application, position, category)

    rows = []
    if can_manage(admin):
        for target_status in NEXT_STATUS.get(application.status, []):
            rows.append(
                [
                    InlineKeyboardButton(
                        text=f"➡️ {STATUS_LABELS[target_status]}",
                        callback_data=f"adm:setstatus:{application.id}:{target_status}",
                    )
                ]
            )
    rows.append([InlineKeyboardButton(text="⬅️ Ro'yxatga qaytish", callback_data="adm:apps:all:1:all")])

    await send_or_edit(callback, text, InlineKeyboardMarkup(inline_keyboard=rows))


@router.callback_query(F.data.startswith("adm:setstatus:"))
async def cb_set_status_start(callback: CallbackQuery, state: FSMContext, admin: Admin) -> None:
    if not can_manage(admin):
        await callback.answer(NO_PERMISSION_TEXT, show_alert=True)
        return
    _, _, app_id_str, new_status = callback.data.split(":")
    await state.update_data(pending_app_id=int(app_id_str), pending_new_status=new_status)
    await state.set_state(AdminStates.entering_status_comment)

    kb = InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="➡️ Izohsiz o'tkazish", callback_data="adm:skipcomment")]]
    )
    await callback.message.answer(
        f"«{STATUS_LABELS[new_status]}» holatiga o'tkazish uchun izoh yozing (ixtiyoriy), yoki tugmani bosing:",
        reply_markup=kb,
    )
    await callback.answer()


async def apply_status_change(
    session: AsyncSession, admin: Admin, app_id: int, new_status: str, comment: str | None
) -> Application:
    application = await session.get(Application, app_id)
    old_status = application.status
    application.status = new_status
    session.add(
        ApplicationStatusHistory(
            application_id=application.id,
            old_status=old_status,
            new_status=new_status,
            changed_by=admin.id,
            comment=comment,
        )
    )
    await session.commit()
    return application


@router.callback_query(AdminStates.entering_status_comment, F.data == "adm:skipcomment")
async def cb_skip_comment(callback: CallbackQuery, state: FSMContext, session: AsyncSession, admin: Admin) -> None:
    data = await state.get_data()
    application = await apply_status_change(
        session, admin, data["pending_app_id"], data["pending_new_status"], comment=None
    )
    await state.clear()
    await callback.message.answer(f"✅ Ariza #{application.id} holati «{STATUS_LABELS[application.status]}»ga o'zgartirildi.")
    await callback.answer()


@router.message(AdminStates.entering_status_comment, F.text)
async def msg_status_comment(message: Message, state: FSMContext, session: AsyncSession, admin: Admin) -> None:
    data = await state.get_data()
    application = await apply_status_change(
        session, admin, data["pending_app_id"], data["pending_new_status"], comment=message.text.strip()[:500]
    )
    await state.clear()
    await message.answer(f"✅ Ariza #{application.id} holati «{STATUS_LABELS[application.status]}»ga o'zgartirildi.")


# ---------------------------------------------------------------------------
# Statistika
# ---------------------------------------------------------------------------

async def render_stats(target: Message | CallbackQuery, session: AsyncSession) -> None:
    total = await session.scalar(select(func.count()).select_from(Application).where(Application.status != "draft"))

    status_rows = await session.execute(
        select(Application.status, func.count()).where(Application.status != "draft").group_by(Application.status)
    )
    by_status = dict(status_rows.all())

    today = dt.datetime.now(dt.timezone.utc)
    week_ago = today - dt.timedelta(days=7)
    month_ago = today - dt.timedelta(days=30)

    week_count = await session.scalar(
        select(func.count()).select_from(Application).where(Application.submitted_at >= week_ago)
    )
    month_count = await session.scalar(
        select(func.count()).select_from(Application).where(Application.submitted_at >= month_ago)
    )

    cat_rows = await session.execute(
        select(PositionCategory.name_uz, func.count(Application.id))
        .join(Position, Position.category_id == PositionCategory.id)
        .join(Application, Application.position_id == Position.id)
        .where(Application.status != "draft")
        .group_by(PositionCategory.name_uz)
    )

    lines = [
        "📊 Statistika",
        f"Jami arizalar: {total or 0}",
        f"Oxirgi 7 kun: {week_count or 0}",
        f"Oxirgi 30 kun: {month_count or 0}",
        "",
        "Holat bo'yicha:",
    ]
    for status, count in by_status.items():
        lines.append(f"  {STATUS_LABELS.get(status, status)}: {count}")

    lines.append("")
    lines.append("Yo'nalish bo'yicha:")
    for name, count in cat_rows.all():
        lines.append(f"  {name}: {count}")

    await send_or_edit(target, "\n".join(lines), back_row("adm:root"))


@router.message(F.text == MENU_STATS)
async def msg_stats(message: Message, session: AsyncSession, admin: Admin) -> None:
    await render_stats(message, session)


# ---------------------------------------------------------------------------
# Eksport (CSV)
# ---------------------------------------------------------------------------

async def render_export_menu(target: Message | CallbackQuery) -> None:
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Oxirgi 7 kun", callback_data="adm:exportperiod:7")],
            [InlineKeyboardButton(text="Oxirgi 30 kun", callback_data="adm:exportperiod:30")],
            [InlineKeyboardButton(text="Oxirgi 90 kun", callback_data="adm:exportperiod:90")],
            [InlineKeyboardButton(text="Barchasi", callback_data="adm:exportperiod:all")],
            [InlineKeyboardButton(text="⬅️ Orqaga", callback_data="adm:root")],
        ]
    )
    await send_or_edit(target, "Qaysi davr uchun eksport qilinsin?", kb)


@router.message(F.text == MENU_EXPORT)
async def msg_export_menu(message: Message, admin: Admin) -> None:
    if not can_manage(admin):
        await message.answer(NO_PERMISSION_TEXT)
        return
    await render_export_menu(message)


@router.callback_query(F.data.startswith("adm:exportperiod:"))
async def cb_export_period(callback: CallbackQuery, session: AsyncSession, admin: Admin) -> None:
    if not can_manage(admin):
        await callback.answer(NO_PERMISSION_TEXT, show_alert=True)
        return
    period = callback.data.split(":")[2]

    query = (
        select(Application, PositionCategory.name_uz, Position.name_uz)
        .join(Position, Application.position_id == Position.id)
        .join(PositionCategory, Position.category_id == PositionCategory.id)
        .where(Application.status != "draft")
        .order_by(Application.submitted_at.desc())
    )
    if period != "all":
        cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=int(period))
        query = query.where(Application.submitted_at >= cutoff)

    rows = [(app_, cat_name, pos_name) for app_, cat_name, pos_name in (await session.execute(query)).all()]
    csv_text = applications_to_csv(rows)
    file = BufferedInputFile(csv_text.encode("utf-8-sig"), filename=export_filename())
    await callback.message.answer_document(file, caption=f"Eksport: {len(rows)} ta ariza")
    await callback.answer()


# ---------------------------------------------------------------------------
# Lavozimlarni boshqarish (faqat super_admin)
# Yo'nalish tanlash — oddiy navigatsiya (Reply). Lavozimlar ro'yxati — har biri
# bitta xabar ichida faol/nofaol almashtiriladi (Inline).
# ---------------------------------------------------------------------------

async def _load_categories(session: AsyncSession) -> list[PositionCategory]:
    return list(await session.scalars(select(PositionCategory).order_by(PositionCategory.sort_order)))


def _category_label(category: PositionCategory) -> str:
    return f"{category.code}) {category.name_uz}"


def positions_category_kb(categories: list[PositionCategory]) -> ReplyKeyboardMarkup:
    rows = [[_category_label(c)] for c in categories]
    rows.append([BTN_BACK])
    return _reply_kb(rows)


async def send_positions_category_picker(
    target: Message | CallbackQuery, state: FSMContext, session: AsyncSession
) -> None:
    categories = await _load_categories(session)
    await state.set_state(AdminStates.choosing_position_category)
    text = "Yo'nalishni tanlang:"
    kb = positions_category_kb(categories)
    if isinstance(target, CallbackQuery):
        await target.message.answer(text, reply_markup=kb)
        await target.answer()
    else:
        await target.answer(text, reply_markup=kb)


@router.message(F.text == MENU_POSITIONS)
async def msg_positions_menu(message: Message, state: FSMContext, session: AsyncSession, admin: Admin) -> None:
    if not can_configure(admin):
        await message.answer(NO_PERMISSION_TEXT)
        return
    await send_positions_category_picker(message, state, session)


@router.callback_query(F.data == "adm:positions")
async def cb_positions_categories(
    callback: CallbackQuery, state: FSMContext, session: AsyncSession, admin: Admin
) -> None:
    if not can_configure(admin):
        await callback.answer(NO_PERMISSION_TEXT, show_alert=True)
        return
    await send_positions_category_picker(callback, state, session)


@router.message(AdminStates.choosing_position_category, F.text)
async def msg_position_category_selected(
    message: Message, state: FSMContext, session: AsyncSession, admin: Admin
) -> None:
    text = (message.text or "").strip()
    if text == BTN_BACK:
        await state.clear()
        await render_admin_menu(message, admin)
        return

    categories = await _load_categories(session)
    category = next((c for c in categories if _category_label(c) == text), None)
    if category is None:
        await message.answer("Iltimos, ro'yxatdan tanlang.", reply_markup=positions_category_kb(categories))
        return

    await state.clear()
    await render_positions_list(message, session, category.code)


async def render_positions_list(target: Message | CallbackQuery, session: AsyncSession, code: str) -> None:
    category = await session.scalar(select(PositionCategory).where(PositionCategory.code == code))
    positions = list(
        await session.scalars(select(Position).where(Position.category_id == category.id).order_by(Position.sort_order))
    )

    rows = []
    for pos in positions:
        mark = "✅" if pos.is_active else "🚫"
        rows.append([InlineKeyboardButton(text=f"{mark} {pos.name_uz}", callback_data=f"adm:postoggle:{pos.id}:{code}")])
    rows.append([InlineKeyboardButton(text="➕ Yangi lavozim qo'shish", callback_data=f"adm:posadd:{code}")])
    rows.append([InlineKeyboardButton(text="⬅️ Orqaga", callback_data="adm:positions")])

    text = f"{category.name_uz} — lavozimlar (bosilsa faol/nofaol almashadi):"
    await send_or_edit(target, text, InlineKeyboardMarkup(inline_keyboard=rows))


@router.callback_query(F.data.startswith("adm:postoggle:"))
async def cb_position_toggle(callback: CallbackQuery, session: AsyncSession, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer(NO_PERMISSION_TEXT, show_alert=True)
        return
    _, _, pos_id_str, code = callback.data.split(":")
    position = await session.get(Position, int(pos_id_str))
    position.is_active = not position.is_active
    await session.commit()
    await render_positions_list(callback, session, code)


@router.callback_query(F.data.startswith("adm:posadd:"))
async def cb_position_add_start(callback: CallbackQuery, state: FSMContext, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer(NO_PERMISSION_TEXT, show_alert=True)
        return
    code = callback.data.split(":")[2]
    await state.update_data(new_position_category_code=code)
    await state.set_state(AdminStates.adding_position_name_uz)
    await callback.message.answer("Yangi lavozim nomini (o'zbek tilida) kiriting:")
    await callback.answer()


@router.message(AdminStates.adding_position_name_uz, F.text)
async def msg_position_name_uz(message: Message, state: FSMContext) -> None:
    await state.update_data(new_position_name_uz=message.text.strip()[:150])
    await state.set_state(AdminStates.adding_position_name_ru)
    await message.answer("Endi rus tilidagi nomini kiriting (yoki \"-\" deb yuboring):")


@router.message(AdminStates.adding_position_name_ru, F.text)
async def msg_position_name_ru(message: Message, state: FSMContext, session: AsyncSession) -> None:
    data = await state.get_data()
    code = data["new_position_category_code"]
    category = await session.scalar(select(PositionCategory).where(PositionCategory.code == code))
    max_sort = await session.scalar(
        select(func.coalesce(func.max(Position.sort_order), 0)).where(Position.category_id == category.id)
    )
    name_ru = message.text.strip()
    position = Position(
        category_id=category.id,
        name_uz=data["new_position_name_uz"],
        name_ru=None if name_ru == "-" else name_ru[:150],
        sort_order=(max_sort or 0) + 1,
    )
    session.add(position)
    await session.commit()
    await state.clear()
    await message.answer(f"✅ Lavozim qo'shildi: {position.name_uz}")


# ---------------------------------------------------------------------------
# Matnlarni boshqarish (faqat super_admin)
# Matn kaliti tanlash — oddiy navigatsiya (Reply). Tahrirlash ekrani — bitta
# xabarga bog'liq harakatlar (Inline).
# ---------------------------------------------------------------------------

TEXT_LABELS = {
    "welcome_message": "Salomlashish xabari (/start)",
    "about_us": "Biz haqimizda",
    "thanks_message": "Rahmat xabari",
}


def texts_list_kb() -> ReplyKeyboardMarkup:
    rows = [[label] for label in TEXT_LABELS.values()]
    rows.append([BTN_BACK])
    return _reply_kb(rows)


async def send_texts_list(target: Message | CallbackQuery, state: FSMContext) -> None:
    await state.set_state(AdminStates.choosing_text_key)
    text = "Tahrirlanadigan matnlar:"
    kb = texts_list_kb()
    if isinstance(target, CallbackQuery):
        await target.message.answer(text, reply_markup=kb)
        await target.answer()
    else:
        await target.answer(text, reply_markup=kb)


@router.message(F.text == MENU_TEXTS)
async def msg_texts_menu(message: Message, state: FSMContext, admin: Admin) -> None:
    if not can_configure(admin):
        await message.answer(NO_PERMISSION_TEXT)
        return
    await send_texts_list(message, state)


@router.callback_query(F.data == "adm:texts")
async def cb_texts_list(callback: CallbackQuery, state: FSMContext, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer(NO_PERMISSION_TEXT, show_alert=True)
        return
    await send_texts_list(callback, state)


@router.message(AdminStates.choosing_text_key, F.text)
async def msg_text_key_selected(message: Message, state: FSMContext, session: AsyncSession, admin: Admin) -> None:
    text = (message.text or "").strip()
    if text == BTN_BACK:
        await state.clear()
        await render_admin_menu(message, admin)
        return

    key = next((k for k, label in TEXT_LABELS.items() if label == text), None)
    if key is None:
        await message.answer("Iltimos, ro'yxatdan tanlang.", reply_markup=texts_list_kb())
        return

    await state.clear()
    await render_text_detail(message, session, key)


async def render_text_detail(target: Message | CallbackQuery, session: AsyncSession, key: str) -> None:
    row = await session.scalar(select(BotText).where(BotText.key == key))
    text = (
        f"🔑 {TEXT_LABELS.get(key, key)}\n\n"
        f"🇺🇿 UZ:\n{row.text_uz if row else '(bo‘sh)'}\n\n"
        f"🇷🇺 RU:\n{row.text_ru if row else '(bo‘sh)'}"
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="✏️ UZ tahrirlash", callback_data=f"adm:textedit:{key}:uz")],
            [InlineKeyboardButton(text="✏️ RU tahrirlash", callback_data=f"adm:textedit:{key}:ru")],
            [InlineKeyboardButton(text="⬅️ Orqaga", callback_data="adm:texts")],
        ]
    )
    await send_or_edit(target, text, kb)


@router.callback_query(F.data.startswith("adm:textedit:"))
async def cb_text_edit_start(callback: CallbackQuery, state: FSMContext, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer(NO_PERMISSION_TEXT, show_alert=True)
        return
    _, _, key, lang = callback.data.split(":")
    await state.update_data(editing_text_key=key)
    await state.set_state(AdminStates.editing_text_uz if lang == "uz" else AdminStates.editing_text_ru)
    await callback.message.answer(f"«{TEXT_LABELS.get(key, key)}» uchun yangi {lang.upper()} matnni yuboring:")
    await callback.answer()


async def save_bot_text(session: AsyncSession, key: str, lang: str, value: str) -> None:
    row = await session.scalar(select(BotText).where(BotText.key == key))
    if row is None:
        row = BotText(key=key, text_uz=value if lang == "uz" else "-", text_ru=value if lang == "ru" else "-")
        session.add(row)
    else:
        if lang == "uz":
            row.text_uz = value
        else:
            row.text_ru = value
    await session.commit()


@router.message(AdminStates.editing_text_uz, F.text)
async def msg_text_edit_uz(message: Message, state: FSMContext, session: AsyncSession) -> None:
    data = await state.get_data()
    await save_bot_text(session, data["editing_text_key"], "uz", message.text.strip()[:4000])
    await state.clear()
    await message.answer("✅ Matn (UZ) yangilandi.")


@router.message(AdminStates.editing_text_ru, F.text)
async def msg_text_edit_ru(message: Message, state: FSMContext, session: AsyncSession) -> None:
    data = await state.get_data()
    await save_bot_text(session, data["editing_text_key"], "ru", message.text.strip()[:4000])
    await state.clear()
    await message.answer("✅ Matn (RU) yangilandi.")


# ---------------------------------------------------------------------------
# Adminlarni boshqarish (faqat super_admin)
# Har bir qator bitta xabar ichida faol/nofaol almashtiriladi (Inline).
# ---------------------------------------------------------------------------

async def render_admins_list(target: Message | CallbackQuery, session: AsyncSession) -> None:
    admins = list(await session.scalars(select(Admin).order_by(Admin.id)))
    rows = []
    for a in admins:
        mark = "✅" if a.is_active else "🚫"
        phone_part = f" — {a.phone}" if a.phone else ""
        rows.append(
            [
                InlineKeyboardButton(
                    text=f"{mark} {a.full_name or a.telegram_id}{phone_part} ({a.role})",
                    callback_data=f"adm:admintoggle:{a.id}",
                )
            ]
        )
    rows.append([InlineKeyboardButton(text="➕ Xodim qo'shish", callback_data="adm:adminadd")])
    rows.append([InlineKeyboardButton(text="⬅️ Orqaga", callback_data="adm:root")])
    await send_or_edit(target, "Xodimlar ro'yxati (bosilsa faol/nofaol almashadi):", InlineKeyboardMarkup(inline_keyboard=rows))


@router.message(F.text == MENU_ADMINS)
async def msg_admins_list(message: Message, session: AsyncSession, admin: Admin) -> None:
    if not can_configure(admin):
        await message.answer(NO_PERMISSION_TEXT)
        return
    await render_admins_list(message, session)


@router.callback_query(F.data.startswith("adm:admintoggle:"))
async def cb_admin_toggle(callback: CallbackQuery, session: AsyncSession, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer(NO_PERMISSION_TEXT, show_alert=True)
        return
    target_id = int(callback.data.split(":")[2])
    target = await session.get(Admin, target_id)
    if target.id == admin.id:
        await callback.answer("O'zingizni o'chira olmaysiz.", show_alert=True)
        return
    if admin.role == "admin" and target.role == "super_admin":
        await callback.answer("Superadmin hisobini o'zgartira olmaysiz.", show_alert=True)
        return
    target.is_active = not target.is_active
    await session.commit()
    await render_admins_list(callback, session)


ADMIN_ROLE_OPTIONS = [("super_admin", "Super Admin"), ("admin", "Admin"), ("hr", "HR")]


def _assignable_role_options(admin: Admin) -> list[tuple[str, str]]:
    if admin.role == "super_admin":
        return ADMIN_ROLE_OPTIONS
    return [o for o in ADMIN_ROLE_OPTIONS if o[0] != "super_admin"]


def admin_role_kb(admin: Admin) -> ReplyKeyboardMarkup:
    rows = [[label] for _, label in _assignable_role_options(admin)]
    rows.append([BTN_BACK])
    return _reply_kb(rows)


@router.callback_query(F.data == "adm:adminadd")
async def cb_admin_add_start(callback: CallbackQuery, state: FSMContext, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer(NO_PERMISSION_TEXT, show_alert=True)
        return
    await state.set_state(AdminStates.adding_admin_id)
    await callback.message.answer("Yangi xodim uchun Telegram ID raqamini yuboring:")
    await callback.answer()


@router.message(AdminStates.adding_admin_id, F.text)
async def msg_admin_add_id(message: Message, state: FSMContext, session: AsyncSession) -> None:
    raw = message.text.strip()
    if not raw.isdigit():
        await message.answer("❗ Telegram ID faqat raqamlardan iborat bo'lishi kerak. Qayta yuboring:")
        return
    telegram_id = int(raw)
    existing = await session.scalar(select(Admin).where(Admin.telegram_id == telegram_id))
    if existing:
        existing.is_active = True
        await session.commit()
        await state.clear()
        await message.answer("✅ Mavjud xodim qayta faollashtirildi.")
        return
    await state.update_data(new_admin_telegram_id=telegram_id)
    await state.set_state(AdminStates.adding_admin_full_name)
    await message.answer("Xodimning F.I.Sh.ini kiriting:")


@router.message(AdminStates.adding_admin_full_name, F.text)
async def msg_admin_add_full_name(message: Message, state: FSMContext) -> None:
    await state.update_data(new_admin_full_name=message.text.strip()[:255])
    await state.set_state(AdminStates.adding_admin_phone)
    await message.answer("Telefon raqamini kiriting (yoki \"-\" deb yuboring):")


@router.message(AdminStates.adding_admin_phone, F.text)
async def msg_admin_add_phone(message: Message, state: FSMContext, admin: Admin) -> None:
    phone = message.text.strip()
    await state.update_data(new_admin_phone=None if phone == "-" else phone[:20])
    await state.set_state(AdminStates.adding_admin_role)
    await message.answer("Rolni tanlang:", reply_markup=admin_role_kb(admin))


@router.message(AdminStates.adding_admin_role, F.text)
async def msg_admin_add_role(message: Message, state: FSMContext, session: AsyncSession, admin: Admin) -> None:
    text = (message.text or "").strip()
    if text == BTN_BACK:
        await state.clear()
        await render_admin_menu(message, admin)
        return

    role = next((code for code, label in _assignable_role_options(admin) if label == text), None)
    if role is None:
        await message.answer("Iltimos, ro'yxatdan tanlang.", reply_markup=admin_role_kb(admin))
        return

    data = await state.get_data()
    new_admin = Admin(
        telegram_id=data["new_admin_telegram_id"],
        full_name=data.get("new_admin_full_name"),
        phone=data.get("new_admin_phone"),
        role=role,
    )
    session.add(new_admin)
    await session.commit()
    await state.clear()
    await message.answer(
        f"✅ Yangi xodim qo'shildi: {new_admin.full_name or new_admin.telegram_id} (rol: {role}).",
        reply_markup=admin_menu_kb(admin),
    )
