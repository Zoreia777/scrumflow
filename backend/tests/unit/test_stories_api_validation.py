"""Validação e erros 404/405/422 da API de histórias.

NÃO precisam de banco: toda entrada inválida é rejeitada antes de qualquer consulta. Se uma
entrada inválida passasse da validação, a API tentaria usar o banco e o teste falharia.
"""

import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from tests.helpers import assert_no_leak, field_errors

PROJECT_ID = str(uuid.uuid4())
URL = f"/api/v1/projects/{PROJECT_ID}/stories"

VALID: dict[str, Any] = {
    "title": "Cadastrar história",
    "priority": "Alta",
    "acceptance_criteria": ["Aparece no backlog"],
}


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(create_app(), raise_server_exceptions=False)


def _field(name: str | None, code: str, message: str) -> dict[str, Any]:
    return {"field": name, "code": code, "message": message}


CASES: list[tuple[str, dict[str, Any], list[dict[str, Any]]]] = [
    (
        "título vazio (AC02)",
        {**VALID, "title": ""},
        [_field("title", "blank", "O título não pode ficar vazio.")],
    ),
    (
        "título só com espaços (AC02)",
        {**VALID, "title": "     "},
        [_field("title", "blank", "O título não pode ficar vazio.")],
    ),
    (
        "título com 151 caracteres",
        {**VALID, "title": "t" * 151},
        [_field("title", "too_long", "O título deve ter no máximo 150 caracteres.")],
    ),
    (
        "descrição com 2001 caracteres",
        {**VALID, "description": "d" * 2001},
        [_field("description", "too_long", "A descrição deve ter no máximo 2000 caracteres.")],
    ),
    (
        "prioridade inválida (AC04)",
        {**VALID, "priority": "Urgente"},
        [_field("priority", "invalid_priority", "A prioridade deve ser Alta, Média ou Baixa.")],
    ),
    (
        "prioridade em minúsculas",
        {**VALID, "priority": "alta"},
        [_field("priority", "invalid_priority", "A prioridade deve ser Alta, Média ou Baixa.")],
    ),
    (
        "sem critérios (AC03)",
        {**VALID, "acceptance_criteria": []},
        [
            _field(
                "acceptance_criteria",
                "criteria_required",
                "Informe ao menos um critério de aceitação.",
            )
        ],
    ),
    (
        "critério vazio (AC03)",
        {**VALID, "acceptance_criteria": ["   "]},
        [
            _field(
                "acceptance_criteria",
                "blank",
                "O critério de aceitação 1 não pode ficar vazio.",
            )
        ],
    ),
    (
        "critérios nulos",
        {**VALID, "acceptance_criteria": None},
        [
            _field(
                "acceptance_criteria",
                "criteria_required",
                "Informe ao menos um critério de aceitação.",
            )
        ],
    ),
    (
        "critérios ausentes",
        {"title": "x", "priority": "Alta"},
        [_field("acceptance_criteria", "missing", "O campo critérios de aceitação é obrigatório.")],
    ),
    (
        "título ausente",
        {"priority": "Alta", "acceptance_criteria": ["a"]},
        [_field("title", "missing", "O campo título é obrigatório.")],
    ),
    (
        "prioridade ausente",
        {"title": "x", "acceptance_criteria": ["a"]},
        [_field("priority", "missing", "O campo prioridade é obrigatório.")],
    ),
    (
        "status enviado pelo cliente",
        {**VALID, "status": "Concluída"},
        [_field("status", "extra_forbidden", "O campo status não é permitido.")],
    ),
]


@pytest.mark.parametrize(
    ("payload", "expected"), [(c[1], c[2]) for c in CASES], ids=[c[0] for c in CASES]
)
def test_invalid_create_returns_422_with_clear_portuguese_messages(
    client: TestClient, payload: dict[str, Any], expected: list[dict[str, Any]]
) -> None:
    response = client.post(URL, json=payload)

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert field_errors(body) == expected
    assert_no_leak(response.text)


def test_all_errors_are_reported_together(client: TestClient) -> None:
    response = client.post(URL, json={"title": " ", "priority": "x", "acceptance_criteria": []})

    assert response.status_code == 422
    assert {e["field"] for e in field_errors(response.json())} == {
        "title",
        "priority",
        "acceptance_criteria",
    }


@pytest.mark.parametrize("method", ["POST", "GET"])
def test_malformed_project_id_returns_422_for_both_endpoints(
    client: TestClient, method: str
) -> None:
    response = client.request(
        method, "/api/v1/projects/abc/stories", json=VALID if method == "POST" else None
    )

    assert response.status_code == 422
    assert field_errors(response.json()) == [
        _field("project_id", "uuid_parsing", "O identificador informado é inválido.")
    ]


def test_invalid_json_returns_422(client: TestClient) -> None:
    response = client.post(URL, content="{nao e json", headers={"Content-Type": "application/json"})

    assert response.status_code == 422
    assert field_errors(response.json())[0]["code"] == "json_invalid"


def test_missing_body_returns_422(client: TestClient) -> None:
    response = client.post(URL)

    assert response.status_code == 422


@pytest.mark.parametrize("method", ["PUT", "PATCH", "DELETE"])
def test_unsupported_methods_return_405_in_the_error_envelope(
    client: TestClient, method: str
) -> None:
    response = client.request(method, URL)

    assert response.status_code == 405
    assert response.json()["error"]["code"] == "method_not_allowed"
