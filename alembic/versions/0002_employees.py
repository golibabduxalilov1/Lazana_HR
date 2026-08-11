"""add phone to admins, migrate viewer role to hr

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("admins", sa.Column("phone", sa.String(20)))
    op.execute("UPDATE admins SET role = 'hr' WHERE role = 'viewer'")


def downgrade() -> None:
    op.drop_column("admins", "phone")
