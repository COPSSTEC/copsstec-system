from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    generate_otp_code,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.modules.auth.application.rbac import resolve_access_level, resolve_access_policy
from app.modules.auth.application.session import issue_session_tokens
from app.modules.auth.domain.entities import AccessPolicy, User
from app.modules.auth.infrastructure.repository import AuthRepository
from app.modules.membership.application.ports import EmailPort
from app.modules.membership.domain.corporate_email import is_corporate_email
from app.modules.membership.domain.entities import PENDING_ENABLE_STATE_ID
from app.shared.infrastructure.email import reset_url_for

RESUME_GENERIC_MESSAGE = (
    "Si el correo está inscrito y tu afiliación sigue en proceso, te enviamos un código."
)
RESUME_RATE_LIMIT_SECONDS = 60
BLOCKED_STATE_IDS = {3, 16}


class InvalidCredentialsError(Exception):
    pass


class MemberCorporateEmailRequiredError(Exception):
    pass


class AffiliationPendingError(Exception):
    pass


class InvalidResetTokenError(Exception):
    pass


class PasswordConfirmationError(Exception):
    pass


class PasswordReuseError(Exception):
    pass


class WeakPasswordError(Exception):
    pass


class InvalidResumeCodeError(Exception):
    pass


class InvalidRefreshTokenError(Exception):
    pass


@dataclass(frozen=True)
class LoginResult:
    access_token: str
    refresh_token: str
    user: User
    access_policy: AccessPolicy


@dataclass(frozen=True)
class AffiliationResumeResult:
    message: str
    debug_code: str | None


@dataclass(frozen=True)
class RefreshResult:
    access_token: str
    refresh_token: str


class LoginUseCase:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def execute(self, email: str, password: str) -> LoginResult:
        user = self.repository.get_user_by_email(email)

        if user is None or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError()

        if user.state_id in BLOCKED_STATE_IDS:
            raise InvalidCredentialsError()

        access_level = resolve_access_level(user.roles)
        if access_level == "member" and user.state_id == 1:
            if not is_corporate_email(user.email, get_settings().corporate_email_domain):
                raise MemberCorporateEmailRequiredError()

        self.repository.update_last_connection(user.id)
        user = self.repository.get_user_by_id(user.id)

        if user is None:
            raise InvalidCredentialsError()

        access_policy = resolve_access_policy(user.roles)
        access_token, refresh_token = issue_session_tokens(
            self.repository,
            user_id=user.id,
            roles=user.roles,
            access_level=access_policy.access_level,
        )

        return LoginResult(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user,
            access_policy=access_policy,
        )


class GetCurrentUserUseCase:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int) -> User | None:
        return self.repository.get_user_by_id(user_id)


