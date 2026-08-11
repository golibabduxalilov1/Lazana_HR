from __future__ import annotations

import csv
import datetime as dt
import io

from app.db.models import Application

CSV_HEADERS = [
    "id",
    "status",
    "category",
    "position",
    "full_name",
    "phone",
    "address",
    "birth_date",
    "work_experience_text",
    "experience_years_range",
    "education_level",
    "education_institution",
    "languages",
    "expected_salary_range",
    "computer_skills",
    "key_skills",
    "source",
    "submitted_at",
]


def applications_to_csv(rows: list[tuple[Application, str, str]]) -> str:
    """rows: [(application, category_name_uz, position_name_uz), ...]"""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(CSV_HEADERS)

    for app_, category_name, position_name in rows:
        writer.writerow(
            [
                app_.id,
                app_.status,
                category_name,
                position_name,
                app_.full_name or "",
                app_.phone or "",
                (app_.address or "").replace("\n", " "),
                app_.birth_date.isoformat() if app_.birth_date else "",
                (app_.work_experience_text or "").replace("\n", " "),
                app_.experience_years_range or "",
                app_.education_level or "",
                app_.education_institution or "",
                ",".join(app_.languages) if app_.languages else "",
                app_.expected_salary_range or "",
                (app_.computer_skills or "").replace("\n", " "),
                (app_.key_skills or "").replace("\n", " "),
                app_.source or "",
                app_.submitted_at.strftime("%Y-%m-%d %H:%M") if app_.submitted_at else "",
            ]
        )
    return buffer.getvalue()


def export_filename(prefix: str = "lazana_applications") -> str:
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{prefix}_{stamp}.csv"
