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

CATEGORY_LABEL_KEYS = {"A": "category_a", "B": "category_b", "S": "category_s"}


def category_label(lang: str, category: PositionCategory) -> str:
    label_key = CATEGORY_LABEL_KEYS.get(category.code)
    return t(lang, label_key) if label_key else (category.name_uz if lang == "uz" else category.name_ru)


def position_label(lang: str, position: Position) -> str:
    return position.name_uz if lang == "uz" or not position.name_ru else position.name_ru


def _reply_kb(rows: list[list[str]]) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=label) for label in row] for row in rows if row],
        resize_keyboard=True,
    )


def nav_labels(lang: str, include_back: bool = True, include_cancel: bool = True) -> list[str]:
    row = []
    if include_back:
        row.append(t(lang, "btn_back"))
    if include_cancel:
        row.append(t(lang, "btn_cancel"))
    return row


# ---------------------------------------------------------------------------
# Asosiy navigatsiya (Reply Keyboard)
# ---------------------------------------------------------------------------

def language_keyboard() -> ReplyKeyboardMarkup:
    return _reply_kb([[t("uz", "btn_lang_uz")], [t("uz", "btn_lang_ru")]])


def main_menu_keyboard(lang: str) -> ReplyKeyboardMarkup:
    return _reply_kb(
        [
            [t(lang, "menu_about")],
            [t(lang, "menu_apply")],
            [t(lang, "menu_change_lang")],
        ]
    )


def category_keyboard(lang: str, categories: list[PositionCategory]) -> ReplyKeyboardMarkup:
    rows = [[category_label(lang, cat)] for cat in categories]
    nav = nav_labels(lang, include_back=True, include_cancel=True)
    if nav:
        rows.append(nav)
    return _reply_kb(rows)


def positions_keyboard(lang: str, positions: list[Position]) -> ReplyKeyboardMarkup:
    rows = [[position_label(lang, pos)] for pos in positions]
    nav = nav_labels(lang, include_back=True, include_cancel=True)
    if nav:
        rows.append(nav)
    return _reply_kb(rows)


def choice_keyboard(lang: str, options: list[tuple[str, str]], columns: int = 1) -> ReplyKeyboardMarkup:
    rows: list[list[str]] = []
    row: list[str] = []
    for _, label_key in options:
        row.append(t(lang, label_key))
        if len(row) == columns:
            rows.append(row)
            row = []
    if row:
        rows.append(row)
    nav = nav_labels(lang)
    if nav:
        rows.append(nav)
    return _reply_kb(rows)


def text_step_keyboard(lang: str, include_back: bool = True) -> ReplyKeyboardMarkup:
    nav = nav_labels(lang, include_back=include_back)
    return _reply_kb([nav])


def phone_request_keyboard(lang: str, include_back: bool = True) -> ReplyKeyboardMarkup:
    rows = [[KeyboardButton(text=t(lang, "btn_share_contact"), request_contact=True)]]
    nav = nav_labels(lang, include_back=include_back)
    if nav:
        rows.append([KeyboardButton(text=label) for label in nav])
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True)


def remove_reply_keyboard() -> ReplyKeyboardRemove:
    return ReplyKeyboardRemove()


# ---------------------------------------------------------------------------
# Inline Keyboard — faqat bitta xabarga bog'liq harakatlar uchun:
# ko'p tanlovni belgilash (bir xabar ichida ✅ almashtiriladi) va yakuniy tasdiqlash.
# ---------------------------------------------------------------------------

def _inline_nav_row(lang: str, include_back: bool = True, include_cancel: bool = True) -> list[InlineKeyboardButton]:
    row = []
    if include_back:
        row.append(InlineKeyboardButton(text=t(lang, "btn_back"), callback_data="nav:back"))
    if include_cancel:
        row.append(InlineKeyboardButton(text=t(lang, "btn_cancel"), callback_data="nav:cancel"))
    return row


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
    rows.append(_inline_nav_row(lang))
    return InlineKeyboardMarkup(inline_keyboard=rows)


def confirm_keyboard(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=t(lang, "btn_confirm"), callback_data="confirm:submit")],
            [InlineKeyboardButton(text=t(lang, "btn_back"), callback_data="confirm:back")],
            [InlineKeyboardButton(text=t(lang, "btn_cancel"), callback_data="confirm:cancel")],
        ]
    )
