import pytest
from sqlalchemy import Engine, text
from sqlalchemy.orm import Session

from app.core.config import Settings

pytestmark = pytest.mark.integration


def test_connects_to_test_database(db_engine: Engine, settings: Settings) -> None:
    with db_engine.connect() as connection:
        assert connection.execute(text("SELECT 1")).scalar_one() == 1
        current = connection.execute(text("SELECT current_database()")).scalar_one()

    assert current == settings.postgres_test_db


def test_server_is_postgresql_16(db_engine: Engine) -> None:
    with db_engine.connect() as connection:
        major = connection.execute(text("SHOW server_version_num")).scalar_one()

    assert str(major).startswith("16")


def test_session_changes_are_rolled_back(db_session: Session) -> None:
    db_session.execute(text("CREATE TEMP TABLE _isolamento (id int)"))
    db_session.execute(text("INSERT INTO _isolamento VALUES (1)"))

    assert db_session.execute(text("SELECT count(*) FROM _isolamento")).scalar_one() == 1
