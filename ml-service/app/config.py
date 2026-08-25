"""Application configuration.

All settings are loaded from environment variables (optionally via a local
``.env`` file — see ``.env.example``). Nothing here hardcodes a real
checkpoint path or model architecture; those are integration points for a
later block.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed, validated service configuration."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Service identity ---
    service_name: str = Field(default="patho-ml-service")
    service_version: str = Field(default="1.0.0")

    # --- Server ---
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")

    # --- Logging ---
    log_level: str = Field(default="info", alias="LOG_LEVEL")

    # --- Model integration points (Block 6+) ---
    # No real checkpoint exists yet — this path is only read once a model
    # architecture is implemented and never trusted blindly.
    model_path: str = Field(default="./models/patho_stage2_best.pth", alias="MODEL_PATH")

    # --- Image / request limits ---
    # Maximum allowed uploaded image size, in megabytes.
    allowed_image_size_mb: float = Field(default=15.0, alias="ALLOWED_IMAGE_SIZE_MB")

    # Square input resolution the model expects once loaded (e.g. 224 for a
    # typical ViT). This is a config placeholder only in Block 5 — nothing
    # resizes or feeds tensors to a model yet.
    model_input_size: int = Field(default=224, alias="MODEL_INPUT_SIZE")

    # How long a single inference request is allowed to take before the
    # service should treat it as failed.
    request_timeout_seconds: float = Field(default=30.0, alias="REQUEST_TIMEOUT_SECONDS")


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance.

    Cached so the environment is only parsed once per process, while still
    remaining easy to override in tests via ``get_settings.cache_clear()``.
    """

    return Settings()
