from functools import lru_cache
from os import getenv


class Settings:
    database_url: str = getenv(
        "DATABASE_URL",
        "postgresql://gabrieltates@localhost:5432/copsstec",
    )
    secret_key: str = getenv("SECRET_KEY", "dev-secret-key-change-me")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = int(
        getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"),
    )
    password_reset_expire_minutes: int = int(
        getenv("PASSWORD_RESET_EXPIRE_MINUTES", "60"),
    )
    app_env: str = getenv("APP_ENV", "local")
    frontend_origin: str = getenv("FRONTEND_ORIGIN", "http://localhost:3000")


@lru_cache
def get_settings() -> Settings:
    return Settings()
