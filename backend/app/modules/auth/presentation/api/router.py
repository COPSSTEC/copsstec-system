from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.auth.application.rbac import resolve_access_policy
from app.modules.auth.application.use_cases import (
    ForgotPasswordUseCase,
    InvalidCredentialsError,
    InvalidResetTokenError,
    LoginUseCase,
    AffiliationPendingError,
    MemberCorporateEmailRequiredError,
    PasswordConfirmationError,
    ResetPasswordUseCase,
)
from app.modules.auth.domain.entities import User
from app.modules.auth.infrastructure.repository import AuthRepository
from app.modules.auth.presentation.api.dependencies import (
    get_auth_repository,
    get_current_user,
    require_access,
)
from app.modules.auth.presentation.api.schemas import (
    AccessPolicyResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    MessageResponse,
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
    reset_token = ForgotPasswordUseCase(repository).execute(request.email)

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
