"""Conexão com o PostgreSQL (SQLAlchemy síncrono)."""

from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session

from app.core.config import get_settings


@lru_cache
def get_engine() -> Engine:
    return create_engine(get_settings().database_url, pool_pre_ping=True)


def get_session() -> Iterator[Session]:
    """Dependência do FastAPI: uma sessão por requisição."""
    with Session(get_engine()) as session:
        yield session
