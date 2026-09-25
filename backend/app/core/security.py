from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import randbelow, token_urlsafe
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings


def _normalize_bcrypt_hash(password_hash: str) -> str:
    if password_hash.startswith("$2y$"):
        return "$2b$" + password_hash[4:]

    return password_hash


def verify_password(plain_password: str, password_hash: str) -> bool:
    normalized_hash = _normalize_bcrypt_hash(password_hash)

    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            normalized_hash.encode("utf-8"),
        )
    except ValueError:
        return False


def hash_password(plain_password: str) -> str:
    hashed = bcrypt.hashpw(
        plain_password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

    # La BD viene de Laravel, que normalmente guarda bcrypt como $2y$.
    if hashed.startswith("$2b$"):
        return "$2y$" + hashed[4:]

    return hashed


def create_access_token(
    subject: int,
    roles: list[str],
    access_level: str,
) -> str:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(
        minutes=settings.access_token_expire_minutes,
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "roles": roles,
        "access_level": access_level,
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def decode_access_token(token: str) -> dict[str, Any] | None:
    settings = get_settings()

    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
    except JWTError:
        return None


def generate_reset_token() -> str:
    return token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def generate_otp_code() -> str:
    return f"{randbelow(1_000_000):06d}"
