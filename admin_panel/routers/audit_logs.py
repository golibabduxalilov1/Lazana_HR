from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from admin_panel.deps import get_session, require_roles
from admin_panel.schemas import AuditLogItem, AuditLogListResponse
from app.db.models import Admin, AuditLog

router = APIRouter(prefix="/api/audit-logs", tags=["audit-logs"])


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    action: str | None = None,
    entity_type: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    _admin: Admin = Depends(require_roles("super_admin", "admin")),
) -> AuditLogListResponse:
    query = select(AuditLog)
    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)

    total = await session.scalar(select(func.count()).select_from(query.subquery())) or 0

    query = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    rows = list(await session.scalars(query))

    actor_ids = {r.actor_id for r in rows if r.actor_id is not None}
    actor_names: dict[int, str | None] = {}
    if actor_ids:
        admin_rows = await session.scalars(select(Admin).where(Admin.id.in_(actor_ids)))
        actor_names = {a.id: a.full_name for a in admin_rows}

    items = [
        AuditLogItem(
            id=r.id,
            actor_type=r.actor_type,
            actor_id=r.actor_id,
            actor_name=actor_names.get(r.actor_id) if r.actor_id is not None else None,
            action=r.action,
            entity_type=r.entity_type,
            entity_id=r.entity_id,
            meta=r.meta,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return AuditLogListResponse(total=total, page=page, page_size=page_size, items=items)
