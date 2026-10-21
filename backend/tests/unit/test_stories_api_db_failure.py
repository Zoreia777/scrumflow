"""Falhas de banco nos endpoints de histórias (banco inacessível de verdade, sem PostgreSQL)."""

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

URL = f"/api/v1/projects/{uuid.uuid4()}/stories"
VALID: dict[str, Any] = {"title": "x", "priority": "Baixa", "acceptance_criteria": ["a"]}


@pytest.fixture(scope="module")
def broken_engine(settings: Settings) -> Iterator[Engine]:
    engine = unreachable_engine(settings)
    yield engine
    engine.dispose()


@pytest.fixture(scope="module")
def client(broken_engine: Engine) -> TestClient:
    return client_for_engine(broken_engine)


@pytest.mark.parametrize(
    ("method", "payload"), [("POST", VALID), ("GET", None)], ids=["POST", "GET"]
)
def test_unreachable_database_returns_generic_500_without_confirmation(
    client: TestClient, method: str, payload: dict[str, Any] | None
) -> None:
    response = client.request(method, URL, json=payload)

    assert response.status_code == 500
    assert response.json() == INTERNAL_ERROR_BODY
    assert_no_leak(response.text)
    assert "id" not in response.json()  # nenhuma confirmação de criação


def test_database_error_is_logged_on_the_server_only(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.ERROR, logger="app.errors"):
        response = client.post(URL, json=VALID)

    assert response.status_code == 500
    assert any("Falha de banco de dados" in r.getMessage() for r in caplog.records)
