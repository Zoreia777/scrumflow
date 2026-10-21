"""Fixtures compartilhadas. Os testes de integração usam um banco separado (POSTGRES_TEST_DB)."""

import re
from collections.abc import Iterator

import pytest
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings

_IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


@pytest.fixture(scope="session")
def settings() -> Settings:
    return get_settings()


def _ensure_test_database(settings: Settings) -> None:
    """Cria o banco de testes se ainda não existir (conexão pelo banco de manutenção)."""
    name = settings.postgres_test_db
    if not _IDENTIFIER.fullmatch(name):
        raise ValueError(f"Nome de banco de testes inválido: {name!r}")
    if name == settings.postgres_db:
        raise ValueError("POSTGRES_TEST_DB não pode ser igual a POSTGRES_DB.")

    admin = create_engine(
        settings.database_url.set(database="postgres"), isolation_level="AUTOCOMMIT"
    )
    try:
        with admin.connect() as connection:
            exists = connection.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": name}
            ).scalar()
            if not exists:
                connection.execute(text(f'CREATE DATABASE "{name}"'))
    finally:
        admin.dispose()


@pytest.fixture(scope="session")
def db_engine(settings: Settings) -> Iterator[Engine]:
    try:
        _ensure_test_database(settings)
    except OperationalError as exc:
        pytest.fail(
            "PostgreSQL indisponível para os testes de integração. "
            "Suba o banco com 'docker compose up -d db' e confira o arquivo .env. "
            f"Detalhe: {exc.orig}"
        )
    engine = create_engine(settings.test_database_url, pool_pre_ping=True)
    yield engine
    engine.dispose()


@pytest.fixture
def db_session(db_engine: Engine) -> Iterator[Session]:
    """Sessão isolada: tudo o que o teste gravar é desfeito (rollback) ao final."""
    with db_engine.connect() as connection:
        transaction = connection.begin()
        session = Session(bind=connection, join_transaction_mode="create_savepoint")
        try:
            yield session
        finally:
            session.close()
            transaction.rollback()
