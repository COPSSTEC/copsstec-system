from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.modules.payments.domain.entities import (
    AffiliationRow,
    BankTransferInfo,
    ConfirmInstallmentsResult,
    CreatePaymentPlanResult,
    MemberHeader,
    MemberPaymentsView,
    MemberSubscription,
    MembershipDashboard,
    MyPaymentsView,
    Payment,
    PaymentAdminStats,
    PaymentListResult,
    PaymentMutationResult,
    PaymentPlan,
    PaymentPlanPreview,
    PeriodInstallmentRow,
    PlanInstallment,
    PublicAgreementView,
    SendAgreementResult,
    SubscriptionListResult,
    UploadAgreementResult,
)
from app.modules.payments.domain.subscription import (
    AGREEMENT_NONE,
    BALANCE_AL_DIA,
    DEBIT_WINDOW_DAYS,
    GRACE_DAYS,
    INSTALLMENT_DEBITED,
    INSTALLMENT_PENDING,
    PLAN_NONE,
    PlanScheduleItem,
    add_months,
    format_period,
    money_str,
    plan_from_amount,
    remaining_plan_debt,
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
    applies_to_debt: bool = False

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
            plan=plan_from_amount(payment.amount) if payment.type and not payment.applies_to_debt else None,
            admin_observation=payment.admin_observation,
            applies_to_debt=payment.applies_to_debt,
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
    payment_plan_status: str = PLAN_NONE

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
            "payment_plan_status": subscription.payment_plan_status,
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


class PlanScheduleItemResponse(BaseModel):
    period: str
    fee_amount: str
    debt_amount: str
    total_amount: str

    @classmethod
    def from_domain(cls, item: PlanScheduleItem) -> "PlanScheduleItemResponse":
        return cls(
            period=format_period(item.period) or "",
            fee_amount=money_str(item.fee_amount),
            debt_amount=money_str(item.debt_amount),
            total_amount=money_str(item.total_amount),
        )


class PlanInstallmentResponse(PlanScheduleItemResponse):
    id: int
    plan_id: int
    status: str
    confirmed_at: str | None = None

    @classmethod
    def from_installment(cls, item: PlanInstallment) -> "PlanInstallmentResponse":
        return cls(
            id=item.id,
            plan_id=item.plan_id,
            period=format_period(item.period) or "",
            fee_amount=money_str(item.fee_amount),
            debt_amount=money_str(item.debt_amount),
            total_amount=money_str(item.total_amount),
            status=item.status,
            confirmed_at=_dt(item.confirmed_at),
        )


class PlanBankResponse(BaseModel):
    bank_name: str
    account_type: str
    account_number: str


class PaymentPlanResponse(BaseModel):
    id: int
    user_id: int
    member_name: str
    status: str
    debt_total: str
    debt_paid: str
    remaining_debt: str
    monthly_fee: str
    installment_amount: str
    monthly_total: str
    start_period: str
    end_period: str
    regular_from_period: str
    debt_from_period: str | None
    debt_to_period: str | None
    debit_window_days: int = DEBIT_WINDOW_DAYS
    bank: PlanBankResponse
    created_at: str | None
    cancelled_at: str | None
    completed_at: str | None
    next_installment: PlanInstallmentResponse | None
    installments: list[PlanInstallmentResponse]

    @classmethod
    def from_domain(cls, plan: PaymentPlan) -> "PaymentPlanResponse":
        settled = [
            (item.status, item.fee_amount, item.debt_amount)
            for item in plan.installments
            if item.status != INSTALLMENT_PENDING
        ]
        paid = sum(
            (item.debt_amount for item in plan.installments if item.status == INSTALLMENT_DEBITED),
            Decimal("0.00"),
        )
        pending = [item for item in plan.installments if item.status == INSTALLMENT_PENDING]
        return cls(
            id=plan.id,
            user_id=plan.user_id,
            member_name=plan.member_name,
            status=plan.status,
            debt_total=money_str(plan.debt_total),
            debt_paid=money_str(paid),
            remaining_debt=money_str(remaining_plan_debt(plan.debt_total, settled)),
            monthly_fee=money_str(plan.monthly_fee),
            installment_amount=money_str(plan.installment_amount),
            monthly_total=money_str(plan.monthly_fee + plan.installment_amount),
            start_period=format_period(plan.start_period) or "",
            end_period=format_period(plan.end_period) or "",
            regular_from_period=format_period(add_months(plan.end_period, 1)) or "",
            debt_from_period=format_period(plan.debt_from_period),
            debt_to_period=format_period(plan.debt_to_period),
            bank=PlanBankResponse(
                bank_name=plan.bank_name,
                account_type=plan.account_type,
                account_number=plan.account_number,
            ),
            created_at=_dt(plan.created_at),
            cancelled_at=_dt(plan.cancelled_at),
            completed_at=_dt(plan.completed_at),
            next_installment=PlanInstallmentResponse.from_installment(pending[0]) if pending else None,
            installments=[PlanInstallmentResponse.from_installment(item) for item in plan.installments],
        )


class PaymentPlanPreviewResponse(BaseModel):
    user_id: int
    member_name: str
    email: str
    debt_total: str
    monthly_fee: str
    installment_amount: str
    monthly_total: str
    start_period: str
    end_period: str
    regular_from_period: str
    debt_from_period: str
    debt_to_period: str
    schedule: list[PlanScheduleItemResponse]
    bank: PlanBankResponse

    @classmethod
    def from_domain(cls, preview: PaymentPlanPreview) -> "PaymentPlanPreviewResponse":
        return cls(
            user_id=preview.user_id,
            member_name=preview.member_name,
            email=preview.email,
            debt_total=money_str(preview.debt_total),
            monthly_fee=money_str(preview.monthly_fee),
            installment_amount=money_str(preview.installment_amount),
            monthly_total=money_str(preview.monthly_fee + preview.installment_amount),
            start_period=format_period(preview.start_period) or "",
            end_period=format_period(preview.end_period) or "",
            regular_from_period=format_period(add_months(preview.end_period, 1)) or "",
            debt_from_period=format_period(preview.debt_from_period) or "",
            debt_to_period=format_period(preview.debt_to_period) or "",
            schedule=[PlanScheduleItemResponse.from_domain(item) for item in preview.schedule],
            bank=PlanBankResponse(
                bank_name=preview.bank.bank_name,
                account_type=preview.bank.account_type,
                account_number=preview.bank.account_number,
            ),
        )


class CreatePaymentPlanRequest(BaseModel):
    installment_amount: Decimal
    start_period: str = Field(min_length=7, max_length=10)
    bank_name: str = Field(min_length=1, max_length=120)
    account_type: str = Field(min_length=1, max_length=20)
    account_number: str = Field(min_length=1, max_length=40)


class CreatePaymentPlanResponse(BaseModel):
    plan: PaymentPlanResponse
    email: str
    email_sent: bool
    message: str

    @classmethod
    def from_domain(cls, result: CreatePaymentPlanResult) -> "CreatePaymentPlanResponse":
        return cls(
            plan=PaymentPlanResponse.from_domain(result.plan),
            email=result.email,
            email_sent=result.email_sent,
            message=result.message,
        )


class PeriodInstallmentResponse(PlanInstallmentResponse):
    user_id: int
    member_name: str
    identifier: str
    plan_status: str
    bank: PlanBankResponse

    @classmethod
    def from_row(cls, row: PeriodInstallmentRow) -> "PeriodInstallmentResponse":
        base = PlanInstallmentResponse.from_installment(row.installment)
        return cls(
            **base.model_dump(),
            user_id=row.user_id,
            member_name=row.member_name,
            identifier=row.identifier,
            plan_status=row.plan_status,
            bank=PlanBankResponse(
                bank_name=row.bank_name,
                account_type=row.account_type,
                account_number=row.account_number,
            ),
        )


class PeriodInstallmentsResponse(BaseModel):
    period: str
    items: list[PeriodInstallmentResponse]
    total_amount: str


class ConfirmInstallmentsRequest(BaseModel):
    installment_ids: list[int] = Field(min_length=1, max_length=500)
    status: str


class ConfirmInstallmentsResponse(BaseModel):
    updated: int
    skipped: int
    items: list[PeriodInstallmentResponse]

    @classmethod
    def from_domain(cls, result: ConfirmInstallmentsResult) -> "ConfirmInstallmentsResponse":
        return cls(
            updated=result.updated,
            skipped=result.skipped,
            items=[PeriodInstallmentResponse.from_row(row) for row in result.items],
        )


class MyPaymentsResponse(BaseModel):
    items: list[PaymentItemResponse]
    open_payment: OpenPaymentResponse | None
    subscription: SubscriptionResponse | None
    payment_info: PaymentInfoResponse
    payment_plan: PaymentPlanResponse | None = None

    @classmethod
    def from_domain(cls, view: MyPaymentsView) -> "MyPaymentsResponse":
        return cls(
            items=[PaymentItemResponse.from_domain(item) for item in view.items],
            open_payment=OpenPaymentResponse.from_domain(view.open_payment) if view.open_payment else None,
            subscription=SubscriptionResponse.from_domain(view.subscription),
            payment_info=PaymentInfoResponse.from_domain(view.payment_info),
            payment_plan=PaymentPlanResponse.from_domain(view.payment_plan) if view.payment_plan else None,
        )
