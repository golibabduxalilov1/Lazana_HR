from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from admin_panel.deps import get_current_admin, get_session, require_roles
from admin_panel.schemas import (
    ApplicationDetail,
    ApplicationListItem,
    ApplicationListResponse,
    CategoryOut,
    StatusChangeRequest,
    StatusHistoryItem,
)
from app.db.models import Admin, Application, ApplicationStatusHistory, Position, PositionCategory

router = APIRouter(prefix="/api", tags=["applications"])

VALID_TRANSITIONS = {
    "submitted": {"reviewed"},
    "reviewed": {"invited", "rejected"},
    "invited": set(),
    "rejected": set(),
}


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(
    session: AsyncSession = Depends(get_session), _admin: Admin = Depends(get_current_admin)
) -> list[CategoryOut]:
    rows = await session.scalars(select(PositionCategory).order_by(PositionCategory.sort_order))
    return [CategoryOut.model_validate(r) for r in rows]


@router.get("/applications", response_model=ApplicationListResponse)
async def list_applications(
    status_filter: str | None = Query(default=None, alias="status"),
    category_id: int | None = None,
    position_id: int | None = None,
    search: str | None = None,
    date_from: dt.date | None = None,
    date_to: dt.date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    _admin: Admin = Depends(get_current_admin),
) -> ApplicationListResponse:
    query = (
        select(Application, PositionCategory.name_uz, Position.name_uz)
        .join(Position, Application.position_id == Position.id)
        .join(PositionCategory, Position.category_id == PositionCategory.id)
        .where(Application.status != "draft")
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

    total = await session.scalar(select(func.count()).select_from(query.subquery())) or 0

    query = query.order_by(Application.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = (await session.execute(query)).all()

    items = [
        ApplicationListItem(
            id=app_.id,
            status=app_.status,
            full_name=app_.full_name,
            phone=app_.phone,
            category_name=cat_name,
            position_name=pos_name,
            submitted_at=app_.submitted_at,
            created_at=app_.created_at,
        )
        for app_, cat_name, pos_name in rows
    ]
    return ApplicationListResponse(total=total, page=page, page_size=page_size, items=items)


@router.get("/applications/{application_id}", response_model=ApplicationDetail)
async def get_application(
    application_id: int,
    session: AsyncSession = Depends(get_session),
    _admin: Admin = Depends(get_current_admin),
) -> ApplicationDetail:
    application = await session.get(Application, application_id)
    if application is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ariza topilmadi")

    position = await session.get(Position, application.position_id)
    category = await session.get(PositionCategory, position.category_id)

    history_rows = (
        await session.execute(
            select(ApplicationStatusHistory, Admin.full_name)
            .outerjoin(Admin, ApplicationStatusHistory.changed_by == Admin.id)
            .where(ApplicationStatusHistory.application_id == application_id)
            .order_by(ApplicationStatusHistory.changed_at.desc())
        )
    ).all()
    status_history = [
        StatusHistoryItem(
            id=h.id,
            old_status=h.old_status,
            new_status=h.new_status,
            comment=h.comment,
            changed_by_name=admin_name,
            changed_at=h.changed_at,
        )
        for h, admin_name in history_rows
    ]

    return ApplicationDetail(
        id=application.id,
        status=application.status,
        category_name=category.name_uz,
        position_name=position.name_uz,
        full_name=application.full_name,
        phone=application.phone,
        address=application.address,
        birth_date=application.birth_date,
        work_experience_text=application.work_experience_text,
        experience_years_range=application.experience_years_range,
        education_level=application.education_level,
        education_institution=application.education_institution,
        languages=application.languages,
        languages_other=application.languages_other,
        expected_salary_range=application.expected_salary_range,
        computer_skills=application.computer_skills,
        key_skills=application.key_skills,
        source=application.source,
        submitted_at=application.submitted_at,
        created_at=application.created_at,
        status_history=status_history,
    )


@router.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    application_id: int,
    session: AsyncSession = Depends(get_session),
    _admin: Admin = Depends(require_roles("super_admin")),
) -> None:
    application = await session.get(Application, application_id)
    if application is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ariza topilmadi")

    await session.execute(
        ApplicationStatusHistory.__table__.delete().where(ApplicationStatusHistory.application_id == application_id)
    )
    await session.delete(application)
    await session.commit()


@router.patch("/applications/{application_id}/status")
async def change_status(
    application_id: int,
    payload: StatusChangeRequest,
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(require_roles("super_admin", "admin")),
) -> dict:
    application = await session.get(Application, application_id)
    if application is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ariza topilmadi")

    allowed = VALID_TRANSITIONS.get(application.status, set())
    if payload.new_status not in allowed:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"«{application.status}» holatidan «{payload.new_status}»ga o'tish mumkin emas",
        )

    old_status = application.status
    application.status = payload.new_status
    session.add(
        ApplicationStatusHistory(
            application_id=application.id,
            old_status=old_status,
            new_status=payload.new_status,
            changed_by=admin.id,
            comment=payload.comment,
        )
    )
    await session.commit()
    return {"ok": True, "status": application.status}
