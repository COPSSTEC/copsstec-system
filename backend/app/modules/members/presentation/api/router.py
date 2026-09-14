from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response

from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import require_access
from app.modules.members.application.use_cases import (
    CreateMemberUseCase,
    DeleteMemberUseCase,
    DownloadMemberPdfUseCase,
    GetMemberUseCase,
    ListMembersUseCase,
    ResendMemberCredentialsUseCase,
    SetMemberStateUseCase,
    UpdateMemberPhotoUseCase,
    UpdateMemberUseCase,
)
from app.modules.members.domain.entities import MemberListQuery
from app.modules.members.domain.exceptions import (
    MemberConflictError,
    MemberNotFoundError,
    MemberValidationError,
)
from app.modules.members.infrastructure.photos import InvalidMemberPhotoError
from app.modules.members.presentation.api.dependencies import (
    get_create_member_use_case,
    get_delete_member_use_case,
    get_download_pdf_use_case,
    get_get_member_use_case,
    get_list_members_use_case,
    get_resend_credentials_use_case,
    get_set_member_state_use_case,
    get_update_member_photo_use_case,
    get_update_member_use_case,
)
from app.modules.members.presentation.api.schemas import (
    CredentialsResponse,
    MemberCreatedResponse,
    MemberListResponse,
    MemberResponse,
    MemberWriteRequest,
    MessageResponse,
)
from app.modules.membership.application.use_cases import (
    ApproveMembershipUseCase,
    GetApprovalPreviewUseCase,
)
from app.modules.membership.domain.exceptions import (
    MailboxError,
    MembershipConflictError as AffiliationConflictError,
    MembershipNotFoundError as AffiliationNotFoundError,
    MembershipValidationError as AffiliationValidationError,
)
from app.modules.membership.presentation.api.dependencies import (
    get_approval_preview_use_case,
    get_approve_membership_use_case,
)
from app.modules.membership.presentation.api.schemas import (
    ApprovalPreviewResponse,
    ApproveMemberRequest,
    ApproveMemberResponse,
)

router = APIRouter(prefix="/api/members", tags=["members"])


