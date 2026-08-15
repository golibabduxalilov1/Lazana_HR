from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from admin_panel.deps import get_current_admin, get_session, require_roles
from admin_panel.schemas import PositionCreate, PositionOut, PositionUpdate
from app.db.models import Admin, Application, Position

router = APIRouter(prefix="/api/positions", tags=["positions"])


@router.get("", response_model=list[PositionOut])
async def list_positions(
    category_id: int | None = None,
    session: AsyncSession = Depends(get_session),
    _admin: Admin = Depends(get_current_admin),
) -> list[PositionOut]:
    query = select(Position).order_by(Position.is_priority.desc(), Position.category_id, Position.sort_order)
    if category_id:
        query = query.where(Position.category_id == category_id)
    rows = await session.scalars(query)
    return [PositionOut.model_validate(r) for r in rows]


@router.post("", response_model=PositionOut, status_code=status.HTTP_201_CREATED)
async def create_position(
    payload: PositionCreate,
    session: AsyncSession = Depends(get_session),
    _admin: Admin = Depends(require_roles("super_admin", "admin")),
) -> PositionOut:
    position = Position(**payload.model_dump())
    session.add(position)
    await session.commit()
    await session.refresh(position)
    return PositionOut.model_validate(position)


@router.patch("/{position_id}", response_model=PositionOut)
async def update_position(
    position_id: int,
    payload: PositionUpdate,
    session: AsyncSession = Depends(get_session),
    _admin: Admin = Depends(require_roles("super_admin", "admin")),
) -> PositionOut:
    position = await session.get(Position, position_id)
    if position is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lavozim topilmadi")

    for field_name, value in payload.model_dump(exclude_unset=True).items():
        setattr(position, field_name, value)

    await session.commit()
    await session.refresh(position)
    return PositionOut.model_validate(position)


@router.delete("/{position_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_position(
    position_id: int,
    session: AsyncSession = Depends(get_session),
    _admin: Admin = Depends(require_roles("super_admin", "admin")),
) -> None:
    position = await session.get(Position, position_id)
    if position is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lavozim topilmadi")

    has_applications = await session.scalar(
        select(Application.id).where(Application.position_id == position_id).limit(1)
    )
    if has_applications is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Bu lavozimga arizalar mavjud, uni o'chirib bo'lmaydi. Nofaollashtiring.",
        )

    await session.delete(position)
    await session.commit()
