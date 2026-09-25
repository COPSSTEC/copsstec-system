from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, Response, status

from app.modules.auth.application.rbac import resolve_access_policy
from app.modules.auth.application.use_cases import (
    AffiliationPendingError,
    ChangePasswordUseCase,
    ForgotPasswordUseCase,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
    InvalidResetTokenError,
    InvalidResumeCodeError,
    LoginUseCase,
    LogoutUseCase,
    MemberCorporateEmailRequiredError,
    PasswordConfirmationError,
    PasswordReuseError,
    RefreshSessionUseCase,
    RequestAffiliationResumeUseCase,
    ResetPasswordUseCase,
    VerifyAffiliationResumeUseCase,
    WeakPasswordError,
)
from app.modules.auth.domain.entities import User
from app.modules.auth.infrastructure.repository import AuthRepository
from app.modules.auth.presentation.api.dependencies import (
    get_auth_repository,
    get_current_user,
    require_access,
)
from app.modules.membership.infrastructure.email import SmtpOrLogEmailSender
from app.modules.auth.presentation.api.schemas import (
    AccessPolicyResponse,
    AffiliationResumeRequest,
    AffiliationResumeResponse,
    AffiliationVerifyRequest,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    MessageResponse,
    RefreshRequest,
    RefreshResponse,
    ResetPasswordRequest,
    UserResponse,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(
    request: LoginRequest,
    repository: Annotated[AuthRepository, Depends(get_auth_repository)],
) -> LoginResponse:
    try:
        result = LoginUseCase(repository).execute(
            email=request.email,
            password=request.password,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas.",
        ) from exc
    except MemberCorporateEmailRequiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Los miembros habilitados deben ingresar con su correo corporativo @copsstec.com.",
        ) from exc
    except AffiliationPendingError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu afiliación aún no ha sido aprobada. Cuando el administrador confirme el pago recibirás tu correo corporativo y la contraseña en tu correo personal.",
        ) from exc

    return LoginResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        user=UserResponse.from_domain(
            result.user,
            result.access_policy,
        ),
    )


@router.get("/me", response_model=UserResponse)
def me(
    user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    access_policy = resolve_access_policy(user.roles)

    return UserResponse.from_domain(user, access_policy)


@router.get("/access", response_model=AccessPolicyResponse)
def access(
    user: Annotated[User, Depends(get_current_user)],
) -> AccessPolicyResponse:
    return AccessPolicyResponse.from_domain(resolve_access_policy(user.roles))


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    request: ForgotPasswordRequest,
    repository: Annotated[AuthRepository, Depends(get_auth_repository)],
) -> ForgotPasswordResponse:
    reset_token = ForgotPasswordUseCase(
        repository,
        email_sender=SmtpOrLogEmailSender(),
    ).execute(request.email)

    return ForgotPasswordResponse(
        message="Si el correo existe, se generó una solicitud de recuperación.",
        reset_token=reset_token,
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(
    request: ResetPasswordRequest,
    repository: Annotated[AuthRepository, Depends(get_auth_repository)],
) -> MessageResponse:
    try:
        ResetPasswordUseCase(repository).execute(
            email=request.email,
            token=request.token,
            password=request.password,
            confirmation=request.password_confirmation,
        )
    except PasswordConfirmationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La confirmación de contraseña no coincide.",
        ) from exc
    except InvalidResetTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o expirado.",
        ) from exc

    return MessageResponse(message="Contraseña actualizada correctamente.")


VERIFY_RESUME_ERROR = "No pudimos validar el código. Revisa el correo o solicita uno nuevo."


@router.post("/affiliation/resume", response_model=AffiliationResumeResponse)
def request_affiliation_resume(
    request: AffiliationResumeRequest,
    repository: Annotated[AuthRepository, Depends(get_auth_repository)],
) -> AffiliationResumeResponse:
    result = RequestAffiliationResumeUseCase(
        repository,
        email_sender=SmtpOrLogEmailSender(),
    ).execute(request.email)
    return AffiliationResumeResponse(message=result.message, debug_code=result.debug_code)


@router.post("/affiliation/verify", response_model=LoginResponse)
def verify_affiliation_resume(
    request: AffiliationVerifyRequest,
    repository: Annotated[AuthRepository, Depends(get_auth_repository)],
) -> LoginResponse:
    try:
        result = VerifyAffiliationResumeUseCase(repository).execute(
            email=request.email,
            code=request.code,
        )
    except InvalidResumeCodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=VERIFY_RESUME_ERROR,
        ) from exc

    return LoginResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
        user=UserResponse.from_domain(result.user, result.access_policy),
    )


@router.post("/refresh", response_model=RefreshResponse)
def refresh_session(
    request: RefreshRequest,
    repository: Annotated[AuthRepository, Depends(get_auth_repository)],
) -> RefreshResponse:
    try:
        result = RefreshSessionUseCase(repository).execute(request.refresh_token)
    except InvalidRefreshTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada.",
        ) from exc

    return RefreshResponse(
        access_token=result.access_token,
        refresh_token=result.refresh_token,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    repository: Annotated[AuthRepository, Depends(get_auth_repository)],
    payload: Annotated[LogoutRequest | None, Body()] = None,
) -> Response:
    token = payload.refresh_token if payload is not None else None
    LogoutUseCase(repository).execute(token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/change-password", response_model=UserResponse)
def change_password(
    request: ChangePasswordRequest,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[AuthRepository, Depends(get_auth_repository)],
) -> UserResponse:
    try:
        updated = ChangePasswordUseCase(repository).execute(
            user=user,
            current_password=request.current_password,
            password=request.password,
            confirmation=request.password_confirmation,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual no es correcta.",
        ) from exc
    except PasswordConfirmationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La confirmación de contraseña no coincide.",
        ) from exc
    except WeakPasswordError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe tener al menos 8 caracteres.",
        ) from exc
    except PasswordReuseError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe ser distinta a la temporal.",
        ) from exc

    return UserResponse.from_domain(updated, resolve_access_policy(updated.roles))


@router.get("/admin/summary", response_model=MessageResponse)
def admin_summary(
    _: Annotated[User, Depends(require_access("admin"))],
) -> MessageResponse:
    return MessageResponse(message="Acceso administrativo confirmado.")


@router.get("/member/summary", response_model=MessageResponse)
def member_summary(
    _: Annotated[User, Depends(require_access("member"))],
) -> MessageResponse:
    return MessageResponse(message="Acceso privado de miembro confirmado.")


@router.get("/operations/summary", response_model=MessageResponse)
def operations_summary(
    _: Annotated[User, Depends(require_access("operations"))],
) -> MessageResponse:
    return MessageResponse(message="Acceso operativo confirmado.")