def _http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, MemberNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Miembro no encontrado.")
    if isinstance(exc, MemberConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message)
    if isinstance(exc, MemberValidationError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    if isinstance(exc, InvalidMemberPhotoError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    if isinstance(exc, AffiliationNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Miembro no encontrado.")
    if isinstance(exc, AffiliationConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message)
    if isinstance(exc, AffiliationValidationError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    if isinstance(exc, MailboxError):
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=exc.message)
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno.")


@router.get("", response_model=MemberListResponse)
def list_members(
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[ListMembersUseCase, Depends(get_list_members_use_case)],
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    q: str | None = None,
    names: str | None = None,
    lastname: str | None = None,
    identifier: str | None = None,
    email: str | None = None,
    date_register_from: str | None = None,
    date_register_to: str | None = None,
    birthday_from: str | None = None,
    birthday_to: str | None = None,
    state_id: int | None = None,
    blood_type: str | None = None,
    title_academic: str | None = None,
    level_academic: str | None = None,
    gender: str | None = None,
    province: str | None = None,
    city: str | None = None,
    fixed_phone: str | None = None,
    cod_senescyt: str | None = None,
    login_email: str | None = None,
    sort_by: str = "names",
    sort_dir: str = "asc",
) -> MemberListResponse:
    result = use_case.execute(
        MemberListQuery(
            page=page,
            page_size=page_size,
            q=q,
            names=names,
            lastname=lastname,
            identifier=identifier,
            email=email,
            date_register_from=date_register_from,
            date_register_to=date_register_to,
            birthday_from=birthday_from,
            birthday_to=birthday_to,
            state_id=state_id,
            blood_type=blood_type,
            title_academic=title_academic,
            level_academic=level_academic,
            gender=gender,
            province=province,
            city=city,
            fixed_phone=fixed_phone,
            cod_senescyt=cod_senescyt,
            login_email=login_email,
            sort_by=sort_by,
            sort_dir=sort_dir,
        ),
    )
    return MemberListResponse.from_domain(result)


@router.get("/{member_id}", response_model=MemberResponse)
def get_member(
    member_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[GetMemberUseCase, Depends(get_get_member_use_case)],
) -> MemberResponse:
    try:
        return MemberResponse.from_domain(use_case.execute(member_id))
    except MemberNotFoundError as exc:
        raise _http_error(exc) from exc


@router.post("", response_model=MemberCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_member(
    request: MemberWriteRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[CreateMemberUseCase, Depends(get_create_member_use_case)],
) -> MemberCreatedResponse:
    try:
        member, password = use_case.execute(request.to_write_data())
    except (MemberConflictError, MemberValidationError) as exc:
        raise _http_error(exc) from exc

    return MemberCreatedResponse(
        member=MemberResponse.from_domain(member),
        temporary_password=password,
        message="Miembro creado. Conserva la contraseña temporal para entregársela.",
    )


@router.put("/{member_id}", response_model=MemberResponse)
def update_member(
    member_id: int,
    request: MemberWriteRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[UpdateMemberUseCase, Depends(get_update_member_use_case)],
) -> MemberResponse:
    try:
        return MemberResponse.from_domain(use_case.execute(member_id, request.to_write_data()))
    except (MemberNotFoundError, MemberConflictError, MemberValidationError) as exc:
        raise _http_error(exc) from exc


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(
    member_id: int,
    current_user: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[DeleteMemberUseCase, Depends(get_delete_member_use_case)],
) -> Response:
    try:
        use_case.execute(member_id, current_user.id)
    except MemberNotFoundError as exc:
        raise _http_error(exc) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{member_id}/disable", response_model=MessageResponse)
def disable_member(
    member_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[SetMemberStateUseCase, Depends(get_set_member_state_use_case)],
) -> MessageResponse:
    try:
        member = use_case.execute(member_id, enabled=False)
    except MemberNotFoundError as exc:
        raise _http_error(exc) from exc

    return MessageResponse(
        message="El miembro fue deshabilitado y ya no puede iniciar sesión.",
        member=MemberResponse.from_domain(member),
    )


@router.post("/{member_id}/enable", response_model=MessageResponse)
def enable_member(
    member_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[SetMemberStateUseCase, Depends(get_set_member_state_use_case)],
) -> MessageResponse:
    try:
        member = use_case.execute(member_id, enabled=True)
    except MemberNotFoundError as exc:
        raise _http_error(exc) from exc

    return MessageResponse(
        message="El miembro fue habilitado y ya puede iniciar sesión.",
        member=MemberResponse.from_domain(member),
    )


@router.post("/{member_id}/resend-credentials", response_model=CredentialsResponse)
def resend_credentials(
    member_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[ResendMemberCredentialsUseCase, Depends(get_resend_credentials_use_case)],
) -> CredentialsResponse:
    try:
        member, password = use_case.execute(member_id)
    except (MemberNotFoundError, MemberValidationError, MailboxError) as exc:
        raise _http_error(exc) from exc

    return CredentialsResponse(
        message="Credenciales reenviadas y actualizadas en Mail-in-a-Box.",
        temporary_password=password,
        member=MemberResponse.from_domain(member),
    )


@router.post("/{member_id}/photo", response_model=MemberResponse)
async def upload_member_photo(
    member_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[UpdateMemberPhotoUseCase, Depends(get_update_member_photo_use_case)],
    photo: UploadFile = File(...),
) -> MemberResponse:
    try:
        member = use_case.execute(
            user_id=member_id,
            filename=photo.filename or "foto.jpg",
            content=await photo.read(),
            content_type=photo.content_type or "",
        )
    except (MemberNotFoundError, InvalidMemberPhotoError) as exc:
        raise _http_error(exc) from exc

    return MemberResponse.from_domain(member)


@router.get("/{member_id}/download")
def download_member_file(
    member_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[DownloadMemberPdfUseCase, Depends(get_download_pdf_use_case)],
) -> Response:
    try:
        filename, content = use_case.execute(member_id, "download")
    except MemberNotFoundError as exc:
        raise _http_error(exc) from exc

    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{member_id}/approval-preview", response_model=ApprovalPreviewResponse)
def approval_preview(
    member_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[GetApprovalPreviewUseCase, Depends(get_approval_preview_use_case)],
) -> ApprovalPreviewResponse:
    try:
        preview = use_case.execute(member_id)
    except (AffiliationNotFoundError, AffiliationValidationError) as exc:
        raise _http_error(exc) from exc

    return ApprovalPreviewResponse(**preview)


@router.post("/{member_id}/approve", response_model=ApproveMemberResponse)
def approve_member(
    member_id: int,
    request: ApproveMemberRequest,
    current_user: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[ApproveMembershipUseCase, Depends(get_approve_membership_use_case)],
) -> ApproveMemberResponse:
    try:
        member = use_case.execute(member_id, str(request.email_corp), current_user.id)
    except (
        AffiliationNotFoundError,
        AffiliationValidationError,
        AffiliationConflictError,
        MailboxError,
    ) as exc:
        raise _http_error(exc) from exc

    return ApproveMemberResponse(
        message="Miembro habilitado, buzón corporativo creado y factura generada.",
        user_id=member.user_id,
        login_email=member.email,
        state_id=member.state_id,
    )
