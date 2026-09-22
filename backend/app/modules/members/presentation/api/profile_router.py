from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response

from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import get_current_user
from app.modules.auth.presentation.api.schemas import UserResponse
from app.modules.auth.application.rbac import resolve_access_policy
from app.modules.auth.infrastructure.repository import AuthRepository
from app.modules.auth.presentation.api.dependencies import get_auth_repository
from app.modules.members.application.use_cases import (
    DownloadMemberPdfUseCase,
    GetPublicMemberUseCase,
    UpdateMemberPhotoUseCase,
    UpdateMyProfileUseCase,
    public_verify_url,
)
from app.modules.members.domain.exceptions import (
    MemberConflictError,
    MemberNotFoundError,
    MemberValidationError,
)
from app.modules.members.infrastructure.pdfs import generate_qr_png
from app.modules.members.infrastructure.photos import InvalidMemberPhotoError
from app.modules.members.presentation.api.dependencies import (
    get_download_pdf_use_case,
    get_get_public_member_use_case,
    get_update_member_photo_use_case,
    get_update_my_profile_use_case,
)
from app.modules.members.presentation.api.router import _http_error
from app.modules.members.presentation.api.schemas import ProfileSelfUpdateRequest, PublicMemberResponse

profile_router = APIRouter(prefix="/api/profile", tags=["profile"])
public_members_router = APIRouter(prefix="/api/public/members", tags=["public-members"])


def _pdf_response(filename: str, content: bytes) -> Response:
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@profile_router.patch("/me", response_model=UserResponse)
def update_my_profile(
    request: ProfileSelfUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[UpdateMyProfileUseCase, Depends(get_update_my_profile_use_case)],
    auth_repository: Annotated[AuthRepository, Depends(get_auth_repository)],
) -> UserResponse:
    try:
        use_case.execute(current_user.id, request.to_patch())
    except (MemberNotFoundError, MemberConflictError, MemberValidationError) as exc:
        raise _http_error(exc) from exc

    user = auth_repository.get_user_by_id(current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return UserResponse.from_domain(user, resolve_access_policy(user.roles))


@profile_router.post("/me/photo", response_model=UserResponse)
async def update_my_photo(
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[UpdateMemberPhotoUseCase, Depends(get_update_member_photo_use_case)],
    auth_repository: Annotated[AuthRepository, Depends(get_auth_repository)],
    photo: UploadFile = File(...),
) -> UserResponse:
    try:
        use_case.execute(
            user_id=current_user.id,
            filename=photo.filename or "foto.jpg",
            content=await photo.read(),
            content_type=photo.content_type or "",
        )
    except (MemberNotFoundError, InvalidMemberPhotoError) as exc:
        raise _http_error(exc) from exc

    user = auth_repository.get_user_by_id(current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
    return UserResponse.from_domain(user, resolve_access_policy(user.roles))


@profile_router.get("/me/certificate")
def download_my_certificate(
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[DownloadMemberPdfUseCase, Depends(get_download_pdf_use_case)],
) -> Response:
    try:
        filename, content = use_case.execute(current_user.id, "certificate")
    except MemberNotFoundError as exc:
        raise _http_error(exc) from exc
    return _pdf_response(filename, content)


@profile_router.get("/me/carnet")
def download_my_carnet(
    current_user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[DownloadMemberPdfUseCase, Depends(get_download_pdf_use_case)],
) -> Response:
    try:
        filename, content = use_case.execute(current_user.id, "carnet")
    except MemberNotFoundError as exc:
        raise _http_error(exc) from exc
    return _pdf_response(filename, content)


@public_members_router.get("/{profile_id}", response_model=PublicMemberResponse)
def get_public_member(
    profile_id: int,
    use_case: Annotated[GetPublicMemberUseCase, Depends(get_get_public_member_use_case)],
) -> PublicMemberResponse:
    try:
        return PublicMemberResponse.from_domain(use_case.execute(profile_id))
    except MemberNotFoundError as exc:
        raise _http_error(exc) from exc


@public_members_router.get("/{profile_id}/qr")
def get_public_member_qr(
    profile_id: int,
    use_case: Annotated[GetPublicMemberUseCase, Depends(get_get_public_member_use_case)],
) -> Response:
    try:
        member = use_case.execute(profile_id)
    except MemberNotFoundError as exc:
        raise _http_error(exc) from exc

    return Response(content=generate_qr_png(public_verify_url(member)), media_type="image/png")
