"""Tabela `projects` no PostgreSQL: constraints, defaults e identificador UUID."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import Engine, text
from sqlalchemy.exc import DataError, IntegrityError
from sqlalchemy.orm import Session

from app.models import Project

pytestmark = pytest.mark.integration


def test_blank_name_is_rejected_by_the_database(clean_db: Engine) -> None:
    with clean_db.connect() as connection:
        transaction = connection.begin()
        try:
            with pytest.raises(IntegrityError, match="ck_projects_name_not_blank"):
                connection.execute(
                    text("INSERT INTO projects (id, name) VALUES (:id, :name)"),
                    {"id": uuid.uuid4(), "name": "   "},
                )
        finally:
            transaction.rollback()


def test_blank_description_is_rejected_by_the_database(clean_db: Engine) -> None:
    with clean_db.connect() as connection:
        transaction = connection.begin()
        try:
            with pytest.raises(IntegrityError, match="ck_projects_description_not_blank"):
                connection.execute(
                    text("INSERT INTO projects (id, name, description) VALUES (:id, 'ok', '  ')"),
                    {"id": uuid.uuid4()},
                )
        finally:
            transaction.rollback()


def test_name_longer_than_100_is_rejected_by_the_database(clean_db: Engine) -> None:
    with clean_db.connect() as connection:
        transaction = connection.begin()
        try:
            with pytest.raises(DataError):
                connection.execute(
                    text("INSERT INTO projects (id, name) VALUES (:id, :name)"),
                    {"id": uuid.uuid4(), "name": "a" * 101},
                )
        finally:
            transaction.rollback()


def test_description_longer_than_1000_is_rejected_by_the_database(clean_db: Engine) -> None:
    with clean_db.connect() as connection:
        transaction = connection.begin()
        try:
            with pytest.raises(DataError):
                connection.execute(
                    text("INSERT INTO projects (id, name, description) VALUES (:id, 'ok', :d)"),
                    {"id": uuid.uuid4(), "d": "d" * 1001},
                )
        finally:
            transaction.rollback()


def test_timestamps_default_to_now_with_timezone(clean_db: Engine) -> None:
    project_id = uuid.uuid4()
    with clean_db.begin() as connection:
        connection.execute(
            text("INSERT INTO projects (id, name) VALUES (:id, 'Defaults')"), {"id": project_id}
        )

    with Session(clean_db) as session:
        project = session.get(Project, project_id)
        assert project is not None
        assert project.created_at.tzinfo is not None
        assert abs(datetime.now(UTC) - project.created_at) < timedelta(minutes=1)
        assert project.updated_at.tzinfo is not None


def test_orm_generates_uuid_identifiers(clean_db: Engine) -> None:
    with Session(clean_db) as session:
        project = Project(name="Com UUID")
        session.add(project)
        session.commit()

        assert isinstance(project.id, uuid.UUID)
        assert project.id.version == 4


def test_updated_at_changes_when_the_row_is_updated(clean_db: Engine) -> None:
    with Session(clean_db) as session:
        project = Project(name="Antes")
        session.add(project)
        session.commit()
        created_at, first_updated_at = project.created_at, project.updated_at

        project.name = "Depois"
        session.commit()

        assert project.created_at == created_at
        assert project.updated_at > first_updated_at
