import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

PRIORITIES = ("Alta", "Média", "Baixa")
DEFAULT_STATUS = "A fazer"
STATUSES = (DEFAULT_STATUS,)  # outros status só serão definidos quando houver quadro/sprint


def _in_list(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


class Story(Base):
    __tablename__ = "stories"
    __table_args__ = (
        # Rede de segurança no banco; a validação principal acontece na API.
        CheckConstraint("char_length(btrim(title)) >= 1", name="title_not_blank"),
        CheckConstraint(
            "description IS NULL OR char_length(btrim(description)) >= 1",
            name="description_not_blank",
        ),
        CheckConstraint(_in_list("priority", PRIORITIES), name="priority_allowed"),
        CheckConstraint(_in_list("status", STATUSES), name="status_allowed"),
        CheckConstraint(
            "jsonb_typeof(acceptance_criteria) = 'array' "
            "AND jsonb_array_length(acceptance_criteria) >= 1",
            name="criteria_non_empty_array",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Sem exclusão em cascata: remover um projeto com histórias deve ser uma decisão explícita.
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="RESTRICT"), index=True
    )
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str | None] = mapped_column(String(2000))
    priority: Mapped[str] = mapped_column(String(10))
    acceptance_criteria: Mapped[list[Any]] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(20), default=DEFAULT_STATUS)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
