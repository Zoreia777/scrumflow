from typing import Any

import pytest
from pydantic import BaseModel, ValidationError

from app.schemas.project import ProjectCreate, ProjectUpdate


def _errors(
    model: type[BaseModel], payload: dict[str, Any]
) -> list[tuple[tuple[Any, ...], str, str]]:
    with pytest.raises(ValidationError) as info:
        model.model_validate(payload)
    return [(tuple(e["loc"]), e["type"], e["msg"]) for e in info.value.errors()]


NAME_TOO_LONG = "O nome deve ter no máximo 100 caracteres."
DESCRIPTION_TOO_LONG = "A descrição deve ter no máximo 1000 caracteres."
NAME_BLANK = "O nome não pode ficar vazio."


# ---------- ProjectCreate: entradas válidas ----------


def test_create_normalizes_name_and_description() -> None:
    project = ProjectCreate.model_validate({"name": "  Meu projeto  ", "description": " texto \n"})

    assert project.name == "Meu projeto"
    assert project.description == "texto"


def test_create_description_is_optional() -> None:
    assert ProjectCreate.model_validate({"name": "A"}).description is None


@pytest.mark.parametrize("blank", ["", "   ", "\n\t", None])
def test_create_blank_description_becomes_none(blank: str | None) -> None:
    assert ProjectCreate.model_validate({"name": "A", "description": blank}).description is None


def test_create_accepts_name_limits() -> None:
    assert ProjectCreate.model_validate({"name": "a"}).name == "a"
    assert len(ProjectCreate.model_validate({"name": "a" * 100}).name) == 100


def test_create_limit_is_counted_after_normalization() -> None:
    padded = "  " + "a" * 100 + "  "  # 104 caracteres brutos, 100 depois do strip

    assert len(ProjectCreate.model_validate({"name": padded}).name) == 100


def test_create_accepts_description_limit() -> None:
    project = ProjectCreate.model_validate({"name": "A", "description": "d" * 1000})

    assert project.description is not None
    assert len(project.description) == 1000


def test_create_keeps_internal_spaces() -> None:
    assert ProjectCreate.model_validate({"name": "a  b"}).name == "a  b"


def test_create_counts_characters_after_nfc() -> None:
    decomposed = "é" * 100  # 200 pontos de código, 100 caracteres depois do NFC

    project = ProjectCreate.model_validate({"name": decomposed})

    assert project.name == "é" * 100


def test_create_rejects_name_that_exceeds_limit_after_nfc() -> None:
    name = "é" * 100 + "é"  # 101 caracteres depois do NFC

    assert _errors(ProjectCreate, {"name": name}) == [(("name",), "too_long", NAME_TOO_LONG)]


# ---------- ProjectCreate: entradas inválidas ----------


@pytest.mark.parametrize("name", ["", "   ", "\t\n", None])
def test_create_rejects_blank_name(name: str | None) -> None:
    assert _errors(ProjectCreate, {"name": name}) == [(("name",), "blank", NAME_BLANK)]


def test_create_rejects_name_above_limit() -> None:
    assert _errors(ProjectCreate, {"name": "a" * 101}) == [(("name",), "too_long", NAME_TOO_LONG)]


def test_create_rejects_description_above_limit() -> None:
    assert _errors(ProjectCreate, {"name": "A", "description": "d" * 1001}) == [
        (("description",), "too_long", DESCRIPTION_TOO_LONG)
    ]


def test_create_requires_name() -> None:
    errors = _errors(ProjectCreate, {})

    assert [(loc, kind) for loc, kind, _ in errors] == [(("name",), "missing")]


@pytest.mark.parametrize("name", [123, 1.5, True, ["a"], {"a": 1}])
def test_create_rejects_non_text_name(name: Any) -> None:
    assert _errors(ProjectCreate, {"name": name}) == [
        (("name",), "invalid_type", "O nome deve ser um texto.")
    ]


def test_create_rejects_non_text_description() -> None:
    assert _errors(ProjectCreate, {"name": "A", "description": 5}) == [
        (("description",), "invalid_type", "A descrição deve ser um texto.")
    ]


def test_create_rejects_unknown_fields() -> None:
    errors = _errors(ProjectCreate, {"name": "A", "id": "x", "created_at": "y"})

    assert sorted((loc, kind) for loc, kind, _ in errors) == [
        (("created_at",), "extra_forbidden"),
        (("id",), "extra_forbidden"),
    ]


def test_create_reports_each_invalid_field() -> None:
    errors = _errors(ProjectCreate, {"name": "", "description": "d" * 1001})

    assert sorted(loc for loc, _, _ in errors) == [("description",), ("name",)]


# ---------- ProjectUpdate ----------


def test_update_name_only() -> None:
    update = ProjectUpdate.model_validate({"name": " Novo "})

    assert update.name == "Novo"
    assert update.model_fields_set == {"name"}


def test_update_description_only() -> None:
    update = ProjectUpdate.model_validate({"description": " nova "})

    assert update.description == "nova"
    assert update.model_fields_set == {"description"}


def test_update_null_description_clears_it() -> None:
    update = ProjectUpdate.model_validate({"description": None})

    assert update.description is None
    assert update.model_fields_set == {"description"}


def test_update_blank_description_clears_it() -> None:
    update = ProjectUpdate.model_validate({"description": "   "})

    assert update.description is None
    assert update.model_fields_set == {"description"}


def test_update_rejects_empty_body() -> None:
    assert _errors(ProjectUpdate, {}) == [
        ((), "empty_body", "Informe ao menos um campo para atualizar (nome ou descrição).")
    ]


@pytest.mark.parametrize("name", [None, "", "   "])
def test_update_rejects_blank_or_null_name(name: str | None) -> None:
    assert _errors(ProjectUpdate, {"name": name}) == [(("name",), "blank", NAME_BLANK)]


def test_update_rejects_name_above_limit() -> None:
    assert _errors(ProjectUpdate, {"name": "a" * 101}) == [(("name",), "too_long", NAME_TOO_LONG)]


def test_update_rejects_description_above_limit() -> None:
    assert _errors(ProjectUpdate, {"description": "d" * 1001}) == [
        (("description",), "too_long", DESCRIPTION_TOO_LONG)
    ]


def test_update_accepts_limits() -> None:
    update = ProjectUpdate.model_validate({"name": "a" * 100, "description": "d" * 1000})

    assert update.name is not None and len(update.name) == 100
    assert update.description is not None and len(update.description) == 1000


def test_update_rejects_unknown_fields() -> None:
    errors = _errors(ProjectUpdate, {"name": "A", "id": "x"})

    assert [(loc, kind) for loc, kind, _ in errors] == [(("id",), "extra_forbidden")]
