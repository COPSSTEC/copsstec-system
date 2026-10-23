"""Stable, read-only API exposed by the payments module."""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Literal, cast

from app.modules.payments.application.ports import PaymentsRepository
from app.modules.payments.domain.subscription import (
    as_money,
    balance_status_from_pending,
    default_debit_period,
    parse_period,
    pending_membership_balance,
)

__all__ = [
    "GetMembershipBalanceUseCase",
    "MembershipBalanceSnapshot",
    "MembershipBalanceUnavailableError",
    "default_debit_period",
    "parse_period",
]

BalanceStatus = Literal["al_dia", "saldo_pendiente"]


@dataclass(frozen=True)
class MembershipBalanceSnapshot:
    pending_balance: Decimal
    balance_status: BalanceStatus


class MembershipBalanceUnavailableError(Exception):
    """Raised when payments cannot resolve the requested member."""


class GetMembershipBalanceUseCase:
    """Recalculate a member balance from the canonical payments history."""

    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(
        self,
        user_id: int,
        today: date | None = None,
    ) -> MembershipBalanceSnapshot:
        context = self.repository.get_agreement_member_context(user_id)
        if context is None:
            raise MembershipBalanceUnavailableError()

        pending = Decimal("0.00")
        if context.enrolled_on is not None:
            renewals = self.repository.list_approved_membership_payments([user_id]).get(user_id, [])
            pending = pending_membership_balance(
                context.enrolled_on,
                today or date.today(),
                renewals,
            )

        pending = as_money(max(pending, Decimal("0.00")))
        return MembershipBalanceSnapshot(
            pending_balance=pending,
            balance_status=cast(BalanceStatus, balance_status_from_pending(pending)),
        )
