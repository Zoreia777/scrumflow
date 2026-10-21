from pathlib import Path

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import Engine, inspect, text

from app.models import Base

pytestmark = pytest.mark.integration

BACKEND_DIR = Path(__file__).resolve().parents[2]


def _alembic_config() -> Config:
    return Config(str(BACKEND_DIR / "alembic.ini"))


def test_baseline_migration_upgrades_and_downgrades(db_engine: Engine) -> None:
    config = _alembic_config()

    # Tudo dentro de uma transação desfeita ao final: o banco de testes continua como estava.
    with db_engine.connect() as connection:
        transaction = connection.begin()
        try:
            config.attributes["connection"] = connection

            command.downgrade(config, "base")  # parte sempre do zero, qualquer que seja o estado
            command.upgrade(config, "0001")
            version = connection.execute(text("SELECT version_num FROM alembic_version")).scalar()
            assert version == "0001"

            command.downgrade(config, "base")
            remaining = connection.execute(text("SELECT count(*) FROM alembic_version")).scalar()
            assert remaining == 0

            command.upgrade(config, "head")
            assert "alembic_version" in inspect(connection).get_table_names()
        finally:
            transaction.rollback()


def test_baseline_creates_no_business_tables(db_engine: Engine) -> None:
    config = _alembic_config()

    with db_engine.connect() as connection:
        transaction = connection.begin()
        try:
            config.attributes["connection"] = connection
            command.downgrade(config, "base")
            command.upgrade(config, "0001")

            tables = set(inspect(connection).get_table_names())
            assert tables <= {"alembic_version"}
        finally:
            transaction.rollback()


def test_projects_migration_creates_and_removes_the_table(db_engine: Engine) -> None:
    config = _alembic_config()

    with db_engine.connect() as connection:
        transaction = connection.begin()
        try:
            config.attributes["connection"] = connection
            command.downgrade(config, "base")
            command.upgrade(config, "head")

            inspector = inspect(connection)
            assert "projects" in inspector.get_table_names()
            columns = {c["name"]: c for c in inspector.get_columns("projects")}
            assert set(columns) == {"id", "name", "description", "created_at", "updated_at"}
            assert columns["name"]["nullable"] is False
            assert columns["description"]["nullable"] is True
            assert str(columns["id"]["type"]).upper() == "UUID"
            assert inspector.get_pk_constraint("projects")["name"] == "pk_projects"
            checks = {c["name"] for c in inspector.get_check_constraints("projects")}
            assert checks == {"ck_projects_name_not_blank", "ck_projects_description_not_blank"}

            command.downgrade(config, "0001")
            assert "projects" not in inspect(connection).get_table_names()
        finally:
            transaction.rollback()


def test_models_match_the_migrations(db_engine: Engine) -> None:
    config = _alembic_config()

    with db_engine.connect() as connection:
        transaction = connection.begin()
        try:
            config.attributes["connection"] = connection
            command.downgrade(config, "base")
            command.upgrade(config, "head")

            differences = compare_metadata(MigrationContext.configure(connection), Base.metadata)

            assert differences == []
        finally:
            transaction.rollback()


def test_stories_migration_creates_the_table_with_its_structure(db_engine: Engine) -> None:
    config = _alembic_config()

    with db_engine.connect() as connection:
        transaction = connection.begin()
        try:
            config.attributes["connection"] = connection
            command.downgrade(config, "base")
            command.upgrade(config, "head")

            inspector = inspect(connection)
            assert "stories" in inspector.get_table_names()
            columns = {c["name"]: c for c in inspector.get_columns("stories")}
            assert set(columns) == {
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
            assert str(columns["acceptance_criteria"]["type"]).upper() == "JSONB"
            assert str(columns["id"]["type"]).upper() == "UUID"
            assert columns["description"]["nullable"] is True
            assert inspector.get_pk_constraint("stories")["name"] == "pk_stories"
            foreign_keys = inspector.get_foreign_keys("stories")
            assert [(fk["referred_table"], fk["constrained_columns"]) for fk in foreign_keys] == [
                ("projects", ["project_id"])
            ]
            assert {i["name"] for i in inspector.get_indexes("stories")} == {
                "ix_stories_project_id"
            }
            checks = {c["name"] for c in inspector.get_check_constraints("stories")}
            assert checks == {
                "ck_stories_title_not_blank",
                "ck_stories_description_not_blank",
                "ck_stories_priority_allowed",
                "ck_stories_status_allowed",
                "ck_stories_criteria_non_empty_array",
            }
        finally:
            transaction.rollback()


def test_stories_migration_preserves_existing_projects_up_and_down(db_engine: Engine) -> None:
    config = _alembic_config()

    with db_engine.connect() as connection:
        transaction = connection.begin()
        try:
            config.attributes["connection"] = connection
            command.downgrade(config, "base")
            command.upgrade(config, "0002")  # estado da Fase 1: só projetos
            assert "stories" not in inspect(connection).get_table_names()
            connection.execute(
                text(
                    "INSERT INTO projects (id, name, description) VALUES "
                    "('11111111-1111-4111-8111-111111111111', 'Antigo', 'Criado na Fase 1'), "
                    "('22222222-2222-4222-8222-222222222222', 'Outro', NULL)"
                )
            )

            command.upgrade(config, "0003")
            after_up = connection.execute(
                text("SELECT id::text, name, description FROM projects ORDER BY name")
            ).all()
            assert [tuple(r) for r in after_up] == [
                ("11111111-1111-4111-8111-111111111111", "Antigo", "Criado na Fase 1"),
                ("22222222-2222-4222-8222-222222222222", "Outro", None),
            ]

            command.downgrade(config, "0002")
            tables = set(inspect(connection).get_table_names())
            assert "stories" not in tables
            assert "projects" in tables
            count = connection.execute(text("SELECT count(*) FROM projects")).scalar()
            assert count == 2
        finally:
            transaction.rollback()
