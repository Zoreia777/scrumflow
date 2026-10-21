"""Contrato OpenAPI: os quatro endpoints da US-01 existem e o endpoint de saúde foi preservado."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture(scope="module")
def spec() -> dict[str, Any]:
    document: dict[str, Any] = TestClient(create_app()).get("/openapi.json").json()
    return document


def test_exposes_exactly_the_planned_paths(spec: dict[str, Any]) -> None:
    assert set(spec["paths"]) == {
        "/api/v1/health",
        "/api/v1/projects",
        "/api/v1/projects/{project_id}",
        "/api/v1/projects/{project_id}/stories",  # US-02 (Fase 3)
    }


def test_exposes_the_four_project_operations(spec: dict[str, Any]) -> None:
    paths = spec["paths"]

    assert set(paths["/api/v1/projects"]) == {"get", "post"}
    assert set(paths["/api/v1/projects/{project_id}"]) == {"get", "patch"}


def test_health_endpoint_is_preserved(spec: dict[str, Any]) -> None:
    assert set(spec["paths"]["/api/v1/health"]) == {"get"}


def test_create_documents_201_and_422(spec: dict[str, Any]) -> None:
    responses = spec["paths"]["/api/v1/projects"]["post"]["responses"]

    assert {"201", "422"} <= set(responses)


@pytest.mark.parametrize("method", ["get", "patch"])
def test_detail_and_patch_document_404_and_422(spec: dict[str, Any], method: str) -> None:
    responses = spec["paths"]["/api/v1/projects/{project_id}"][method]["responses"]

    assert {"200", "404", "422"} <= set(responses)


def test_project_id_is_documented_as_uuid(spec: dict[str, Any]) -> None:
    (parameter,) = spec["paths"]["/api/v1/projects/{project_id}"]["get"]["parameters"]

    assert parameter["name"] == "project_id"
    assert parameter["schema"]["format"] == "uuid"


def test_error_format_is_documented(spec: dict[str, Any]) -> None:
    schemas = spec["components"]["schemas"]

    assert {"ErrorResponse", "ErrorBody", "FieldError", "ProjectRead"} <= set(schemas)
