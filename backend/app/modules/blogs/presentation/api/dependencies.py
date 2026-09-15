from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db_session
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
from app.modules.blogs.infrastructure.files import LocalBlogImageStorage
from app.modules.blogs.infrastructure.repository import SqlAlchemyBlogRepository


def get_blog_repository(
    session: Annotated[Session, Depends(get_db_session)],
) -> SqlAlchemyBlogRepository:
    return SqlAlchemyBlogRepository(session)


def get_blog_image_storage() -> LocalBlogImageStorage:
    return LocalBlogImageStorage()


def get_list_public_blogs_use_case(
    repository: Annotated[SqlAlchemyBlogRepository, Depends(get_blog_repository)],
) -> ListPublicBlogsUseCase:
    return ListPublicBlogsUseCase(repository)


def get_get_public_blog_use_case(
    repository: Annotated[SqlAlchemyBlogRepository, Depends(get_blog_repository)],
) -> GetPublicBlogUseCase:
    return GetPublicBlogUseCase(repository)


def get_list_admin_blogs_use_case(
    repository: Annotated[SqlAlchemyBlogRepository, Depends(get_blog_repository)],
) -> ListAdminBlogsUseCase:
    return ListAdminBlogsUseCase(repository)


def get_get_admin_blog_use_case(
    repository: Annotated[SqlAlchemyBlogRepository, Depends(get_blog_repository)],
) -> GetAdminBlogUseCase:
    return GetAdminBlogUseCase(repository)


def get_create_blog_use_case(
    repository: Annotated[SqlAlchemyBlogRepository, Depends(get_blog_repository)],
    storage: Annotated[LocalBlogImageStorage, Depends(get_blog_image_storage)],
) -> CreateBlogUseCase:
    return CreateBlogUseCase(repository, storage)


def get_update_blog_use_case(
    repository: Annotated[SqlAlchemyBlogRepository, Depends(get_blog_repository)],
    storage: Annotated[LocalBlogImageStorage, Depends(get_blog_image_storage)],
) -> UpdateBlogUseCase:
    return UpdateBlogUseCase(repository, storage)


def get_set_blog_visibility_use_case(
    repository: Annotated[SqlAlchemyBlogRepository, Depends(get_blog_repository)],
) -> SetBlogVisibilityUseCase:
    return SetBlogVisibilityUseCase(repository)


def get_delete_blog_use_case(
    repository: Annotated[SqlAlchemyBlogRepository, Depends(get_blog_repository)],
) -> DeleteBlogUseCase:
    return DeleteBlogUseCase(repository)
