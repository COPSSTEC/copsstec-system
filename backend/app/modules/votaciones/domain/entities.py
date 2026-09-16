from dataclasses import dataclass, field
from datetime import date, datetime


OPEN_STATUSES = ("en_preparacion", "publicada", "en_votacion")
CLOSED_STATUSES = ("cerrada", "finalizada")
ELECTION_STATUSES = OPEN_STATUSES + CLOSED_STATUSES
LIST_STATUSES = ("borrador", "activa", "suspendida", "retirada")
ELECTION_TYPES = ("lista_completa", "voto_por_cargos")

CALENDAR_KEYS: tuple[tuple[str, str, int], ...] = (
    ("convocatoria", "Convocatoria electoral", 1),
    ("inscripcion_listas", "Inscripción de listas", 2),
    ("revision_listas", "Revisión y validación de listas", 3),
    ("publicacion_listas", "Publicación de listas habilitadas", 4),
    ("campana", "Campaña electoral", 5),
    ("votacion", "Periodo de votación", 6),
    ("escrutinio", "Escrutinio y publicación de resultados", 7),
    ("inicio_gestion", "Inicio del periodo de gestión", 8),
    ("fin_gestion", "Fin del periodo de gestión", 9),
)

SINGLE_DATE_CALENDAR_KEYS = frozenset(
    {
        "convocatoria",
        "publicacion_listas",
        "inicio_gestion",
        "fin_gestion",
    }
)

DEFAULT_POSITIONS: tuple[str, ...] = (
    "Presidente",
    "Vicepresidente",
    "Secretario",
    "Tesorero",
    "Primer vocal",
    "Segundo vocal",
    "Tercer vocal",
)

MESSAGE_KEYS: tuple[tuple[str, str, str, str], ...] = (
    (
        "convocatoria",
        "Convocatoria electoral",
        "Convocatoria: {titulo}",
        "Estimado/a {nombre},\n\nSe ha iniciado el proceso electoral {titulo}.\nPeriodo de votación: {fecha_inicio} - {fecha_fin}.\n\nColegio Profesional COPSSTEC.",
    ),
    (
        "inicio_votacion",
        "Inicio de votación",
        "Ya puedes votar: {titulo}",
        "Estimado/a {nombre},\n\nEl proceso de votación de {titulo} ya está abierto.\nPuedes votar hasta el {fecha_fin}.\n\nIngresa al portal de votación.",
    ),
    (
        "recordatorio",
        "Recordatorio a votantes pendientes",
        "Aún puedes votar: {titulo}",
        "Estimado/a {nombre},\n\nAún no registramos tu voto en {titulo}.\nEl periodo cierra el {fecha_fin}.\n\nTu participación es importante.",
    ),
    (
        "confirmacion_voto",
        "Confirmación de voto recibido",
        "Hemos recibido tu voto",
        "Estimado/a {nombre},\n\nConfirmamos que tu voto en {titulo} fue registrado.\nGracias por participar.",
    ),
    (
        "cierre",
        "Cierre del proceso",
        "Proceso de votación finalizado",
        "Estimado/a {nombre},\n\nEl periodo de votación de {titulo} ha finalizado.",
    ),
    (
        "publicacion_resultados",
        "Publicación de resultados",
        "Resultados oficiales: {titulo}",
        "Estimado/a {nombre},\n\nYa puedes consultar los resultados oficiales de {titulo}.",
    ),
)

PAYMENT_LABELS = {
    "al_dia": "Al día",
    "gracia": "Al día",
    "vencida": "Pendiente",
    "sin_historial": "Pendiente",
}


@dataclass
class ElectionPosition:
    id: int
    election_id: int
    name: str
    sort_order: int
    is_active: bool = True
    photo_required: bool = True
    full_name_required: bool = True
    short_profile_required: bool = False
    profession_required: bool = True
    visible_to_members: bool = True


