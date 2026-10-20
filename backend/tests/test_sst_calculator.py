from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import get_current_user
from app.modules.payments.domain.entities import AgreementMemberContext
from app.modules.payments.public import GetMembershipBalanceUseCase
from app.modules.sst_calculator.application.use_cases import (
    GetAuthorizedCiiuCatalogUseCase,
    GetSstCalculatorAccessUseCase,
)
from app.modules.sst_calculator.domain.entities import MembershipBalance
from app.modules.sst_calculator.infrastructure.ciiu_catalog import JsonCiiuCatalogAdapter
from app.modules.sst_calculator.presentation.api.dependencies import (
    get_authorized_ciiu_catalog_use_case,
    get_sst_access_use_case,
)


@dataclass
class MutableBalanceReader:
    pending_balance: Decimal = Decimal("0.00")
    calls: int = 0

    def get_current_balance(self, user_id: int) -> MembershipBalance:
        self.calls += 1
        return MembershipBalance(
            pending_balance=self.pending_balance,
            balance_status="saldo_pendiente" if self.pending_balance > 0 else "al_dia",
        )


class MutablePaymentsRepository:
    def __init__(self, enrolled_on: date | None) -> None:
        self.enrolled_on = enrolled_on
        self.approved_renewals: list[tuple[Decimal, date]] = []

    def get_agreement_member_context(self, user_id: int) -> AgreementMemberContext:
        return AgreementMemberContext(
            user_id=user_id,
            names="Ana",
            lastname="Pérez",
            identifier="1100",
            email="ana@example.com",
            city="Quito",
            state_id=1,
            enrolled_on=self.enrolled_on,
        )

    def list_approved_membership_payments(
        self,
        user_ids: list[int],
    ) -> dict[int, list[tuple[Decimal, date]]]:
        return {user_id: list(self.approved_renewals) for user_id in user_ids}


def _user(*, roles: list[str] | None = None, state_id: int = 1) -> User:
    return User(
        id=17,
        name="Ana Pérez",
        email="ana@example.com",
        password_hash="hash",
        state_id=state_id,
        email_verified_at=None,
        last_conexion=None,
        roles=roles if roles is not None else ["miembro"],
        profile=None,
    )


@pytest.fixture
def api_overrides() -> tuple[MutableBalanceReader, GetSstCalculatorAccessUseCase]:
    reader = MutableBalanceReader()
    access_use_case = GetSstCalculatorAccessUseCase(reader)
    catalog_use_case = GetAuthorizedCiiuCatalogUseCase(
        access_use_case,
        JsonCiiuCatalogAdapter(),
    )
    app.dependency_overrides[get_current_user] = lambda: _user()
    app.dependency_overrides[get_sst_access_use_case] = lambda: access_use_case
    app.dependency_overrides[get_authorized_ciiu_catalog_use_case] = lambda: catalog_use_case
    try:
        yield reader, access_use_case
    finally:
        app.dependency_overrides.clear()


def test_access_allows_enabled_member_with_zero_balance(api_overrides) -> None:
    reader, _ = api_overrides

    response = TestClient(app).get("/api/sst-calculator/access")

    assert response.status_code == 200
    assert response.json() == {
        "allowed": True,
        "balance_status": "al_dia",
        "pending_balance": "0.00",
        "reason": None,
    }
    assert reader.calls == 1


def test_access_allows_enabled_legacy_member_without_enrollment_history() -> None:
    repository = MutablePaymentsRepository(enrolled_on=None)
    snapshot = GetMembershipBalanceUseCase(repository).execute(
        user_id=17,
        today=date(2026, 10, 19),
    )

    assert snapshot.pending_balance == Decimal("0.00")
    assert snapshot.balance_status == "al_dia"


def test_access_denies_member_with_pending_balance(api_overrides) -> None:
    reader, _ = api_overrides
    reader.pending_balance = Decimal("20.00")

    response = TestClient(app).get("/api/sst-calculator/access")

    assert response.status_code == 200
    assert response.json() == {
        "allowed": False,
        "balance_status": "saldo_pendiente",
        "pending_balance": "20.00",
        "reason": "Debes estar al día con tus pagos para usar Calcular SST.",
    }


