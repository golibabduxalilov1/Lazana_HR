from __future__ import annotations

import datetime as dt

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import BufferedInputFile, CallbackQuery, Message
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot.filters import IsAdmin, can_configure, can_manage
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

STATUS_LABELS = {
    "submitted": "🆕 Yuborilgan",
    "reviewed": "👀 Ko'rib chiqilgan",
    "invited": "✅ Taklif qilingan",
    "rejected": "❌ Rad etilgan",
}
STATUS_FILTERS = ["all", "submitted", "reviewed", "invited", "rejected"]
NEXT_STATUS = {"submitted": ["reviewed"], "reviewed": ["invited", "rejected"]}


def admin_menu_kb(admin: Admin):
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

    rows = [
        [InlineKeyboardButton(text="📋 Arizalar", callback_data="adm:apps:all:1")],
        [InlineKeyboardButton(text="📊 Statistika", callback_data="adm:stats")],
    ]
    if can_manage(admin):
        rows.append([InlineKeyboardButton(text="📤 Eksport (CSV)", callback_data="adm:export")])
    if can_configure(admin):
        rows.append([InlineKeyboardButton(text="🏷 Lavozimlar", callback_data="adm:positions")])
        rows.append([InlineKeyboardButton(text="📝 Matnlar", callback_data="adm:texts")])
        rows.append([InlineKeyboardButton(text="👤 Adminlar", callback_data="adm:admins")])
    return InlineKeyboardMarkup(inline_keyboard=rows)


def back_row(callback_data: str):
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

    return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="⬅️ Orqaga", callback_data=callback_data)]])


async def render_admin_menu(target: Message | CallbackQuery, admin: Admin) -> None:
    text = f"🛠 Admin panel\nRol: {admin.role}"
    if isinstance(target, CallbackQuery):
        try:
            await target.message.edit_text(text, reply_markup=admin_menu_kb(admin))
        except Exception:
            await target.message.answer(text, reply_markup=admin_menu_kb(admin))
        await target.answer()
    else:
        await target.answer(text, reply_markup=admin_menu_kb(admin))


@router.message(Command("admin"))
async def cmd_admin(message: Message, admin: Admin) -> None:
    await render_admin_menu(message, admin)


@router.callback_query(F.data == "adm:root")
async def cb_admin_root(callback: CallbackQuery, admin: Admin, state: FSMContext) -> None:
    await state.clear()
    await render_admin_menu(callback, admin)


# ---------------------------------------------------------------------------
# Arizalar ro'yxati va tafsiloti
# ---------------------------------------------------------------------------

@router.callback_query(F.data.startswith("adm:apps:"))
async def cb_apps_list(callback: CallbackQuery, session: AsyncSession, admin: Admin) -> None:
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

    _, _, status_filter, page_str = callback.data.split(":")
    page = int(page_str)

    query = select(Application).order_by(Application.created_at.desc())
    if status_filter != "all":
        query = query.where(Application.status == status_filter)
    else:
        query = query.where(Application.status != "draft")

    count_query = select(func.count()).select_from(query.subquery())
    total = await session.scalar(count_query) or 0

    query = query.offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
    applications = list(await session.scalars(query))

    lines = [f"📋 Arizalar ({STATUS_LABELS.get(status_filter, 'Barchasi') if status_filter != 'all' else 'Barchasi'}) — jami: {total}"]
    rows = []
    for app_ in applications:
        position = await session.get(Position, app_.position_id)
        label = f"#{app_.id} {app_.full_name or '-'} — {position.name_uz if position else '-'}"
        rows.append([InlineKeyboardButton(text=label, callback_data=f"adm:app:{app_.id}")])

    filter_row = [
        InlineKeyboardButton(
            text=("• " if s == status_filter else "") + STATUS_LABELS.get(s, "Barchasi"),
            callback_data=f"adm:apps:{s}:1",
        )
        for s in STATUS_FILTERS
    ]
    rows.append(filter_row[:3])
    rows.append(filter_row[3:])

    nav = []
    if page > 1:
        nav.append(InlineKeyboardButton(text="⬅️", callback_data=f"adm:apps:{status_filter}:{page - 1}"))
    if page * PAGE_SIZE < total:
        nav.append(InlineKeyboardButton(text="➡️", callback_data=f"adm:apps:{status_filter}:{page + 1}"))
    if nav:
        rows.append(nav)

    rows.append([InlineKeyboardButton(text="🏠 Admin menyu", callback_data="adm:root")])

    try:
        await callback.message.edit_text("\n".join(lines), reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))
    except Exception:
        await callback.message.answer("\n".join(lines), reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))
    await callback.answer()


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
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

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
    rows.append([InlineKeyboardButton(text="⬅️ Ro'yxatga qaytish", callback_data="adm:apps:all:1")])

    try:
        await callback.message.edit_text(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))
    except Exception:
        await callback.message.answer(text, reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))
    await callback.answer()


