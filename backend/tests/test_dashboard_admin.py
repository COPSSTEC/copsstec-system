from datetime import date

from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import get_current_user
from app.modules.dashboard.application.use_cases import (
    ExportAdminDashboardUseCase,
    GetAdminDashboardUseCase,
)
from app.modules.dashboard.domain.entities import (
    ENABLED_STATE_ID,
    IDENTITY_HEADERS,
    RosterMember,
)
from app.modules.dashboard.presentation.api.dependencies import get_dashboard_repository
from app.modules.payments.domain.subscription import SUBSCRIPTION_GRACIA, SUBSCRIPTION_SIN_HISTORIAL


class FakeDashboardRepository:
    def __init__(
        self,
        roster: list[RosterMember] | None = None,
        charges=None,
        pending=None,
    ) -> None:
        self.roster = list(roster or [])
        self.charges = list(charges or [])
        self.pending = list(pending or [])

    def list_roster(self) -> list[RosterMember]:
        return list(self.roster)

    def list_income_charges(self):
        return list(self.charges)

    def list_pending_approvals(self):
        return list(self.pending)


def _member(
    *,
    user_id: int = 1,
    state_id: int = ENABLED_STATE_ID,
    names: str = "Ana",
    lastname: str = "Pérez",
    identifier: str = "1100",
    email: str = "ana@test.com",
    date_register: str = "15/09/2026",
    gender: str = "Femenino",
    province: str = "Pichincha",
    city: str = "Quito",
    birtday: str = "10/05/1990",
    blood_type: str = "O+",
    type_profile: str = "miembro",
    title_academic: str = "Ingeniera en SST",
    fourth_title: str = "",
    coverage_until: date | None = None,
) -> RosterMember:
    return RosterMember(
        user_id=user_id,
        state_id=state_id,
        names=names,
        lastname=lastname,
        identifier=identifier,
        email=email,
        date_register=date_register,
        gender=gender,
        province=province,
        city=city,
        birtday=birtday,
        blood_type=blood_type,
        type_profile=type_profile,
        title_academic=title_academic,
        fourth_title=fourth_title,
        coverage_until=coverage_until,
    )


def _member_user(user_id: int = 10) -> User:
    return User(
        id=user_id,
        name="Miembro",
        email="miembro@test.com",
        password_hash="x",
        state_id=1,
        email_verified_at=None,
        last_conexion=None,
        roles=["miembro"],
        profile=None,
    )


def test_dashboard_forbidden_for_member() -> None:
    app.dependency_overrides[get_current_user] = lambda: _member_user()
    app.dependency_overrides[get_dashboard_repository] = lambda: FakeDashboardRepository()
    try:
        client = TestClient(app)
        response = client.get("/api/dashboard/admin")
        assert response.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_payment_status_groups_grace_as_al_dia() -> None:
    today = date(2026, 9, 22)
    repo = FakeDashboardRepository(
        roster=[_member(coverage_until=date(2026, 9, 17))],
    )
    snapshot = GetAdminDashboardUseCase(repo).execute(year=2026, today=today)
    assert snapshot.payments.al_dia == 1
    assert snapshot.payments.pendiente == 0


def test_sin_historial_counts_as_pendiente() -> None:
    today = date(2026, 9, 22)
    repo = FakeDashboardRepository(roster=[_member(coverage_until=None)])
    snapshot = GetAdminDashboardUseCase(repo).execute(year=2026, today=today)
    assert snapshot.payments.al_dia == 0
    assert snapshot.payments.pendiente == 1


def test_medical_keyword_classifies_as_medico() -> None:
    today = date(2026, 9, 22)
    repo = FakeDashboardRepository(
        roster=[
            _member(user_id=1, title_academic="Médico ocupacional"),
            _member(user_id=2, title_academic="Ingeniero en SST"),
            _member(user_id=3, title_academic="", fourth_title=""),
        ],
    )
    snapshot = GetAdminDashboardUseCase(repo).execute(year=2026, today=today)
    assert snapshot.cards.medical == 1
    assert snapshot.cards.technical == 1


def test_export_payments_includes_identity_columns() -> None:
    today = date(2026, 9, 22)
    repo = FakeDashboardRepository(
        roster=[_member(coverage_until=date(2026, 9, 17))],
    )
    export = ExportAdminDashboardUseCase(repo).execute("payments", year=2026, today=today)
    assert export.headers[:4] == IDENTITY_HEADERS
    assert export.headers == IDENTITY_HEADERS + ("estado_pago", "coverage_until")
    assert export.rows[0][0] == "Ana"
    assert export.rows[0][1] == "Pérez"
    assert export.rows[0][2] == "1100"
    assert export.rows[0][3] == "ana@test.com"
    assert export.rows[0][4] == SUBSCRIPTION_GRACIA
    assert export.rows[0][5] == "2026-09-17"
    assert SUBSCRIPTION_SIN_HISTORIAL not in {row[4] for row in export.rows}