@pytest.mark.parametrize(
    ("roles", "expected_reason"),
    [
        (["admin"], "Calcular SST está disponible únicamente para miembros."),
        (["bibliotecario"], "Calcular SST está disponible únicamente para miembros."),
        ([], "Calcular SST está disponible únicamente para miembros."),
        (["rol-desconocido"], "Calcular SST está disponible únicamente para miembros."),
        (
            ["miembro", "admin"],
            "Calcular SST está disponible únicamente para miembros.",
        ),
    ],
    ids=["admin", "operations", "restricted-empty", "restricted-role", "admin-and-member"],
)
def test_access_denies_non_member_access_levels_without_reading_balance(
    api_overrides,
    roles: list[str],
    expected_reason: str,
) -> None:
    reader, _ = api_overrides
    app.dependency_overrides[get_current_user] = lambda: _user(roles=roles)

    response = TestClient(app).get("/api/sst-calculator/access")

    assert response.status_code == 200
    assert response.json() == {
        "allowed": False,
        "balance_status": "al_dia",
        "pending_balance": "0.00",
        "reason": expected_reason,
    }
    assert reader.calls == 0


@pytest.mark.parametrize("state_id", [2, 4, 16])
def test_access_denies_disabled_or_onboarding_member_without_reading_balance(
    api_overrides,
    state_id: int,
) -> None:
    reader, _ = api_overrides
    app.dependency_overrides[get_current_user] = lambda: _user(state_id=state_id)

    response = TestClient(app).get("/api/sst-calculator/access")

    assert response.status_code == 200
    assert response.json() == {
        "allowed": False,
        "balance_status": "al_dia",
        "pending_balance": "0.00",
        "reason": "Tu acceso al portal de miembros no está habilitado.",
    }
    assert reader.calls == 0


@pytest.mark.parametrize("path", ["/api/sst-calculator/access", "/api/sst-calculator/catalog"])
def test_sst_endpoints_return_401_without_session(path: str) -> None:
    app.dependency_overrides.clear()

    response = TestClient(app).get(path)

    assert response.status_code == 401
    assert response.json() == {"detail": "Sesión requerida."}


def test_catalog_returns_all_original_activities_for_eligible_member(api_overrides) -> None:
    response = TestClient(app).get("/api/sst-calculator/catalog")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1738
    assert all(set(item) == {"code", "description", "risk"} for item in body)
    assert {item["risk"] for item in body} == {"Bajo", "Medio", "Alto"}


def test_catalog_returns_403_when_balance_is_pending(api_overrides) -> None:
    reader, _ = api_overrides
    reader.pending_balance = Decimal("10.00")

    response = TestClient(app).get("/api/sst-calculator/catalog")

    assert response.status_code == 403
    assert response.json() == {
        "detail": "No tienes acceso a Calcular SST. Verifica tu estado de membresía y pagos.",
    }


def test_catalog_revalidates_access_after_payment_state_changes(api_overrides) -> None:
    reader, _ = api_overrides
    client = TestClient(app)

    initial_access = client.get("/api/sst-calculator/access")
    reader.pending_balance = Decimal("10.00")
    updated_access = client.get("/api/sst-calculator/access")
    catalog = client.get("/api/sst-calculator/catalog")

    assert initial_access.json()["allowed"] is True
    assert updated_access.json() == {
        "allowed": False,
        "balance_status": "saldo_pendiente",
        "pending_balance": "10.00",
        "reason": "Debes estar al día con tus pagos para usar Calcular SST.",
    }
    assert catalog.status_code == 403
    assert reader.calls == 3


def test_balance_reader_reflects_approve_update_and_delete_payment() -> None:
    repository = MutablePaymentsRepository(enrolled_on=date(2024, 1, 1))
    use_case = GetMembershipBalanceUseCase(repository)
    today = date(2026, 4, 2)

    assert use_case.execute(17, today).pending_balance == Decimal("150.00")

    repository.approved_renewals.append((Decimal("150.00"), date(2026, 4, 2)))
    assert use_case.execute(17, today).pending_balance == Decimal("0.00")

    repository.approved_renewals[0] = (Decimal("120.00"), date(2026, 4, 2))
    assert use_case.execute(17, today).pending_balance == Decimal("30.00")

    repository.approved_renewals.clear()
    assert use_case.execute(17, today).pending_balance == Decimal("150.00")


def test_invalid_or_missing_catalog_returns_generic_error_without_exposing_path(
    api_overrides,
    tmp_path: Path,
) -> None:
    _, access_use_case = api_overrides
    missing_path = tmp_path / "private" / "ciiu-secret.json"
    invalid_catalog_use_case = GetAuthorizedCiiuCatalogUseCase(
        access_use_case,
        JsonCiiuCatalogAdapter(missing_path),
    )
    app.dependency_overrides[get_authorized_ciiu_catalog_use_case] = (
        lambda: invalid_catalog_use_case
    )

    response = TestClient(app).get("/api/sst-calculator/catalog")

    assert response.status_code == 500
    assert response.json() == {"detail": "No fue posible cargar el catálogo CIIU."}
    assert str(missing_path) not in response.text
