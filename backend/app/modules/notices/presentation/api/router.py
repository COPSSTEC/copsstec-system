from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import require_access
from app.modules.notices.application.use_cases import (
    CreateNoticeUseCase,
    DeleteNoticeUseCase,
    GetAdminNoticeUseCase,
    ListAdminNoticesUseCase,
    SetNoticeVisibilityUseCase,
    UpdateNoticeUseCase,
)
from app.modules.notices.domain.entities import VISIBLE_STATE_ID
from app.modules.notices.domain.exceptions import (
    InvalidNoticeImageError,
    NoticeNotFoundError,
    NoticeValidationError,
)
from app.modules.notices.presentation.api.dependencies import (
    get_create_notice_use_case,
    get_delete_notice_use_case,
    get_get_admin_notice_use_case,
    get_list_admin_notices_use_case,
    get_set_notice_visibility_use_case,
    get_update_notice_use_case,
)
from app.modules.notices.presentation.api.schemas import AdminNoticeResponse, NoticeVisibilityRequest

router = APIRouter(prefix="/api/notices", tags=["notices"])


def _http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, NoticeNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aviso no encontrado.")
    if isinstance(exc, (NoticeValidationError, InvalidNoticeImageError)):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno.")


@router.get("/admin", response_model=list[AdminNoticeResponse])
def list_admin_notices(
    use_case: Annotated[ListAdminNoticesUseCase, Depends(get_list_admin_notices_use_case)],
    _: Annotated[User, Depends(require_access("admin"))],
) -> list[AdminNoticeResponse]:
    return [AdminNoticeResponse.from_domain(notice) for notice in use_case.execute()]


@router.get("/admin/{notice_id}", response_model=AdminNoticeResponse)
def get_admin_notice(
    notice_id: int,
    use_case: Annotated[GetAdminNoticeUseCase, Depends(get_get_admin_notice_use_case)],
    _: Annotated[User, Depends(require_access("admin"))],
) -> AdminNoticeResponse:
    try:
        return AdminNoticeResponse.from_domain(use_case.execute(notice_id))
    except NoticeNotFoundError as exc:
        raise _http_error(exc) from exc


@router.post("/admin", response_model=AdminNoticeResponse, status_code=status.HTTP_201_CREATED)
async def create_notice(
    use_case: Annotated[CreateNoticeUseCase, Depends(get_create_notice_use_case)],
    user: Annotated[User, Depends(require_access("admin"))],
    title: str = Form(...),
    description: str = Form(...),
    importance: str = Form(...),
    state_id: int = Form(default=VISIBLE_STATE_ID),
    published_at: str | None = Form(default=None),
    image: UploadFile = File(...),
) -> AdminNoticeResponse:
    try:
        notice = use_case.execute(
            title=title,
            description=description,
            state_id=state_id,
            importance=importance,
            published_at=published_at,
            created_by=user.id,
            filename=image.filename or "portada.jpg",
            content=await image.read(),
            content_type=image.content_type or "",
        )
    except (NoticeValidationError, InvalidNoticeImageError, NoticeNotFoundError) as exc:
        raise _http_error(exc) from exc

    return AdminNoticeResponse.from_domain(notice)


@router.put("/admin/{notice_id}", response_model=AdminNoticeResponse)
async def update_notice(
    notice_id: int,
    use_case: Annotated[UpdateNoticeUseCase, Depends(get_update_notice_use_case)],
    _: Annotated[User, Depends(require_access("admin"))],
    title: str = Form(...),
    description: str = Form(...),
    importance: str = Form(...),
    state_id: int = Form(default=VISIBLE_STATE_ID),
    published_at: str | None = Form(default=None),
    image: UploadFile | None = File(default=None),
) -> AdminNoticeResponse:
    content = await image.read() if image is not None else None
    has_file = bool(image is not None and image.filename and content)

    try:
        notice = use_case.execute(
            notice_id,
            title=title,
            description=description,
            state_id=state_id,
            importance=importance,
            published_at=published_at,
            filename=image.filename if image is not None else None,
            content=content if has_file else None,
            content_type=image.content_type if has_file and image is not None else None,
        )
    except (NoticeValidationError, InvalidNoticeImageError, NoticeNotFoundError) as exc:
        raise _http_error(exc) from exc

    return AdminNoticeResponse.from_domain(notice)


@router.patch("/admin/{notice_id}/visibility", response_model=AdminNoticeResponse)
def set_notice_visibility(
    notice_id: int,
    payload: NoticeVisibilityRequest,
    use_case: Annotated[SetNoticeVisibilityUseCase, Depends(get_set_notice_visibility_use_case)],
    _: Annotated[User, Depends(require_access("admin"))],
) -> AdminNoticeResponse:
    try:
        return AdminNoticeResponse.from_domain(use_case.execute(notice_id, payload.state_id))
    except (NoticeValidationError, NoticeNotFoundError) as exc:
        raise _http_error(exc) from exc


@router.delete("/admin/{notice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notice(
    notice_id: int,
    use_case: Annotated[DeleteNoticeUseCase, Depends(get_delete_notice_use_case)],
    user: Annotated[User, Depends(require_access("admin"))],
) -> None:
    try:
        use_case.execute(notice_id, user.id)
    except NoticeNotFoundError as exc:
        raise _http_error(exc) from exc
