from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from admin_panel.deps import get_session, require_roles
from admin_panel.schemas import EmployeeCreate, EmployeeOut, EmployeeUpdate
from app.config import get_settings
from app.db.models import Admin

router = APIRouter(prefix="/api/employees", tags=["employees"])

ROLES = {"super_admin", "admin", "hr"}


def _ensure_can_assign_role(actor: Admin, role: str) -> None:
    if role not in ROLES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Noto'g'ri rol")
    if role == "super_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Superadmin huquqini bera olmaysiz")


def _ensure_can_modify_target(actor: Admin, target: Admin) -> None:
    if actor.role == "admin" and target.role == "super_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Superadmin hisobini o'zgartira olmaysiz")


def _is_bootstrap_admin(employee: Admin) -> bool:
    bootstrap_id = get_settings().bootstrap_super_admin_id
    return bootstrap_id is not None and employee.telegram_id == bootstrap_id


@router.get("", response_model=list[EmployeeOut])
async def list_employees(
    session: AsyncSession = Depends(get_session),
    _admin: Admin = Depends(require_roles("super_admin", "admin")),
) -> list[EmployeeOut]:
    rows = await session.scalars(select(Admin).order_by(Admin.id))
    return [EmployeeOut.model_validate(r) for r in rows]


@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(require_roles("super_admin", "admin")),
) -> EmployeeOut:
    _ensure_can_assign_role(admin, payload.role)

    existing = await session.scalar(select(Admin).where(Admin.telegram_id == payload.telegram_id))
    if existing is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bu Telegram ID bilan xodim allaqachon mavjud")

    employee = Admin(
        telegram_id=payload.telegram_id,
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.role,
        username=None,
        password_hash=None,
    )
    session.add(employee)
    await session.commit()
    await session.refresh(employee)
    return EmployeeOut.model_validate(employee)


@router.patch("/{employee_id}", response_model=EmployeeOut)
async def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(require_roles("super_admin", "admin")),
) -> EmployeeOut:
    employee = await session.get(Admin, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Xodim topilmadi")

    _ensure_can_modify_target(admin, employee)

    data = payload.model_dump(exclude_unset=True)

    if employee.id == admin.id and ("role" in data or data.get("is_active") is False):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "O'zingizni o'zgartira olmaysiz")

    if data.get("is_active") is False and _is_bootstrap_admin(employee):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Asosiy superadminni faolsizlantirib bo'lmaydi")

    if data.get("is_active") is False and employee.role == "super_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Superadminni faolsizlantirib bo'lmaydi")

    if data.get("role") is not None:
        if employee.role == "super_admin":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Superadmin rolini o'zgartirib bo'lmaydi")
        _ensure_can_assign_role(admin, data["role"])

    for field_name, value in data.items():
        setattr(employee, field_name, value)

    await session.commit()
    await session.refresh(employee)
    return EmployeeOut.model_validate(employee)


@router.delete("/{employee_id}", response_model=EmployeeOut)
async def delete_employee(
    employee_id: int,
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(require_roles("super_admin", "admin")),
) -> EmployeeOut:
    employee = await session.get(Admin, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Xodim topilmadi")

    _ensure_can_modify_target(admin, employee)

    if employee.id == admin.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "O'zingizni o'chira olmaysiz")

    if _is_bootstrap_admin(employee):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Asosiy superadminni o'chirib bo'lmaydi")

    if employee.role == "super_admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Superadminni o'chirib bo'lmaydi")

    employee.is_active = False
    await session.commit()
    await session.refresh(employee)
    return EmployeeOut.model_validate(employee)
