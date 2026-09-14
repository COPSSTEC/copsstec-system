from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db_session
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
from app.modules.members.infrastructure.notifications import LogMemberNotifier
from app.modules.members.infrastructure.pdfs import BlankMemberPdfGenerator
from app.modules.members.infrastructure.photos import LocalMemberPhotoStorage
from app.modules.members.infrastructure.repository import SqlAlchemyMemberRepository
from app.modules.membership.infrastructure.email import SmtpOrLogEmailSender
from app.modules.membership.infrastructure.mailbox import MailInABoxMailbox


def get_member_repository(
    session: Annotated[Session, Depends(get_db_session)],
) -> SqlAlchemyMemberRepository:
    return SqlAlchemyMemberRepository(session)


def get_member_notifier() -> LogMemberNotifier:
    return LogMemberNotifier()


def get_blank_pdf_generator() -> BlankMemberPdfGenerator:
    return BlankMemberPdfGenerator()


def get_list_members_use_case(
    repository: Annotated[SqlAlchemyMemberRepository, Depends(get_member_repository)],
) -> ListMembersUseCase:
    return ListMembersUseCase(repository)


def get_get_member_use_case(
    repository: Annotated[SqlAlchemyMemberRepository, Depends(get_member_repository)],
) -> GetMemberUseCase:
    return GetMemberUseCase(repository)


def get_create_member_use_case(
    repository: Annotated[SqlAlchemyMemberRepository, Depends(get_member_repository)],
    notifier: Annotated[LogMemberNotifier, Depends(get_member_notifier)],
) -> CreateMemberUseCase:
    return CreateMemberUseCase(repository, notifier)


def get_update_member_use_case(
    repository: Annotated[SqlAlchemyMemberRepository, Depends(get_member_repository)],
) -> UpdateMemberUseCase:
    return UpdateMemberUseCase(repository)


def get_delete_member_use_case(
    repository: Annotated[SqlAlchemyMemberRepository, Depends(get_member_repository)],
) -> DeleteMemberUseCase:
    return DeleteMemberUseCase(repository)


def get_set_member_state_use_case(
    repository: Annotated[SqlAlchemyMemberRepository, Depends(get_member_repository)],
) -> SetMemberStateUseCase:
    return SetMemberStateUseCase(repository)


def get_resend_credentials_use_case(
    repository: Annotated[SqlAlchemyMemberRepository, Depends(get_member_repository)],
) -> ResendMemberCredentialsUseCase:
    return ResendMemberCredentialsUseCase(
        repository,
        mailbox=MailInABoxMailbox(),
        email_sender=SmtpOrLogEmailSender(),
    )


def get_member_photo_storage() -> LocalMemberPhotoStorage:
    return LocalMemberPhotoStorage()


def get_update_member_photo_use_case(
    repository: Annotated[SqlAlchemyMemberRepository, Depends(get_member_repository)],
    storage: Annotated[LocalMemberPhotoStorage, Depends(get_member_photo_storage)],
) -> UpdateMemberPhotoUseCase:
    return UpdateMemberPhotoUseCase(repository, storage)


def get_download_pdf_use_case(
    repository: Annotated[SqlAlchemyMemberRepository, Depends(get_member_repository)],
    pdf_generator: Annotated[BlankMemberPdfGenerator, Depends(get_blank_pdf_generator)],
) -> DownloadMemberPdfUseCase:
    return DownloadMemberPdfUseCase(repository, pdf_generator)
