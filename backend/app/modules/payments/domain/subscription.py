from calendar import monthrange
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

MONTHLY_FEE = Decimal("10.00")
YEARLY_FEE = Decimal("120.00")
GRACE_DAYS = 5

GATE_SUBSCRIPTION_DUE = "subscription_due"
GATE_NONE = "none"

PLAN_MONTHLY = "monthly"
PLAN_YEARLY = "yearly"

STATUS_PENDING_PAYMENT = "pending_payment"
STATUS_PENDING_REVIEW = "pending_review"
STATUS_APPROVED = "approved"
STATUS_REJECTED = "rejected"

OPEN_PAYMENT_STATUSES = (STATUS_PENDING_PAYMENT, STATUS_PENDING_REVIEW)

PAYMENT_TYPE_MEMBERSHIP = "membresía"
PAYMENT_TYPES = (
    "membresía",
    "curso",
    "carnet",
    "multa",
    "congreso",
    "reservaciones",
)
MEMBERSHIP_TYPE_ALIASES = {"membresía", "membresia"}

RENEWAL_REFERENCE = "Renovación de membresía"

SUBSCRIPTION_AL_DIA = "al_dia"
SUBSCRIPTION_GRACIA = "gracia"
SUBSCRIPTION_VENCIDA = "vencida"
SUBSCRIPTION_SIN_HISTORIAL = "sin_historial"

DATE_PATTERN = "%d/%m/%Y"
_TWO_PLACES = Decimal("0.01")


@dataclass(frozen=True)
class SubscriptionState:
    coverage_until: date | None
    credit_balance: Decimal


def money_str(value: Decimal | str | int | None) -> str:
    return f"{as_money(value):.2f}"


def as_money(value: Decimal | str | int | None) -> Decimal:
    if value is None or value == "":
        return Decimal("0.00")
    try:
        return Decimal(str(value)).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        raise ValueError("El valor de pago no es válido.") from None


def dollars_from_cents(total: str | int | None) -> Decimal:
    raw = str(total or "0").strip()
    try:
        cents = Decimal(raw)
    except (InvalidOperation, ValueError):
        return Decimal("0.00")
    return (cents / Decimal(100)).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)


def cents_from_dollars(amount: Decimal | str | int) -> str:
    dollars = as_money(amount)
    cents = int((dollars * 100).to_integral_value(rounding=ROUND_HALF_UP))
    return str(cents)


def parse_register_date(value: str) -> date:
    from datetime import datetime

    text = (value or "").strip()
    try:
        return date.fromisoformat(text)
    except ValueError:
        pass
    try:
        return datetime.strptime(text, DATE_PATTERN).date()
    except ValueError as exc:
        raise ValueError("La fecha de pago debe tener el formato DD/MM/YYYY.") from exc


def format_register_date(value: date) -> str:
    return value.strftime(DATE_PATTERN)


def is_membership_type(payment_type: str | None) -> bool:
    return (payment_type or "").strip().lower() in MEMBERSHIP_TYPE_ALIASES


def canonicalize_payment_type(payment_type: str) -> str:
    normalized = (payment_type or "").strip().lower()
    aliases = {
        "membresía": PAYMENT_TYPE_MEMBERSHIP,
        "membresia": PAYMENT_TYPE_MEMBERSHIP,
        "curso": "curso",
        "carnet": "carnet",
        "multa": "multa",
        "congreso": "congreso",
        "reservaciones": "reservaciones",
    }
    if normalized not in aliases:
        raise ValueError("Tipo de pago inválido.")
    return aliases[normalized]


def plan_from_amount(amount: Decimal) -> str | None:
    money = as_money(amount)
    if money == MONTHLY_FEE:
        return PLAN_MONTHLY
    if money == YEARLY_FEE:
        return PLAN_YEARLY
    return None


def amount_for_plan(plan: str) -> Decimal:
    normalized = (plan or "").strip().lower()
    if normalized == PLAN_MONTHLY:
        return MONTHLY_FEE
    if normalized == PLAN_YEARLY:
        return YEARLY_FEE
    raise ValueError("El plan debe ser monthly o yearly.")


def add_years(value: date, years: int) -> date:
    if years == 0:
        return value
    try:
        return value.replace(year=value.year + years)
    except ValueError:
        return value.replace(year=value.year + years, day=28)


def add_months(value: date, months: int) -> date:
    if months == 0:
        return value
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, monthrange(year, month)[1])
    return date(year, month, day)


def apply_payment(
    amount: Decimal,
    coverage_until: date | None,
    credit: Decimal,
    payment_date: date,
) -> SubscriptionState:
    credit_balance = as_money(credit) + as_money(amount)
    years = int(credit_balance // YEARLY_FEE)
    credit_balance -= years * YEARLY_FEE
    months = int(credit_balance // MONTHLY_FEE)
    credit_balance -= months * MONTHLY_FEE
    credit_balance = as_money(credit_balance)

    if coverage_until is not None and coverage_until >= payment_date:
        base = coverage_until
    else:
        base = payment_date

    coverage = add_months(add_years(base, years), months)
    return SubscriptionState(coverage_until=coverage, credit_balance=credit_balance)


def replay(payments: list[tuple[Decimal, date]]) -> SubscriptionState:
    state = SubscriptionState(coverage_until=None, credit_balance=Decimal("0.00"))
    for amount, payment_date in payments:
        state = apply_payment(amount, state.coverage_until, state.credit_balance, payment_date)
    return state


def days_overdue(coverage_until: date | None, today: date) -> int:
    if coverage_until is None:
        return 0
    return max((today - coverage_until).days, 0)


def subscription_status_label(coverage_until: date | None, today: date) -> str:
    if coverage_until is None:
        return SUBSCRIPTION_SIN_HISTORIAL
    if today <= coverage_until:
        return SUBSCRIPTION_AL_DIA
    if today <= coverage_until + timedelta(days=GRACE_DAYS):
        return SUBSCRIPTION_GRACIA
    return SUBSCRIPTION_VENCIDA


def is_coverage_expired(coverage_until: date | None, today: date) -> bool:
    return coverage_until is not None and today > coverage_until


def is_subscription_due(
    coverage_until: date | None,
    credit_balance: Decimal,
    today: date,
) -> bool:
    if coverage_until is None:
        return False
    return today > coverage_until + timedelta(days=GRACE_DAYS) and as_money(credit_balance) < MONTHLY_FEE


def apply_subscription_gate(
    affiliation_gate: str,
    coverage_until: date | None,
    credit_balance: Decimal,
    today: date,
) -> str:
    if affiliation_gate != GATE_NONE:
        return affiliation_gate
    if is_subscription_due(coverage_until, credit_balance, today):
        return GATE_SUBSCRIPTION_DUE
    return GATE_NONE
