from dataclasses import dataclass

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.modules.auth.application.rbac import resolve_access_policy
from app.modules.auth.domain.entities import AccessPolicy, User
from app.modules.auth.infrastructure.repository import AuthRepository


class InvalidCredentialsError(Exception):
    pass


class InvalidResetTokenError(Exception):
    pass


class PasswordConfirmationError(Exception):
    pass


@dataclass(frozen=True)
class LoginResult:
    access_token: str
    user: User
    access_policy: AccessPolicy


class LoginUseCase:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def execute(self, email: str, password: str) -> LoginResult:
        user = self.repository.get_user_by_email(email)

        if user is None or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError()

        if user.state_id in {3, 16}:
            raise InvalidCredentialsError()

        self.repository.update_last_connection(user.id)
        user = self.repository.get_user_by_id(user.id)

        if user is None:
            raise InvalidCredentialsError()

        access_policy = resolve_access_policy(user.roles)
        access_token = create_access_token(
            subject=user.id,
            roles=user.roles,
            access_level=access_policy.access_level,
        )

        return LoginResult(
            access_token=access_token,
            user=user,
            access_policy=access_policy,
        )


class GetCurrentUserUseCase:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int) -> User | None:
        return self.repository.get_user_by_id(user_id)


class ForgotPasswordUseCase:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def execute(self, email: str) -> str | None:
        user = self.repository.get_user_by_email(email)

        if user is None:
            return None

        reset_token = generate_reset_token()
        self.repository.upsert_password_reset_token(
            email=email,
            token_hash=hash_reset_token(reset_token),
        )

        settings = get_settings()
        if settings.app_env.lower() in {"local", "development", "dev"}:
            return reset_token

        return None


class ResetPasswordUseCase:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def execute(self, email: str, token: str, password: str, confirmation: str) -> None:
        if password != confirmation:
            raise PasswordConfirmationError()

        token_is_valid = self.repository.password_reset_token_is_valid(
            email=email,
            token_hash=hash_reset_token(token),
        )

        if not token_is_valid:
            raise InvalidResetTokenError()

        self.repository.update_password(
            email=email,
            password_hash=hash_password(password),
        )
