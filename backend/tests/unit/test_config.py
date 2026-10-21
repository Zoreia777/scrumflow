import pytest
from pydantic import ValidationError

from app.core.config import Settings


def _clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_DB",
        "POSTGRES_TEST_DB",
        "POSTGRES_HOST",
        "POSTGRES_PORT",
        "CORS_ORIGINS",
    ):
        monkeypatch.delenv(name, raising=False)


def _settings_from_env_only() -> Settings:
    """Lê só as variáveis de ambiente (ignora o arquivo .env real do desenvolvedor)."""
    return Settings(_env_file=None)  # type: ignore[call-arg]


def test_database_urls_use_driver_and_separate_databases(monkeypatch: pytest.MonkeyPatch) -> None:
    _clean_env(monkeypatch)
    monkeypatch.setenv("POSTGRES_PASSWORD", "p@ss:word/1")

    settings = _settings_from_env_only()

    assert settings.database_url.drivername == "postgresql+psycopg"
    assert settings.database_url.database == "scrumflow"
    assert settings.test_database_url.database == "scrumflow_test"
    assert settings.database_url.port == 5433
    # Caracteres especiais na senha são preservados (sem quebrar a URL).
    assert settings.database_url.password == "p@ss:word/1"


def test_password_is_required(monkeypatch: pytest.MonkeyPatch) -> None:
    _clean_env(monkeypatch)

    with pytest.raises(ValidationError):
        _settings_from_env_only()


def test_password_is_not_exposed_in_repr(monkeypatch: pytest.MonkeyPatch) -> None:
    _clean_env(monkeypatch)
    monkeypatch.setenv("POSTGRES_PASSWORD", "segredo-que-nao-deve-aparecer")

    assert "segredo-que-nao-deve-aparecer" not in repr(_settings_from_env_only())


def test_cors_origins_are_split_and_trimmed(monkeypatch: pytest.MonkeyPatch) -> None:
    _clean_env(monkeypatch)
    monkeypatch.setenv("POSTGRES_PASSWORD", "x")
    monkeypatch.setenv("CORS_ORIGINS", " http://a.test , http://b.test ,, ")

    assert _settings_from_env_only().cors_origin_list == ["http://a.test", "http://b.test"]
