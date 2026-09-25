from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.modules.documents.application.use_cases import (
    ListMemberDocumentsUseCase,
    UpdateMemberDocumentStyleUseCase,
    UploadMemberDocumentCoverUseCase,
    UploadMemberDocumentUseCase,
)
from app.modules.documents.infrastructure.files import LocalMemberDocumentStorage
from app.modules.documents.infrastructure.repository import SqlAlchemyMemberDocumentRepository


def get_document_repository(
    session: Annotated[Session, Depends(get_db_session)],
) -> SqlAlchemyMemberDocumentRepository:
    return SqlAlchemyMemberDocumentRepository(session)


def get_document_storage() -> LocalMemberDocumentStorage:
    return LocalMemberDocumentStorage()


def get_list_member_documents_use_case(
    repository: Annotated[SqlAlchemyMemberDocumentRepository, Depends(get_document_repository)],
) -> ListMemberDocumentsUseCase:
    return ListMemberDocumentsUseCase(repository)


def get_upload_member_document_use_case(
    repository: Annotated[SqlAlchemyMemberDocumentRepository, Depends(get_document_repository)],
    storage: Annotated[LocalMemberDocumentStorage, Depends(get_document_storage)],
) -> UploadMemberDocumentUseCase:
    return UploadMemberDocumentUseCase(repository, storage)


def get_upload_member_document_cover_use_case(
    repository: Annotated[SqlAlchemyMemberDocumentRepository, Depends(get_document_repository)],
    storage: Annotated[LocalMemberDocumentStorage, Depends(get_document_storage)],
) -> UploadMemberDocumentCoverUseCase:
    return UploadMemberDocumentCoverUseCase(repository, storage)


def get_update_member_document_style_use_case(
    repository: Annotated[SqlAlchemyMemberDocumentRepository, Depends(get_document_repository)],
) -> UpdateMemberDocumentStyleUseCase:
    return UpdateMemberDocumentStyleUseCase(repository)
