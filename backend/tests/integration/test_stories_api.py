"""US-02 (backend) com PostgreSQL de verdade: AC01 a AC09 no nível da API."""

import uuid
from datetime import datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, func, select, text
from sqlalchemy.orm import Session

from app.models import Project, Story
from tests.helpers import client_for_engine

pytestmark = pytest.mark.integration

PROJECTS = "/api/v1/projects"
NOT_FOUND_BODY = {"error": {"code": "not_found", "message": "Recurso não encontrado."}}


def story_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "title": "Cadastrar história",
        "description": "Como gestor, quero registrar histórias.",
        "priority": "Alta",
        "acceptance_criteria": ["Salva a história", "Mostra no backlog"],
    }
    payload.update(overrides)
    return payload


def make_project(client: TestClient, name: str = "Projeto") -> str:
    response = client.post(PROJECTS, json={"name": name})
    assert response.status_code == 201, response.text
    return str(response.json()["id"])


def url(project_id: str) -> str:
    return f"{PROJECTS}/{project_id}/stories"


def create(client: TestClient, project_id: str, **overrides: Any) -> dict[str, Any]:
    response = client.post(url(project_id), json=story_payload(**overrides))
    assert response.status_code == 201, response.text
    body: dict[str, Any] = response.json()
    return body


def story_count(engine: Engine) -> int:
    with Session(engine) as session:
        return session.scalar(select(func.count()).select_from(Story)) or 0


# ---------- AC01: criar e ver no backlog ----------


def test_create_returns_201_with_all_fields(client: TestClient) -> None:
    project_id = make_project(client)

    response = client.post(url(project_id), json=story_payload())

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {
        "id",
        "project_id",
        "title",
        "description",
        "priority",
        "acceptance_criteria",
        "status",
        "created_at",
        "updated_at",
    }
    assert uuid.UUID(body["id"]).version == 4
    assert body["project_id"] == project_id
    assert body["title"] == "Cadastrar história"
    assert body["priority"] == "Alta"
    assert body["acceptance_criteria"] == ["Salva a história", "Mostra no backlog"]
    assert body["status"] == "A fazer"
    assert datetime.fromisoformat(body["created_at"]).tzinfo is not None


def test_created_story_appears_in_the_backlog(client: TestClient) -> None:
    project_id = make_project(client)
    created = create(client, project_id)

    listed = client.get(url(project_id))

    assert listed.status_code == 200
    assert listed.json() == [created]


@pytest.mark.parametrize("priority", ["Alta", "Média", "Baixa"])
def test_each_allowed_priority_is_accepted_and_returned(client: TestClient, priority: str) -> None:
    project_id = make_project(client)

    story = create(client, project_id, priority=priority)

    assert story["priority"] == priority
    assert client.get(url(project_id)).json()[0]["priority"] == priority


def test_description_is_optional_and_blank_becomes_null(client: TestClient) -> None:
    project_id = make_project(client)

    without = create(client, project_id, description=None)
    blank = create(client, project_id, description="   ")
    omitted_payload = story_payload()
    del omitted_payload["description"]
    omitted = client.post(url(project_id), json=omitted_payload).json()

    assert without["description"] is None
    assert blank["description"] is None
    assert omitted["description"] is None


def test_text_is_normalized_before_saving(client: TestClient) -> None:
    project_id = make_project(client)

    story = create(
        client,
        project_id,
        title="  Café   da manhã  ",
        acceptance_criteria=["  critério com espaços  "],
    )

    assert story["title"] == "Café   da manhã"
    assert story["acceptance_criteria"] == ["critério com espaços"]


def test_limits_are_accepted_exactly(client: TestClient) -> None:
    project_id = make_project(client)

    story = create(
        client,
        project_id,
        title="t" * 150,
        description="d" * 2000,
        acceptance_criteria=["c" * 500] * 20,
    )

    assert len(story["title"]) == 150
    assert len(story["description"]) == 2000
    assert len(story["acceptance_criteria"]) == 20


# ---------- AC07: persistência (relê em sessão nova, direto no banco) ----------


