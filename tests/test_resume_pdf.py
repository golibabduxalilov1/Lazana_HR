from __future__ import annotations

import datetime as dt

from app.db.models import Application, Position, PositionCategory
from app.services.resume_pdf import generate_resume_pdf, resume_filename


def _sample_application() -> Application:
    return Application(
        id=1,
        user_id=1,
        position_id=1,
        status="submitted",
        full_name="Aliyev Ali Aliyevich",
        phone="+998901234567",
        address="Toshkent shahar",
        birth_date=dt.date(1995, 5, 15),
        work_experience_text="5 yil savdo sohasida ishlagan.",
        experience_years_range="3-5",
        education_level="Oliy",
        education_institution="TDTU",
        languages=["O'zbek", "Rus"],
        languages_other=None,
        expected_salary_range="5-7 mln",
        computer_skills="MS Office, 1C",
        key_skills="Kommunikabellik, jamoada ishlash",
        source="telegram",
        submitted_at=dt.datetime(2026, 8, 1, 10, 30, tzinfo=dt.timezone.utc),
    )


def test_generate_resume_pdf_returns_pdf_bytes() -> None:
    application = _sample_application()
    position = Position(id=1, category_id=1, name_uz="Sotuvchi")
    category = PositionCategory(id=1, code="B", name_uz="Savdo", name_ru="Torgovlya", question_set="basic")

    pdf_bytes = generate_resume_pdf(application, position, category)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    assert pdf_bytes.startswith(b"%PDF")


def test_generate_resume_pdf_handles_empty_fields() -> None:
    application = Application(
        id=2,
        user_id=1,
        position_id=1,
        status="draft",
        full_name=None,
        submitted_at=None,
    )
    position = Position(id=1, category_id=1, name_uz="Sotuvchi")
    category = PositionCategory(id=1, code="B", name_uz="Savdo", name_ru="Torgovlya", question_set="basic")

    pdf_bytes = generate_resume_pdf(application, position, category)

    assert pdf_bytes.startswith(b"%PDF")


def test_resume_filename_slugifies_full_name() -> None:
    application = _sample_application()
    filename = resume_filename(application)

    assert filename.startswith("resume_1_")
    assert filename.endswith(".pdf")
