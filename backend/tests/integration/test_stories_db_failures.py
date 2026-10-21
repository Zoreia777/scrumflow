"""Falhas de persistência em histórias: sem registros parciais e sem confirmação falsa (AC09)."""

import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, func, select
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError
from app.models import Project, Story
from app.schemas.story import StoryCreate
from app.services import stories as story_service
from tests.helpers import INTERNAL_ERROR_BODY, assert_no_leak

pytestmark = pytest.mark.integration

PROJECTS = "/api/v1/projects"
SECRET = "SEGREDO-INTERNO host=10.0.0.5 password=abc123"
PAYLOAD: dict[str, Any] = {
    "title": "Não pode gravar",
    "priority": "Alta",
    "acceptance_criteria": ["a", "b"],
}


def _boom(*_args: Any, **_kwargs: Any) -> Any:
    raise OperationalError("INSERT INTO stories (title) VALUES ('x')", None, Exception(SECRET))


def _count(engine: Engine) -> int:
    with Session(engine) as session:
        return session.scalar(select(func.count()).select_from(Story)) or 0


def _project(client: TestClient) -> str:
    return str(client.post(PROJECTS, json={"name": "P"}).json()["id"])


def test_commit_failure_returns_500_without_confirmation_and_persists_nothing(
    client: TestClient, clean_db: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    project_id = _project(client)
    monkeypatch.setattr(Session, "commit", _boom)

    response = client.post(f"{PROJECTS}/{project_id}/stories", json=PAYLOAD)

    assert response.status_code == 500
    assert response.json() == INTERNAL_ERROR_BODY
    assert_no_leak(response.text)
    assert "id" not in response.json()
    monkeypatch.undo()
    assert _count(clean_db) == 0
    assert client.get(f"{PROJECTS}/{project_id}/stories").json() == []  # sem item fantasma


def test_a_failed_save_does_not_block_the_next_one(
    client: TestClient, clean_db: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    project_id = _project(client)
    url = f"{PROJECTS}/{project_id}/stories"
    with monkeypatch.context() as patch:
        patch.setattr(Session, "commit", _boom)
        assert client.post(url, json=PAYLOAD).status_code == 500

    retry = client.post(url, json=PAYLOAD)

    assert retry.status_code == 201
    assert _count(clean_db) == 1


def test_failure_after_the_insert_is_rolled_back_with_no_partial_row(
    client: TestClient, clean_db: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    """O INSERT chega a ser enviado ao banco; a falha vem na confirmação. Nada pode ficar."""
    project_id = _project(client)

    def flush_then_fail(self: Session, *args: Any, **kwargs: Any) -> None:
        self.flush()  # a linha existe dentro da transação...
        raise OperationalError("COMMIT", None, Exception(SECRET))

    monkeypatch.setattr(Session, "commit", flush_then_fail)

    response = client.post(f"{PROJECTS}/{project_id}/stories", json=PAYLOAD)

    assert response.status_code == 500
    monkeypatch.undo()
    assert _count(clean_db) == 0  # ...mas foi desfeita


def test_query_failure_on_list_returns_500(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    project_id = _project(client)
    monkeypatch.setattr(Session, "scalars", _boom)

    response = client.get(f"{PROJECTS}/{project_id}/stories")

    assert response.status_code == 500
    assert response.json() == INTERNAL_ERROR_BODY
    assert_no_leak(response.text)


def test_project_lookup_failure_returns_500_not_404(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    project_id = _project(client)
    monkeypatch.setattr(Session, "get", _boom)

    for method, payload in (("POST", PAYLOAD), ("GET", None)):
        response = client.request(method, f"{PROJECTS}/{project_id}/stories", json=payload)
        assert response.status_code == 500
        assert response.json() == INTERNAL_ERROR_BODY


def test_integrity_error_at_commit_rolls_back_and_the_session_stays_usable(
    clean_db: Engine,
) -> None:
    """Camada de serviço: entrada que burla a API é barrada pelo banco e nada fica gravado."""
    with Session(clean_db) as session:
        project = Project(name="P")
        session.add(project)
        session.commit()
        bad = StoryCreate.model_construct(
            title="x", description=None, priority="Urgente", acceptance_criteria=["a"]
        )

        with pytest.raises(IntegrityError):
            story_service.create_story(session, project.id, bad)

        assert session.scalar(select(func.count()).select_from(Story)) == 0
        good = StoryCreate(title="ok", priority="Alta", acceptance_criteria=["a"])
        story_service.create_story(session, project.id, good)  # a sessão continua utilizável
        assert session.scalar(select(func.count()).select_from(Story)) == 1


def test_project_deleted_between_check_and_insert_becomes_404_and_creates_nothing(
    client: TestClient, clean_db: Engine, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Corrida: o projeto some depois da verificação. A violação de FK vira 404, não 500."""
    monkeypatch.setattr(story_service, "get_project", lambda session, project_id: None)

    response = client.post(f"{PROJECTS}/{uuid.uuid4()}/stories", json=PAYLOAD)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
    monkeypatch.undo()
    assert _count(clean_db) == 0


def test_service_raises_not_found_for_a_missing_project(clean_db: Engine) -> None:
    with Session(clean_db) as session:
        data = StoryCreate(title="x", priority="Alta", acceptance_criteria=["a"])

        with pytest.raises(NotFoundError):
            story_service.create_story(session, uuid.uuid4(), data)
        with pytest.raises(NotFoundError):
            story_service.list_stories(session, uuid.uuid4())
