from __future__ import annotations

import io
import os
import re
from xml.sax.saxutils import escape

from reportlab.graphics.shapes import Circle, Drawing, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.db.models import Application, Position, PositionCategory

COMPANY_NAME = "LAZANA HR"

STATUS_LABELS_UZ = {
    "draft": "Qoralama",
    "submitted": "Yangi",
    "reviewed": "Ko'rib chiqilgan",
    "invited": "Taklif qilingan",
    "rejected": "Rad etilgan",
}

SALARY_LABELS_UZ = {
    "4m": "4,000,000 so'm",
    "5-7m": "5,000,000 – 7,000,000 so'm",
    "7-10m": "7,000,000 – 10,000,000 so'm",
    "10m+": "10,000,000 dan yuqori",
}

# --- Rang sxemasi -----------------------------------------------------------
HEADER_BG = colors.HexColor("#0f172a")
HEADER_ACCENT_TEXT = colors.HexColor("#93c5fd")
SIDEBAR_BG = colors.HexColor("#f1f5f9")
ACCENT = colors.HexColor("#2563eb")
INK = colors.HexColor("#0f172a")
MUTED = colors.HexColor("#64748b")
LINE = colors.HexColor("#e2e8f0")
WHITE = colors.white

PAGE_MARGIN = 16 * mm
SIDEBAR_WIDTH = 60 * mm

# Windows'da Arial (kirill/lotin belgilarini to'liq qo'llab-quvvatlaydi) topilmasa,
# reportlab'ning ichki Helvetica shriftiga (faqat Latin-1) tushiladi.
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


def _initials(full_name: str | None) -> str:
    if not full_name:
        return "LH"
    parts = [p for p in re.split(r"\s+", full_name.strip()) if p]
    letters = "".join(p[0] for p in parts[:2]).upper()
    return letters or "LH"


def _avatar(initials: str) -> Drawing:
    size = 20 * mm
    d = Drawing(size, size)
    d.add(Circle(size / 2, size / 2, size / 2, fillColor=ACCENT, strokeColor=None))
    d.add(
        String(
            size / 2,
            size / 2 - 5,
            initials,
            fontName=_FONT_BOLD,
            fontSize=15,
            fillColor=WHITE,
            textAnchor="middle",
        )
    )
    return d


class _Styles:
    def __init__(self) -> None:
        self.company = ParagraphStyle(
            "company", fontName=_FONT_BOLD, fontSize=8.5, textColor=HEADER_ACCENT_TEXT, leading=11, spaceAfter=3
        )
        self.name = ParagraphStyle("name", fontName=_FONT_BOLD, fontSize=20, textColor=WHITE, leading=24, spaceAfter=2)
        self.subtitle = ParagraphStyle(
            "subtitle", fontName=_FONT_NAME, fontSize=11.5, textColor=HEADER_ACCENT_TEXT, leading=15
        )
        self.side_section = ParagraphStyle(
            "side_section",
            fontName=_FONT_BOLD,
            fontSize=9.5,
            textColor=ACCENT,
            leading=12,
            spaceBefore=2,
            spaceAfter=6,
        )
        self.side_label = ParagraphStyle(
            "side_label", fontName=_FONT_BOLD, fontSize=7.5, textColor=MUTED, leading=10, spaceBefore=7
        )
        self.side_value = ParagraphStyle(
            "side_value", fontName=_FONT_NAME, fontSize=9.5, textColor=INK, leading=13
        )
        self.main_section = ParagraphStyle(
            "main_section",
            fontName=_FONT_BOLD,
            fontSize=12.5,
            textColor=INK,
            leading=16,
            spaceBefore=4,
            spaceAfter=2,
        )
        self.main_label = ParagraphStyle(
            "main_label", fontName=_FONT_BOLD, fontSize=8.5, textColor=ACCENT, leading=11, spaceBefore=8
        )
        self.main_value = ParagraphStyle(
            "main_value", fontName=_FONT_NAME, fontSize=10, textColor=INK, leading=14.5
        )
        self.footer = ParagraphStyle("footer", fontName=_FONT_NAME, fontSize=7.5, textColor=MUTED, leading=10)


def _side_item(styles: _Styles, label: str, value: str | None) -> list:
    if not value:
        return []
    return [
        Paragraph(escape(label.upper()), styles.side_label),
        Paragraph(escape(str(value)), styles.side_value),
    ]


def _main_item(styles: _Styles, label: str, value: str | None) -> list:
    if not value:
        return []
    return [
        Paragraph(escape(label.upper()), styles.main_label),
        Paragraph(escape(str(value)), styles.main_value),
    ]


def _section_underline() -> HRFlowable:
    return HRFlowable(width="100%", thickness=1.4, color=ACCENT, spaceAfter=8, lineCap="round")


