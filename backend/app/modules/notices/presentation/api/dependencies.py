from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.modules.notices.application.use_cases import (
    CreateNoticeUseCase,
    DeleteNoticeUseCase,
    GetAdminNoticeUseCase,
    ListAdminNoticesUseCase,
    SetNoticeVisibilityUseCase,
    UpdateNoticeUseCase,
)
from app.modules.notices.infrastructure.files import LocalNoticeImageStorage
from app.modules.notices.infrastructure.repository import SqlAlchemyNoticeRepository


def get_notice_repository(
    session: Annotated[Session, Depends(get_db_session)],
) -> SqlAlchemyNoticeRepository:
    return SqlAlchemyNoticeRepository(session)


def get_notice_image_storage() -> LocalNoticeImageStorage:
    return LocalNoticeImageStorage()


def get_list_admin_notices_use_case(
    repository: Annotated[SqlAlchemyNoticeRepository, Depends(get_notice_repository)],
) -> ListAdminNoticesUseCase:
    return ListAdminNoticesUseCase(repository)


def get_get_admin_notice_use_case(
    repository: Annotated[SqlAlchemyNoticeRepository, Depends(get_notice_repository)],
) -> GetAdminNoticeUseCase:
    return GetAdminNoticeUseCase(repository)


def get_create_notice_use_case(
    repository: Annotated[SqlAlchemyNoticeRepository, Depends(get_notice_repository)],
    storage: Annotated[LocalNoticeImageStorage, Depends(get_notice_image_storage)],
) -> CreateNoticeUseCase:
    return CreateNoticeUseCase(repository, storage)


def get_update_notice_use_case(
    repository: Annotated[SqlAlchemyNoticeRepository, Depends(get_notice_repository)],
    storage: Annotated[LocalNoticeImageStorage, Depends(get_notice_image_storage)],
) -> UpdateNoticeUseCase:
    return UpdateNoticeUseCase(repository, storage)


def get_set_notice_visibility_use_case(
    repository: Annotated[SqlAlchemyNoticeRepository, Depends(get_notice_repository)],
) -> SetNoticeVisibilityUseCase:
    return SetNoticeVisibilityUseCase(repository)


def get_delete_notice_use_case(
    repository: Annotated[SqlAlchemyNoticeRepository, Depends(get_notice_repository)],
) -> DeleteNoticeUseCase:
    return DeleteNoticeUseCase(repository)
