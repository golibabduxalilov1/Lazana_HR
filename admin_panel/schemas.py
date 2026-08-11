from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str | None = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name_uz: str
    name_ru: str
    question_set: str
    sort_order: int
    is_active: bool


class PositionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    category_id: int
    name_uz: str
    name_ru: str | None
    sort_order: int
    is_active: bool


class PositionCreate(BaseModel):
    category_id: int
    name_uz: str
    name_ru: str | None = None
    sort_order: int = 0


class PositionUpdate(BaseModel):
    category_id: int | None = None
    name_uz: str | None = None
    name_ru: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class ApplicationListItem(BaseModel):
    id: int
    status: str
    full_name: str | None
    phone: str | None
    category_name: str
    position_name: str
    submitted_at: dt.datetime | None
    created_at: dt.datetime


class StatusHistoryItem(BaseModel):
    id: int
    old_status: str | None
    new_status: str
    comment: str | None
    changed_by_name: str | None
    changed_at: dt.datetime


class ApplicationDetail(BaseModel):
    id: int
    status: str
    category_name: str
    position_name: str
    full_name: str | None
    phone: str | None
    address: str | None
    birth_date: dt.date | None
    work_experience_text: str | None
    experience_years_range: str | None
    education_level: str | None
    education_institution: str | None
    languages: list[str] | None
    languages_other: str | None
    expected_salary_range: str | None
    computer_skills: str | None
    key_skills: str | None
    source: str | None
    submitted_at: dt.datetime | None
    created_at: dt.datetime
    status_history: list[StatusHistoryItem] = []


class ApplicationListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[ApplicationListItem]


class StatusChangeRequest(BaseModel):
    new_status: str
    comment: str | None = None


class BotTextOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    key: str
    text_uz: str
    text_ru: str


class BotTextUpdate(BaseModel):
    text_uz: str | None = None
    text_ru: str | None = None


class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: str | None
    phone: str | None
    telegram_id: int
    role: str
    is_active: bool


class EmployeeCreate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    telegram_id: int
    role: str


class EmployeeUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    role: str | None = None
    is_active: bool | None = None


class StatsSummary(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    last_7_days: int
    last_30_days: int
