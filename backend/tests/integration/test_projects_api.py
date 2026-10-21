"""US-01 (backend) com PostgreSQL de verdade: AC01, AC02, AC03, AC04, AC05 e AC07."""

import uuid
from datetime import datetime
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, select
from sqlalchemy.orm import Session

from app.models import Project
from tests.helpers import client_for_engine

pytestmark = pytest.mark.integration

BASE = "/api/v1/projects"
NOT_FOUND_BODY = {"error": {"code": "not_found", "message": "Recurso não encontrado."}}


def _rows(engine: Engine) -> list[Project]:
    """Lê direto do banco, em uma sessão nova (independente da API)."""
    with Session(engine) as session:
        return list(session.scalars(select(Project).order_by(Project.created_at)))


def _create(client: TestClient, **payload: Any) -> dict[str, Any]:
    response = client.post(BASE, json=payload)
    assert response.status_code == 201, response.text
    body: dict[str, Any] = response.json()
    return body


# ---------- POST /projects (AC01, AC02, AC03, AC07) ----------


def test_create_returns_201_with_uuid_and_timestamps(client: TestClient) -> None:
    response = client.post(BASE, json={"name": "Meu Projeto", "description": "Uma descrição"})

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "name", "description", "created_at", "updated_at"}
    assert uuid.UUID(body["id"]).version == 4
    assert body["name"] == "Meu Projeto"
    assert body["description"] == "Uma descrição"
    assert datetime.fromisoformat(body["created_at"]).tzinfo is not None
    assert datetime.fromisoformat(body["updated_at"]).tzinfo is not None


def test_created_project_is_persisted_and_appears_in_list(
    client: TestClient, clean_db: Engine
) -> None:
    created = _create(client, name="Projeto A", description="Desc A")

    rows = _rows(clean_db)
    assert [(str(r.id), r.name, r.description) for r in rows] == [
        (created["id"], "Projeto A", "Desc A")
    ]
    listed = client.get(BASE).json()
    assert [p["id"] for p in listed] == [created["id"]]


def test_create_without_description_stores_null(client: TestClient, clean_db: Engine) -> None:
    created = _create(client, name="Sem descrição")

    assert created["description"] is None
    assert _rows(clean_db)[0].description is None


def test_create_normalizes_text_before_saving(client: TestClient, clean_db: Engine) -> None:
    created = _create(client, name="  Meu   Projeto \n", description="   ")

    assert created["name"] == "Meu   Projeto"
    assert created["description"] is None
    row = _rows(clean_db)[0]
    assert (row.name, row.description) == ("Meu   Projeto", None)


def test_create_stores_nfc_normalized_name(client: TestClient, clean_db: Engine) -> None:
    created = _create(client, name="Educação")

    assert created["name"] == "Educação"
    assert _rows(clean_db)[0].name == "Educação"


def test_create_accepts_limit_values(client: TestClient, clean_db: Engine) -> None:
    _create(client, name="a")
    _create(client, name="n" * 100, description="d" * 1000)

    rows = _rows(clean_db)
    assert [len(r.name) for r in rows] == [1, 100]
    assert rows[1].description is not None and len(rows[1].description) == 1000


def test_duplicate_names_are_allowed(client: TestClient, clean_db: Engine) -> None:
    first = _create(client, name="Repetido")
    second = _create(client, name="Repetido")

    assert first["id"] != second["id"]
    assert len(_rows(clean_db)) == 2


INVALID_CREATE_PAYLOADS: list[dict[str, Any]] = [
    {"name": ""},
    {"name": "   "},
    {"name": None},
    {"name": "a" * 101},
    {"name": "ok", "description": "d" * 1001},
    {},
    {"name": 123},
    {"name": "ok", "id": str(uuid.uuid4())},
    {"name": "ok", "created_at": "2020-01-01T00:00:00Z"},
]


@pytest.mark.parametrize("payload", INVALID_CREATE_PAYLOADS)
def test_invalid_create_is_rejected_and_nothing_is_persisted(
    client: TestClient, clean_db: Engine, payload: dict[str, Any]
) -> None:
    response = client.post(BASE, json=payload)

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert _rows(clean_db) == []


def test_invalid_json_create_persists_nothing(client: TestClient, clean_db: Engine) -> None:
    response = client.post(BASE, content="{quebrado", headers={"Content-Type": "application/json"})

    assert response.status_code == 422
    assert _rows(clean_db) == []


# ---------- GET /projects ----------


def test_list_is_empty_at_first(client: TestClient) -> None:
    response = client.get(BASE)

    assert response.status_code == 200
    assert response.json() == []


def test_list_returns_newest_first(client: TestClient) -> None:
    first = _create(client, name="Primeiro")
    second = _create(client, name="Segundo")
    third = _create(client, name="Terceiro")

    listed = client.get(BASE).json()

    assert [p["id"] for p in listed] == [third["id"], second["id"], first["id"]]
    assert [p["name"] for p in listed] == ["Terceiro", "Segundo", "Primeiro"]


def test_list_items_have_the_full_contract(client: TestClient) -> None:
    _create(client, name="Único", description="Texto")

    (item,) = client.get(BASE).json()

    assert set(item) == {"id", "name", "description", "created_at", "updated_at"}


# ---------- GET /projects/{id} (AC05) ----------


