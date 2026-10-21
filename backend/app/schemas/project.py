"""Contratos da API de projetos e regras de validação (ADR-002, seção 7)."""

import uuid
from datetime import datetime
from typing import Self

from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from pydantic_core import PydanticCustomError

from app.core.text import normalize_text

NAME_MAX_LENGTH = 100
DESCRIPTION_MAX_LENGTH = 1000


def clean_name(value: object) -> str:
    """Nome obrigatório: 1 a 100 caracteres depois da normalização."""
    if value is None:
        raise PydanticCustomError("blank", "O nome não pode ficar vazio.")
    if not isinstance(value, str):
        raise PydanticCustomError("invalid_type", "O nome deve ser um texto.")
    name = normalize_text(value)
    if not name:
        raise PydanticCustomError("blank", "O nome não pode ficar vazio.")
    if len(name) > NAME_MAX_LENGTH:
        raise PydanticCustomError(
            "too_long",
            "O nome deve ter no máximo {limit} caracteres.",
            {"limit": NAME_MAX_LENGTH},
        )
    return name


def clean_description(value: object) -> str | None:
    """Descrição opcional: até 1000 caracteres; texto vazio ou só espaços vira nulo."""
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


class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    description: str | None = None

    @field_validator("name", mode="before")
    @classmethod
    def _validate_name(cls, value: object) -> str:
        return clean_name(value)

    @field_validator("description", mode="before")
    @classmethod
    def _validate_description(cls, value: object) -> str | None:
        return clean_description(value)


class ProjectUpdate(BaseModel):
    """Atualização parcial: só os campos enviados são alterados.

    `description: null` limpa a descrição; `name: null` é rejeitado; corpo vazio é rejeitado.
    """

    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    description: str | None = None

    @field_validator("name", mode="before")
    @classmethod
    def _validate_name(cls, value: object) -> str:
        return clean_name(value)

    @field_validator("description", mode="before")
    @classmethod
    def _validate_description(cls, value: object) -> str | None:
        return clean_description(value)

    @model_validator(mode="after")
    def _require_at_least_one_field(self) -> Self:
        if not self.model_fields_set:
            raise PydanticCustomError(
                "empty_body", "Informe ao menos um campo para atualizar (nome ou descrição)."
            )
        return self


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
