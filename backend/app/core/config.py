from functools import lru_cache
from os import environ, getenv
from pathlib import Path


def _apply_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        if key and key not in environ:
            environ[key] = value


_apply_env_file(Path(__file__).resolve().parents[2] / ".env")


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
    membership_fee: str = getenv("MEMBERSHIP_FEE", "50.00")
    membership_bank_name: str = getenv("MEMBERSHIP_BANK_NAME", "Banco Pichincha")
    membership_account_type: str = getenv("MEMBERSHIP_ACCOUNT_TYPE", "Cuenta de ahorros")
    membership_account_number: str = getenv("MEMBERSHIP_ACCOUNT_NUMBER", "XXXXXXXXXX")
    membership_account_holder: str = getenv("MEMBERSHIP_ACCOUNT_HOLDER", "COPSSTEC")
    membership_account_ruc: str = getenv("MEMBERSHIP_ACCOUNT_RUC", "")
    mailbox_api_url: str = getenv("MAILBOX_API_URL", "https://box.copsstec.com")
    mailbox_admin_email: str = getenv("MAILBOX_ADMIN_EMAIL", "administrator@copsstec.com")
    mailbox_admin_password: str = getenv("MAILBOX_ADMIN_PASSWORD", "")
    smtp_host: str = getenv("SMTP_HOST", "")
    smtp_port: int = int(getenv("SMTP_PORT", "587"))
    smtp_user: str = getenv("SMTP_USER", "")
    smtp_password: str = getenv("SMTP_PASSWORD", "")
    smtp_from: str = getenv("SMTP_FROM", "COPSSTEC <no-reply@copsstec.com>")
    smtp_use_tls: bool = getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}
    mail_logo_url: str = getenv(
        "MAIL_LOGO_URL",
        "https://www.copsstec.com/assets/logos/coppstec.png",
    )
    mail_support_email: str = getenv("MAIL_SUPPORT_EMAIL", "soporte@copsstec.com")
    mail_admin_notifications: str = getenv(
        "MAIL_ADMIN_NOTIFICATIONS",
        "administrator@copsstec.com",
    )
    mailbox_web_url: str = getenv("MAILBOX_WEB_URL", "https://box.copsstec.com/mail/")
    corporate_email_domain: str = getenv("CORPORATE_EMAIL_DOMAIN", "copsstec.com")


@lru_cache
def get_settings() -> Settings:
    return Settings()
