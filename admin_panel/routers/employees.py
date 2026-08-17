from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from admin_panel.audit import log_action
from admin_panel.deps import get_session, require_roles
from admin_panel.schemas import EmployeeCreate, EmployeeOut, EmployeeUpdate
from admin_panel.security import hash_password
from app.config import get_settings
from app.db.models import Admin

router = APIRouter(prefix="/api/employees", tags=["employees"])

ROLES = {"super_admin", "admin", "hr"}


def _ensure_can_assign_role(actor: Admin, role: str) -> None:
    if role not in ROLES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Noto'g'ri rol")
    if role == "super_admin" and not _is_bootstrap_admin(actor):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Superadmin huquqini faqat asosiy (.env) superadmin bera oladi")


def _ensure_can_modify_target(actor: Admin, target: Admin) -> None:
    is_self = actor.id == target.id
    if _is_bootstrap_admin(target):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Asosiy (.env) superadminni panel orqali o'zgartirib bo'lmaydi")
    if target.role == "super_admin" and not is_self and not _is_bootstrap_admin(actor):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Superadminni faqat asosiy (.env) superadmin boshqara oladi")


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

    existing_phone = await session.scalar(select(Admin).where(Admin.phone == payload.phone))
    if existing_phone is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bu telefon raqami bilan xodim allaqachon mavjud")

    if payload.telegram_id is not None:
        existing_tg = await session.scalar(select(Admin).where(Admin.telegram_id == payload.telegram_id))
        if existing_tg is not None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bu Telegram ID bilan xodim allaqachon mavjud")

    employee = Admin(
        telegram_id=payload.telegram_id,
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.role,
        password_hash=hash_password(payload.password),
    )
    session.add(employee)
    await session.flush()
    await log_action(
        session,
        actor_id=admin.id,
        action="employee_create",
        entity_type="employee",
        entity_id=employee.id,
        meta={"full_name": employee.full_name, "role": employee.role},
    )
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

    role_changed = "role" in data and data["role"] != employee.role

    if employee.id == admin.id and (role_changed or data.get("is_active") is False):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "O'zingizni o'zgartira olmaysiz")

    if role_changed:
        _ensure_can_assign_role(admin, data["role"])

    if "phone" in data and data["phone"] and data["phone"] != employee.phone:
        existing_phone = await session.scalar(
            select(Admin).where(Admin.phone == data["phone"], Admin.id != employee.id)
        )
        if existing_phone is not None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bu telefon raqami bilan xodim allaqachon mavjud")

    if "telegram_id" in data and data["telegram_id"] is not None and data["telegram_id"] != employee.telegram_id:
        existing_tg = await session.scalar(
            select(Admin).where(Admin.telegram_id == data["telegram_id"], Admin.id != employee.id)
        )
        if existing_tg is not None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bu Telegram ID bilan xodim allaqachon mavjud")

    password = data.pop("password", None)
    changed_fields = list(data.keys())
    if password:
        employee.password_hash = hash_password(password)
        changed_fields.append("password")

    for field_name, value in data.items():
        setattr(employee, field_name, value)

    if changed_fields:
        await log_action(
            session,
            actor_id=admin.id,
            action="employee_update",
            entity_type="employee",
            entity_id=employee.id,
            meta={"changed_fields": changed_fields},
        )

    await session.commit()
    await session.refresh(employee)
    return EmployeeOut.model_validate(employee)


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: int,
    session: AsyncSession = Depends(get_session),
    admin: Admin = Depends(require_roles("super_admin", "admin")),
) -> None:
    employee = await session.get(Admin, employee_id)
    if employee is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Xodim topilmadi")

    _ensure_can_modify_target(admin, employee)

    if employee.id == admin.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "O'zingizni o'chira olmaysiz")

    await log_action(
        session,
        actor_id=admin.id,
        action="employee_delete",
        entity_type="employee",
        entity_id=employee.id,
        meta={"full_name": employee.full_name},
    )
    await session.delete(employee)
    await session.commit()
