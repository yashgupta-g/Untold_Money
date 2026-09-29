"""
Application configuration using Pydantic Settings.
Loads from environment variables and .env files with validation.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application configuration."""

    model_config = SettingsConfigDict(
        env_file=("../../.env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    APP_NAME: str = "UntoldMoney"
    APP_ENV: Literal["local", "dev", "staging", "production"] = "local"
    API_VERSION: str = "v1"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # --- Database ---
    POSTGRES_USER: str = "untoldmoney"
    POSTGRES_PASSWORD: str = "changeme_postgres_password"
    POSTGRES_DB: str = "untoldmoney"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = ""

    # --- Redis ---
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_URL: str = ""

    # --- JWT ---
    JWT_SECRET_KEY: str = "changeme_super_secret_key_at_least_32_chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- CORS ---
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # --- URLs ---
    FRONTEND_URL: str = "http://localhost:3000"

    # --- Celery ---
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    @model_validator(mode="after")
    def assemble_urls(self) -> "Settings":
        """Auto-assemble DATABASE_URL and REDIS_URL from components if not set."""
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
        if not self.REDIS_URL:
            self.REDIS_URL = f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return self

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Prevent startup with default secrets in non-local environments."""
        if self.APP_ENV != "local":
            if "changeme" in self.JWT_SECRET_KEY:
                raise ValueError(
                    "JWT_SECRET_KEY must be changed from default in non-local environments"
                )
            if "changeme" in self.POSTGRES_PASSWORD:
                raise ValueError(
                    "POSTGRES_PASSWORD must be changed from default in non-local environments"
                )
        return self

    @property
    def database_url_sync(self) -> str:
        """Synchronous database URL for Alembic."""
        return self.DATABASE_URL.replace("+asyncpg", "")

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def is_local(self) -> bool:
        return self.APP_ENV == "local"


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
