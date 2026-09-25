from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import get_current_user, require_access
from app.modules.documents.application.use_cases import (
    ListMemberDocumentsUseCase,
    UpdateMemberDocumentStyleUseCase,
    UploadMemberDocumentCoverUseCase,
    UploadMemberDocumentUseCase,
)
from app.modules.documents.domain.exceptions import (
    DocumentNotFoundError,
    DocumentValidationError,
    InvalidDocumentFileError,
)
from app.modules.documents.presentation.api.dependencies import (
    get_list_member_documents_use_case,
    get_update_member_document_style_use_case,
    get_upload_member_document_cover_use_case,
    get_upload_member_document_use_case,
)
from app.modules.documents.presentation.api.schemas import MemberDocumentResponse, MemberDocumentStyleRequest

router = APIRouter(prefix="/api/member-documents", tags=["member-documents"])


def _http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, DocumentNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado.")
    if isinstance(exc, (DocumentValidationError, InvalidDocumentFileError)):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno.")


@router.get("", response_model=list[MemberDocumentResponse])
def list_member_documents(
    use_case: Annotated[ListMemberDocumentsUseCase, Depends(get_list_member_documents_use_case)],
    _: Annotated[User, Depends(get_current_user)],
) -> list[MemberDocumentResponse]:
    return [MemberDocumentResponse.from_domain(item) for item in use_case.execute()]


@router.put("/{document_key}", response_model=MemberDocumentResponse)
async def upload_member_document(
    document_key: str,
    use_case: Annotated[UploadMemberDocumentUseCase, Depends(get_upload_member_document_use_case)],
    user: Annotated[User, Depends(require_access("admin"))],
    file: UploadFile = File(...),
) -> MemberDocumentResponse:
    try:
        document = use_case.execute(
            document_key,
            filename=file.filename or "documento.pdf",
            content=await file.read(),
            content_type=file.content_type or "",
            updated_by=user.id,
        )
    except (DocumentValidationError, InvalidDocumentFileError, DocumentNotFoundError) as exc:
        raise _http_error(exc) from exc

    return MemberDocumentResponse.from_domain(document)


@router.put("/{document_key}/cover", response_model=MemberDocumentResponse)
async def upload_member_document_cover(
    document_key: str,
    use_case: Annotated[UploadMemberDocumentCoverUseCase, Depends(get_upload_member_document_cover_use_case)],
    user: Annotated[User, Depends(require_access("admin"))],
    file: UploadFile = File(...),
) -> MemberDocumentResponse:
    try:
        document = use_case.execute(
            document_key,
            filename=file.filename or "portada.jpg",
            content=await file.read(),
            content_type=file.content_type or "",
            updated_by=user.id,
        )
    except (DocumentValidationError, InvalidDocumentFileError, DocumentNotFoundError) as exc:
        raise _http_error(exc) from exc

    return MemberDocumentResponse.from_domain(document)


@router.patch("/{document_key}/style", response_model=MemberDocumentResponse)
def update_member_document_style(
    document_key: str,
    payload: MemberDocumentStyleRequest,
    use_case: Annotated[UpdateMemberDocumentStyleUseCase, Depends(get_update_member_document_style_use_case)],
    user: Annotated[User, Depends(require_access("admin"))],
) -> MemberDocumentResponse:
    try:
        document = use_case.execute(
            document_key,
            overlay_color=payload.overlay_color,
            overlay_opacity=payload.overlay_opacity,
            updated_by=user.id,
        )
    except (DocumentValidationError, DocumentNotFoundError) as exc:
        raise _http_error(exc) from exc

    return MemberDocumentResponse.from_domain(document)