@dataclass
class CalendarEvent:
    id: int
    election_id: int
    event_key: str
    title: str
    starts_on: date | None
    ends_on: date | None
    sort_order: int


@dataclass
class ElectionCandidate:
    id: int
    list_id: int
    position_id: int
    position_name: str
    full_name: str
    profession: str
    short_profile: str
    photo_url: str | None
    sort_order: int


@dataclass
class ElectionList:
    id: int
    election_id: int
    name: str
    slogan: str
    color: str | None
    logo_url: str | None
    description: str
    work_plan_url: str | None
    work_plan_summary: str
    backing_document_url: str | None
    status: str
    sort_order: int
    candidates: list[ElectionCandidate] = field(default_factory=list)


@dataclass
class MessageTemplate:
    id: int
    election_id: int
    template_key: str
    title: str
    subject: str
    body: str
    channel_email: bool
    channel_portal: bool
    channel_internal: bool


@dataclass
class Election:
    id: int
    title: str
    subtitle: str
    tagline: str
    status: str
    voting_starts_on: date | None
    voting_ends_on: date | None
    term_starts_on: date | None
    term_ends_on: date | None
    calendar_public: bool
    work_plan_required: bool
    photo_required: bool
    accept_position_required: bool
    list_logo_enabled: bool
    list_color_required: bool
    backing_document_required: bool
    registration_deadline: date | None
    max_file_mb: int
    show_work_plan: bool
    show_all_photos: bool
    show_process_status: bool
    members_only: bool
    auto_publish_on_vote_start: bool
    publish_from: date | None
    publish_until: date | None
    logo_url: str | None
    banner_url: str | None
    primary_color: str
    secondary_color: str
    election_type: str
    one_vote_per_member: bool
    secret_vote: bool
    confirm_vote: bool
    allow_blank_vote: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None
    positions: list[ElectionPosition] = field(default_factory=list)
    calendar: list[CalendarEvent] = field(default_factory=list)
    templates: list[MessageTemplate] = field(default_factory=list)


@dataclass(frozen=True)
class ElectionSummary:
    id: int
    title: str
    status: str
    voting_starts_on: date | None
    voting_ends_on: date | None
    term_starts_on: date | None
    term_ends_on: date | None
    is_open: bool


@dataclass(frozen=True)
class GuideStep:
    key: str
    label: str
    href: str
    done: bool


@dataclass
class ElectionVoter:
    user_id: int
    names: str
    lastname: str
    identifier: str
    member_code: str
    profession: str
    email: str
    photo_url: str | None
    last_access: datetime | None
    payment_status: str
    voting_enabled: bool
    has_voted: bool
    province: str
    city: str


@dataclass
class VoterListResult:
    items: list[ElectionVoter]
    total: int
    enabled_count: int
    disabled_count: int
    pending_payment_count: int
    padro_total: int


@dataclass
class VoteChoice:
    list_id: int | None
    position_id: int | None
    is_blank: bool


@dataclass
class ReportListRow:
    list_id: int | None
    name: str
    slogan: str
    color: str | None
    logo_url: str | None
    principal_name: str
    votes: int
    percentage: float
    result_status: str


@dataclass
class ReportTimelineItem:
    key: str
    title: str
    occurred_at: datetime | None
    detail: str
    tone: str


@dataclass
class ElectionReport:
    election_id: int
    title: str
    status: str
    eligible: int
    votes_cast: int
    participation: float
    blank_votes: int
    blank_percentage: float
    lists_count: int
    updated_at: datetime | None
    rows: list[ReportListRow]
    timeline: list[ReportTimelineItem]


@dataclass
class ElectionNotice:
    id: int
    title: str
    body: str
    created_at: datetime


@dataclass
class MemberPortal:
    election: Election
    lists: list[ElectionList]
    voting_enabled: bool
    has_voted: bool
    can_vote: bool
    notices: list[ElectionNotice] = field(default_factory=list)
