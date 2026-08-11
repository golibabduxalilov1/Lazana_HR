from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from admin_panel.deps import get_session, require_roles
from app.db.models import Admin, Application, Position, PositionCategory
from app.services.export import applications_to_csv, export_filename

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/applications.csv")
async def export_applications_csv(
    date_from: dt.date | None = None,
    date_to: dt.date | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
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
    if date_from:
        query = query.where(Application.submitted_at >= dt.datetime.combine(date_from, dt.time.min, dt.timezone.utc))
    if date_to:
        query = query.where(Application.submitted_at <= dt.datetime.combine(date_to, dt.time.max, dt.timezone.utc))

    rows = [(app_, cat_name, pos_name) for app_, cat_name, pos_name in (await session.execute(query)).all()]
    csv_text = applications_to_csv(rows)
    filename = export_filename()

    return StreamingResponse(
        iter([csv_text.encode("utf-8-sig")]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
