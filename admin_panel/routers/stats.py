from __future__ import annotations

import datetime as dt
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from admin_panel.deps import get_current_admin, get_session
from admin_panel.schemas import StatsSummary
from app.db.models import Admin, Application, Position, PositionCategory

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/summary", response_model=StatsSummary)
async def stats_summary(
    session: AsyncSession = Depends(get_session), _admin: Admin = Depends(get_current_admin)
) -> StatsSummary:
    base = select(Application).where(Application.status != "draft")
    total = await session.scalar(select(func.count()).select_from(base.subquery())) or 0

    status_rows = (
        await session.execute(
            select(Application.status, func.count()).where(Application.status != "draft").group_by(Application.status)
        )
    ).all()
    by_status = {status_: count for status_, count in status_rows}

    category_rows = (
        await session.execute(
            select(PositionCategory.name_uz, func.count(Application.id))
            .join(Position, Position.category_id == PositionCategory.id)
            .join(Application, Application.position_id == Position.id)
            .where(Application.status != "draft")
            .group_by(PositionCategory.name_uz)
        )
    ).all()
    by_category = {name: count for name, count in category_rows}

    now = dt.datetime.now(dt.timezone.utc)
    last_7 = await session.scalar(
        select(func.count()).select_from(Application).where(Application.submitted_at >= now - dt.timedelta(days=7))
    ) or 0
    last_30 = await session.scalar(
        select(func.count()).select_from(Application).where(Application.submitted_at >= now - dt.timedelta(days=30))
    ) or 0

    trend_start = now - dt.timedelta(days=29)
    trend_rows = (
        await session.execute(
            select(Application.submitted_at)
            .where(Application.status != "draft")
            .where(Application.submitted_at >= trend_start)
        )
    ).scalars().all()
    trend_counts = Counter(ts.date().isoformat() for ts in trend_rows if ts is not None)
    daily_trend = {}
    for i in range(30):
        day = (trend_start + dt.timedelta(days=i)).date().isoformat()
        daily_trend[day] = trend_counts.get(day, 0)

    return StatsSummary(
        total=total,
        by_status=by_status,
        by_category=by_category,
        last_7_days=last_7,
        last_30_days=last_30,
        daily_trend=daily_trend,
    )
