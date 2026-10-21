"""Contratos da API de histórias de usuário e regras de validação (ADR-002, seção 7)."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic_core import PydanticCustomError

from app.core.text import normalize_text
from app.models.story import PRIORITIES

TITLE_MAX_LENGTH = 150
DESCRIPTION_MAX_LENGTH = 2000
CRITERION_MAX_LENGTH = 500
CRITERIA_MAX_ITEMS = 20


def clean_title(value: object) -> str:
    """Título obrigatório: 1 a 150 caracteres depois da normalização."""
    if value is None:
        raise PydanticCustomError("blank", "O título não pode ficar vazio.")
    if not isinstance(value, str):
        raise PydanticCustomError("invalid_type", "O título deve ser um texto.")
    title = normalize_text(value)
    if not title:
        raise PydanticCustomError("blank", "O título não pode ficar vazio.")
    if len(title) > TITLE_MAX_LENGTH:
        raise PydanticCustomError(
            "too_long",
            "O título deve ter no máximo {limit} caracteres.",
            {"limit": TITLE_MAX_LENGTH},
        )
    return title


def clean_description(value: object) -> str | None:
    """Descrição opcional: até 2000 caracteres; texto vazio ou só espaços vira nulo."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise PydanticCustomError("invalid_type", "A descrição deve ser um texto.")
    description = normalize_text(value)
    if not description:
        return None
    if len(description) > DESCRIPTION_MAX_LENGTH:
        raise PydanticCustomError(
            "too_long",
            "A descrição deve ter no máximo {limit} caracteres.",
            {"limit": DESCRIPTION_MAX_LENGTH},
        )
    return description


def clean_priority(value: object) -> str:
    """Exatamente Alta, Média ou Baixa (diferencia maiúsculas; sem apelidos)."""
    if value not in PRIORITIES:  # inclui None e tipos que não são texto
        raise PydanticCustomError("invalid_priority", "A prioridade deve ser Alta, Média ou Baixa.")
    assert isinstance(value, str)
    return value


def clean_criteria(value: object) -> list[str]:
    """Lista com 1 a 20 critérios; cada item tem 1 a 500 caracteres. Nunca descarta item vazio."""
    if value is None:
        raise PydanticCustomError("criteria_required", "Informe ao menos um critério de aceitação.")
    if not isinstance(value, list):
        raise PydanticCustomError(
            "invalid_type", "Os critérios de aceitação devem ser uma lista de textos."
        )
    if not value:
        raise PydanticCustomError("criteria_required", "Informe ao menos um critério de aceitação.")
    if len(value) > CRITERIA_MAX_ITEMS:
        raise PydanticCustomError(
            "too_many",
            "Informe no máximo {limit} critérios de aceitação.",
            {"limit": CRITERIA_MAX_ITEMS},
        )
    cleaned: list[str] = []
    for position, item in enumerate(value, start=1):
        if not isinstance(item, str):
            raise PydanticCustomError(
                "invalid_type",
                "O critério de aceitação {position} deve ser um texto.",
                {"position": position},
            )
        criterion = normalize_text(item)
        if not criterion:
            raise PydanticCustomError(
                "blank",
                "O critério de aceitação {position} não pode ficar vazio.",
                {"position": position},
            )
        if len(criterion) > CRITERION_MAX_LENGTH:
            raise PydanticCustomError(
                "too_long",
                "O critério de aceitação {position} deve ter no máximo {limit} caracteres.",
                {"position": position, "limit": CRITERION_MAX_LENGTH},
            )
        cleaned.append(criterion)
    return cleaned


class StoryCreate(BaseModel):
    """Corpo de criação. O status é definido pelo servidor: enviá-lo é rejeitado (422)."""

    model_config = ConfigDict(extra="forbid")

    title: str
    description: str | None = None
    priority: str
    acceptance_criteria: list[str]

    @field_validator("title", mode="before")
    @classmethod
    def _validate_title(cls, value: object) -> str:
        return clean_title(value)

    @field_validator("description", mode="before")
    @classmethod
    def _validate_description(cls, value: object) -> str | None:
        return clean_description(value)

    @field_validator("priority", mode="before")
    @classmethod
    def _validate_priority(cls, value: object) -> str:
        return clean_priority(value)

    @field_validator("acceptance_criteria", mode="before")
    @classmethod
    def _validate_criteria(cls, value: Any) -> list[str]:
        return clean_criteria(value)


class StoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: str | None
    priority: str
    acceptance_criteria: list[str]
    status: str
    created_at: datetime
    updated_at: datetime
