from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.core.security import decode_access_token
from app.modules.auth.application.rbac import can_access, resolve_access_policy
from app.modules.auth.application.use_cases import GetCurrentUserUseCase
from app.modules.auth.domain.entities import User
from app.modules.auth.infrastructure.repository import AuthRepository

bearer_scheme = HTTPBearer(auto_error=False)


def get_auth_repository(
    session: Annotated[Session, Depends(get_db_session)],
) -> AuthRepository:
    return AuthRepository(session)


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    repository: Annotated[AuthRepository, Depends(get_auth_repository)],
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión requerida.",
        )

    payload = decode_access_token(credentials.credentials)

    if payload is None or payload.get("sub") is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida.",
        )

    try:
        user_id = int(payload["sub"])
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida.",
        ) from exc

    user = GetCurrentUserUseCase(repository).execute(user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida.",
        )

    return user


def require_access(required_access: str) -> Callable[[User], User]:
    def dependency(
        user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        access_policy = resolve_access_policy(user.roles)

        if not can_access(access_policy.access_level, required_access):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para acceder a este recurso.",
            )

        return user

    return dependency
