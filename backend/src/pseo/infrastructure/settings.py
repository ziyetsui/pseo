"""Environment-backed process settings."""

from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Non-secret API process configuration."""

    model_config = SettingsConfigDict(env_prefix="PSEO_", extra="ignore")

    service_name: str = "pseo-public-api"
    environment: str = "development"
    repository_root: Path | None = None
    public_base_url: str = "http://127.0.0.1:8000"
    public_base_description: str = "Local beta"
    cors_origins: tuple[str, ...] = Field(
        default=("http://localhost:3000", "http://127.0.0.1:3000")
    )
