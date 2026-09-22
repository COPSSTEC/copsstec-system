import re
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP

from app.modules.dashboard.domain.entities import (
    AGE_RANGE_ORDER,
    INCOME_TYPE_COURSE,
    INCOME_TYPE_MEMBERSHIP,
    INCOME_TYPE_RESERVATION,
    PAYMENT_GROUP_AL_DIA,
    PAYMENT_GROUP_PENDIENTE,
    PROFESSION_MEDICAL,
    PROFESSION_TECHNICAL,
    SIN_DATO,
    TITLE_GROUP_BOTH,
    TITLE_GROUP_FOURTH,
    TITLE_GROUP_NONE,
    TITLE_GROUP_THIRD,
    LabelCount,
)
from app.modules.payments.domain.subscription import (
    SUBSCRIPTION_AL_DIA,
    SUBSCRIPTION_GRACIA,
    as_money,
    dollars_from_cents,
    subscription_status_label,
)

DATE_PATTERN = "%d/%m/%Y"
DATE_TEXT_RE = re.compile(r"^\d{2}/\d{2}/\d{4}$")
MEDICAL_TITLE_RE = re.compile(r"médic|medic|doctor|medicina", re.IGNORECASE)
_ONE_PLACE = Decimal("0.1")
MEMBERSHIP_TYPE_ALIASES = {"membresía", "membresia"}
AL_DIA_STATUSES = {SUBSCRIPTION_AL_DIA, SUBSCRIPTION_GRACIA}
GENDER_ALIASES = {
    "masculino": "Masculino",
    "hombre": "Masculino",
    "hombres": "Masculino",
    "m": "Masculino",
    "femenino": "Femenino",
    "mujer": "Femenino",
    "mujeres": "Femenino",
    "f": "Femenino",
}


def is_filled(value: str | None) -> bool:
    return bool((value or "").strip())


def display_label(value: str | None) -> str:
    text = (value or "").strip()
    return text if text else SIN_DATO


def normalize_gender(value: str | None) -> str:
    text = (value or "").strip()
    if not text:
        return SIN_DATO
    return GENDER_ALIASES.get(text.casefold(), text)


def normalize_title_label(value: str | None) -> str:
    text = " ".join((value or "").split())
    return text if text else SIN_DATO


def parse_legacy_date(value: str | None) -> date | None:
    text = (value or "").strip()
    if not DATE_TEXT_RE.match(text):
        return None
    try:
        return datetime.strptime(text, DATE_PATTERN).date()
    except ValueError:
        return None


def format_legacy_date(value: date) -> str:
    return value.strftime(DATE_PATTERN)


def age_on(birthday: date, today: date) -> int:
    years = today.year - birthday.year
    if (today.month, today.day) < (birthday.month, birthday.day):
        years -= 1
    return years


def age_from_birthday(birtday: str | None, today: date) -> int | None:
    parsed = parse_legacy_date(birtday)
    if parsed is None:
        return None
    age = age_on(parsed, today)
    if age < 0:
        return None
    return age


def age_range_label(age: int | None) -> str:
    if age is None:
        return SIN_DATO
    if 18 <= age <= 29:
        return "18-29"
    if 30 <= age <= 39:
        return "30-39"
    if 40 <= age <= 49:
        return "40-49"
    if 50 <= age <= 59:
        return "50-59"
    if age >= 60:
        return "60+"
    return SIN_DATO


def is_medical_title(value: str | None) -> bool:
    return bool(MEDICAL_TITLE_RE.search((value or "").strip()))


def classify_profession(title_academic: str | None, fourth_title: str | None) -> str | None:
    if is_medical_title(title_academic) or is_medical_title(fourth_title):
        return PROFESSION_MEDICAL
    if is_filled(title_academic) or is_filled(fourth_title):
        return PROFESSION_TECHNICAL
    return None