def generate_resume_pdf(application: Application, position: Position, category: PositionCategory) -> bytes:
    _ensure_font()
    styles = _Styles()

    content_width = A4[0] - 2 * PAGE_MARGIN

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=PAGE_MARGIN,
        bottomMargin=PAGE_MARGIN,
        leftMargin=PAGE_MARGIN,
        rightMargin=PAGE_MARGIN,
        title=f"Ariza #{application.id} — {application.full_name or ''}",
    )

    # --- Sarlavha bloki (avatar + ism + lavozim) ---------------------------
    header_text = [
        Paragraph(escape(COMPANY_NAME.upper()), styles.company),
        Paragraph(escape(application.full_name or f"Ariza #{application.id}"), styles.name),
        Paragraph(escape(f"{category.name_uz} / {position.name_uz}"), styles.subtitle),
    ]
    header_table = Table(
        [[_avatar(_initials(application.full_name)), header_text]],
        colWidths=[32 * mm, content_width - 32 * mm],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), HEADER_BG),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (0, 0), 10 * mm),
                ("RIGHTPADDING", (0, 0), (0, 0), 4 * mm),
                ("LEFTPADDING", (1, 0), (1, 0), 4 * mm),
                ("RIGHTPADDING", (1, 0), (1, 0), 10 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 9 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9 * mm),
            ]
        )
    )

    # --- Yon panel (aloqa, shaxsiy, ta'lim, tillar, holat) ------------------
    sidebar: list = []

    contact_items = _side_item(styles, "Telefon", application.phone) + _side_item(
        styles, "Manzil", application.address
    )
    if contact_items:
        sidebar += [Paragraph("ALOQA", styles.side_section), _section_underline(), *contact_items, Spacer(1, 10)]

    personal_items = _side_item(
        styles,
        "Tug'ilgan sana",
        application.birth_date.strftime("%d.%m.%Y") if application.birth_date else None,
    ) + _side_item(styles, "Manba", application.source)
    if personal_items:
        sidebar += [
            Paragraph("SHAXSIY MA'LUMOTLAR", styles.side_section),
            _section_underline(),
            *personal_items,
            Spacer(1, 10),
        ]

    education_items = _side_item(styles, "Ta'lim darajasi", application.education_level) + _side_item(
        styles, "Ta'lim muassasasi", application.education_institution
    )
    if education_items:
        sidebar += [Paragraph("TA'LIM", styles.side_section), _section_underline(), *education_items, Spacer(1, 10)]

    languages_value = ", ".join(application.languages) if application.languages else None
    language_items = _side_item(styles, "Tillar", languages_value) + _side_item(
        styles, "Boshqa tillar", application.languages_other
    )
    if language_items:
        sidebar += [Paragraph("TILLAR", styles.side_section), _section_underline(), *language_items, Spacer(1, 10)]

    status_items = _side_item(
        styles, "Holat", STATUS_LABELS_UZ.get(application.status, application.status)
    ) + _side_item(
        styles,
        "Topshirilgan sana",
        application.submitted_at.strftime("%d.%m.%Y %H:%M") if application.submitted_at else None,
    )
    if status_items:
        sidebar += [
            Paragraph("ARIZA HOLATI", styles.side_section),
            _section_underline(),
            *status_items,
        ]

    # --- Asosiy ustun (tajriba, ko'nikmalar, maosh) -------------------------
    main: list = []

    experience_items = _main_item(
        styles, "Tajriba (yillar)", application.experience_years_range
    ) + _main_item(styles, "Mehnat faoliyati", application.work_experience_text)
    if experience_items:
        main += [
            Paragraph("Ish tajribasi", styles.main_section),
            _section_underline(),
            *experience_items,
            Spacer(1, 12),
        ]

    skill_items = _main_item(styles, "Kompyuter ko'nikmalari", application.computer_skills) + _main_item(
        styles, "Asosiy ko'nikmalar", application.key_skills
    )
    if skill_items:
        main += [
            Paragraph("Ko'nikmalar", styles.main_section),
            _section_underline(),
            *skill_items,
            Spacer(1, 12),
        ]

    salary_label = SALARY_LABELS_UZ.get(
        application.expected_salary_range, application.expected_salary_range
    )
    salary_items = _main_item(styles, "Kutilayotgan maosh", salary_label)
    if salary_items:
        main += [Paragraph("Kutilayotgan maosh", styles.main_section), _section_underline(), *salary_items]

    if not main:
        main = [Paragraph("Qo'shimcha ma'lumot kiritilmagan.", styles.main_value)]

    body_table = Table(
        [[sidebar, main]],
        colWidths=[SIDEBAR_WIDTH, content_width - SIDEBAR_WIDTH],
    )
    body_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), SIDEBAR_BG),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (0, 0), 8 * mm),
                ("RIGHTPADDING", (0, 0), (0, 0), 6 * mm),
                ("LEFTPADDING", (1, 0), (1, 0), 9 * mm),
                ("RIGHTPADDING", (1, 0), (1, 0), 2 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 8 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8 * mm),
                ("LINEAFTER", (0, 0), (0, 0), 0.75, LINE),
            ]
        )
    )

    story = [header_table, body_table]

    def _footer(canvas, _doc) -> None:
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.6)
        canvas.line(PAGE_MARGIN, PAGE_MARGIN - 4 * mm, A4[0] - PAGE_MARGIN, PAGE_MARGIN - 4 * mm)
        canvas.setFont(_FONT_NAME, 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(
            PAGE_MARGIN, PAGE_MARGIN - 9 * mm, f"{COMPANY_NAME} — Ariza #{application.id}"
        )
        canvas.drawRightString(A4[0] - PAGE_MARGIN, PAGE_MARGIN - 9 * mm, f"Sahifa {canvas.getPageNumber()}")
        canvas.restoreState()

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buffer.getvalue()