def test_story_is_persisted_with_title_priority_and_criteria(
    client: TestClient, clean_db: Engine
) -> None:
    project_id = make_project(client)
    created = create(client, project_id, acceptance_criteria=["primeiro", "segundo", "terceiro"])

    fresh_client = client_for_engine(clean_db)  # "recarregar a página": tudo novo
    listed = fresh_client.get(url(project_id)).json()
    assert listed == [created]

    with Session(clean_db) as session:
        row = session.get(Story, uuid.UUID(created["id"]))
        assert row is not None
        assert row.title == "Cadastrar história"
        assert row.priority == "Alta"
        assert row.acceptance_criteria == ["primeiro", "segundo", "terceiro"]  # ordem preservada
        assert row.status == "A fazer"
        assert str(row.project_id) == project_id


def test_criteria_are_stored_as_a_jsonb_array(client: TestClient, clean_db: Engine) -> None:
    project_id = make_project(client)
    create(client, project_id, acceptance_criteria=["a", "b"])

    with clean_db.connect() as connection:
        row = connection.execute(
            text(
                "SELECT jsonb_typeof(acceptance_criteria), jsonb_array_length(acceptance_criteria),"
                " acceptance_criteria ->> 1 FROM stories"
            )
        ).one()

    assert tuple(row) == ("array", 2, "b")


def test_unicode_in_criteria_survives_the_round_trip(client: TestClient) -> None:
    project_id = make_project(client)
    criteria = ["Aceita acentuação: ção, é, ü", "Emoji 😀 e aspas \"duplas\" 'simples'"]

    create(client, project_id, acceptance_criteria=criteria)

    assert client.get(url(project_id)).json()[0]["acceptance_criteria"] == criteria


# ---------- AC06: títulos repetidos ----------


def test_duplicate_titles_get_distinct_ids_and_both_are_listed(client: TestClient) -> None:
    project_id = make_project(client)

    first = create(client, project_id, title="Mesmo título")
    second = create(client, project_id, title="Mesmo título")

    assert first["id"] != second["id"]
    listed = client.get(url(project_id)).json()
    assert [s["title"] for s in listed] == ["Mesmo título", "Mesmo título"]
    assert {s["id"] for s in listed} == {first["id"], second["id"]}


def test_same_title_in_different_projects_is_allowed(client: TestClient) -> None:
    a, b = make_project(client, "A"), make_project(client, "B")

    sa, sb = create(client, a, title="Igual"), create(client, b, title="Igual")

    assert sa["id"] != sb["id"]


# ---------- AC08: isolamento por projeto ----------


def test_backlog_only_shows_stories_of_its_own_project(client: TestClient) -> None:
    a, b, empty = make_project(client, "A"), make_project(client, "B"), make_project(client, "C")
    a1, a2 = create(client, a, title="A1"), create(client, a, title="A2")
    b1 = create(client, b, title="B1")

    listed_a = client.get(url(a)).json()
    listed_b = client.get(url(b)).json()

    assert {s["id"] for s in listed_a} == {a1["id"], a2["id"]}
    assert {s["id"] for s in listed_b} == {b1["id"]}
    assert all(s["project_id"] == a for s in listed_a)
    assert client.get(url(empty)).json() == []


def test_backlog_is_ordered_newest_first(client: TestClient) -> None:
    project_id = make_project(client)
    ids = [create(client, project_id, title=f"História {n}")["id"] for n in range(5)]

    listed = client.get(url(project_id)).json()

    assert [s["id"] for s in listed] == list(reversed(ids))


def test_empty_backlog_returns_an_empty_list(client: TestClient) -> None:
    assert client.get(url(make_project(client))).json() == []


# ---------- AC05: projeto inexistente ----------


def test_create_for_missing_project_returns_404_and_creates_nothing(
    client: TestClient, clean_db: Engine
) -> None:
    response = client.post(url(str(uuid.uuid4())), json=story_payload())

    assert response.status_code == 404
    assert response.json() == NOT_FOUND_BODY
    assert story_count(clean_db) == 0


def test_list_for_missing_project_returns_404(client: TestClient) -> None:
    response = client.get(url(str(uuid.uuid4())))

    assert response.status_code == 404
    assert response.json() == NOT_FOUND_BODY


