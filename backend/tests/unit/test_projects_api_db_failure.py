"""Falhas de banco na API de projetos (banco inacessível de verdade, sem precisar de PostgreSQL).

A engine aponta para a porta 1, onde nada escuta: toda operação falha ao conectar.
"""

import logging
import uuid
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine

from app.core.config import Settings
from tests.helpers import (
    INTERNAL_ERROR_BODY,
    assert_no_leak,
    client_for_engine,
    unreachable_engine,
)

BASE = "/api/v1/projects"


@pytest.fixture(scope="module")
def broken_engine(settings: Settings) -> Iterator[Engine]:
    engine = unreachable_engine(settings)
    yield engine
    engine.dispose()


@pytest.fixture(scope="module")
def client(broken_engine: Engine) -> TestClient:
    return client_for_engine(broken_engine)


REQUESTS: list[tuple[str, str, dict[str, Any] | None]] = [
    ("POST", BASE, {"name": "Projeto válido"}),
    ("GET", BASE, None),
    ("GET", f"{BASE}/{uuid.uuid4()}", None),
    ("PATCH", f"{BASE}/{uuid.uuid4()}", {"name": "Novo nome"}),
]


@pytest.mark.parametrize(
    ("method", "url", "payload"),
    REQUESTS,
    ids=[f"{m} {u.split('/api/v1')[1][:9]}" for m, u, _ in REQUESTS],
)
def test_database_failure_returns_generic_500(
    client: TestClient, method: str, url: str, payload: dict[str, Any] | None
) -> None:
    response = client.request(method, url, json=payload)

    assert response.status_code == 500
    assert response.json() == INTERNAL_ERROR_BODY
    assert_no_leak(response.text)
    # Nenhum detalhe da conexão (host, porta, usuário) chega ao cliente.
    assert "localhost" not in response.text
    assert "5433" not in response.text


def test_database_failure_is_logged_on_the_server_only(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.ERROR, logger="app.errors"):
        response = client.get(BASE)

    assert response.status_code == 500
    assert any("Falha de banco de dados" in record.getMessage() for record in caplog.records)


def test_health_endpoint_still_works_after_error_handlers(
    broken_engine: Engine,
) -> None:
    # Regressão: o endpoint de saúde continua informando 503 (não 500) com banco inacessível.
    response = client_for_engine(broken_engine).get("/api/v1/health")

    assert response.status_code == 503
    assert response.json() == {"status": "degraded", "database": "unavailable"}