def test_get_returns_id_name_description_and_creation_date(client: TestClient) -> None:
    created = _create(client, name="Detalhe", description="Descrição do detalhe")

    response = client.get(f"{BASE}/{created['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body["name"] == "Detalhe"
    assert body["description"] == "Descrição do detalhe"
    assert body["created_at"] == created["created_at"]


def test_get_unknown_project_returns_404(client: TestClient) -> None:
    response = client.get(f"{BASE}/{uuid.uuid4()}")

    assert response.status_code == 404
    assert response.json() == NOT_FOUND_BODY


def test_get_does_not_return_other_projects(client: TestClient) -> None:
    first = _create(client, name="Um")
    second = _create(client, name="Dois")

    assert client.get(f"{BASE}/{first['id']}").json()["name"] == "Um"
    assert client.get(f"{BASE}/{second['id']}").json()["name"] == "Dois"


# ---------- PATCH /projects/{id} (AC04, AC07) ----------


def test_patch_updates_name_and_description_and_persists(
    client: TestClient, clean_db: Engine
) -> None:
    created = _create(client, name="Antigo", description="Desc antiga")

    response = client.patch(
        f"{BASE}/{created['id']}", json={"name": " Novo nome ", "description": "Desc nova"}
    )

    assert response.status_code == 200
    body = response.json()
    assert (body["name"], body["description"]) == ("Novo nome", "Desc nova")
    assert body["id"] == created["id"]
    assert body["created_at"] == created["created_at"]
    assert datetime.fromisoformat(body["updated_at"]) > datetime.fromisoformat(
        created["created_at"]
    )

    # Nova consulta pela API e leitura direta no banco: os dados atualizados foram persistidos.
    again = client.get(f"{BASE}/{created['id']}").json()
    assert (again["name"], again["description"]) == ("Novo nome", "Desc nova")
    row = _rows(clean_db)[0]
    assert (row.name, row.description) == ("Novo nome", "Desc nova")


def test_patch_name_only_keeps_description(client: TestClient) -> None:
    created = _create(client, name="Antigo", description="Mantida")

    body = client.patch(f"{BASE}/{created['id']}", json={"name": "Novo"}).json()

    assert (body["name"], body["description"]) == ("Novo", "Mantida")


def test_patch_description_only_keeps_name(client: TestClient) -> None:
    created = _create(client, name="Mantido", description="Antiga")

    body = client.patch(f"{BASE}/{created['id']}", json={"description": "Nova"}).json()

    assert (body["name"], body["description"]) == ("Mantido", "Nova")


@pytest.mark.parametrize("cleared", [None, "", "   "])
def test_patch_clears_description(
    client: TestClient, clean_db: Engine, cleared: str | None
) -> None:
    created = _create(client, name="Projeto", description="Será apagada")

    response = client.patch(f"{BASE}/{created['id']}", json={"description": cleared})

    assert response.status_code == 200
    assert response.json()["description"] is None
    assert _rows(clean_db)[0].description is None


def test_patch_with_same_values_is_accepted(client: TestClient) -> None:
    created = _create(client, name="Igual", description="Igual")

    response = client.patch(f"{BASE}/{created['id']}", json={"name": "Igual"})

    assert response.status_code == 200
    assert response.json()["name"] == "Igual"


INVALID_PATCH_PAYLOADS: list[dict[str, Any]] = [
    {},
    {"name": None},
    {"name": ""},
    {"name": "   "},
    {"name": "a" * 101},
    {"description": "d" * 1001},
    {"name": "Válido", "description": "d" * 1001},
    {"id": str(uuid.uuid4())},
    {"name": "Válido", "created_at": "2020-01-01T00:00:00Z"},
]


@pytest.mark.parametrize("payload", INVALID_PATCH_PAYLOADS)
def test_invalid_patch_is_rejected_and_project_is_unchanged(
    client: TestClient, clean_db: Engine, payload: dict[str, Any]
) -> None:
    created = _create(client, name="Original", description="Desc original")

    response = client.patch(f"{BASE}/{created['id']}", json=payload)

    assert response.status_code == 422
    unchanged = client.get(f"{BASE}/{created['id']}").json()
    assert unchanged == created  # inclusive updated_at: nada foi gravado
    row = _rows(clean_db)[0]
    assert (row.name, row.description) == ("Original", "Desc original")


def test_patch_unknown_project_returns_404(client: TestClient, clean_db: Engine) -> None:
    response = client.patch(f"{BASE}/{uuid.uuid4()}", json={"name": "Qualquer"})

    assert response.status_code == 404
    assert response.json() == NOT_FOUND_BODY
    assert _rows(clean_db) == []


def test_patch_changes_only_the_target_project(client: TestClient) -> None:
    target = _create(client, name="Alvo")
    other = _create(client, name="Outro", description="Intacto")

    client.patch(f"{BASE}/{target['id']}", json={"name": "Alvo editado"})

    assert client.get(f"{BASE}/{other['id']}").json() == other
    assert client.get(f"{BASE}/{target['id']}").json()["name"] == "Alvo editado"


# ---------- Persistência independente da instância da aplicação ----------


def test_data_survives_a_new_application_instance(client: TestClient, clean_db: Engine) -> None:
    created = _create(client, name="Persistente", description="Sobrevive")
    client.patch(f"{BASE}/{created['id']}", json={"name": "Persistente editado"})

    fresh_client = client_for_engine(clean_db)
    assert fresh_client.app is not client.app
    body = fresh_client.get(f"{BASE}/{created['id']}").json()

    assert body["name"] == "Persistente editado"
    assert body["description"] == "Sobrevive"
    assert [p["id"] for p in fresh_client.get(BASE).json()] == [created["id"]]
