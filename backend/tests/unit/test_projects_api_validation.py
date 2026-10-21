"""Validação e erros 404/405/422 da API de projetos.

Estes testes NÃO precisam de banco: todas as entradas são rejeitadas antes de qualquer consulta.
Se uma entrada inválida passasse da validação, a API tentaria usar o banco e o teste falharia.
"""

import uuid
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from tests.helpers import assert_no_leak, field_errors

BASE = "/api/v1/projects"
SOME_ID = str(uuid.uuid4())


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(create_app(), raise_server_exceptions=False)


def _field(name: str | None, code: str, message: str) -> dict[str, Any]:
    return {"field": name, "code": code, "message": message}


CREATE_CASES: list[tuple[str, dict[str, Any], list[dict[str, Any]]]] = [
    ("nome vazio", {"name": ""}, [_field("name", "blank", "O nome não pode ficar vazio.")]),
    (
        "nome só com espaços",
        {"name": "   "},
        [_field("name", "blank", "O nome não pode ficar vazio.")],
    ),
    ("nome nulo", {"name": None}, [_field("name", "blank", "O nome não pode ficar vazio.")]),
    (
        "nome com 101 caracteres",
        {"name": "a" * 101},
        [_field("name", "too_long", "O nome deve ter no máximo 100 caracteres.")],
    ),
    (
        "descrição com 1001 caracteres",
        {"name": "ok", "description": "d" * 1001},
        [_field("description", "too_long", "A descrição deve ter no máximo 1000 caracteres.")],
    ),
    ("nome ausente", {}, [_field("name", "missing", "O campo nome é obrigatório.")]),
    (
        "nome com tipo errado",
        {"name": 123},
        [_field("name", "invalid_type", "O nome deve ser um texto.")],
    ),
    (
        "campo desconhecido",
        {"name": "ok", "id": "x"},
        [_field("id", "extra_forbidden", "O campo id não é permitido.")],
    ),
]


@pytest.mark.parametrize(
    ("payload", "expected"), [c[1:] for c in CREATE_CASES], ids=[c[0] for c in CREATE_CASES]
)
def test_post_rejects_invalid_payload_with_portuguese_message(
    client: TestClient, payload: dict[str, Any], expected: list[dict[str, Any]]
) -> None:
    response = client.post(BASE, json=payload)

    assert response.status_code == 422
    body = response.json()
    assert set(body) == {"error"}
    assert body["error"]["code"] == "validation_error"
    assert body["error"]["message"] == "Dados inválidos."
    assert field_errors(body) == expected


def test_post_without_body_is_rejected(client: TestClient) -> None:
    response = client.post(BASE)

    assert response.status_code == 422
    assert field_errors(response.json()) == [
        _field(None, "missing", "O corpo da requisição é obrigatório.")
    ]


def test_post_with_invalid_json_is_rejected(client: TestClient) -> None:
    response = client.post(
        BASE, content="{isto não é json", headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 422
    assert field_errors(response.json()) == [
        _field(None, "json_invalid", "O corpo da requisição não é um JSON válido.")
    ]


def test_post_with_non_object_json_is_rejected(client: TestClient) -> None:
    response = client.post(BASE, json=["não", "é", "objeto"])

    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "validation_error"
    assert [f["message"] for f in field_errors(body)] == [
        "O corpo da requisição deve ser um objeto JSON."
    ]


def test_post_reports_every_invalid_field(client: TestClient) -> None:
    response = client.post(BASE, json={"name": "", "description": "d" * 1001})

    assert response.status_code == 422
    assert sorted(f["field"] for f in field_errors(response.json())) == ["description", "name"]


PATCH_CASES: list[tuple[str, dict[str, Any], list[dict[str, Any]]]] = [
    (
        "corpo vazio",
        {},
        [
            _field(
                None,
                "empty_body",
                "Informe ao menos um campo para atualizar (nome ou descrição).",
            )
        ],
    ),
    ("nome nulo", {"name": None}, [_field("name", "blank", "O nome não pode ficar vazio.")]),
    ("nome vazio", {"name": "  "}, [_field("name", "blank", "O nome não pode ficar vazio.")]),
    (
        "nome com 101 caracteres",
        {"name": "a" * 101},
        [_field("name", "too_long", "O nome deve ter no máximo 100 caracteres.")],
    ),
    (
        "descrição com 1001 caracteres",
        {"description": "d" * 1001},
        [_field("description", "too_long", "A descrição deve ter no máximo 1000 caracteres.")],
    ),
    (
        "tentativa de alterar o id",
        {"id": str(uuid.uuid4())},
        [_field("id", "extra_forbidden", "O campo id não é permitido.")],
    ),
]


@pytest.mark.parametrize(
    ("payload", "expected"), [c[1:] for c in PATCH_CASES], ids=[c[0] for c in PATCH_CASES]
)
def test_patch_rejects_invalid_payload(
    client: TestClient, payload: dict[str, Any], expected: list[dict[str, Any]]
) -> None:
    response = client.patch(f"{BASE}/{SOME_ID}", json=payload)

    assert response.status_code == 422
    assert field_errors(response.json()) == expected


@pytest.mark.parametrize("method", ["get", "patch"])
def test_malformed_id_is_rejected(client: TestClient, method: str) -> None:
    response = client.request(
        method, f"{BASE}/isto-nao-e-uuid", json={"name": "ok"} if method == "patch" else None
    )

    assert response.status_code == 422
    assert field_errors(response.json()) == [
        _field("project_id", "uuid_parsing", "O identificador informado é inválido.")
    ]


def test_unknown_route_returns_standard_404(client: TestClient) -> None:
    response = client.get("/api/v1/nao-existe")

    assert response.status_code == 404
    assert response.json() == {"error": {"code": "not_found", "message": "Recurso não encontrado."}}


def test_unsupported_method_returns_standard_405(client: TestClient) -> None:
    response = client.delete(BASE)

    assert response.status_code == 405
    assert response.json() == {
        "error": {
            "code": "method_not_allowed",
            "message": "Método não permitido para este recurso.",
        }
    }
    assert "allow" in response.headers


def test_validation_errors_do_not_echo_input_or_internals(client: TestClient) -> None:
    response = client.post(BASE, json={"name": "x" * 101, "senha": "SEGREDO-INTERNO"})

    assert response.status_code == 422
    # O valor enviado pelo cliente não é devolvido na resposta.
    assert "x" * 101 not in response.text
    assert "SEGREDO-INTERNO" not in response.text
    assert_no_leak(response.text)
