"""cria a tabela projects (US-01)

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "char_length(btrim(name)) >= 1", name=op.f("ck_projects_name_not_blank")
        ),
        sa.CheckConstraint(
            "description IS NULL OR char_length(btrim(description)) >= 1",
            name=op.f("ck_projects_description_not_blank"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_projects")),
    )


def downgrade() -> None:
    op.drop_table("projects")
