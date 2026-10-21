"""Configuração da aplicação, lida de variáveis de ambiente e do arquivo .env da raiz."""

from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

# backend/app/core/config.py -> raiz do repositório (onde fica o .env)
ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    postgres_user: str = "scrumflow"
    # Sem valor padrão de propósito: nenhuma credencial fica no código.
    postgres_password: SecretStr
    postgres_db: str = "scrumflow"
    postgres_test_db: str = "scrumflow_test"
    postgres_host: str = "localhost"
    postgres_port: int = 5433

    # Origens separadas por vírgula (ex.: "http://localhost:5173,http://127.0.0.1:5173").
    cors_origins: str = "http://localhost:5173"

    def _url(self, database: str) -> URL:
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password.get_secret_value(),
            host=self.postgres_host,
            port=self.postgres_port,
            database=database,
        )

    @property
    def database_url(self) -> URL:
        return self._url(self.postgres_db)

    @property
    def test_database_url(self) -> URL:
        return self._url(self.postgres_test_db)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # postgres_password vem do ambiente
