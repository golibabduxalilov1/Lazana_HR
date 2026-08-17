from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from admin_panel.audit import log_action
from admin_panel.deps import get_session
from admin_panel.schemas import LoginRequest, LoginResponse
from admin_panel.security import create_access_token, verify_password
from app.config import get_settings
from app.db.models import Admin

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_session)) -> LoginResponse:
    admin = await session.scalar(select(Admin).where(Admin.phone == payload.phone, Admin.is_active.is_(True)))
    if admin is None or not admin.password_hash or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Raqam yoki parol noto'g'ri")

    await log_action(session, actor_id=admin.id, action="login", entity_type="employee", entity_id=admin.id)
    await session.commit()

    token = create_access_token(admin.id, admin.role)
    bootstrap_id = get_settings().bootstrap_super_admin_id
    is_env_admin = bootstrap_id is not None and admin.telegram_id == bootstrap_id
    return LoginResponse(access_token=token, role=admin.role, full_name=admin.full_name, is_env_admin=is_env_admin)
