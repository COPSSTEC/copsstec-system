from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import require_access
from app.modules.blogs.application.use_cases import (
    CreateBlogUseCase,
    DeleteBlogUseCase,
    GetAdminBlogUseCase,
    GetPublicBlogUseCase,
    ListAdminBlogsUseCase,
    ListPublicBlogsUseCase,
    SetBlogVisibilityUseCase,
    UpdateBlogUseCase,
)
from app.modules.blogs.domain.entities import VISIBLE_STATE_ID
from app.modules.blogs.domain.exceptions import (
    BlogNotFoundError,
    BlogUnavailableError,
    BlogValidationError,
    InvalidBlogImageError,
)
from app.modules.blogs.presentation.api.dependencies import (
    get_create_blog_use_case,
    get_delete_blog_use_case,
    get_get_admin_blog_use_case,
    get_get_public_blog_use_case,
    get_list_admin_blogs_use_case,
    get_list_public_blogs_use_case,
    get_set_blog_visibility_use_case,
    get_update_blog_use_case,
)
from app.modules.blogs.presentation.api.schemas import (
    AdminBlogResponse,
    BlogVisibilityRequest,
    PublicBlogListItem,
    PublicBlogResponse,
)

router = APIRouter(prefix="/api/blogs", tags=["blogs"])


def _http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, BlogNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog no encontrado.")
    if isinstance(exc, BlogUnavailableError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog no disponible.")
    if isinstance(exc, (BlogValidationError, InvalidBlogImageError)):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno.")


@router.get("/public", response_model=list[PublicBlogListItem])
def list_public_blogs(
    use_case: Annotated[ListPublicBlogsUseCase, Depends(get_list_public_blogs_use_case)],
) -> list[PublicBlogListItem]:
    return [PublicBlogListItem.from_domain(blog) for blog in use_case.execute()]


@router.get("/public/{blog_id}", response_model=PublicBlogResponse)
def get_public_blog(
    blog_id: int,
    use_case: Annotated[GetPublicBlogUseCase, Depends(get_get_public_blog_use_case)],
) -> PublicBlogResponse:
    try:
        return PublicBlogResponse.from_domain(use_case.execute(blog_id))
    except BlogUnavailableError as exc:
        raise _http_error(exc) from exc


@router.get("/admin", response_model=list[AdminBlogResponse])
def list_admin_blogs(
    use_case: Annotated[ListAdminBlogsUseCase, Depends(get_list_admin_blogs_use_case)],
    _: Annotated[User, Depends(require_access("admin"))],
) -> list[AdminBlogResponse]:
    return [AdminBlogResponse.from_domain(blog) for blog in use_case.execute()]


@router.get("/admin/{blog_id}", response_model=AdminBlogResponse)
def get_admin_blog(
    blog_id: int,
    use_case: Annotated[GetAdminBlogUseCase, Depends(get_get_admin_blog_use_case)],
    _: Annotated[User, Depends(require_access("admin"))],
) -> AdminBlogResponse:
    try:
        return AdminBlogResponse.from_domain(use_case.execute(blog_id))
    except BlogNotFoundError as exc:
        raise _http_error(exc) from exc


@router.post("/admin", response_model=AdminBlogResponse, status_code=status.HTTP_201_CREATED)
async def create_blog(
    use_case: Annotated[CreateBlogUseCase, Depends(get_create_blog_use_case)],
    user: Annotated[User, Depends(require_access("admin"))],
    title: str = Form(...),
    description: str = Form(...),
    state_id: int = Form(default=VISIBLE_STATE_ID),
    image: UploadFile = File(...),
) -> AdminBlogResponse:
    try:
        blog = use_case.execute(
            title=title,
            description=description,
            state_id=state_id,
            created_by=user.id,
            filename=image.filename or "portada.jpg",
            content=await image.read(),
            content_type=image.content_type or "",
        )
    except (BlogValidationError, InvalidBlogImageError, BlogNotFoundError) as exc:
        raise _http_error(exc) from exc

    return AdminBlogResponse.from_domain(blog)


@router.put("/admin/{blog_id}", response_model=AdminBlogResponse)
async def update_blog(
    blog_id: int,
    use_case: Annotated[UpdateBlogUseCase, Depends(get_update_blog_use_case)],
    _: Annotated[User, Depends(require_access("admin"))],
    title: str = Form(...),
    description: str = Form(...),
    state_id: int = Form(default=VISIBLE_STATE_ID),
    image: UploadFile | None = File(default=None),
) -> AdminBlogResponse:
    content = await image.read() if image is not None else None
    has_file = bool(image is not None and image.filename and content)

    try:
        blog = use_case.execute(
            blog_id,
            title=title,
            description=description,
            state_id=state_id,
            filename=image.filename if image is not None else None,
            content=content if has_file else None,
            content_type=image.content_type if has_file and image is not None else None,
        )
    except (BlogValidationError, InvalidBlogImageError, BlogNotFoundError) as exc:
        raise _http_error(exc) from exc

    return AdminBlogResponse.from_domain(blog)


@router.patch("/admin/{blog_id}/visibility", response_model=AdminBlogResponse)
def set_blog_visibility(
    blog_id: int,
    payload: BlogVisibilityRequest,
    use_case: Annotated[SetBlogVisibilityUseCase, Depends(get_set_blog_visibility_use_case)],
    _: Annotated[User, Depends(require_access("admin"))],
) -> AdminBlogResponse:
    try:
        return AdminBlogResponse.from_domain(use_case.execute(blog_id, payload.state_id))
    except (BlogValidationError, BlogNotFoundError) as exc:
        raise _http_error(exc) from exc


@router.delete("/admin/{blog_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_blog(
    blog_id: int,
    use_case: Annotated[DeleteBlogUseCase, Depends(get_delete_blog_use_case)],
    user: Annotated[User, Depends(require_access("admin"))],
) -> None:
    try:
        use_case.execute(blog_id, user.id)
    except BlogNotFoundError as exc:
        raise _http_error(exc) from exc
