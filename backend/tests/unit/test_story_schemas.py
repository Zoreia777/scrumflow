"""Validação de histórias (ADR-002, seção 7): regras puras, sem banco e sem HTTP."""

from typing import Any

import pytest
from pydantic import ValidationError

from app.schemas.story import (
    CRITERIA_MAX_ITEMS,
    CRITERION_MAX_LENGTH,
    DESCRIPTION_MAX_LENGTH,
    TITLE_MAX_LENGTH,
    StoryCreate,
)


def make(**overrides: Any) -> StoryCreate:
    payload: dict[str, Any] = {
        "title": "Cadastrar história",
        "priority": "Alta",
        "acceptance_criteria": ["Salva e mostra no backlog"],
    }
    payload.update(overrides)
    return StoryCreate(**payload)


def error_of(**overrides: Any) -> tuple[str, str]:
    """Devolve (código, mensagem) do primeiro erro de validação."""
    with pytest.raises(ValidationError) as info:
        make(**overrides)
    error = info.value.errors()[0]
    return str(error["type"]), str(error["msg"])


class TestTitle:
    def test_is_trimmed_and_normalized_to_nfc(self) -> None:
        assert make(title="  Café da manhã  ").title == "Café da manhã"

    def test_keeps_internal_spaces(self) -> None:
        assert make(title="a   b").title == "a   b"

    @pytest.mark.parametrize("value", ["", "   ", "\t\n", None])
    def test_blank_is_rejected_with_a_message_naming_the_field(self, value: Any) -> None:
        assert error_of(title=value) == ("blank", "O título não pode ficar vazio.")

    def test_accepts_exactly_150_characters(self) -> None:
        assert len(make(title="t" * TITLE_MAX_LENGTH).title) == 150

    def test_rejects_151_characters(self) -> None:
        assert error_of(title="t" * 151) == (
            "too_long",
            "O título deve ter no máximo 150 caracteres.",
        )

    def test_limit_is_measured_after_trimming(self) -> None:
        assert len(make(title=f"  {'t' * 150}  ").title) == 150

    def test_counts_characters_not_bytes(self) -> None:
        assert len(make(title="é" * 150).title) == 150

    def test_rejects_non_text(self) -> None:
        assert error_of(title=42) == ("invalid_type", "O título deve ser um texto.")


class TestDescription:
    def test_is_optional(self) -> None:
        story = StoryCreate(title="x", priority="Baixa", acceptance_criteria=["a"])
        assert story.description is None

    @pytest.mark.parametrize("value", ["", "   ", None])
    def test_blank_becomes_null(self, value: Any) -> None:
        assert make(description=value).description is None

    def test_accepts_exactly_2000_characters(self) -> None:
        assert len(make(description="d" * DESCRIPTION_MAX_LENGTH).description or "") == 2000

    def test_rejects_2001_characters(self) -> None:
        assert error_of(description="d" * 2001) == (
            "too_long",
            "A descrição deve ter no máximo 2000 caracteres.",
        )

    def test_rejects_non_text(self) -> None:
        assert error_of(description=["x"])[0] == "invalid_type"


class TestPriority:
    @pytest.mark.parametrize("value", ["Alta", "Média", "Baixa"])
    def test_accepts_only_the_three_allowed_values(self, value: str) -> None:
        assert make(priority=value).priority == value

    @pytest.mark.parametrize(
        "value",
        ["alta", "ALTA", "Media", "Média ", " Alta", "Urgente", "High", "", "1", None, 1, True],
    )
    def test_rejects_everything_else(self, value: Any) -> None:
        assert error_of(priority=value) == (
            "invalid_priority",
            "A prioridade deve ser Alta, Média ou Baixa.",
        )

    def test_is_required(self) -> None:
        with pytest.raises(ValidationError) as info:
            StoryCreate.model_validate({"title": "x", "acceptance_criteria": ["a"]})
        assert info.value.errors()[0]["type"] == "missing"


class TestAcceptanceCriteria:
    def test_accepts_one_criterion(self) -> None:
        assert make(acceptance_criteria=["a"]).acceptance_criteria == ["a"]

    def test_criteria_are_trimmed_and_keep_their_order(self) -> None:
        story = make(acceptance_criteria=["  primeiro ", "segundo", "terceiro  "])
        assert story.acceptance_criteria == ["primeiro", "segundo", "terceiro"]

    def test_repeated_criteria_are_kept(self) -> None:
        assert make(acceptance_criteria=["a", "a"]).acceptance_criteria == ["a", "a"]

    @pytest.mark.parametrize("value", [[], None])
    def test_empty_list_or_null_is_rejected(self, value: Any) -> None:
        assert error_of(acceptance_criteria=value) == (
            "criteria_required",
            "Informe ao menos um critério de aceitação.",
        )

    @pytest.mark.parametrize("value", [[""], ["   "], ["\n"]])
    def test_only_blank_criteria_are_rejected(self, value: list[str]) -> None:
        assert error_of(acceptance_criteria=value) == (
            "blank",
            "O critério de aceitação 1 não pode ficar vazio.",
        )

    def test_a_blank_item_among_valid_ones_is_rejected_not_discarded(self) -> None:
        assert error_of(acceptance_criteria=["ok", "  ", "ok"]) == (
            "blank",
            "O critério de aceitação 2 não pode ficar vazio.",
        )

    def test_accepts_500_characters_and_rejects_501(self) -> None:
        assert make(acceptance_criteria=["c" * CRITERION_MAX_LENGTH]).acceptance_criteria
        assert error_of(acceptance_criteria=["ok", "c" * 501]) == (
            "too_long",
            "O critério de aceitação 2 deve ter no máximo 500 caracteres.",
        )

    def test_accepts_20_items_and_rejects_21(self) -> None:
        items = [f"critério {n}" for n in range(CRITERIA_MAX_ITEMS)]
        assert len(make(acceptance_criteria=items).acceptance_criteria) == 20
        assert error_of(acceptance_criteria=[*items, "extra"]) == (
            "too_many",
            "Informe no máximo 20 critérios de aceitação.",
        )

    @pytest.mark.parametrize("value", ["texto solto", {"a": 1}, 5])
    def test_must_be_a_list(self, value: Any) -> None:
        assert error_of(acceptance_criteria=value)[0] == "invalid_type"

    @pytest.mark.parametrize("value", [[1], [None], [["a"]]])
    def test_items_must_be_text(self, value: list[Any]) -> None:
        assert error_of(acceptance_criteria=value) == (
            "invalid_type",
            "O critério de aceitação 1 deve ser um texto.",
        )


class TestStatusAndExtraFields:
    def test_client_cannot_send_status(self) -> None:
        with pytest.raises(ValidationError) as info:
            make(status="Concluída")
        assert info.value.errors()[0]["type"] == "extra_forbidden"

    def test_client_cannot_send_id_or_project_id(self) -> None:
        for field in ("id", "project_id", "created_at"):
            with pytest.raises(ValidationError):
                make(**{field: "x"})
