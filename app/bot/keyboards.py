from __future__ import annotations

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)

from app.bot.texts import t
from app.db.models import Position, PositionCategory


def language_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=t("uz", "btn_lang_uz"), callback_data="lang:uz")],
            [InlineKeyboardButton(text=t("uz", "btn_lang_ru"), callback_data="lang:ru")],
        ]
    )


def main_menu_keyboard(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=t(lang, "menu_about"), callback_data="menu:about")],
            [InlineKeyboardButton(text=t(lang, "menu_apply"), callback_data="menu:apply")],
            [InlineKeyboardButton(text=t(lang, "menu_change_lang"), callback_data="menu:lang")],
        ]
    )


def back_to_menu_keyboard(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text=t(lang, "btn_to_menu"), callback_data="menu:root")]]
    )


def nav_row(lang: str, include_back: bool = True, include_cancel: bool = True) -> list[InlineKeyboardButton]:
    row = []
    if include_back:
        row.append(InlineKeyboardButton(text=t(lang, "btn_back"), callback_data="nav:back"))
    if include_cancel:
        row.append(InlineKeyboardButton(text=t(lang, "btn_cancel"), callback_data="nav:cancel"))
    return row


def category_keyboard(lang: str, categories: list[PositionCategory]) -> InlineKeyboardMarkup:
    rows = []
    label_by_code = {"A": "category_a", "B": "category_b", "S": "category_s"}
    for cat in categories:
        label_key = label_by_code.get(cat.code)
        label = t(lang, label_key) if label_key else (cat.name_uz if lang == "uz" else cat.name_ru)
        rows.append([InlineKeyboardButton(text=label, callback_data=f"cat:{cat.code}")])
    rows.append(nav_row(lang, include_back=True, include_cancel=True))
    return InlineKeyboardMarkup(inline_keyboard=rows)


def positions_keyboard(lang: str, positions: list[Position]) -> InlineKeyboardMarkup:
    rows = []
    for pos in positions:
        name = pos.name_uz if lang == "uz" or not pos.name_ru else pos.name_ru
        rows.append([InlineKeyboardButton(text=name, callback_data=f"pos:{pos.id}")])
    rows.append(nav_row(lang, include_back=True, include_cancel=True))
    return InlineKeyboardMarkup(inline_keyboard=rows)


def choice_keyboard(
    lang: str, options: list[tuple[str, str]], prefix: str, columns: int = 1
) -> InlineKeyboardMarkup:
    rows: list[list[InlineKeyboardButton]] = []
    row: list[InlineKeyboardButton] = []
    for value, label_key in options:
        row.append(InlineKeyboardButton(text=t(lang, label_key), callback_data=f"{prefix}:{value}"))
        if len(row) == columns:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    rows.append(nav_row(lang))
    return InlineKeyboardMarkup(inline_keyboard=rows)


def multiselect_keyboard(
    lang: str, options: list[tuple[str, str]], selected: set[str], prefix: str
) -> InlineKeyboardMarkup:
    rows = []
    for value, label_key in options:
        mark = "✅ " if value in selected else ""
        rows.append(
            [InlineKeyboardButton(text=f"{mark}{t(lang, label_key)}", callback_data=f"{prefix}:{value}")]
        )
    rows.append([InlineKeyboardButton(text=t(lang, "btn_done"), callback_data=f"{prefix}:done")])
    rows.append(nav_row(lang))
    return InlineKeyboardMarkup(inline_keyboard=rows)


def text_step_keyboard(lang: str, include_back: bool = True) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[nav_row(lang, include_back=include_back)])


def phone_request_keyboard(lang: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=t(lang, "btn_share_contact"), request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def remove_reply_keyboard() -> ReplyKeyboardRemove:
    return ReplyKeyboardRemove()


def confirm_keyboard(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=t(lang, "btn_confirm"), callback_data="confirm:submit")],
            [InlineKeyboardButton(text=t(lang, "btn_back"), callback_data="confirm:back")],
            [InlineKeyboardButton(text=t(lang, "btn_cancel"), callback_data="confirm:cancel")],
        ]
    )