def title_group(title_academic: str | None, fourth_title: str | None) -> str:
    has_third = is_filled(title_academic)
    has_fourth = is_filled(fourth_title)
    if has_third and has_fourth:
        return TITLE_GROUP_BOTH
    if has_third:
        return TITLE_GROUP_THIRD
    if has_fourth:
        return TITLE_GROUP_FOURTH
    return TITLE_GROUP_NONE


def split_profile_types(value: str | None) -> list[str]:
    parts = [part.strip() for part in (value or "").split(",") if part.strip()]
    return parts or [SIN_DATO]


def payment_status_group(coverage_until: date | None, today: date) -> str:
    label = subscription_status_label(coverage_until, today)
    if label in AL_DIA_STATUSES:
        return PAYMENT_GROUP_AL_DIA
    return PAYMENT_GROUP_PENDIENTE


def month_over_month_percent(current: int, previous: int) -> Decimal | None:
    if previous == 0:
        return None
    change = (Decimal(current - previous) / Decimal(previous)) * Decimal(100)
    return change.quantize(_ONE_PLACE, rounding=ROUND_HALF_UP)


def dollars_from_course_amount(raw: str | int | None) -> Decimal:
    text = str(raw or "0").strip()
    if "." in text:
        try:
            return as_money(text)
        except ValueError:
            return Decimal("0.00")
    return dollars_from_cents(text)


def canonicalize_income_type(payment_type: str | None) -> str | None:
    normalized = (payment_type or "").strip().lower()
    if normalized in MEMBERSHIP_TYPE_ALIASES:
        return INCOME_TYPE_MEMBERSHIP
    if normalized == INCOME_TYPE_COURSE:
        return INCOME_TYPE_COURSE
    if normalized == INCOME_TYPE_RESERVATION:
        return INCOME_TYPE_RESERVATION
    return None


def count_labels(values: list[str], *, sort_desc: bool = True) -> list[LabelCount]:
    counts: dict[str, int] = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    items = [LabelCount(label=label, count=count) for label, count in counts.items()]
    if sort_desc:
        items.sort(key=lambda item: (-item.count, item.label.casefold()))
    return items


def count_labels_ci(values: list[str]) -> list[LabelCount]:
    variants: dict[str, dict[str, int]] = {}
    for value in values:
        text = normalize_title_label(value)
        key = text.casefold()
        bucket = variants.setdefault(key, {})
        bucket[text] = bucket.get(text, 0) + 1
    items = [
        LabelCount(
            label=max(bucket.items(), key=lambda item: (item[1], -len(item[0])))[0],
            count=sum(bucket.values()),
        )
        for bucket in variants.values()
    ]
    items.sort(key=lambda item: (-item.count, item.label.casefold()))
    return items


def top_counts(items: list[LabelCount], limit: int = 10) -> list[LabelCount]:
    return items[:limit]


def age_range_counts(values: list[str]) -> list[LabelCount]:
    counts = {label: 0 for label in AGE_RANGE_ORDER}
    for value in values:
        if value in counts:
            counts[value] += 1
    return [
        LabelCount(label=label, count=counts[label])
        for label in AGE_RANGE_ORDER
        if counts[label] > 0
    ]


def city_counts(values: list[str], limit: int = 10) -> list[LabelCount]:
    ranked = count_labels(values)
    top: list[LabelCount] = []
    sin_dato: LabelCount | None = None
    for item in ranked:
        if item.label == SIN_DATO:
            sin_dato = item
            continue
        if len(top) < limit:
            top.append(item)
    if sin_dato is not None:
        top.append(sin_dato)
    return top


def previous_calendar_month(today: date) -> tuple[int, int]:
    if today.month == 1:
        return today.year - 1, 12
    return today.year, today.month - 1


def registered_in_month(date_register: str | None, year: int, month: int) -> bool:
    parsed = parse_legacy_date(date_register)
    return parsed is not None and parsed.year == year and parsed.month == month