@router.callback_query(F.data.startswith("adm:setstatus:"))
async def cb_set_status_start(callback: CallbackQuery, state: FSMContext, admin: Admin) -> None:
    if not can_manage(admin):
        await callback.answer("Sizda bu amal uchun ruxsat yo'q.", show_alert=True)
        return
    _, _, app_id_str, new_status = callback.data.split(":")
    await state.update_data(pending_app_id=int(app_id_str), pending_new_status=new_status)
    await state.set_state(AdminStates.entering_status_comment)

    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

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

@router.callback_query(F.data == "adm:stats")
async def cb_stats(callback: CallbackQuery, session: AsyncSession) -> None:
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

    await callback.message.edit_text("\n".join(lines), reply_markup=back_row("adm:root"))
    await callback.answer()


# ---------------------------------------------------------------------------
# Eksport (CSV)
# ---------------------------------------------------------------------------

@router.callback_query(F.data == "adm:export")
async def cb_export_menu(callback: CallbackQuery, admin: Admin) -> None:
    if not can_manage(admin):
        await callback.answer("Sizda bu amal uchun ruxsat yo'q.", show_alert=True)
        return
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Oxirgi 7 kun", callback_data="adm:exportperiod:7")],
            [InlineKeyboardButton(text="Oxirgi 30 kun", callback_data="adm:exportperiod:30")],
            [InlineKeyboardButton(text="Oxirgi 90 kun", callback_data="adm:exportperiod:90")],
            [InlineKeyboardButton(text="Barchasi", callback_data="adm:exportperiod:all")],
            [InlineKeyboardButton(text="⬅️ Orqaga", callback_data="adm:root")],
        ]
    )
    await callback.message.edit_text("Qaysi davr uchun eksport qilinsin?", reply_markup=kb)
    await callback.answer()


@router.callback_query(F.data.startswith("adm:exportperiod:"))
async def cb_export_period(callback: CallbackQuery, session: AsyncSession, admin: Admin) -> None:
    if not can_manage(admin):
        await callback.answer("Sizda bu amal uchun ruxsat yo'q.", show_alert=True)
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
# ---------------------------------------------------------------------------

@router.callback_query(F.data == "adm:positions")
async def cb_positions_categories(callback: CallbackQuery, session: AsyncSession, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer("Sizda bu amal uchun ruxsat yo'q.", show_alert=True)
        return
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

    categories = list(await session.scalars(select(PositionCategory).order_by(PositionCategory.sort_order)))
    rows = [[InlineKeyboardButton(text=f"{c.code}) {c.name_uz}", callback_data=f"adm:poscat:{c.code}")] for c in categories]
    rows.append([InlineKeyboardButton(text="⬅️ Orqaga", callback_data="adm:root")])
    await callback.message.edit_text("Yo'nalishni tanlang:", reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))
    await callback.answer()


async def render_positions_list(callback: CallbackQuery, session: AsyncSession, code: str) -> None:
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

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

    try:
        await callback.message.edit_text(
            f"{category.name_uz} — lavozimlar (bosilsa faol/nofaol almashadi):",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=rows),
        )
    except Exception:
        await callback.message.answer(
            f"{category.name_uz} — lavozimlar (bosilsa faol/nofaol almashadi):",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=rows),
        )


@router.callback_query(F.data.startswith("adm:poscat:"))
async def cb_positions_list(callback: CallbackQuery, session: AsyncSession, admin: Admin) -> None:
    code = callback.data.split(":")[2]
    await render_positions_list(callback, session, code)
    await callback.answer()


