from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field

from app.modules.membership.domain.entities import (
    BankTransferInfo,
    MembershipPayment,
    MembershipStatus,
    RegisteredMember,
)


class MembershipStatusResponse(BaseModel):
    must_complete_payment: bool
    must_wait_approval: bool
    gate: str
    payment_status: str | None
    state_id: int
    personal_email: str
    login_email: str
    has_invoice: bool
    names: str = ""
    lastname: str = ""
    identifier: str = ""
    must_pay_subscription: bool = False
    coverage_until: str | None = None
    credit_balance: str = "0.00"
    days_overdue: int = 0
    open_payment_status: str | None = None

    @classmethod
    def from_domain(cls, status: MembershipStatus) -> "MembershipStatusResponse":
        coverage = status.coverage_until.isoformat() if status.coverage_until else None
        return cls(
            must_complete_payment=status.must_complete_payment,
            must_wait_approval=status.must_wait_approval,
            gate=status.gate,
            payment_status=status.payment_status,
            state_id=status.state_id,
            personal_email=status.personal_email,
            login_email=status.login_email,
            has_invoice=status.has_invoice,
            names=status.names,
            lastname=status.lastname,
            identifier=status.identifier,
            must_pay_subscription=status.must_pay_subscription,
            coverage_until=coverage,
            credit_balance=f"{status.credit_balance.quantize(Decimal('0.01')):.2f}",
            days_overdue=status.days_overdue,
            open_payment_status=status.open_payment_status,
        )


class PaymentInfoResponse(BaseModel):
    amount: Decimal
    currency: str
    bank_name: str
    account_type: str
    account_number: str
    account_holder: str
    account_ruc: str
    reference: str
    qr_payload: str

    @classmethod
    def from_domain(cls, info: BankTransferInfo) -> "PaymentInfoResponse":
        return cls(
            amount=info.amount,
            currency=info.currency,
            bank_name=info.bank_name,
            account_type=info.account_type,
            account_number=info.account_number,
            account_holder=info.account_holder,
            account_ruc=info.account_ruc,
            reference=info.reference,
            qr_payload=info.qr_payload,
        )


class PaymentResponse(BaseModel):
    id: int
    status: str
    voucher_path: str | None
    message: str

    @classmethod
    def from_domain(cls, payment: MembershipPayment, message: str) -> "PaymentResponse":
        return cls(
            id=payment.id,
            status=payment.status,
            voucher_path=payment.voucher_path,
            message=message,
        )


class RegisterUserResponse(BaseModel):
    id: int
    name: str
    email: str
    state_id: int


class RegisterMembershipResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: RegisterUserResponse
    payment: PaymentResponse

    @classmethod
    def from_domain(
        cls,
        member: RegisteredMember,
        access_token: str,
        message: str,
    ) -> "RegisterMembershipResponse":
        return cls(
            access_token=access_token,
            user=RegisterUserResponse(
                id=member.user_id,
                name=member.name,
                email=member.email,
                state_id=member.state_id,
            ),
            payment=PaymentResponse.from_domain(member.payment, message),
        )


class ApprovalPreviewResponse(BaseModel):
    user_id: int
    names: str
    lastname: str
    identifier: str
    personal_email: str
    suggested_corporate_email: str
    payment_status: str
    voucher_url: str | None
    amount: str


class ApproveMemberRequest(BaseModel):
    email_corp: EmailStr = Field(min_length=5)


class ApproveMemberResponse(BaseModel):
    message: str
    user_id: int
    login_email: str
    state_id: int
    approved_at: datetime | None = None
