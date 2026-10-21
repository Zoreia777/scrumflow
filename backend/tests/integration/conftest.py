"""Fixtures dos testes de integração: banco de testes migrado e limpo a cada teste."""

from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, text

from tests.helpers import client_for_engine

BACKEND_DIR = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session")
def migrated_engine(db_engine: Engine) -> Engine:
    """Banco de testes na versão mais recente das migrações (aplicadas de verdade)."""
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    with db_engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    return db_engine


@pytest.fixture
def clean_db(migrated_engine: Engine) -> Engine:
    with migrated_engine.begin() as connection:
        connection.execute(text("TRUNCATE TABLE stories, projects"))
    return migrated_engine


@pytest.fixture
def client(clean_db: Engine) -> TestClient:
    return client_for_engine(clean_db)
