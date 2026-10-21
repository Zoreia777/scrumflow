"""A tabela `stories` no PostgreSQL: constraints, relacionamento e tipos (rede de segurança)."""

import uuid
from typing import Any

import pytest
from sqlalchemy import Engine, inspect, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Project, Story

pytestmark = pytest.mark.integration


def _project(session: Session) -> Project:
    project = Project(name="Projeto")
    session.add(project)
    session.flush()
    return project


def _story(project: Project, **overrides: Any) -> Story:
    values: dict[str, Any] = {
        "project_id": project.id,
        "title": "Título",
        "priority": "Alta",
        "acceptance_criteria": ["critério"],
        "status": "A fazer",
    }
    values.update(overrides)
    return Story(**values)


def test_defaults_are_filled_by_the_database_and_the_app(db_session: Session) -> None:
    project = _project(db_session)
    story = Story(project_id=project.id, title="x", priority="Baixa", acceptance_criteria=["a"])
    db_session.add(story)
    db_session.flush()
    db_session.refresh(story)

    assert isinstance(story.id, uuid.UUID)
    assert story.status == "A fazer"
    assert story.description is None
    assert story.created_at.tzinfo is not None
    assert story.updated_at.tzinfo is not None


def test_id_column_is_uuid_and_criteria_column_is_jsonb(migrated_engine: Engine) -> None:
    columns = {c["name"]: c for c in inspect(migrated_engine).get_columns("stories")}

    assert str(columns["id"]["type"]).upper() == "UUID"
    assert str(columns["project_id"]["type"]).upper() == "UUID"
    assert str(columns["acceptance_criteria"]["type"]).upper() == "JSONB"
    assert columns["acceptance_criteria"]["nullable"] is False


@pytest.mark.parametrize(
    ("override", "constraint"),
    [
        ({"title": "   "}, "ck_stories_title_not_blank"),
        ({"description": "   "}, "ck_stories_description_not_blank"),
        ({"priority": "Urgente"}, "ck_stories_priority_allowed"),
        ({"priority": "alta"}, "ck_stories_priority_allowed"),
        ({"status": "Concluída"}, "ck_stories_status_allowed"),
        ({"acceptance_criteria": []}, "ck_stories_criteria_non_empty_array"),
        ({"acceptance_criteria": {"a": "b"}}, "ck_stories_criteria_non_empty_array"),
        ({"acceptance_criteria": "texto"}, "ck_stories_criteria_non_empty_array"),
    ],
)
def test_database_rejects_invalid_rows_even_if_the_api_were_bypassed(
    db_session: Session, override: dict[str, Any], constraint: str
) -> None:
    project = _project(db_session)
    db_session.add(_story(project, **override))

    with pytest.raises(IntegrityError) as info:
        db_session.flush()

    assert constraint in str(info.value.orig)


def test_database_rejects_a_story_for_a_missing_project(db_session: Session) -> None:
    db_session.add(
        Story(
            project_id=uuid.uuid4(),
            title="Órfã",
            priority="Alta",
            acceptance_criteria=["a"],
        )
    )

    with pytest.raises(IntegrityError) as info:
        db_session.flush()

    assert "fk_stories_project_id_projects" in str(info.value.orig)


def test_database_rejects_null_in_required_columns(db_session: Session) -> None:
    project = _project(db_session)
    db_session.add(_story(project, acceptance_criteria=None))

    with pytest.raises(IntegrityError):
        db_session.flush()


def test_duplicate_titles_are_allowed_at_the_database_level(db_session: Session) -> None:
    project = _project(db_session)
    first, second = _story(project, title="Igual"), _story(project, title="Igual")
    db_session.add_all([first, second])
    db_session.flush()

    assert first.id != second.id


def test_project_with_stories_cannot_be_deleted(db_session: Session) -> None:
    project = _project(db_session)
    db_session.add(_story(project))
    db_session.flush()

    with pytest.raises(IntegrityError) as info:
        db_session.execute(text("DELETE FROM projects WHERE id = :id"), {"id": project.id})

    assert "fk_stories_project_id_projects" in str(info.value.orig)


def test_project_without_stories_can_still_be_deleted(db_session: Session) -> None:
    project = _project(db_session)

    db_session.execute(text("DELETE FROM projects WHERE id = :id"), {"id": project.id})

    assert db_session.scalar(select(Project).where(Project.id == project.id)) is None


def test_jsonb_can_be_queried_inside_the_criteria(db_session: Session) -> None:
    project = _project(db_session)
    db_session.add(_story(project, acceptance_criteria=["pagar boleto", "enviar e-mail"]))
    db_session.flush()

    found = db_session.execute(
        text(
            "SELECT count(*) FROM stories WHERE acceptance_criteria @> '[\"pagar boleto\"]'::jsonb"
        )
    ).scalar()

    assert found == 1
