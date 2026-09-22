from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.modules.dashboard.application.use_cases import (
    ExportAdminDashboardUseCase,
    GetAdminDashboardUseCase,
    GetMemberDashboardUseCase,
)
from app.modules.dashboard.infrastructure.repository import SqlAlchemyDashboardRepository


def get_dashboard_repository(
    session: Annotated[Session, Depends(get_db_session)],
) -> SqlAlchemyDashboardRepository:
    return SqlAlchemyDashboardRepository(session)


def get_admin_dashboard_use_case(
    repository: Annotated[SqlAlchemyDashboardRepository, Depends(get_dashboard_repository)],
) -> GetAdminDashboardUseCase:
    return GetAdminDashboardUseCase(repository)


def get_export_admin_dashboard_use_case(
    repository: Annotated[SqlAlchemyDashboardRepository, Depends(get_dashboard_repository)],
) -> ExportAdminDashboardUseCase:
    return ExportAdminDashboardUseCase(repository)


def get_member_dashboard_use_case(
    repository: Annotated[SqlAlchemyDashboardRepository, Depends(get_dashboard_repository)],
) -> GetMemberDashboardUseCase:
    return GetMemberDashboardUseCase(repository)
