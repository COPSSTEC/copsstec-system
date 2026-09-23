from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Protocol

from app.modules.payments.domain.entities import (
    AdminPaymentQuery,
    AffiliationRow,
    AgreementMemberContext,
    DebitAgreement,
    MemberHeader,
    MemberSubscription,
    Payment,
    PaymentAdminStats,
    PaymentListResult,
    PublicAgreementView,
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

    def cancel_unused_pending_renewal(self, user_id: int) -> None:
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
        last_digits: str | None = None,
        trans_id: str | None = None,
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

    def get_admin_stats(self) -> PaymentAdminStats:
        ...

    def get_agreement_member_context(self, user_id: int) -> AgreementMemberContext | None:
        ...

    def list_approved_membership_payments(
        self,
        user_ids: list[int],
    ) -> dict[int, list[tuple[Decimal, date]]]:
        ...

    def get_current_agreement(self, user_id: int) -> DebitAgreement | None:
        ...

    def get_public_agreement(self, token: str) -> PublicAgreementView | None:
        ...

    def revoke_current_agreement(self, user_id: int) -> None:
        ...

    def create_debit_agreement(
        self,
        *,
        user_id: int,
        token: str,
        pending_balance: Decimal,
        sent_at: datetime,
        expires_at: datetime,
    ) -> DebitAgreement:
        ...

    def save_agreement_documents(
        self,
        agreement_id: int,
        signed_authorization_path: str | None,
        identity_document_path: str | None,
        status: str,
        documents_uploaded_at: datetime | None,
    ) -> DebitAgreement:
        ...


class PaymentFileStorage(Protocol):
    def save_voucher(self, user_id: int, filename: str, content: bytes, content_type: str) -> str:
        ...

    def resolve_path(self, voucher_path: str) -> Path | None:
        ...


class AgreementFileStorage(Protocol):
    def save_pdf(self, user_id: int, folder: str, filename: str, content: bytes, content_type: str) -> str:
        ...

    def resolve_path(self, stored_path: str) -> Path | None:
        ...


class AgreementEmailSender(Protocol):
    def send_template(self, to_email: str, template_key: str, context: dict | None = None) -> None:
        ...


class AdvAuthorizationPdfGenerator(Protocol):
    def generate(
        self,
        *,
        names: str,
        lastname: str,
        identifier: str,
        city: str,
        issued_on: date,
    ) -> bytes:
        ...
