"""Utilitários compartilhados pelos testes de API."""

from collections.abc import Iterator
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.database import get_session
from app.main import create_app

# Resposta esperada para qualquer falha interna: genérica, sem detalhes.
INTERNAL_ERROR_BODY = {"error": {"code": "internal_error", "message": "Erro interno do servidor."}}

# Trechos que nunca podem aparecer em respostas de erro enviadas ao cliente.
FORBIDDEN_LEAKS = (
    "psycopg",
    "sqlalchemy",
    "traceback",
    "select ",
    "insert ",
    "update projects",
    "password",
    "SEGREDO-INTERNO",
)


def client_for_engine(engine: Engine) -> TestClient:
    """Cliente de teste que usa o `engine` informado e devolve 500 (em vez de levantar erro)."""
    app = create_app()

    def override() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override
    return TestClient(app, raise_server_exceptions=False)


def unreachable_engine(settings: Settings) -> Engine:
    """Engine apontando para a porta 1, onde nada escuta: a conexão falha de verdade."""
    return create_engine(
        settings.test_database_url.set(port=1), connect_args={"connect_timeout": 2}
    )


def assert_no_leak(text: str) -> None:
    lowered = text.lower()
    for fragment in FORBIDDEN_LEAKS:
        assert fragment.lower() not in lowered, f"A resposta vazou {fragment!r}: {text}"


def field_errors(body: dict[str, Any]) -> list[dict[str, Any]]:
    fields: list[dict[str, Any]] = body["error"]["fields"]
    return fields
