"""cria a tabela stories (US-02)

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Apenas cria uma tabela nova: os registros de `projects` não são tocados.
    op.create_table(
        "stories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("priority", sa.String(length=10), nullable=False),
        sa.Column("acceptance_criteria", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
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
            "char_length(btrim(title)) >= 1", name=op.f("ck_stories_title_not_blank")
        ),
        sa.CheckConstraint(
            "description IS NULL OR char_length(btrim(description)) >= 1",
            name=op.f("ck_stories_description_not_blank"),
        ),
        sa.CheckConstraint(
            "priority IN ('Alta', 'Média', 'Baixa')", name=op.f("ck_stories_priority_allowed")
        ),
        sa.CheckConstraint("status IN ('A fazer')", name=op.f("ck_stories_status_allowed")),
        sa.CheckConstraint(
            "jsonb_typeof(acceptance_criteria) = 'array' "
            "AND jsonb_array_length(acceptance_criteria) >= 1",
            name=op.f("ck_stories_criteria_non_empty_array"),
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name=op.f("fk_stories_project_id_projects"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stories")),
    )
    op.create_index(op.f("ix_stories_project_id"), "stories", ["project_id"], unique=False)


def downgrade() -> None:
    # Remove somente `stories` (e seu índice); `projects` permanece intacta.
    op.drop_index(op.f("ix_stories_project_id"), table_name="stories")
    op.drop_table("stories")
