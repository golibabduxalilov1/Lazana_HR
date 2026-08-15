"""admins: phone-based login, optional telegram_id

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("admins", "telegram_id", existing_type=sa.BigInteger(), nullable=True)
    op.drop_constraint("uq_admins_username", "admins", type_="unique")
    op.drop_column("admins", "username")
    op.create_unique_constraint("uq_admins_phone", "admins", ["phone"])


def downgrade() -> None:
    op.drop_constraint("uq_admins_phone", "admins", type_="unique")
    op.add_column("admins", sa.Column("username", sa.String(100)))
    op.create_unique_constraint("uq_admins_username", "admins", ["username"])
    op.alter_column("admins", "telegram_id", existing_type=sa.BigInteger(), nullable=False)
