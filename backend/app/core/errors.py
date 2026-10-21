"""Tratamento global de erros: formato único, mensagens em português, sem detalhes internos."""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.errors")

# Códigos de erro de validação criados pela própria aplicação (a mensagem já vem em português).
APP_VALIDATION_CODES = frozenset(
    {
        "blank",
        "too_long",
        "invalid_type",
        "empty_body",
        "invalid_priority",
        "criteria_required",
        "too_many",
    }
)

_FIELD_LABELS = {
    "name": "nome",
    "description": "descrição",
    "title": "título",
    "priority": "prioridade",
    "acceptance_criteria": "critérios de aceitação",
    "project_id": "identificador do projeto",
}

_HTTP_ERRORS = {
    404: ("not_found", "Recurso não encontrado."),
    405: ("method_not_allowed", "Método não permitido para este recurso."),
}


class NotFoundError(Exception):
    """Recurso inexistente (resultado: 404)."""

    def __init__(self, resource: str) -> None:
        super().__init__(resource)
        self.resource = resource


def error_response(
    status_code: int,
    code: str,
    message: str,
    fields: list[dict[str, str | None]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {"code": code, "message": message}
    if fields is not None:
        body["fields"] = fields
    return JSONResponse(status_code=status_code, content={"error": body}, headers=headers)


def _builtin_message(error_type: str, field: str | None) -> str:
    label = _FIELD_LABELS.get(field, field) if field else None
    if error_type == "missing":
        return (
            f"O campo {label} é obrigatório." if label else "O corpo da requisição é obrigatório."
        )
    if error_type == "extra_forbidden":
        return f"O campo {label} não é permitido."
    if error_type == "string_type":
        return f"O campo {label} deve ser um texto."
    if error_type.startswith("uuid"):
        return "O identificador informado é inválido."
    if error_type == "json_invalid":
        return "O corpo da requisição não é um JSON válido."
    if error_type in {"model_attributes_type", "dict_type", "model_type"}:
        return "O corpo da requisição deve ser um objeto JSON."
    return f"Valor inválido para o campo {label}." if label else "Dados inválidos."


def _field_name(location: tuple[Any, ...], error_type: str) -> str | None:
    if error_type == "json_invalid":
        return None
    # loc[0] indica a origem ("body", "path"...); o restante é o caminho do campo.
    parts = [str(part) for part in location[1:]]
    return ".".join(parts) or None


async def validation_error_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, RequestValidationError)
    fields: list[dict[str, str | None]] = []
    for error in exc.errors():
        error_type = str(error["type"])
        field = _field_name(tuple(error["loc"]), error_type)
        if error_type in APP_VALIDATION_CODES:
            message = str(error["msg"])
        else:
            message = _builtin_message(error_type, field)
        fields.append({"field": field, "code": error_type, "message": message})
    return error_response(422, "validation_error", "Dados inválidos.", fields)


async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
    return error_response(404, "not_found", "Recurso não encontrado.")


async def http_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    assert isinstance(exc, StarletteHTTPException)
    code, message = _HTTP_ERRORS.get(
        exc.status_code, ("http_error", "Não foi possível processar a requisição.")
    )
    headers = dict(exc.headers) if exc.headers else None
    return error_response(exc.status_code, code, message, headers=headers)


async def database_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # Detalhes (SQL, host, usuário) vão apenas para o log do servidor, nunca para o cliente.
    logger.error("Falha de banco de dados em %s %s", request.method, request.url.path, exc_info=exc)
    return error_response(500, "internal_error", "Erro interno do servidor.")


async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Erro inesperado em %s %s", request.method, request.url.path, exc_info=exc)
    return error_response(500, "internal_error", "Erro interno do servidor.")


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(NotFoundError, not_found_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(SQLAlchemyError, database_error_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)
