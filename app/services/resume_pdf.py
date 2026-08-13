from __future__ import annotations

import io
import os
import re
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

from app.db.models import Application, Position, PositionCategory

COMPANY_NAME = "LAZANA HR"

STATUS_LABELS_UZ = {
    "draft": "Qoralama",
    "submitted": "Yangi",
    "reviewed": "Ko'rib chiqilgan",
    "invited": "Taklif qilingan",
    "rejected": "Rad etilgan",
}

INK = colors.HexColor("#0f172a")
MUTED = colors.HexColor("#64748b")
ACCENT = colors.HexColor("#1d4ed8")
LINE = colors.HexColor("#cbd5e1")

# Windows'da Arial (Cyrillic/lotin belgilarini to'liq qo'llab-quvvatlaydi) bo'lmasa,
# reportlab o'zining ichki Helvetica shriftiga (faqat Latin-1) tushadi.
_FONT_CANDIDATES = [
    ("Resume", "Resume-Bold", r"C:\Windows\Fonts\arial.ttf", r"C:\Windows\Fonts\arialbd.ttf"),
    (
        "Resume",
        "Resume-Bold",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ),
]

_FONT_NAME = "Helvetica"
_FONT_BOLD = "Helvetica-Bold"
_font_registered = False


def _ensure_font() -> None:
    global _FONT_NAME, _FONT_BOLD, _font_registered
    if _font_registered:
        return
    _font_registered = True
    for regular_name, bold_name, regular_path, bold_path in _FONT_CANDIDATES:
        if os.path.exists(regular_path) and os.path.exists(bold_path):
            pdfmetrics.registerFont(TTFont(regular_name, regular_path))
            pdfmetrics.registerFont(TTFont(bold_name, bold_path))
            _FONT_NAME = regular_name
            _FONT_BOLD = bold_name
            return


def _slugify(text: str | None) -> str:
    if not text:
        return "ariza"
    ascii_text = text.encode("ascii", "ignore").decode("ascii")
    ascii_text = re.sub(r"[^A-Za-z0-9]+", "_", ascii_text).strip("_")
    return ascii_text.lower() or "ariza"


def resume_filename(application: Application) -> str:
    return f"resume_{application.id}_{_slugify(application.full_name)}.pdf"


def _field(label: str, value: str | None) -> Paragraph | None:
    if value is None or value == "":
        return None
    text = f"<b>{escape(label)}:</b> {escape(str(value))}"
    return Paragraph(text, ParagraphStyle("field", fontName=_FONT_NAME, fontSize=10, leading=14, textColor=INK))


def generate_resume_pdf(application: Application, position: Position, category: PositionCategory) -> bytes:
    _ensure_font()

    style_company = ParagraphStyle(
        "company", fontName=_FONT_BOLD, fontSize=9, textColor=MUTED, spaceAfter=4, leading=11
    )
    style_name = ParagraphStyle("name", fontName=_FONT_BOLD, fontSize=22, textColor=INK, spaceAfter=2, leading=26)
    style_subtitle = ParagraphStyle(
        "subtitle", fontName=_FONT_NAME, fontSize=13, textColor=ACCENT, spaceAfter=2, leading=16
    )
    style_section = ParagraphStyle(
        "section",
        fontName=_FONT_BOLD,
        fontSize=12,
        textColor=ACCENT,
        spaceBefore=14,
        spaceAfter=6,
        leading=15,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        title=f"Ariza #{application.id} — {application.full_name or ''}",
    )

    story: list = [
        Paragraph(escape(COMPANY_NAME.upper()), style_company),
        Paragraph(escape(application.full_name or f"Ariza #{application.id}"), style_name),
        Paragraph(escape(f"{category.name_uz} / {position.name_uz}"), style_subtitle),
        Spacer(1, 6),
        HRFlowable(width="100%", thickness=1, color=LINE, spaceAfter=10),
    ]

    sections: list[tuple[str, list[Paragraph | None]]] = [
        (
            "Shaxsiy ma'lumotlar",
            [
                _field("Telefon", application.phone),
                _field("Manzil", application.address),
                _field(
                    "Tug'ilgan sana",
                    application.birth_date.strftime("%d.%m.%Y") if application.birth_date else None,
                ),
                _field("Manba", application.source),
            ],
        ),
        (
            "Ta'lim",
            [
                _field("Ta'lim darajasi", application.education_level),
                _field("Ta'lim muassasasi", application.education_institution),
            ],
        ),
        (
            "Ish tajribasi",
            [
                _field("Tajriba (yillar)", application.experience_years_range),
                _field("Mehnat faoliyati", application.work_experience_text),
            ],
        ),
        (
            "Ko'nikmalar va tillar",
            [
                _field(
                    "Tillar",
                    ", ".join(application.languages) if application.languages else None,
                ),
                _field("Boshqa tillar", application.languages_other),
                _field("Kompyuter ko'nikmalari", application.computer_skills),
                _field("Asosiy ko'nikmalar", application.key_skills),
            ],
        ),
        (
            "Kutilayotgan maosh",
            [_field("Kutilayotgan maosh", application.expected_salary_range)],
        ),
        (
            "Ariza holati",
            [
                _field("Holat", STATUS_LABELS_UZ.get(application.status, application.status)),
                _field(
                    "Topshirilgan sana",
                    application.submitted_at.strftime("%d.%m.%Y %H:%M") if application.submitted_at else None,
                ),
            ],
        ),
    ]

    for title, fields in sections:
        rendered = [f for f in fields if f is not None]
        if not rendered:
            continue
        story.append(Paragraph(escape(title), style_section))
        for field in rendered:
            story.append(field)
            story.append(Spacer(1, 3))

    doc.build(story)
    return buffer.getvalue()
