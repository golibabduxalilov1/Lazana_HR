from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from admin_panel.deps import get_session
from admin_panel.schemas import LoginRequest, LoginResponse
from admin_panel.security import create_access_token, verify_password
from app.db.models import Admin

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_session)) -> LoginResponse:
    admin = await session.scalar(select(Admin).where(Admin.username == payload.username, Admin.is_active.is_(True)))
    if admin is not None and admin.role == "hr":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "HR xodimlari web admin panelga kira olmaydi")
    if admin is None or not admin.password_hash or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Login yoki parol noto'g'ri")

    token = create_access_token(admin.id, admin.role)
    return LoginResponse(access_token=token, role=admin.role, full_name=admin.full_name)
