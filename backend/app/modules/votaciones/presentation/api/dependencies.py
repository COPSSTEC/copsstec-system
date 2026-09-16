from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.modules.votaciones.application.use_cases import (
    CastVoteUseCase,
    CloseElectionUseCase,
    GetMemberPortalUseCase,
    GetOrCreateElectionUseCase,
    GetPublicCalendarUseCase,
    GetReportsUseCase,
    ManageListsUseCase,
    ManageVotersUseCase,
    SaveCalendarUseCase,
    SaveMessagesUseCase,
    SavePositionsUseCase,
    StartElectionUseCase,
    UpdateElectionUseCase,
    UploadElectionMediaUseCase,
)
from app.modules.votaciones.infrastructure.files import LocalElectionFileStorage
from app.modules.votaciones.infrastructure.notifications import ElectionEmailNotifier
from app.modules.votaciones.infrastructure.pdfs import ElectionPdfRenderer
from app.modules.votaciones.infrastructure.repository import SqlAlchemyElectionsRepository


def get_elections_repository(
    session: Annotated[Session, Depends(get_db_session)],
) -> SqlAlchemyElectionsRepository:
    return SqlAlchemyElectionsRepository(session)


def get_election_storage() -> LocalElectionFileStorage:
    return LocalElectionFileStorage()


def get_election_pdfs() -> ElectionPdfRenderer:
    return ElectionPdfRenderer()


def get_election_notifier() -> ElectionEmailNotifier:
    return ElectionEmailNotifier()


def get_or_create_election_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
) -> GetOrCreateElectionUseCase:
    return GetOrCreateElectionUseCase(repository)


def get_update_election_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
) -> UpdateElectionUseCase:
    return UpdateElectionUseCase(repository)


def get_close_election_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
) -> CloseElectionUseCase:
    return CloseElectionUseCase(repository)


def get_start_election_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
) -> StartElectionUseCase:
    return StartElectionUseCase(repository)


def get_positions_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
) -> SavePositionsUseCase:
    return SavePositionsUseCase(repository)


def get_calendar_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
) -> SaveCalendarUseCase:
    return SaveCalendarUseCase(repository)


def get_lists_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
) -> ManageListsUseCase:
    return ManageListsUseCase(repository)


def get_media_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
    storage: Annotated[LocalElectionFileStorage, Depends(get_election_storage)],
) -> UploadElectionMediaUseCase:
    return UploadElectionMediaUseCase(repository, storage)


def get_voters_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
) -> ManageVotersUseCase:
    return ManageVotersUseCase(repository)


def get_messages_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
    notifier: Annotated[ElectionEmailNotifier, Depends(get_election_notifier)],
) -> SaveMessagesUseCase:
    return SaveMessagesUseCase(repository, notifier)


def get_vote_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
    notifier: Annotated[ElectionEmailNotifier, Depends(get_election_notifier)],
) -> CastVoteUseCase:
    return CastVoteUseCase(repository, notifier)


def get_member_portal_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
) -> GetMemberPortalUseCase:
    return GetMemberPortalUseCase(repository)


def get_reports_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
    pdfs: Annotated[ElectionPdfRenderer, Depends(get_election_pdfs)],
) -> GetReportsUseCase:
    return GetReportsUseCase(repository, pdfs)


def get_public_calendar_use_case(
    repository: Annotated[SqlAlchemyElectionsRepository, Depends(get_elections_repository)],
    pdfs: Annotated[ElectionPdfRenderer, Depends(get_election_pdfs)],
) -> GetPublicCalendarUseCase:
    return GetPublicCalendarUseCase(repository, pdfs)
