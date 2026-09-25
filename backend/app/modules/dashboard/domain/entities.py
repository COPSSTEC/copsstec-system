from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from html import unescape
from re import sub


ENABLED_STATE_ID = 1
PENDING_ENABLE_STATE_ID = 2
DISABLED_STATE_ID = 3
DISAFFILIATED_STATE_ID = 16
INACTIVE_STATE_IDS = (DISABLED_STATE_ID, DISAFFILIATED_STATE_ID)
MEMBER_ROLE_NAME = "miembro"
USER_MODEL_TYPE = r"App\Models\User"
PAID_STATE_ID = 14

STATE_LABELS: dict[int, str] = {
    ENABLED_STATE_ID: "HABILITADO",
    PENDING_ENABLE_STATE_ID: "POR HABILITAR",
    DISABLED_STATE_ID: "DESHABILITADO",
    DISAFFILIATED_STATE_ID: "DESAFILIADO",
}

EXPORT_KEYS = (
    "active",
    "inactive",
    "technical",
    "medical",
    "payments",
    "debtors",
    "income",
    "gender",
    "province",
    "city",
    "age",
    "blood_type",
    "profile_type",
    "titles",
)

IDENTITY_HEADERS = ("nombres", "apellidos", "cedula", "correo")

INCOME_TYPE_MEMBERSHIP = "membresía"
INCOME_TYPE_COURSE = "curso"
INCOME_TYPE_RESERVATION = "reservaciones"

PAYMENT_GROUP_AL_DIA = "al_dia"
PAYMENT_GROUP_PENDIENTE = "pendiente"

TITLE_GROUP_BOTH = "ambos"
TITLE_GROUP_THIRD = "tercer_nivel"
TITLE_GROUP_FOURTH = "cuarto_nivel"
TITLE_GROUP_NONE = "ninguno"

PROFESSION_MEDICAL = "medico"
PROFESSION_TECHNICAL = "tecnico"

SIN_DATO = "Sin dato"

AGE_RANGE_ORDER = ("18-29", "30-39", "40-49", "50-59", "60+", SIN_DATO)


@dataclass(frozen=True)
class RosterMember:
    user_id: int
    state_id: int
    names: str
    lastname: str
    identifier: str
    email: str
    date_register: str
    gender: str
    province: str
    city: str
    birtday: str
    blood_type: str
    type_profile: str
    title_academic: str
    fourth_title: str
    coverage_until: date | None = None


@dataclass(frozen=True)
class IncomeCharge:
    names: str
    lastname: str
    identifier: str
    email: str
    tipo: str
    amount: Decimal
    fecha: str
    year: int | None
    month: int | None


@dataclass(frozen=True)
class PendingApproval:
    user_id: int
    names: str
    lastname: str
    identifier: str
    email: str
    date_register: str


@dataclass(frozen=True)
class LabelCount:
    label: str
    count: int


@dataclass(frozen=True)
class IncomeMonth:
    month: int
    memberships: Decimal
    courses: Decimal
    reservations: Decimal


@dataclass(frozen=True)
class DashboardCards:
    active: int
    inactive: int
    technical: int
    medical: int
    active_mom_percent: Decimal | None
    inactive_mom_percent: Decimal | None


@dataclass(frozen=True)
class PaymentStatusTotals:
    al_dia: int
    pendiente: int


@dataclass(frozen=True)
class IncomeSnapshot:
    year: int
    available_years: list[int]
    months: list[IncomeMonth]


@dataclass(frozen=True)
class DemographicsSnapshot:
    gender: list[LabelCount]
    province: list[LabelCount]
    city: list[LabelCount]
    age_range: list[LabelCount]
    blood_type: list[LabelCount]
    profile_type: list[LabelCount]


@dataclass(frozen=True)
class TitlesSnapshot:
    third_level: int
    fourth_level: int
    both: int
    none: int
    top_third: list[LabelCount]
    top_fourth: list[LabelCount]


@dataclass(frozen=True)
class UpcomingDue:
    user_id: int
    names: str
    lastname: str
    coverage_until: date
    days_left: int


@dataclass(frozen=True)
class AdminDashboardSnapshot:
    cards: DashboardCards
    payments: PaymentStatusTotals
    income: IncomeSnapshot
    demographics: DemographicsSnapshot
    titles: TitlesSnapshot
    pending_approvals: list[PendingApproval]
    upcoming_dues: list[UpcomingDue]


@dataclass(frozen=True)
class DashboardExport:
    filename: str
    headers: tuple[str, ...]
    rows: list[list[str]]


FEED_NOTICE_LIMIT = 12
FEED_ITEM_LIMIT = 6
VISIBLE_FEED_STATE_ID = 4


@dataclass(frozen=True)
class FeedNotice:
    id: int
    title: str
    excerpt: str
    description: str
    image: str
    importance: str
    published_at: datetime | None


@dataclass(frozen=True)
class FeedBlog:
    id: int
    title: str
    excerpt: str
    image: str
    created_at: datetime | None


@dataclass(frozen=True)
class FeedCourse:
    id: int
    title: str
    image: str
    date_course: str
    type_modality: str | None
    location: str


@dataclass(frozen=True)
class FeedJob:
    id: int
    title: str
    name_enterprise: str
    location: str
    type: str
    logo: str
    link: str


@dataclass(frozen=True)
class FeedDocument:
    document_key: str
    title: str
    file_path: str | None
    available: bool
    cover_path: str | None = None
    overlay_color: str = "#0f172a"
    overlay_opacity: int = 68


@dataclass(frozen=True)
class MemberDashboardSnapshot:
    notices_high: list[FeedNotice]
    notices_medium: list[FeedNotice]
    notices_low: list[FeedNotice]
    blogs: list[FeedBlog]
    courses: list[FeedCourse]
    jobs: list[FeedJob]
    documents: list[FeedDocument]


def feed_plain_text(html: str) -> str:
    text = sub(r"<[^>]+>", " ", html or "")
    text = unescape(text).replace("\xa0", " ")
    return sub(r"\s+", " ", text).strip()


def feed_excerpt(html: str, max_length: int = 220) -> str:
    text = feed_plain_text(html)
    if len(text) <= max_length:
        return text
    clipped = text[:max_length].rsplit(" ", 1)[0].strip()
    return f"{clipped}…"
