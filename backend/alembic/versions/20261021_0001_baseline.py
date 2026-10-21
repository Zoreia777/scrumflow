"""baseline (sem tabelas de negócio)

Revision ID: 0001
Revises:
Create Date: 2026-10-21
"""

from collections.abc import Sequence

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Migração inicial vazia: só registra a versão na tabela de controle do Alembic."""


def downgrade() -> None:
    """Nada a desfazer."""
