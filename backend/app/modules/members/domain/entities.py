from dataclasses import dataclass, field
from datetime import datetime


ENABLED_STATE_ID = 1
DISABLED_STATE_ID = 3
DISAFFILIATED_STATE_ID = 16
BLOCKED_LOGIN_STATE_IDS = {DISABLED_STATE_ID, DISAFFILIATED_STATE_ID}
MEMBER_ROLE_NAME = "miembro"
USER_MODEL_TYPE = r"App\Models\User"

STATE_LABELS: dict[int, str] = {
    ENABLED_STATE_ID: "HABILITADO",
    2: "POR HABILITAR",
    DISABLED_STATE_ID: "DESHABILITADO",
    DISAFFILIATED_STATE_ID: "DESAFILIADO",
}

PROFILE_TYPE_OPTIONS: tuple[str, ...] = ("miembro", "fundador", "directivo")

COMMISSION_OPTIONS: dict[str, str] = {
    "NA": "Ninguna",
    "TV": "CANAL DIGITAL COPSSTEC TV",
    "INT": "RELACIONES INTERNACIONALES",
    "MRT": "MÉRITOS Y RECONOCIMIENTOS",
    "ETC": "ÉTICA Y HONOR",
    "INV": "INVESTIGACIÓN E INNOVACIÓN",
    "SST": "REVISTA SST ECUADOR",
    "EDU": "CAPACITACIÓN Y EDUCACIÓN",
}


@dataclass(frozen=True)
class MemberColumn:
    id: str
    label: str
    source: str
    default_visible: bool
    sortable: bool = True
    filterable: bool = True
    filter_type: str = "text"


MEMBER_COLUMNS: tuple[MemberColumn, ...] = (
    MemberColumn("member", "Miembro", "profiles.names,profiles.lastname,profiles.foto_id", True, filterable=True),
    MemberColumn("lastname", "Apellidos", "profiles.lastname", False),
    MemberColumn("identifier", "Cédula", "profiles.identifier", True),
    MemberColumn("contacts", "Contactos", "profiles.email,profiles.mobile_phone", True, sortable=False),
    MemberColumn("birtday", "Fecha de cumpleaños", "profiles.birtday", True, filter_type="date-range"),
    MemberColumn("state", "Estado", "users.state_id", True, filter_type="text"),
    MemberColumn("date_register", "Fecha de registro", "profiles.date_register", True, filter_type="date-range"),
    MemberColumn("login_email", "Correo de acceso", "users.email", False),
    MemberColumn("blood_type", "Tipo de sangre", "profiles.blood_type", False),
    MemberColumn("title_academic", "Título académico", "profiles.title_academic", False),
    MemberColumn("level_academic", "Nivel académico", "profiles.level_academic", False),
    MemberColumn("gender", "Género", "profiles.gender", False),
    MemberColumn("province", "Provincia", "profiles.province", False),
    MemberColumn("city", "Ciudad", "profiles.city", False),
    MemberColumn("fixed_phone", "Teléfono fijo", "profiles.fixed_phone", False),
    MemberColumn("cod_senescyt", "Código Senescyt", "profiles.cod_senescyt", False),
    MemberColumn("last_conexion", "Última conexión", "users.last_conexion", False, filterable=False),
)


@dataclass(frozen=True)
class Member:
    user_id: int
    profile_id: int | None
    name: str
    login_email: str
    state_id: int
    state_label: str
    last_conexion: datetime | None
    names: str
    lastname: str
    identifier: str
    email: str
    birtday: str
    blood_type: str
    mobile_phone: str
    fixed_phone: str
    title_academic: str
    level_academic: str
    cod_senescyt: str
    date_register: str
    linkdink: str
    want_notifications: bool
    is_work: bool
    foto_id: str
    province: str | None
    city: str | None
    street_principal: str | None
    street_secondary: str | None
    type_profile: str | None
    date_exit: str | None
    fourth_title: str | None
    type_commision: str | None
    codigo_senescyt_cuarto: str | None
    cod: str | None
    gender: str | None
    created_at: datetime | None = None


@dataclass(frozen=True)
class MemberListResult:
    items: list[Member]
    total: int
    page: int
    page_size: int
    columns: tuple[MemberColumn, ...] = field(default=MEMBER_COLUMNS)


@dataclass(frozen=True)
class MemberListQuery:
    page: int = 1
    page_size: int = 15
    q: str | None = None
    names: str | None = None
    lastname: str | None = None
    identifier: str | None = None
    email: str | None = None
    date_register_from: str | None = None
    date_register_to: str | None = None
    birthday_from: str | None = None
    birthday_to: str | None = None
    state_id: int | None = None
    blood_type: str | None = None
    title_academic: str | None = None
    level_academic: str | None = None
    gender: str | None = None
    province: str | None = None
    city: str | None = None
    fixed_phone: str | None = None
    cod_senescyt: str | None = None
    login_email: str | None = None
    sort_by: str = "names"
    sort_dir: str = "asc"


@dataclass(frozen=True)
class MemberWriteData:
    names: str
    lastname: str
    identifier: str
    email: str
    login_email: str
    birtday: str
    mobile_phone: str
    date_register: str
    blood_type: str = ""
    fixed_phone: str = ""
    title_academic: str = ""
    level_academic: str = ""
    cod_senescyt: str = ""
    linkdink: str = ""
    want_notifications: bool = True
    is_work: bool = False
    foto_id: str = ""
    province: str | None = None
    city: str | None = None
    street_principal: str | None = None
    street_secondary: str | None = None
    type_profile: str | None = "miembro"
    fourth_title: str | None = None
    type_commision: str | None = None
    codigo_senescyt_cuarto: str | None = None
    gender: str | None = None
    state_id: int = ENABLED_STATE_ID


@dataclass(frozen=True)
class ProfileSelfUpdate:
    names: str | None = None
    lastname: str | None = None
    identifier: str | None = None
    email: str | None = None
    birtday: str | None = None
    blood_type: str | None = None
    mobile_phone: str | None = None
    fixed_phone: str | None = None
    title_academic: str | None = None
    level_academic: str | None = None
    cod_senescyt: str | None = None
    linkdink: str | None = None
    want_notifications: bool | None = None
    is_work: bool | None = None
    province: str | None = None
    city: str | None = None
    street_principal: str | None = None
    street_secondary: str | None = None
    fourth_title: str | None = None
    codigo_senescyt_cuarto: str | None = None
    gender: str | None = None
