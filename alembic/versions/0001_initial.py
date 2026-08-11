"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("username", sa.String(255)),
        sa.Column("first_name", sa.String(255)),
        sa.Column("last_name", sa.String(255)),
        sa.Column("language", sa.String(5), nullable=False, server_default="uz"),
        sa.Column("source", sa.String(50)),
        sa.Column("is_blocked", sa.Boolean(), server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("telegram_id", name="uq_users_telegram_id"),
    )
    op.create_index("idx_users_telegram_id", "users", ["telegram_id"])

    op.create_table(
        "position_categories",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(5), nullable=False),
        sa.Column("name_uz", sa.String(100), nullable=False),
        sa.Column("name_ru", sa.String(100), nullable=False),
        sa.Column("question_set", sa.String(50), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.UniqueConstraint("code", name="uq_position_categories_code"),
    )

    op.create_table(
        "positions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("position_categories.id"), nullable=False),
        sa.Column("name_uz", sa.String(150), nullable=False),
        sa.Column("name_ru", sa.String(150)),
        sa.Column("sort_order", sa.Integer(), server_default="0"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_positions_category_id", "positions", ["category_id"])

    op.create_table(
        "admins",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("full_name", sa.String(255)),
        sa.Column("role", sa.String(20), nullable=False, server_default="hr"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("username", sa.String(100)),
        sa.Column("password_hash", sa.String(255)),
        sa.UniqueConstraint("telegram_id", name="uq_admins_telegram_id"),
        sa.UniqueConstraint("username", name="uq_admins_username"),
    )

    op.create_table(
        "applications",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("position_id", sa.Integer(), sa.ForeignKey("positions.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("full_name", sa.String(255)),
        sa.Column("phone", sa.String(20)),
        sa.Column("address", sa.Text()),
        sa.Column("birth_date", sa.Date()),
        sa.Column("work_experience_text", sa.Text()),
        sa.Column("experience_years_range", sa.String(20)),
        sa.Column("education_level", sa.String(30)),
        sa.Column("education_institution", sa.String(255)),
        sa.Column("languages", postgresql.ARRAY(sa.String())),
        sa.Column("languages_other", sa.String(100)),
        sa.Column("expected_salary_range", sa.String(30)),
        sa.Column("computer_skills", sa.Text()),
        sa.Column("key_skills", sa.Text()),
        sa.Column("extra_data", postgresql.JSONB()),
        sa.Column("source", sa.String(50)),
        sa.Column("submitted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_applications_user_id", "applications", ["user_id"])
    op.create_index("idx_applications_position_id", "applications", ["position_id"])
    op.create_index("idx_applications_status", "applications", ["status"])
    op.create_index("idx_applications_submitted_at", "applications", ["submitted_at"])

    op.create_table(
        "application_status_history",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("application_id", sa.BigInteger(), sa.ForeignKey("applications.id"), nullable=False),
        sa.Column("old_status", sa.String(20)),
        sa.Column("new_status", sa.String(20), nullable=False),
        sa.Column("changed_by", sa.BigInteger(), sa.ForeignKey("admins.id")),
        sa.Column("comment", sa.Text()),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(
        "idx_status_history_application_id", "application_status_history", ["application_id"]
    )

    op.create_table(
        "bot_texts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("key", sa.String(100), nullable=False),
        sa.Column("text_uz", sa.Text(), nullable=False),
        sa.Column("text_ru", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("key", name="uq_bot_texts_key"),
    )

    op.create_table(
        "audit_log",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("actor_type", sa.String(20)),
        sa.Column("actor_id", sa.BigInteger()),
        sa.Column("action", sa.String(100)),
        sa.Column("entity_type", sa.String(50)),
        sa.Column("entity_id", sa.BigInteger()),
        sa.Column("meta", postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("bot_texts")
    op.drop_index("idx_status_history_application_id", table_name="application_status_history")
    op.drop_table("application_status_history")
    op.drop_index("idx_applications_submitted_at", table_name="applications")
    op.drop_index("idx_applications_status", table_name="applications")
    op.drop_index("idx_applications_position_id", table_name="applications")
    op.drop_index("idx_applications_user_id", table_name="applications")
    op.drop_table("applications")
    op.drop_table("admins")
    op.drop_index("idx_positions_category_id", table_name="positions")
    op.drop_table("positions")
    op.drop_table("position_categories")
    op.drop_index("idx_users_telegram_id", table_name="users")
    op.drop_table("users")
