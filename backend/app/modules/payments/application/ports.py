from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Protocol

from app.modules.payments.domain.entities import (
    AdminPaymentQuery,
    AffiliationRow,
    MemberHeader,
    MemberSubscription,
    Payment,
    PaymentListResult,
    SubscriptionListQuery,
    SubscriptionListResult,
)


class PaymentsRepository(Protocol):
    def list_admin_payments(self, query: AdminPaymentQuery) -> PaymentListResult:
        ...

    def get_payment(self, payment_id: int) -> Payment | None:
        ...

    def member_exists(self, user_id: int) -> bool:
        ...

    def get_member_header(self, user_id: int) -> MemberHeader | None:
        ...

    def list_payments_for_user(self, user_id: int) -> list[Payment]:
        ...

    def get_subscription(self, user_id: int) -> MemberSubscription | None:
        ...

    def get_open_membership_payment(self, user_id: int) -> Payment | None:
        ...

    def create_payment(
        self,
        *,
        user_id: int,
        payment_type: str,
        description: str,
        amount: Decimal,
        date_register: str,
        status: str,
        last_digits: str = "any",
        trans_id: str = "NA",
        client_id: str = "NA",
        voucher_path: str | None = None,
        admin_observation: str | None = None,
        reviewed_by: int | None = None,
        recalculate: bool = True,
    ) -> Payment:
        ...

    def update_payment(
        self,
        payment_id: int,
        *,
        payment_type: str,
        description: str,
        amount: Decimal,
        date_register: str,
    ) -> Payment:
        ...

    def delete_payment(self, payment_id: int) -> Payment:
        ...

    def approve_payment(self, payment_id: int, reviewed_by: int, date_register: str) -> Payment:
        ...

    def reject_payment(self, payment_id: int, reviewed_by: int, observation: str) -> tuple[Payment, Payment]:
        ...

    def save_voucher(self, payment_id: int, voucher_path: str) -> Payment:
        ...

    def ensure_pending_renewal(
        self,
        user_id: int,
        amount: Decimal,
        date_register: str,
        reference: str,
    ) -> Payment:
        ...

    def update_pending_renewal(self, payment_id: int, amount: Decimal, date_register: str | None = None) -> Payment:
        ...

    def recalculate_subscription(self, user_id: int) -> MemberSubscription:
        ...

    def record_affiliation_payment(self, user_id: int, amount: Decimal, payment_date: date) -> None:
        ...

    def list_pending_vouchers(self) -> list[Payment]:
        ...

    def list_subscriptions(self, query: SubscriptionListQuery) -> SubscriptionListResult:
        ...

    def list_affiliations(self) -> list[AffiliationRow]:
        ...


class PaymentFileStorage(Protocol):
    def save_voucher(self, user_id: int, filename: str, content: bytes, content_type: str) -> str:
        ...

    def resolve_path(self, voucher_path: str) -> Path | None:
        ...
