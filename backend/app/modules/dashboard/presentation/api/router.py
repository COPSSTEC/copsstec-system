import csv
import io
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response

from app.modules.auth.application.rbac import resolve_access_policy
from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import get_current_user, require_access
from app.modules.dashboard.application.use_cases import (
    ExportAdminDashboardUseCase,
    GetAdminDashboardUseCase,
    GetMemberDashboardUseCase,
)
from app.modules.dashboard.domain.entities import DashboardExport
from app.modules.dashboard.domain.exceptions import InvalidDashboardExportKeyError
from app.modules.dashboard.presentation.api.dependencies import (
    get_admin_dashboard_use_case,
    get_export_admin_dashboard_use_case,
    get_member_dashboard_use_case,
)
from app.modules.dashboard.presentation.api.schemas import AdminDashboardResponse, MemberDashboardResponse

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _csv_bytes(export: DashboardExport) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(export.headers)
    writer.writerows(export.rows)
    return buffer.getvalue().encode("utf-8-sig")


def require_member_only(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if resolve_access_policy(user.roles).access_level != "member":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder a este recurso.",
        )
    return user


@router.get("/member", response_model=MemberDashboardResponse)
def get_member_dashboard(
    _: Annotated[User, Depends(require_member_only)],
    use_case: Annotated[GetMemberDashboardUseCase, Depends(get_member_dashboard_use_case)],
) -> MemberDashboardResponse:
    return MemberDashboardResponse.from_domain(use_case.execute())


@router.get("/admin", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[GetAdminDashboardUseCase, Depends(get_admin_dashboard_use_case)],
    year: int | None = Query(default=None),
) -> AdminDashboardResponse:
    return AdminDashboardResponse.from_domain(use_case.execute(year=year))


@router.get("/admin/exports/{export_key}")
def export_admin_dashboard(
    export_key: str,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[ExportAdminDashboardUseCase, Depends(get_export_admin_dashboard_use_case)],
    year: int | None = Query(default=None),
) -> Response:
    try:
        export = use_case.execute(export_key, year=year)
    except InvalidDashboardExportKeyError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message) from exc
    return Response(
        content=_csv_bytes(export),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{export.filename}"'},
    )
