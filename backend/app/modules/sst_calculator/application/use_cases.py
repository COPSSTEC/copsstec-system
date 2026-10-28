from decimal import Decimal

from app.modules.sst_calculator.application.ports import CiiuCatalogReader, MembershipBalanceReader
from app.modules.sst_calculator.domain.entities import (
    CiiuActivity,
    SstCalculatorAccess,
    SstCalculatorUser,
)
from app.modules.sst_calculator.domain.exceptions import SstCalculatorAccessDeniedError

MEMBER_ROLE = "miembro"
MEMBER_ACCESS_LEVEL = "member"
ENABLED_STATE_ID = 1

MEMBER_ONLY_REASON = "Cotiza SST está disponible únicamente para miembros."
PORTAL_DISABLED_REASON = "Tu acceso al portal de miembros no está habilitado."
PENDING_BALANCE_REASON = "Debes estar al día con tus pagos para usar Cotiza SST."


class GetSstCalculatorAccessUseCase:
    def __init__(self, balance_reader: MembershipBalanceReader) -> None:
        self.balance_reader = balance_reader

    def execute(self, user: SstCalculatorUser) -> SstCalculatorAccess:
        if user.access_level != MEMBER_ACCESS_LEVEL or MEMBER_ROLE not in user.roles:
            return self._denied(MEMBER_ONLY_REASON)
        if user.state_id != ENABLED_STATE_ID:
            return self._denied(PORTAL_DISABLED_REASON)

        balance = self.balance_reader.get_current_balance(user.user_id)
        if balance.pending_balance > Decimal("0.00"):
            return SstCalculatorAccess(
                allowed=False,
                balance_status="saldo_pendiente",
                pending_balance=balance.pending_balance,
                reason=PENDING_BALANCE_REASON,
            )

        return SstCalculatorAccess(
            allowed=True,
            balance_status="al_dia",
            pending_balance=Decimal("0.00"),
            reason=None,
        )

    @staticmethod
    def _denied(reason: str) -> SstCalculatorAccess:
        return SstCalculatorAccess(
            allowed=False,
            balance_status="al_dia",
            pending_balance=Decimal("0.00"),
            reason=reason,
        )


class GetAuthorizedCiiuCatalogUseCase:
    def __init__(
        self,
        access_use_case: GetSstCalculatorAccessUseCase,
        catalog_reader: CiiuCatalogReader,
    ) -> None:
        self.access_use_case = access_use_case
        self.catalog_reader = catalog_reader

    def execute(self, user: SstCalculatorUser) -> tuple[CiiuActivity, ...]:
        access = self.access_use_case.execute(user)
        if not access.allowed:
            raise SstCalculatorAccessDeniedError()
        return self.catalog_reader.list_activities()
