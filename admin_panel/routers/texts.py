from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from admin_panel.deps import get_current_admin, get_session, require_roles
from admin_panel.schemas import BotTextOut, BotTextUpdate
from app.db.models import Admin, BotText

router = APIRouter(prefix="/api/texts", tags=["texts"])


@router.get("", response_model=list[BotTextOut])
async def list_texts(
    session: AsyncSession = Depends(get_session), _admin: Admin = Depends(get_current_admin)
) -> list[BotTextOut]:
    rows = await session.scalars(select(BotText).order_by(BotText.key))
    return [BotTextOut.model_validate(r) for r in rows]


@router.patch("/{key}", response_model=BotTextOut)
async def update_text(
    key: str,
    payload: BotTextUpdate,
    session: AsyncSession = Depends(get_session),
    _admin: Admin = Depends(require_roles("super_admin", "admin")),
) -> BotTextOut:
    row = await session.scalar(select(BotText).where(BotText.key == key))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Matn topilmadi")

    for field_name, value in payload.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(row, field_name, value)

    await session.commit()
    await session.refresh(row)
    return BotTextOut.model_validate(row)
