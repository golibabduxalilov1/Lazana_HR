from __future__ import annotations

import datetime as dt
import re
from dataclasses import dataclass, field
from typing import Any

PHONE_RE = re.compile(r"^\+998\d{9}$")
FULL_NAME_RE = re.compile(r"^[A-Za-zА-Яа-яЁёʼ'`\s]+$")
URL_RE = re.compile(r"(https?://|www\.|t\.me/|[a-z0-9-]+\.(com|net|org|uz|ru|io)\b)", re.IGNORECASE)

FREE_TEXT_MAX_LEN = 500
ADDRESS_MIN_LEN = 10
FULL_NAME_MIN_LEN = 5


@dataclass
class ValidationResult:
    ok: bool
    value: Any = None
    error_key: str | None = None
    error_kwargs: dict = field(default_factory=dict)


def normalize_phone(raw: str) -> str:
    digits = re.sub(r"[^\d+]", "", raw.strip())
    if digits.startswith("00"):
        digits = "+" + digits[2:]
    if digits.startswith("998") and not digits.startswith("+"):
        digits = "+" + digits
    if not digits.startswith("+") and len(digits) == 9:
        digits = "+998" + digits
    return digits


def validate_phone(raw: str) -> ValidationResult:
    phone = normalize_phone(raw)
    if not PHONE_RE.match(phone):
        return ValidationResult(ok=False, error_key="err_phone")
    return ValidationResult(ok=True, value=phone)


def validate_full_name(raw: str) -> ValidationResult:
    value = raw.strip()
    words = [w for w in value.split() if w]
    if len(value) < FULL_NAME_MIN_LEN or len(words) < 2 or not FULL_NAME_RE.match(value):
        return ValidationResult(ok=False, error_key="err_full_name")
    return ValidationResult(ok=True, value=" ".join(words))


def validate_address(raw: str) -> ValidationResult:
    value = raw.strip()
    if len(value) < ADDRESS_MIN_LEN:
        return ValidationResult(ok=False, error_key="err_address")
    if URL_RE.search(value):
        return ValidationResult(ok=False, error_key="err_link_not_allowed")
    return ValidationResult(ok=True, value=value)


def validate_birth_date(raw: str, min_age: int, max_age: int) -> ValidationResult:
    value = raw.strip()
    parsed: dt.date | None = None
    for fmt in ("%d.%m.%Y", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            parsed = dt.datetime.strptime(value, fmt).date()
            break
        except ValueError:
            continue
    if parsed is None:
        return ValidationResult(ok=False, error_key="err_birth_date_format")

    today = dt.date.today()
    age = today.year - parsed.year - ((today.month, today.day) < (parsed.month, parsed.day))
    if parsed > today or age < min_age or age > max_age:
        return ValidationResult(ok=False, error_key="err_birth_date_age", error_kwargs={"min": min_age, "max": max_age})
    return ValidationResult(ok=True, value=parsed)


def validate_free_text(raw: str, max_length: int = FREE_TEXT_MAX_LEN, min_length: int = 1) -> ValidationResult:
    value = raw.strip()
    if len(value) < min_length:
        return ValidationResult(ok=False, error_key="err_text_too_short")
    if len(value) > max_length:
        return ValidationResult(ok=False, error_key="err_text_too_long", error_kwargs={"max": max_length})
    if URL_RE.search(value):
        return ValidationResult(ok=False, error_key="err_link_not_allowed")
    return ValidationResult(ok=True, value=value)
