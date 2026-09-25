from datetime import UTC, datetime, timedelta
from typing import Protocol

from app.core.config import get_settings
from app.core.security import create_access_token, generate_reset_token, hash_reset_token


class RefreshTokenWriter(Protocol):
    def create_refresh_token(
        self,
        user_id: int,
        token_hash: str,
        expires_at: datetime,
    ) -> None:
        ...


def issue_session_tokens(
    repository: RefreshTokenWriter,
    user_id: int,
    roles: list[str],
    access_level: str,
) -> tuple[str, str]:
    settings = get_settings()
    access_token = create_access_token(
        subject=user_id,
        roles=roles,
        access_level=access_level,
    )
    refresh_plain = generate_reset_token()
    expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(
        hours=settings.refresh_token_expire_hours,
    )
    repository.create_refresh_token(
        user_id=user_id,
        token_hash=hash_reset_token(refresh_plain),
        expires_at=expires_at,
    )
    return access_token, refresh_plain
