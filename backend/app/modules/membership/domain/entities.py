from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


PENDING_ENABLE_STATE_ID = 2
ENABLED_STATE_ID = 1
MEMBER_ROLE_NAME = "miembro"
USER_MODEL_TYPE = r"App\Models\User"
CORPORATE_EMAIL_DOMAIN = "copsstec.com"

PAYMENT_PENDING = "pending_payment"
PAYMENT_REVIEW = "pending_review"
PAYMENT_APPROVED = "approved"

GATE_PAYMENT = "payment"
GATE_PENDING_APPROVAL = "pending_approval"
GATE_NONE = "none"

BLOOD_TYPES = (
    "A Rh+ (A positivo)",
    "A Rh- (A negativo)",
    "B Rh+ (B positivo)",
    "B Rh- (B negativo)",
    "O Rh+ (O positivo)",
    "O Rh- (O negativo)",
    "AB Rh+ (AB positivo)",
    "AB Rh- (AB negativo)",
)

GENDERS = ("Masculino", "Femenino")


def membership_gate_from_payment(state_id: int, payment_status: str | None, has_invoice: bool) -> str:
    if state_id == ENABLED_STATE_ID and payment_status == PAYMENT_APPROVED:
        return GATE_NONE
    if payment_status == PAYMENT_REVIEW:
        return GATE_PENDING_APPROVAL
    if payment_status == PAYMENT_PENDING or state_id == PENDING_ENABLE_STATE_ID:
        return GATE_PAYMENT
    _ = has_invoice
    return GATE_NONE


@dataclass(frozen=True)
class MembershipRegistrationData:
    names: str
    lastname: str
    identifier: str
    email: str
    birtday: str
    blood_type: str
    gender: str
    mobile_phone: str
    fixed_phone: str
    province: str
    city: str
    street_principal: str
    street_secondary: str
    title_academic: str
    cod_senescyt: str
    fourth_title: str
    codigo_senescyt_cuarto: str
    accept_birthday_notifications: bool
    accept_data_policy: bool


@dataclass(frozen=True)
class MembershipPayment:
    id: int
    user_id: int
    profile_id: int
    amount: Decimal
    currency: str
    bank_name: str
    account_type: str
    account_number: str
    account_holder: str
    account_ruc: str | None
    reference: str
    voucher_path: str | None
    status: str
    reviewed_by: int | None
    reviewed_at: datetime | None


@dataclass(frozen=True)
class MembershipInvoice:
    id: int
    payment_id: int
    user_id: int
    number: str
    amount: Decimal
    pdf_path: str
    issued_at: datetime


@dataclass(frozen=True)
class MembershipStatus:
    user_id: int
    state_id: int
    personal_email: str
    login_email: str
    payment_status: str | None
    gate: str
    must_complete_payment: bool
    must_wait_approval: bool
    has_invoice: bool
    names: str
    lastname: str
    identifier: str


@dataclass(frozen=True)
class BankTransferInfo:
    amount: Decimal
    currency: str
    bank_name: str
    account_type: str
    account_number: str
    account_holder: str
    account_ruc: str
    reference: str
    qr_payload: str


@dataclass(frozen=True)
class RegisteredMember:
    user_id: int
    profile_id: int
    name: str
    email: str
    state_id: int
    payment: MembershipPayment
