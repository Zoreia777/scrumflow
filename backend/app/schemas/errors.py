"""Modelos do formato de erro (usados na documentação OpenAPI)."""

from pydantic import BaseModel


class FieldError(BaseModel):
    field: str | None
    code: str
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    fields: list[FieldError] | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody
