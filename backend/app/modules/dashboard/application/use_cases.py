from datetime import UTC, date, datetime
from decimal import Decimal

from app.modules.dashboard.application.ports import DashboardRepository
from app.modules.dashboard.domain.classification import (
    age_from_birthday,
    age_range_counts,
    age_range_label,
    canonicalize_income_type,
    city_counts,
    classify_profession,
    count_labels,
    count_labels_ci,
    display_label,
    normalize_gender,
    is_filled,
    month_over_month_percent,
    payment_status_group,
    previous_calendar_month,
    registered_in_month,
    split_profile_types,
    title_group,
    top_counts,
)
from app.modules.dashboard.domain.entities import (
    ENABLED_STATE_ID,
    EXPORT_KEYS,
    FEED_ITEM_LIMIT,
    FEED_NOTICE_LIMIT,
    IDENTITY_HEADERS,
    INACTIVE_STATE_IDS,
    INCOME_TYPE_COURSE,
    INCOME_TYPE_MEMBERSHIP,
    INCOME_TYPE_RESERVATION,
    PAYMENT_GROUP_AL_DIA,
    PROFESSION_MEDICAL,
    PROFESSION_TECHNICAL,
    STATE_LABELS,
    AdminDashboardSnapshot,
    DashboardCards,
    DashboardExport,
    DemographicsSnapshot,
    IncomeCharge,
    IncomeMonth,
    IncomeSnapshot,
    MemberDashboardSnapshot,
    PaymentStatusTotals,
    PendingApproval,
    RosterMember,
    TitlesSnapshot,
    UpcomingDue,
)
from app.modules.dashboard.domain.exceptions import InvalidDashboardExportKeyError
from app.modules.payments.domain.subscription import money_str, subscription_status_label


def _today() -> date:
    return date.today()


def _enabled(roster: list[RosterMember]) -> list[RosterMember]:
    return [member for member in roster if member.state_id == ENABLED_STATE_ID]


def _inactive(roster: list[RosterMember]) -> list[RosterMember]:
    return [member for member in roster if member.state_id in INACTIVE_STATE_IDS]


def _identity_row(member: RosterMember) -> list[str]:
    return [member.names, member.lastname, member.identifier, member.email]


def _coverage_label(coverage_until: date | None) -> str:
    return coverage_until.isoformat() if coverage_until else ""


def _state_label(state_id: int) -> str:
    return STATE_LABELS.get(state_id, str(state_id))


def _mom_for(members: list[RosterMember], today: date) -> Decimal | None:
    previous_year, previous_month = previous_calendar_month(today)
    current = sum(1 for member in members if registered_in_month(member.date_register, today.year, today.month))
    previous = sum(
        1 for member in members if registered_in_month(member.date_register, previous_year, previous_month)
    )
    return month_over_month_percent(current, previous)


def _payment_totals(enabled: list[RosterMember], today: date) -> PaymentStatusTotals:
    al_dia = 0
    pendiente = 0
    for member in enabled:
        if payment_status_group(member.coverage_until, today) == PAYMENT_GROUP_AL_DIA:
            al_dia += 1
        else:
            pendiente += 1
    return PaymentStatusTotals(al_dia=al_dia, pendiente=pendiente)


def _income_snapshot(charges: list[IncomeCharge], year: int) -> IncomeSnapshot:
    months = {
        month: {"memberships": Decimal("0.00"), "courses": Decimal("0.00"), "reservations": Decimal("0.00")}
        for month in range(1, 13)
    }
    years: set[int] = set()
    for charge in charges:
        if charge.year is not None:
            years.add(charge.year)
        if charge.year != year or charge.month is None:
            continue
        category = canonicalize_income_type(charge.tipo)
        bucket = months[charge.month]
        if category == INCOME_TYPE_MEMBERSHIP:
            bucket["memberships"] += charge.amount
        elif category == INCOME_TYPE_COURSE:
            bucket["courses"] += charge.amount
        elif category == INCOME_TYPE_RESERVATION:
            bucket["reservations"] += charge.amount
    return IncomeSnapshot(
        year=year,
        available_years=sorted(years),
        months=[
            IncomeMonth(
                month=month,
                memberships=values["memberships"],
                courses=values["courses"],
                reservations=values["reservations"],
            )
            for month, values in months.items()
        ],
    )


def _demographics(enabled: list[RosterMember], today: date) -> DemographicsSnapshot:
    profile_types: list[str] = []
    for member in enabled:
        profile_types.extend(split_profile_types(member.type_profile))
    return DemographicsSnapshot(
        gender=count_labels([normalize_gender(member.gender) for member in enabled]),
        province=count_labels([display_label(member.province) for member in enabled]),
        city=city_counts([display_label(member.city) for member in enabled]),
        age_range=age_range_counts(
            [age_range_label(age_from_birthday(member.birtday, today)) for member in enabled],
        ),
        blood_type=count_labels([display_label(member.blood_type) for member in enabled]),
        profile_type=count_labels(profile_types),
    )


def _titles(enabled: list[RosterMember]) -> TitlesSnapshot:
    third_level = 0
    fourth_level = 0
    both = 0
    none = 0
    third_titles: list[str] = []
    fourth_titles: list[str] = []
    for member in enabled:
        has_third = is_filled(member.title_academic)
        has_fourth = is_filled(member.fourth_title)
        if has_third:
            third_level += 1
            third_titles.append(member.title_academic.strip())
        if has_fourth:
            fourth_level += 1
            fourth_titles.append(member.fourth_title.strip())
        if has_third and has_fourth:
            both += 1
        if not has_third and not has_fourth:
            none += 1
    return TitlesSnapshot(
        third_level=third_level,
        fourth_level=fourth_level,
        both=both,
        none=none,
        top_third=top_counts(count_labels_ci(third_titles)),
        top_fourth=top_counts(count_labels_ci(fourth_titles)),
    )


def _upcoming_dues(enabled: list[RosterMember], today: date, limit: int = 5) -> list[UpcomingDue]:
    items: list[UpcomingDue] = []
    for member in enabled:
        if member.coverage_until is None:
            continue
        days_left = (member.coverage_until - today).days
        if days_left < -5 or days_left > 45:
            continue
        items.append(
            UpcomingDue(
                user_id=member.user_id,
                names=member.names,
                lastname=member.lastname,
                coverage_until=member.coverage_until,
                days_left=days_left,
            ),
        )
    items.sort(key=lambda item: (item.days_left, item.lastname, item.names))
    return items[:limit]


def build_snapshot(
    roster: list[RosterMember],
    charges: list[IncomeCharge],
    pending: list[PendingApproval],
    year: int,
    today: date,
) -> AdminDashboardSnapshot:
    enabled = _enabled(roster)
    inactive = _inactive(roster)
    technical = 0
    medical = 0
    for member in enabled:
        profession = classify_profession(member.title_academic, member.fourth_title)
        if profession == PROFESSION_MEDICAL:
            medical += 1
        elif profession == PROFESSION_TECHNICAL:
            technical += 1
    return AdminDashboardSnapshot(
        cards=DashboardCards(
            active=len(enabled),
            inactive=len(inactive),
            technical=technical,
            medical=medical,
            active_mom_percent=_mom_for(enabled, today),
            inactive_mom_percent=_mom_for(inactive, today),
        ),
        payments=_payment_totals(enabled, today),
        income=_income_snapshot(charges, year),
        demographics=_demographics(enabled, today),
        titles=_titles(enabled),
        pending_approvals=list(pending),
        upcoming_dues=_upcoming_dues(enabled, today),
    )


def _income_rows(charges: list[IncomeCharge], year: int) -> list[list[str]]:
    rows: list[list[str]] = []
    for charge in charges:
        if charge.year != year:
            continue
        rows.append(
            [
                charge.names,
                charge.lastname,
                charge.identifier,
                charge.email,
                charge.tipo,
                money_str(charge.amount),
                charge.fecha,
                str(charge.month) if charge.month is not None else "",
            ],
        )
    return rows


def build_export(
    export_key: str,
    roster: list[RosterMember],
    charges: list[IncomeCharge],
    year: int,
    today: date,
) -> DashboardExport:
    if export_key not in EXPORT_KEYS:
        raise InvalidDashboardExportKeyError()

    enabled = _enabled(roster)
    inactive = _inactive(roster)
    filename = f"dashboard-{export_key}.csv"
    headers = IDENTITY_HEADERS
    rows: list[list[str]] = []

    if export_key == "active":
        headers = IDENTITY_HEADERS + ("estado",)
        rows = [_identity_row(member) + [_state_label(member.state_id)] for member in enabled]
    elif export_key == "inactive":
        headers = IDENTITY_HEADERS + ("estado",)
        rows = [_identity_row(member) + [_state_label(member.state_id)] for member in inactive]
    elif export_key == "technical":
        headers = IDENTITY_HEADERS + ("titulo_tercer", "titulo_cuarto")
        rows = [
            _identity_row(member) + [member.title_academic, member.fourth_title]
            for member in enabled
            if classify_profession(member.title_academic, member.fourth_title) == PROFESSION_TECHNICAL
        ]
    elif export_key == "medical":
        headers = IDENTITY_HEADERS + ("titulo_tercer", "titulo_cuarto")
        rows = [
            _identity_row(member) + [member.title_academic, member.fourth_title]
            for member in enabled
            if classify_profession(member.title_academic, member.fourth_title) == PROFESSION_MEDICAL
        ]
    elif export_key == "payments":
        headers = IDENTITY_HEADERS + ("estado_pago", "coverage_until")
        rows = [
            _identity_row(member)
            + [
                subscription_status_label(member.coverage_until, today),
                _coverage_label(member.coverage_until),
            ]
            for member in enabled
        ]
    elif export_key == "debtors":
        headers = IDENTITY_HEADERS + ("estado_pago", "coverage_until")
        rows = [
            _identity_row(member)
            + [
                subscription_status_label(member.coverage_until, today),
                _coverage_label(member.coverage_until),
            ]
            for member in enabled
            if payment_status_group(member.coverage_until, today) != PAYMENT_GROUP_AL_DIA
        ]
    elif export_key == "income":
        filename = f"dashboard-income-{year}.csv"
        headers = IDENTITY_HEADERS + ("tipo", "monto", "fecha", "mes")
        rows = _income_rows(charges, year)
    elif export_key == "gender":
        headers = IDENTITY_HEADERS + ("genero",)
        rows = [_identity_row(member) + [normalize_gender(member.gender)] for member in enabled]
    elif export_key == "province":
        headers = IDENTITY_HEADERS + ("provincia",)
        rows = [_identity_row(member) + [display_label(member.province)] for member in enabled]
    elif export_key == "city":
        headers = IDENTITY_HEADERS + ("ciudad",)
        rows = [_identity_row(member) + [display_label(member.city)] for member in enabled]
    elif export_key == "age":
        headers = IDENTITY_HEADERS + ("edad", "rango")
        for member in enabled:
            age = age_from_birthday(member.birtday, today)
            rows.append(
                _identity_row(member)
                + ["" if age is None else str(age), age_range_label(age)],
            )
    elif export_key == "blood_type":
        headers = IDENTITY_HEADERS + ("tipo_sangre",)
        rows = [_identity_row(member) + [display_label(member.blood_type)] for member in enabled]
    elif export_key == "profile_type":
        headers = IDENTITY_HEADERS + ("tipo_perfil",)
        rows = [_identity_row(member) + [display_label(member.type_profile)] for member in enabled]
    elif export_key == "titles":
        headers = IDENTITY_HEADERS + ("titulo_tercer", "titulo_cuarto", "grupo")
        rows = [
            _identity_row(member)
            + [
                member.title_academic,
                member.fourth_title,
                title_group(member.title_academic, member.fourth_title),
            ]
            for member in enabled
        ]

    return DashboardExport(filename=filename, headers=headers, rows=rows)


class GetAdminDashboardUseCase:
    def __init__(self, repository: DashboardRepository) -> None:
        self.repository = repository

    def execute(self, year: int | None = None, today: date | None = None) -> AdminDashboardSnapshot:
        resolved_today = today or _today()
        resolved_year = resolved_today.year if year is None else year
        return build_snapshot(
            self.repository.list_roster(),
            self.repository.list_income_charges(),
            self.repository.list_pending_approvals(),
            resolved_year,
            resolved_today,
        )


class GetMemberDashboardUseCase:
    def __init__(self, repository: DashboardRepository) -> None:
        self.repository = repository

    def execute(self, now: datetime | None = None) -> MemberDashboardSnapshot:
        resolved_now = now or datetime.now(UTC).replace(tzinfo=None)
        notices = self.repository.list_published_notices(resolved_now, FEED_NOTICE_LIMIT)
        return MemberDashboardSnapshot(
            notices_high=[item for item in notices if item.importance == "alta"],
            notices_medium=[item for item in notices if item.importance == "media"],
            notices_low=[item for item in notices if item.importance == "baja"],
            blogs=self.repository.list_recent_blogs(FEED_ITEM_LIMIT),
            courses=self.repository.list_open_courses(FEED_ITEM_LIMIT),
            jobs=self.repository.list_open_jobs(FEED_ITEM_LIMIT),
            documents=self.repository.list_member_documents(),
        )


class ExportAdminDashboardUseCase:
    def __init__(self, repository: DashboardRepository) -> None:
        self.repository = repository

    def execute(
        self,
        export_key: str,
        year: int | None = None,
        today: date | None = None,
    ) -> DashboardExport:
        resolved_today = today or _today()
        resolved_year = resolved_today.year if year is None else year
        return build_export(
            export_key,
            self.repository.list_roster(),
            self.repository.list_income_charges(),
            resolved_year,
            resolved_today,
        )
