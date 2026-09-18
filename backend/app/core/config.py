from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="VOICESHIELD_", env_file=".env")

    # Storage
    data_dir: Path = BASE_DIR / "data"
    upload_dir: Path = BASE_DIR / "data" / "uploads"
    database_url: str = f"sqlite:///{BASE_DIR / 'data' / 'voiceshield.db'}"

    # Upload limits
    max_upload_bytes: int = 25 * 1024 * 1024  # 25 MB
    min_duration_sec: float = 0.5
    max_duration_sec: float = 120.0
    allowed_extensions: tuple[str, ...] = (
        ".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm",
    )

    # Retention (informational in this build; enforced by a periodic
    # cleanup task an operator can schedule — see README)
    retention_days: int = 30

    # CORS
    cors_allow_origins: tuple[str, ...] = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://voiceshield-forensics.vercel.app",
    )


settings = Settings()
settings.data_dir.mkdir(parents=True, exist_ok=True)
settings.upload_dir.mkdir(parents=True, exist_ok=True)
