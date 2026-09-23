from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.modules.payments.domain.entities import (
    AffiliationRow,
    BankTransferInfo,
    MemberHeader,
    MemberPaymentsView,
    MemberSubscription,
    MembershipDashboard,
    MyPaymentsView,
    Payment,
    PaymentAdminStats,
    PaymentListResult,
    PaymentMutationResult,
    PublicAgreementView,
    SendAgreementResult,
    SubscriptionListResult,
    UploadAgreementResult,
)
from app.modules.payments.domain.subscription import (
    AGREEMENT_NONE,
    BALANCE_AL_DIA,
    GRACE_DAYS,
    money_str,
    plan_from_amount,
)


def _dt(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.replace(microsecond=0).isoformat()


class PaymentItemResponse(BaseModel):
    id: int
    user_id: int
    member_name: str
    identifier: str
    type: str
    description: str
    amount: str
    currency: str = "USD"
    date_register: str
    last_digits: str
    trans_id: str = "NA"
    status: str
    voucher_url: str | None
    created_at: str | None
    plan: str | None = None
    admin_observation: str | None = None

    @classmethod
    def from_domain(cls, payment: Payment) -> "PaymentItemResponse":
        return cls(
            id=payment.id,
            user_id=payment.user_id,
            member_name=payment.member_name,
            identifier=payment.identifier,
            type=payment.type,
            description=payment.description,
            amount=money_str(payment.amount),
            date_register=payment.date_register,
            last_digits=payment.last_digits,
            trans_id=payment.trans_id,
            status=payment.status,
            voucher_url=payment.voucher_url,
            created_at=_dt(payment.created_at),
            plan=plan_from_amount(payment.amount) if payment.type else None,
            admin_observation=payment.admin_observation,
        )


class PaymentListResponse(BaseModel):
    items: list[PaymentItemResponse]
    page: int
    page_size: int
    total: int

    @classmethod
    def from_domain(cls, result: PaymentListResult) -> "PaymentListResponse":
        return cls(
            items=[PaymentItemResponse.from_domain(item) for item in result.items],
            page=result.page,
            page_size=result.page_size,
            total=result.total,
        )


class SubscriptionResponse(BaseModel):
    user_id: int | None = None
    member_name: str | None = None
    identifier: str | None = None
    coverage_until: date | None
    credit_balance: str
    status: str
    days_overdue: int = 0
    last_payment_at: date | None = None
    payments_count: int | None = None
    open_payment_status: str | None = None
    grace_days: int = GRACE_DAYS
    enrolled_on: date | None = None
    first_renewal_on: date | None = None
    pending_balance: str = "0.00"
    balance_status: str = BALANCE_AL_DIA
    agreement_status: str = AGREEMENT_NONE
    agreement_sent_at: str | None = None
    has_signed_authorization: bool = False
    has_identity_document: bool = False
    email: str | None = None

    @classmethod
    def from_domain(cls, subscription: MemberSubscription | None, include_member: bool = False) -> "SubscriptionResponse | None":
        if subscription is None:
            return None
        payload = {
            "coverage_until": subscription.coverage_until,
            "credit_balance": money_str(subscription.credit_balance),
            "status": subscription.status,
            "days_overdue": subscription.days_overdue,
            "last_payment_at": subscription.last_payment_at,
            "open_payment_status": subscription.open_payment_status,
            "grace_days": GRACE_DAYS,
            "enrolled_on": subscription.enrolled_on,
            "first_renewal_on": subscription.first_renewal_on,
            "pending_balance": money_str(subscription.pending_balance),
            "balance_status": subscription.balance_status,
            "agreement_status": subscription.agreement_status,
            "agreement_sent_at": _dt(subscription.agreement_sent_at),
            "has_signed_authorization": subscription.has_signed_authorization,
            "has_identity_document": subscription.has_identity_document,
            "email": subscription.email or None,
        }
        if include_member:
            payload.update(
                {
                    "user_id": subscription.user_id,
                    "member_name": subscription.member_name,
                    "identifier": subscription.identifier,
                    "payments_count": subscription.payments_count,
                },
            )
        return cls(**payload)


class PendingVoucherResponse(BaseModel):
    id: int
    user_id: int
    member_name: str
    amount: str
    plan: str | None
    status: str
    voucher_url: str | None
    date_register: str
    created_at: str | None

    @classmethod
    def from_domain(cls, payment: Payment) -> "PendingVoucherResponse":
        return cls(
            id=payment.id,
            user_id=payment.user_id,
            member_name=payment.member_name,
            amount=money_str(payment.amount),
            plan=plan_from_amount(payment.amount),
            status=payment.status,
            voucher_url=payment.voucher_url,
            date_register=payment.date_register,
            created_at=_dt(payment.created_at),
        )


class AffiliationResponse(BaseModel):
    user_id: int
    member_name: str
    amount: str
    status: str
    voucher_url: str | None
    created_at: str | None

    @classmethod
    def from_domain(cls, row: AffiliationRow) -> "AffiliationResponse":
        return cls(
            user_id=row.user_id,
            member_name=row.member_name,
            amount=money_str(row.amount),
            status=row.status,
            voucher_url=row.voucher_url,
            created_at=_dt(row.created_at),
        )


class SubscriptionPageResponse(BaseModel):
    items: list[SubscriptionResponse]
    page: int
    page_size: int
    total: int

    @classmethod
    def from_domain(cls, result: SubscriptionListResult) -> "SubscriptionPageResponse":
        return cls(
            items=[
                item
                for item in (
                    SubscriptionResponse.from_domain(row, include_member=True) for row in result.items
                )
                if item is not None
            ],
            page=result.page,
            page_size=result.page_size,
            total=result.total,
        )


class MembershipDashboardResponse(BaseModel):
    pending_vouchers: list[PendingVoucherResponse]
    subscriptions: SubscriptionPageResponse
    affiliations: list[AffiliationResponse]

    @classmethod
    def from_domain(cls, dashboard: MembershipDashboard) -> "MembershipDashboardResponse":
        return cls(
            pending_vouchers=[PendingVoucherResponse.from_domain(item) for item in dashboard.pending_vouchers],
            subscriptions=SubscriptionPageResponse.from_domain(dashboard.subscriptions),
            affiliations=[AffiliationResponse.from_domain(item) for item in dashboard.affiliations],
        )


class MemberHeaderResponse(BaseModel):
    user_id: int
    names: str
    lastname: str

    @classmethod
    def from_domain(cls, member: MemberHeader) -> "MemberHeaderResponse":
        return cls(user_id=member.user_id, names=member.names, lastname=member.lastname)


class MemberPaymentsResponse(BaseModel):
    member: MemberHeaderResponse
    items: list[PaymentItemResponse]
    subscription: SubscriptionResponse | None

    @classmethod
    def from_domain(cls, view: MemberPaymentsView) -> "MemberPaymentsResponse":
        return cls(
            member=MemberHeaderResponse.from_domain(view.member),
            items=[PaymentItemResponse.from_domain(item) for item in view.items],
            subscription=SubscriptionResponse.from_domain(view.subscription),
        )


class CreatePaymentRequest(BaseModel):
    type: str = Field(min_length=1)
    description: str = Field(min_length=1, max_length=255)
    amount: Decimal
    date_register: str = Field(min_length=8, max_length=10)
    last_digits: str | None = None
    trans_id: str | None = None


class PaymentAdminStatsResponse(BaseModel):
    payments_total: int
    approved_count: int
    approved_month: int
    approved_prev_month: int
    pending_count: int
    pending_month: int
    pending_prev_month: int
    members_total: int
    members_al_dia: int
    members_gracia: int
    members_vencidas: int
    members_sin_historial: int
    pending_balance_total: str

    @classmethod
    def from_domain(cls, stats: PaymentAdminStats) -> "PaymentAdminStatsResponse":
        return cls(
            payments_total=stats.payments_total,
            approved_count=stats.approved_count,
            approved_month=stats.approved_month,
            approved_prev_month=stats.approved_prev_month,
            pending_count=stats.pending_count,
            pending_month=stats.pending_month,
            pending_prev_month=stats.pending_prev_month,
            members_total=stats.members_total,
            members_al_dia=stats.members_al_dia,
            members_gracia=stats.members_gracia,
            members_vencidas=stats.members_vencidas,
            members_sin_historial=stats.members_sin_historial,
            pending_balance_total=money_str(stats.pending_balance_total),
        )


class RejectPaymentRequest(BaseModel):
    observation: str = Field(min_length=1, max_length=500)


class RenewalRequest(BaseModel):
    plan: str


class PaymentMutationResponse(BaseModel):
    payment: PaymentItemResponse
    subscription: SubscriptionResponse | None
    open_payment: PaymentItemResponse | None = None

    @classmethod
    def from_domain(cls, result: PaymentMutationResult) -> "PaymentMutationResponse":
        return cls(
            payment=PaymentItemResponse.from_domain(result.payment),
            subscription=SubscriptionResponse.from_domain(result.subscription),
            open_payment=PaymentItemResponse.from_domain(result.open_payment) if result.open_payment else None,
        )


class OpenPaymentResponse(BaseModel):
    id: int
    status: str
    amount: str
    plan: str | None
    description: str
    date_register: str
    voucher_url: str | None
    admin_observation: str | None

    @classmethod
    def from_domain(cls, payment: Payment) -> "OpenPaymentResponse":
        return cls(
            id=payment.id,
            status=payment.status,
            amount=money_str(payment.amount),
            plan=plan_from_amount(payment.amount),
            description=payment.description,
            date_register=payment.date_register,
            voucher_url=payment.voucher_url,
            admin_observation=payment.admin_observation,
        )


class PaymentInfoResponse(BaseModel):
    bank_name: str
    account_type: str
    account_number: str
    account_holder: str
    account_ruc: str
    qr_payload: str

    @classmethod
    def from_domain(cls, info: BankTransferInfo) -> "PaymentInfoResponse":
        return cls(
            bank_name=info.bank_name,
            account_type=info.account_type,
            account_number=info.account_number,
            account_holder=info.account_holder,
            account_ruc=info.account_ruc,
            qr_payload=info.qr_payload,
        )


class SendAgreementResponse(BaseModel):
    user_id: int
    email: str
    pending_balance: str
    agreement_status: str
    expires_at: str
    message: str

    @classmethod
    def from_domain(cls, result: SendAgreementResult) -> "SendAgreementResponse":
        return cls(
            user_id=result.user_id,
            email=result.email,
            pending_balance=money_str(result.pending_balance),
            agreement_status=result.agreement_status,
            expires_at=_dt(result.expires_at) or "",
            message=result.message,
        )


class PublicAgreementResponse(BaseModel):
    member_name: str
    identifier: str
    pending_balance: str
    has_signed_authorization: bool
    has_identity_document: bool
    status: str
    expires_at: str

    @classmethod
    def from_domain(cls, view: PublicAgreementView) -> "PublicAgreementResponse":
        return cls(
            member_name=view.member_name,
            identifier=view.identifier,
            pending_balance=money_str(view.pending_balance),
            has_signed_authorization=view.has_signed_authorization,
            has_identity_document=view.has_identity_document,
            status=view.status,
            expires_at=_dt(view.expires_at) or "",
        )


class UploadAgreementDocumentsResponse(BaseModel):
    status: str
    has_signed_authorization: bool
    has_identity_document: bool
    message: str

    @classmethod
    def from_domain(cls, result: UploadAgreementResult) -> "UploadAgreementDocumentsResponse":
        return cls(
            status=result.status,
            has_signed_authorization=result.has_signed_authorization,
            has_identity_document=result.has_identity_document,
            message=result.message,
        )


class MyPaymentsResponse(BaseModel):
    items: list[PaymentItemResponse]
    open_payment: OpenPaymentResponse | None
    subscription: SubscriptionResponse | None
    payment_info: PaymentInfoResponse

    @classmethod
    def from_domain(cls, view: MyPaymentsView) -> "MyPaymentsResponse":
        return cls(
            items=[PaymentItemResponse.from_domain(item) for item in view.items],
            open_payment=OpenPaymentResponse.from_domain(view.open_payment) if view.open_payment else None,
            subscription=SubscriptionResponse.from_domain(view.subscription),
            payment_info=PaymentInfoResponse.from_domain(view.payment_info),
        )
