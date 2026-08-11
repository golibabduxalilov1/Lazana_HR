"""Kategoriya (A/B/S -> basic/production/specialist) bo'yicha savollar ketma-ketligini aniqlaydi.

Har bir Step `applications` jadvalidagi bitta ustunga mos keladi. `condition` mavjud bo'lsa,
savol faqat oldingi javoblar asosida shart bajarilganda so'raladi (masalan languages_other).
"""
from __future__ import annotations

import functools
from dataclasses import dataclass
from typing import Any, Callable

from app.bot.validators import ValidationResult, validate_address, validate_free_text, validate_full_name

Kind = str  # "text" | "phone" | "date" | "choice" | "multiselect"


@dataclass
class Step:
    key: str
    kind: Kind
    prompt_key: str
    validator: Callable[[str], ValidationResult] | None = None
    options: list[tuple[str, str]] | None = None
    condition: Callable[[dict[str, Any]], bool] | None = None


EXPERIENCE_OPTIONS = [
    ("<1", "exp_lt1"),
    ("1-3", "exp_1_3"),
    ("3-5", "exp_3_5"),
    ("5+", "exp_5plus"),
]

EDUCATION_OPTIONS = [
    ("oliy", "edu_oliy"),
    ("orta", "edu_orta"),
    ("orta_maxsus", "edu_orta_maxsus"),
    ("tugallanmagan_oliy", "edu_tugallanmagan_oliy"),
]

LANGUAGE_OPTIONS = [
    ("uz", "lang_uz"),
    ("ru", "lang_ru"),
    ("tj", "lang_tj"),
    ("kz", "lang_kz"),
    ("tr", "lang_tr"),
    ("other", "lang_other"),
]

SALARY_OPTIONS = [
    ("4m", "salary_4m"),
    ("5-7m", "salary_5_7m"),
    ("7-10m", "salary_7_10m"),
    ("10m+", "salary_10plus"),
]

_STEPS_BASIC: list[Step] = [
    Step("full_name", "text", "step_full_name", validator=validate_full_name),
    Step("phone", "phone", "step_phone"),
    Step("address", "text", "step_address", validator=validate_address),
    Step("birth_date", "date", "step_birth_date"),
    Step("work_experience_text", "text", "step_work_experience", validator=functools.partial(validate_free_text, max_length=500)),
]

_STEPS_PRODUCTION: list[Step] = [
    *_STEPS_BASIC,
    Step("experience_years_range", "choice", "step_experience_years", options=EXPERIENCE_OPTIONS),
]

_STEPS_SPECIALIST: list[Step] = [
    *_STEPS_PRODUCTION,
    Step("education_level", "choice", "step_education_level", options=EDUCATION_OPTIONS),
    Step(
        "education_institution",
        "text",
        "step_education_institution",
        validator=functools.partial(validate_free_text, max_length=255),
    ),
    Step("languages", "multiselect", "step_languages", options=LANGUAGE_OPTIONS),
    Step(
        "languages_other",
        "text",
        "step_languages_other",
        validator=functools.partial(validate_free_text, max_length=100),
        condition=lambda answers: "other" in (answers.get("languages") or []),
    ),
    Step("expected_salary_range", "choice", "step_expected_salary", options=SALARY_OPTIONS),
    Step("computer_skills", "text", "step_computer_skills", validator=functools.partial(validate_free_text, max_length=500)),
    Step("key_skills", "text", "step_key_skills", validator=functools.partial(validate_free_text, max_length=500)),
]

STEP_SETS: dict[str, list[Step]] = {
    "basic": _STEPS_BASIC,
    "production": _STEPS_PRODUCTION,
    "specialist": _STEPS_SPECIALIST,
}

STEP_KEY_TO_CONFIRM_LABEL: dict[str, str] = {
    "full_name": "confirm_full_name",
    "phone": "confirm_phone",
    "address": "confirm_address",
    "birth_date": "confirm_birth_date",
    "work_experience_text": "confirm_work_experience",
    "experience_years_range": "confirm_experience_years",
    "education_level": "confirm_education_level",
    "education_institution": "confirm_education_institution",
    "languages": "confirm_languages",
    "expected_salary_range": "confirm_expected_salary",
    "computer_skills": "confirm_computer_skills",
    "key_skills": "confirm_key_skills",
}


def active_steps(question_set: str, answers: dict[str, Any]) -> list[Step]:
    return [s for s in STEP_SETS[question_set] if s.condition is None or s.condition(answers)]


def find_step(question_set: str, key: str) -> Step | None:
    for s in STEP_SETS[question_set]:
        if s.key == key:
            return s
    return None


def next_step(question_set: str, answers: dict[str, Any], order: list[str]) -> Step | None:
    for step in active_steps(question_set, answers):
        if step.key not in order:
            return step
    return None


def option_label(options: list[tuple[str, str]], value: str) -> str | None:
    for opt_value, label_key in options:
        if opt_value == value:
            return label_key
    return None
