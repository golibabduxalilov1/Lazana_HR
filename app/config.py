from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Telegram
    bot_token: str
    hr_notify_chat_id: int
    bootstrap_super_admin_id: int | None = None

    # Database
    database_url: str

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # Admin panel / JWT
    admin_jwt_secret: str
    admin_jwt_expire_minutes: int = 480

    # Limits
    rate_limit_per_minute: int = 20
    reapply_cooldown_hours: int = 24
    min_age_years: int = 16
    max_age_years: int = 70

    # Monitoring
    sentry_dsn: str | None = None

    environment: str = "production"
    log_level: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
