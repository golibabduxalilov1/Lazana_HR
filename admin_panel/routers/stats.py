from __future__ import annotations

import datetime as dt
from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from admin_panel.deps import get_current_admin, get_session
from admin_panel.schemas import StatsFunnelStage, StatsSummary, StatsTopPosition, StatsTrendPoint
from app.db.models import Admin, Application, ApplicationStatusHistory, Position, PositionCategory

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _bounds(day_from: dt.date, day_to: dt.date) -> tuple[dt.datetime, dt.datetime]:
    start = dt.datetime.combine(day_from, dt.time.min, dt.timezone.utc)
    end = dt.datetime.combine(day_to, dt.time.max, dt.timezone.utc)
    return start, end


def _pct_change(current: int, previous: int) -> float | None:
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 1)


@router.get("/summary", response_model=StatsSummary)
async def stats_summary(
    date_from: dt.date | None = None,
    date_to: dt.date | None = None,
    category_id: list[int] | None = Query(default=None),
    status: list[str] | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
    _admin: Admin = Depends(get_current_admin),
) -> StatsSummary:
    today = dt.datetime.now(dt.timezone.utc).date()
    date_to = date_to or today
    date_from = date_from or (date_to - dt.timedelta(days=29))
    if date_from > date_to:
        date_from, date_to = date_to, date_from

    period_days = (date_to - date_from).days + 1
    prev_date_to = date_from - dt.timedelta(days=1)
    prev_date_from = prev_date_to - dt.timedelta(days=period_days - 1)

    range_start, range_end = _bounds(date_from, date_to)
    prev_range_start, prev_range_end = _bounds(prev_date_from, prev_date_to)

    def scoped(start: dt.datetime, end: dt.datetime, *, apply_status: bool):
        q = (
            select(Application.id)
            .join(Position, Application.position_id == Position.id)
            .where(Application.status != "draft")
            .where(Application.submitted_at >= start)
            .where(Application.submitted_at <= end)
        )
        if category_id:
            q = q.where(Position.category_id.in_(category_id))
        if apply_status and status:
            q = q.where(Application.status.in_(status))
        return q

    async def count_of(query) -> int:
        return await session.scalar(select(func.count()).select_from(query.subquery())) or 0

    # --- Fully scoped (date + category + status) numbers: headline totals, status/category breakdown, trend ---
    total = await count_of(scoped(range_start, range_end, apply_status=True))
    prev_total = await count_of(scoped(prev_range_start, prev_range_end, apply_status=True))

    status_rows = (
        await session.execute(
            select(Application.status, func.count())
            .where(Application.id.in_(scoped(range_start, range_end, apply_status=True)))
            .group_by(Application.status)
        )
    ).all()
    by_status = {s: c for s, c in status_rows}

    prev_status_rows = (
        await session.execute(
            select(Application.status, func.count())
            .where(Application.id.in_(scoped(prev_range_start, prev_range_end, apply_status=True)))
            .group_by(Application.status)
        )
    ).all()
    prev_by_status = {s: c for s, c in prev_status_rows}

    category_rows = (
        await session.execute(
            select(PositionCategory.name_uz, func.count(Application.id))
            .join(Position, Position.category_id == PositionCategory.id)
            .join(Application, Application.position_id == Position.id)
            .where(Application.id.in_(scoped(range_start, range_end, apply_status=True)))
            .group_by(PositionCategory.name_uz)
        )
    ).all()
    by_category = {name: count for name, count in category_rows}

    trend_rows = (
        await session.execute(
            select(Application.submitted_at).where(
                Application.id.in_(scoped(prev_range_start, range_end, apply_status=True))
            )
        )
    ).scalars().all()
    counts_by_day = Counter(ts.date().isoformat() for ts in trend_rows if ts is not None)

    daily_trend: list[StatsTrendPoint] = []
    for i in range(period_days):
        cur_day = date_from + dt.timedelta(days=i)
        prev_day = prev_date_from + dt.timedelta(days=i)
        daily_trend.append(
            StatsTrendPoint(
                date=cur_day.isoformat(),
                label=f"{cur_day.day:02d}.{cur_day.month:02d}",
                current=counts_by_day.get(cur_day.isoformat(), 0),
                previous=counts_by_day.get(prev_day.isoformat(), 0),
            )
        )

    reviewed_count = by_status.get("reviewed", 0)
    invited_count = by_status.get("invited", 0)
    rejected_count = by_status.get("rejected", 0)
    change_pct = _pct_change(total, prev_total)
    reviewed_change_pct = _pct_change(reviewed_count, prev_by_status.get("reviewed", 0))
    invited_change_pct = _pct_change(invited_count, prev_by_status.get("invited", 0))

    # --- Pipeline numbers (date + category only — status filter would break the funnel/avg/top-N logic) ---
    pipeline_ids_q = scoped(range_start, range_end, apply_status=False)
    pipeline_total = await count_of(pipeline_ids_q)

    reviewed_ever = await session.scalar(
        select(func.count(func.distinct(ApplicationStatusHistory.application_id)))
        .where(ApplicationStatusHistory.new_status == "reviewed")
        .where(ApplicationStatusHistory.application_id.in_(pipeline_ids_q))
    ) or 0

    invited_ever = await session.scalar(
        select(func.count(func.distinct(ApplicationStatusHistory.application_id)))
        .where(ApplicationStatusHistory.new_status == "invited")
        .where(ApplicationStatusHistory.application_id.in_(pipeline_ids_q))
    ) or 0

    def stage_pct(count: int) -> float:
        return round(count / pipeline_total * 100, 1) if pipeline_total else 0.0

    funnel = [
        StatsFunnelStage(key="submitted", count=pipeline_total, pct=100.0),
        StatsFunnelStage(key="reviewed", count=reviewed_ever, pct=stage_pct(reviewed_ever)),
        StatsFunnelStage(key="invited", count=invited_ever, pct=stage_pct(invited_ever)),
    ]

    review_rows = (
        await session.execute(
            select(Application.submitted_at, func.min(ApplicationStatusHistory.changed_at))
            .join(ApplicationStatusHistory, ApplicationStatusHistory.application_id == Application.id)
            .where(ApplicationStatusHistory.new_status == "reviewed")
            .where(Application.id.in_(pipeline_ids_q))
            .group_by(Application.id, Application.submitted_at)
        )
    ).all()
    review_deltas = [
        (reviewed_at - submitted_at).total_seconds() / 86400
        for submitted_at, reviewed_at in review_rows
        if submitted_at is not None
    ]
    avg_review_days = round(sum(review_deltas) / len(review_deltas), 1) if review_deltas else None

    top_rows = (
        await session.execute(
            select(Position.id, Position.name_uz, PositionCategory.name_uz, func.count(Application.id))
            .join(Application, Application.position_id == Position.id)
            .join(PositionCategory, Position.category_id == PositionCategory.id)
            .where(Application.id.in_(pipeline_ids_q))
            .group_by(Position.id, Position.name_uz, PositionCategory.name_uz)
            .order_by(func.count(Application.id).desc())
            .limit(5)
        )
    ).all()
    max_top = max((count for *_, count in top_rows), default=0)
    top_positions = [
        StatsTopPosition(
            position_id=pid,
            name=name,
            category_name=cat_name,
            count=count,
            pct=round(count / max_top * 100, 1) if max_top else 0.0,
        )
        for pid, name, cat_name, count in top_rows
    ]

    return StatsSummary(
        total=total,
        prev_total=prev_total,
        change_pct=change_pct,
        by_status=by_status,
        by_category=by_category,
        reviewed_count=reviewed_count,
        reviewed_change_pct=reviewed_change_pct,
        invited_count=invited_count,
        invited_change_pct=invited_change_pct,
        rejected_count=rejected_count,
        avg_review_days=avg_review_days,
        daily_trend=daily_trend,
        funnel=funnel,
        top_positions=top_positions,
        date_from=date_from,
        date_to=date_to,
    )
