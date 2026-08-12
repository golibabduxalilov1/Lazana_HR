from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from admin_panel.deps import get_session, require_roles
from app.db.models import Admin, Application, Position, PositionCategory
from app.services.export import applications_to_xlsx, export_filename

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/applications.xlsx")
async def export_applications_xlsx(
    date_from: dt.date | None = None,
    date_to: dt.date | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    category_id: int | None = None,
    position_id: int | None = None,
    search: str | None = None,
    session: AsyncSession = Depends(get_session),
    _admin: Admin = Depends(require_roles("super_admin", "admin")),
) -> StreamingResponse:
    query = (
        select(Application, PositionCategory.name_uz, Position.name_uz)
        .join(Position, Application.position_id == Position.id)
        .join(PositionCategory, Position.category_id == PositionCategory.id)
        .where(Application.status != "draft")
        .order_by(Application.submitted_at.desc())
    )
    if status_filter:
        query = query.where(Application.status == status_filter)
    if category_id:
        query = query.where(PositionCategory.id == category_id)
    if position_id:
        query = query.where(Position.id == position_id)
    if search:
        pattern = f"%{search}%"
        query = query.where(or_(Application.full_name.ilike(pattern), Application.phone.ilike(pattern)))
    if date_from:
        query = query.where(Application.submitted_at >= dt.datetime.combine(date_from, dt.time.min, dt.timezone.utc))
    if date_to:
        query = query.where(Application.submitted_at <= dt.datetime.combine(date_to, dt.time.max, dt.timezone.utc))

    rows = [(app_, cat_name, pos_name) for app_, cat_name, pos_name in (await session.execute(query)).all()]
    xlsx_bytes = applications_to_xlsx(rows)
    filename = export_filename(ext="xlsx")

    return StreamingResponse(
        iter([xlsx_bytes]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