class ForgotPasswordUseCase:
    def __init__(self, repository: AuthRepository, email_sender: EmailPort | None = None) -> None:
        self.repository = repository
        self.email_sender = email_sender

    def execute(self, email: str) -> str | None:
        user = self.repository.get_user_by_email(email)

        if user is None:
            return None

        reset_token = generate_reset_token()
        self.repository.upsert_password_reset_token(
            email=email,
            token_hash=hash_reset_token(reset_token),
        )

        if self.email_sender:
            self.email_sender.send_template(
                user.email,
                "password_reset",
                {
                    "nombres": user.name,
                    "token": reset_token,
                    "reset_url": reset_url_for(user.email, reset_token),
                },
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


class ChangePasswordUseCase:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def execute(
        self,
        user: User,
        current_password: str,
        password: str,
        confirmation: str,
    ) -> User:
        if not verify_password(current_password, user.password_hash):
            raise InvalidCredentialsError()
        if password != confirmation:
            raise PasswordConfirmationError()
        if len(password.strip()) < 8:
            raise WeakPasswordError()
        if verify_password(password, user.password_hash):
            raise PasswordReuseError()

        self.repository.update_own_password(user.id, hash_password(password))
        updated = self.repository.get_user_by_id(user.id)
        if updated is None:
            raise InvalidCredentialsError()
        return updated


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _naive_now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _as_naive(value: datetime) -> datetime:
    if value.tzinfo is not None:
        return value.astimezone(UTC).replace(tzinfo=None)
    return value


def _is_dev_env() -> bool:
    return get_settings().app_env.lower() in {"local", "development", "dev"}


def _display_name(user: User) -> str:
    if user.profile is not None:
        full = f"{user.profile.names} {user.profile.lastname}".strip()
        if full:
            return full
    return user.name


class RequestAffiliationResumeUseCase:
    def __init__(self, repository: AuthRepository, email_sender: EmailPort | None = None) -> None:
        self.repository = repository
        self.email_sender = email_sender

    def execute(self, email: str) -> AffiliationResumeResult:
        normalized = _normalize_email(email)
        user = self.repository.get_user_by_email(normalized)

        if user is None or user.state_id != PENDING_ENABLE_STATE_ID:
            return AffiliationResumeResult(message=RESUME_GENERIC_MESSAGE, debug_code=None)

        since = _naive_now() - timedelta(seconds=RESUME_RATE_LIMIT_SECONDS)
        if self.repository.count_recent_resume_codes(normalized, since) > 0:
            return AffiliationResumeResult(message=RESUME_GENERIC_MESSAGE, debug_code=None)

        settings = get_settings()
        code = generate_otp_code()
        expires_at = _naive_now() + timedelta(minutes=settings.affiliation_resume_expire_minutes)

        self.repository.invalidate_open_resume_codes(normalized)
        self.repository.create_resume_code(
            user_id=user.id,
            email=normalized,
            code_hash=hash_reset_token(code),
            expires_at=expires_at,
        )

        if self.email_sender:
            origin = settings.frontend_origin.rstrip("/")
            self.email_sender.send_template(
                user.email,
                "affiliation_resume",
                {
                    "nombres": _display_name(user),
                    "code": code,
                    "expire_minutes": settings.affiliation_resume_expire_minutes,
                    "resume_url": f"{origin}/continuar-afiliacion",
                },
            )

        debug_code = code if _is_dev_env() else None
        return AffiliationResumeResult(message=RESUME_GENERIC_MESSAGE, debug_code=debug_code)


class VerifyAffiliationResumeUseCase:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def execute(self, email: str, code: str) -> LoginResult:
        normalized = _normalize_email(email)
        submitted = code.strip()
        resume = self.repository.get_latest_resume_code(normalized)
        settings = get_settings()

        if resume is None or _as_naive(resume.expires_at) <= _naive_now():
            raise InvalidResumeCodeError()

        user = self.repository.get_user_by_id(resume.user_id)
        if user is None or user.state_id != PENDING_ENABLE_STATE_ID:
            raise InvalidResumeCodeError()

        if hash_reset_token(submitted) != resume.code_hash:
            attempts = self.repository.increment_resume_attempts(resume.id)
            if attempts >= settings.affiliation_resume_max_attempts:
                self.repository.consume_resume_code(resume.id)
            raise InvalidResumeCodeError()

        self.repository.consume_resume_code(resume.id)
        self.repository.update_last_connection(user.id)
        user = self.repository.get_user_by_id(user.id)
        if user is None or user.state_id != PENDING_ENABLE_STATE_ID:
            raise InvalidResumeCodeError()

        access_policy = resolve_access_policy(user.roles)
        access_token, refresh_token = issue_session_tokens(
            self.repository,
            user_id=user.id,
            roles=user.roles,
            access_level=access_policy.access_level,
        )
        return LoginResult(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user,
            access_policy=access_policy,
        )


class RefreshSessionUseCase:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def execute(self, refresh_token: str) -> RefreshResult:
        token_hash = hash_reset_token(refresh_token.strip())
        stored = self.repository.get_valid_refresh_token(token_hash)
        if stored is None:
            raise InvalidRefreshTokenError()

        user = self.repository.get_user_by_id(stored.user_id)
        if user is None or user.state_id in BLOCKED_STATE_IDS:
            self.repository.revoke_refresh_token(token_hash)
            raise InvalidRefreshTokenError()

        access_policy = resolve_access_policy(user.roles)
        access_token = create_access_token(
            subject=user.id,
            roles=user.roles,
            access_level=access_policy.access_level,
        )
        new_refresh = generate_reset_token()
        expires_at = _naive_now() + timedelta(hours=get_settings().refresh_token_expire_hours)
        self.repository.revoke_and_replace_refresh(
            old_token_hash=token_hash,
            user_id=user.id,
            new_token_hash=hash_reset_token(new_refresh),
            expires_at=expires_at,
        )
        return RefreshResult(access_token=access_token, refresh_token=new_refresh)


class LogoutUseCase:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    def execute(self, refresh_token: str | None) -> None:
        if not refresh_token or not refresh_token.strip():
            return
        self.repository.revoke_refresh_token(hash_reset_token(refresh_token.strip()))
