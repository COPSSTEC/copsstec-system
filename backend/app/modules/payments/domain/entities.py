from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

from app.modules.payments.domain.subscription import (
    STATUS_APPROVED,
    STATUS_PENDING_PAYMENT,
    STATUS_PENDING_REVIEW,
    STATUS_REJECTED,
    money_str,
    plan_from_amount,
)


@dataclass(frozen=True)
class Payment:
    id: int
    user_id: int
    member_name: str
    identifier: str
    type: str
    description: str
    amount: Decimal
    currency: str
    date_register: str
    last_digits: str
    status: str
    voucher_path: str | None
    created_at: datetime | None
    updated_at: datetime | None = None
    reviewed_by: int | None = None
    reviewed_at: datetime | None = None
    admin_observation: str | None = None
    trans_id: str = "NA"
    client_id: str = "NA"
    total_cents: str = ""

    @property
    def plan(self) -> str | None:
        return plan_from_amount(self.amount)

    @property
    def voucher_url(self) -> str | None:
        return self.voucher_path

    @property
    def amount_label(self) -> str:
        return money_str(self.amount)


@dataclass(frozen=True)
class MemberHeader:
    user_id: int
    names: str
    lastname: str
    identifier: str = ""


@dataclass(frozen=True)
class MemberSubscription:
    user_id: int
    coverage_until: date | None
    credit_balance: Decimal
    last_payment_at: date | None = None
    updated_at: datetime | None = None
    member_name: str = ""
    identifier: str = ""
    payments_count: int = 0
    open_payment_status: str | None = None
    status: str = "sin_historial"
    days_overdue: int = 0


@dataclass(frozen=True)
class AffiliationRow:
    user_id: int
    member_name: str
    amount: Decimal
    status: str
    voucher_url: str | None
    created_at: datetime | None


@dataclass(frozen=True)
class PaymentListResult:
    items: list[Payment]
    page: int
    page_size: int
    total: int


@dataclass(frozen=True)
class SubscriptionListResult:
    items: list[MemberSubscription]
    page: int
    page_size: int
    total: int


@dataclass(frozen=True)
class AdminPaymentQuery:
    page: int = 1
    page_size: int = 15
    q: str | None = None
    payment_type: str | None = None
    status: str | None = None
    user_id: int | None = None
    date_from: str | None = None
    date_to: str | None = None
    sort_by: str = "date_register"
    sort_dir: str = "desc"


@dataclass(frozen=True)
class SubscriptionListQuery:
    page: int = 1
    page_size: int = 15
    q: str | None = None
    subscription_status: str | None = None


@dataclass(frozen=True)
class BankTransferInfo:
    bank_name: str
    account_type: str
    account_number: str
    account_holder: str
    account_ruc: str
    qr_payload: str


@dataclass(frozen=True)
class MembershipDashboard:
    pending_vouchers: list[Payment]
    subscriptions: SubscriptionListResult
    affiliations: list[AffiliationRow]


@dataclass(frozen=True)
class MemberPaymentsView:
    member: MemberHeader
    items: list[Payment]
    subscription: MemberSubscription | None


@dataclass(frozen=True)
class MyPaymentsView:
    items: list[Payment]
    open_payment: Payment | None
    subscription: MemberSubscription | None
    payment_info: BankTransferInfo


@dataclass(frozen=True)
class PaymentMutationResult:
    payment: Payment
    subscription: MemberSubscription | None
    open_payment: Payment | None = None


PAYMENT_STATUSES = (
    STATUS_PENDING_PAYMENT,
    STATUS_PENDING_REVIEW,
    STATUS_APPROVED,
    STATUS_REJECTED,
)
