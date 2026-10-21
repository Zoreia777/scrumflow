from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.database import get_session
from app.main import create_app

pytestmark = pytest.mark.integration


def _client_with_engine(engine: Engine) -> TestClient:
    app = create_app()

    def override() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = override
    return TestClient(app)


def test_health_reports_database_ok(db_engine: Engine) -> None:
    response = _client_with_engine(db_engine).get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_health_reports_503_when_database_is_unreachable(settings: Settings) -> None:
    # Porta 1: nada escuta lá, então a conexão falha de verdade (sem simulação).
    unreachable = create_engine(
        settings.test_database_url.set(port=1), connect_args={"connect_timeout": 2}
    )
    try:
        response = _client_with_engine(unreachable).get("/api/v1/health")
    finally:
        unreachable.dispose()

    assert response.status_code == 503
    assert response.json() == {"status": "degraded", "database": "unavailable"}
    # Nenhum detalhe interno (host, usuário, senha, stack trace) na resposta.
    assert "localhost" not in response.text
    assert "psycopg" not in response.text
