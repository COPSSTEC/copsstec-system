from typing import Protocol

from app.modules.sst_calculator.domain.entities import CiiuActivity, MembershipBalance


class MembershipBalanceReader(Protocol):
    def get_current_balance(self, user_id: int) -> MembershipBalance:
        ...


class CiiuCatalogReader(Protocol):
    def list_activities(self) -> tuple[CiiuActivity, ...]:
        ...
