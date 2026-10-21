"""Falhas de banco simuladas no meio de operações reais: erro 500 genérico e nada gravado."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.models import Project
from tests.helpers import INTERNAL_ERROR_BODY, assert_no_leak

pytestmark = pytest.mark.integration

BASE = "/api/v1/projects"
SECRET = "SEGREDO-INTERNO host=10.0.0.5 password=abc123"


def _boom(*_args: Any, **_kwargs: Any) -> Any:
    raise OperationalError("INSERT INTO projects (name) VALUES ('x')", None, Exception(SECRET))


def _names(engine: Engine) -> list[str]:
    with Session(engine) as session:
        return list(session.scalars(select(Project.name).order_by(Project.created_at)))


def test_commit_failure_on_create_returns_500_and_persists_nothing(
    client: TestClient, clean_db: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(Session, "commit", _boom)

    response = client.post(BASE, json={"name": "Não pode gravar"})

    assert response.status_code == 500
    assert response.json() == INTERNAL_ERROR_BODY
    assert_no_leak(response.text)
    assert _names(clean_db) == []  # nenhum registro fantasma


def test_commit_failure_on_patch_returns_500_and_keeps_original_data(
    client: TestClient, clean_db: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    created = client.post(BASE, json={"name": "Original", "description": "Desc"}).json()
    monkeypatch.setattr(Session, "commit", _boom)

    response = client.patch(f"{BASE}/{created['id']}", json={"name": "Alterado"})

    assert response.status_code == 500
    assert response.json() == INTERNAL_ERROR_BODY
    assert_no_leak(response.text)
    monkeypatch.undo()
    assert client.get(f"{BASE}/{created['id']}").json() == created
    assert _names(clean_db) == ["Original"]


def test_query_failure_on_list_returns_500(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(Session, "scalars", _boom)

    response = client.get(BASE)

    assert response.status_code == 500
    assert response.json() == INTERNAL_ERROR_BODY
    assert_no_leak(response.text)


@pytest.mark.parametrize("method", ["GET", "PATCH"])
def test_lookup_failure_on_detail_and_patch_returns_500(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, method: str
) -> None:
    created = client.post(BASE, json={"name": "Existe"}).json()
    monkeypatch.setattr(Session, "get", _boom)

    response = client.request(method, f"{BASE}/{created['id']}", json={"name": "X"})

    assert response.status_code == 500
    assert response.json() == INTERNAL_ERROR_BODY
    assert_no_leak(response.text)


def test_unexpected_error_returns_generic_500(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def explode(*_args: Any, **_kwargs: Any) -> Any:
        raise RuntimeError(SECRET)

    monkeypatch.setattr(Session, "scalars", explode)

    response = client.get(BASE)

    assert response.status_code == 500
    assert response.json() == INTERNAL_ERROR_BODY
    assert_no_leak(response.text)


def test_server_recovers_after_a_failure(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    with monkeypatch.context() as patch:
        patch.setattr(Session, "scalars", _boom)
        assert client.get(BASE).status_code == 500

    assert client.get(BASE).status_code == 200
    assert client.post(BASE, json={"name": "Depois da falha"}).status_code == 201