@router.callback_query(F.data.startswith("adm:postoggle:"))
async def cb_position_toggle(callback: CallbackQuery, session: AsyncSession, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer("Sizda bu amal uchun ruxsat yo'q.", show_alert=True)
        return
    _, _, pos_id_str, code = callback.data.split(":")
    position = await session.get(Position, int(pos_id_str))
    position.is_active = not position.is_active
    await session.commit()
    await render_positions_list(callback, session, code)
    await callback.answer()


@router.callback_query(F.data.startswith("adm:posadd:"))
async def cb_position_add_start(callback: CallbackQuery, state: FSMContext, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer("Sizda bu amal uchun ruxsat yo'q.", show_alert=True)
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
# ---------------------------------------------------------------------------

TEXT_LABELS = {
    "welcome_message": "Salomlashish xabari (/start)",
    "about_us": "Biz haqimizda",
    "thanks_message": "Rahmat xabari",
}


@router.callback_query(F.data == "adm:texts")
async def cb_texts_list(callback: CallbackQuery, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer("Sizda bu amal uchun ruxsat yo'q.", show_alert=True)
        return
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

    rows = [[InlineKeyboardButton(text=label, callback_data=f"adm:text:{key}")] for key, label in TEXT_LABELS.items()]
    rows.append([InlineKeyboardButton(text="⬅️ Orqaga", callback_data="adm:root")])
    await callback.message.edit_text("Tahrirlanadigan matnlar:", reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))
    await callback.answer()


@router.callback_query(F.data.startswith("adm:text:"))
async def cb_text_detail(callback: CallbackQuery, session: AsyncSession, admin: Admin) -> None:
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

    key = callback.data.split(":")[2]
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
    await callback.message.edit_text(text, reply_markup=kb)
    await callback.answer()


@router.callback_query(F.data.startswith("adm:textedit:"))
async def cb_text_edit_start(callback: CallbackQuery, state: FSMContext, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer("Sizda bu amal uchun ruxsat yo'q.", show_alert=True)
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
# ---------------------------------------------------------------------------

@router.callback_query(F.data == "adm:admins")
async def cb_admins_list(callback: CallbackQuery, session: AsyncSession, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer("Sizda bu amal uchun ruxsat yo'q.", show_alert=True)
        return
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

    admins = list(await session.scalars(select(Admin).order_by(Admin.id)))
    rows = []
    for a in admins:
        mark = "✅" if a.is_active else "🚫"
        rows.append(
            [
                InlineKeyboardButton(
                    text=f"{mark} {a.full_name or a.telegram_id} ({a.role})",
                    callback_data=f"adm:admintoggle:{a.id}",
                )
            ]
        )
    rows.append([InlineKeyboardButton(text="➕ Admin qo'shish", callback_data="adm:adminadd")])
    rows.append([InlineKeyboardButton(text="⬅️ Orqaga", callback_data="adm:root")])
    await callback.message.edit_text("Adminlar ro'yxati (bosilsa faol/nofaol almashadi):", reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))
    await callback.answer()


@router.callback_query(F.data.startswith("adm:admintoggle:"))
async def cb_admin_toggle(callback: CallbackQuery, session: AsyncSession, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer("Sizda bu amal uchun ruxsat yo'q.", show_alert=True)
        return
    target_id = int(callback.data.split(":")[2])
    target = await session.get(Admin, target_id)
    if target.id == admin.id:
        await callback.answer("O'zingizni o'chira olmaysiz.", show_alert=True)
        return
    target.is_active = not target.is_active
    await session.commit()
    await cb_admins_list(callback, session, admin)


@router.callback_query(F.data == "adm:adminadd")
async def cb_admin_add_start(callback: CallbackQuery, state: FSMContext, admin: Admin) -> None:
    if not can_configure(admin):
        await callback.answer("Sizda bu amal uchun ruxsat yo'q.", show_alert=True)
        return
    await state.set_state(AdminStates.adding_admin_id)
    await callback.message.answer("Yangi admin (rol: hr) uchun Telegram ID raqamini yuboring:")
    await callback.answer()


@router.message(AdminStates.adding_admin_id, F.text)
async def msg_admin_add(message: Message, state: FSMContext, session: AsyncSession) -> None:
    raw = message.text.strip()
    if not raw.isdigit():
        await message.answer("❗ Telegram ID faqat raqamlardan iborat bo'lishi kerak. Qayta yuboring:")
        return
    telegram_id = int(raw)
    existing = await session.scalar(select(Admin).where(Admin.telegram_id == telegram_id))
    if existing:
        existing.is_active = True
        await session.commit()
        await message.answer("✅ Mavjud admin qayta faollashtirildi.")
    else:
        session.add(Admin(telegram_id=telegram_id, role="hr"))
        await session.commit()
        await message.answer(f"✅ Yangi admin qo'shildi (ID: {telegram_id}, rol: hr).")
    await state.clear()