def test_missing_project_does_not_hide_behind_another_projects_data(
    client: TestClient, clean_db: Engine
) -> None:
    existing = make_project(client)
    create(client, existing)

    response = client.post(url(str(uuid.uuid4())), json=story_payload(title="Órfã"))

    assert response.status_code == 404
    assert story_count(clean_db) == 1


# ---------- AC02, AC03, AC04 e AC07 (backend): entradas inválidas nunca são gravadas ----------

INVALID_PAYLOADS: list[tuple[str, dict[str, Any]]] = [
    ("título vazio", story_payload(title="")),
    ("título só com espaços", story_payload(title="   ")),
    ("título com 151", story_payload(title="t" * 151)),
    ("descrição com 2001", story_payload(description="d" * 2001)),
    ("prioridade inválida", story_payload(priority="Urgente")),
    ("prioridade minúscula", story_payload(priority="alta")),
    ("prioridade sem acento", story_payload(priority="Media")),
    ("prioridade vazia", story_payload(priority="")),
    ("prioridade nula", story_payload(priority=None)),
    ("prioridade numérica", story_payload(priority=1)),
    ("sem critérios", story_payload(acceptance_criteria=[])),
    ("critério vazio", story_payload(acceptance_criteria=[""])),
    ("critério só com espaços", story_payload(acceptance_criteria=["ok", "  "])),
    ("critério com 501", story_payload(acceptance_criteria=["c" * 501])),
    ("21 critérios", story_payload(acceptance_criteria=["c"] * 21)),
    ("critérios como texto", story_payload(acceptance_criteria="um critério")),
    ("status enviado", story_payload(status="A fazer")),
]


@pytest.mark.parametrize(
    "payload", [p for _, p in INVALID_PAYLOADS], ids=[n for n, _ in INVALID_PAYLOADS]
)
def test_invalid_input_returns_422_and_persists_nothing(
    client: TestClient, clean_db: Engine, payload: dict[str, Any]
) -> None:
    project_id = make_project(client)

    response = client.post(url(project_id), json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert story_count(clean_db) == 0
    assert client.get(url(project_id)).json() == []


def test_missing_required_fields_are_rejected(client: TestClient, clean_db: Engine) -> None:
    project_id = make_project(client)

    for field in ("title", "priority", "acceptance_criteria"):
        payload = story_payload()
        del payload[field]
        response = client.post(url(project_id), json=payload)
        assert response.status_code == 422
        assert response.json()["error"]["fields"][0]["field"] == field

    assert story_count(clean_db) == 0


def test_rejected_request_does_not_disturb_valid_ones(client: TestClient) -> None:
    project_id = make_project(client)
    ok = create(client, project_id, title="Válida")

    client.post(url(project_id), json=story_payload(priority="Urgente"))

    assert client.get(url(project_id)).json() == [ok]


# ---------- Relacionamento e preservação de projetos ----------


def test_stories_do_not_change_the_project(client: TestClient) -> None:
    project_id = make_project(client, "Intacto")
    before = client.get(f"{PROJECTS}/{project_id}").json()

    create(client, project_id)

    assert client.get(f"{PROJECTS}/{project_id}").json() == before
    assert [p["id"] for p in client.get(PROJECTS).json()] == [project_id]


def test_story_belongs_to_an_existing_project_row(client: TestClient, clean_db: Engine) -> None:
    project_id = make_project(client)
    story = create(client, project_id)

    with Session(clean_db) as session:
        row = session.get(Story, uuid.UUID(story["id"]))
        assert row is not None
        project = session.get(Project, row.project_id)
        assert project is not None
        assert str(project.id) == project_id


def test_existing_project_endpoints_still_work_after_the_story_migration(
    client: TestClient,
) -> None:
    project_id = make_project(client, "Antigo")

    assert client.get(PROJECTS).status_code == 200
    assert client.patch(f"{PROJECTS}/{project_id}", json={"name": "Renomeado"}).status_code == 200
    assert client.get("/api/v1/health").json() == {"status": "ok", "database": "ok"}


def test_wrong_http_methods_are_not_allowed(client: TestClient) -> None:
    project_id = make_project(client)

    assert client.put(url(project_id), json=story_payload()).status_code == 405
    assert client.delete(url(project_id)).status_code == 405
