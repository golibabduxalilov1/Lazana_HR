"""application_status_history.changed_by: ON DELETE SET NULL (allow hard-deleting admins)

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-17

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "application_status_history_changed_by_fkey", "application_status_history", type_="foreignkey"
    )
    op.create_foreign_key(
        "application_status_history_changed_by_fkey",
        "application_status_history",
        "admins",
        ["changed_by"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "application_status_history_changed_by_fkey", "application_status_history", type_="foreignkey"
    )
    op.create_foreign_key(
        "application_status_history_changed_by_fkey",
        "application_status_history",
        "admins",
        ["changed_by"],
        ["id"],
    )
