from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.modules.dashboard.domain.entities import (
    AdminDashboardSnapshot,
    DashboardCards,
    DemographicsSnapshot,
    FeedBlog,
    FeedCourse,
    FeedDocument,
    FeedJob,
    FeedNotice,
    IncomeMonth,
    IncomeSnapshot,
    LabelCount,
    MemberDashboardSnapshot,
    PaymentStatusTotals,
    PendingApproval,
    TitlesSnapshot,
    UpcomingDue,
)
from app.modules.payments.domain.subscription import money_str


def _percent(value: Decimal | None) -> float | None:
    if value is None:
        return None
    return float(value)


class LabelCountResponse(BaseModel):
    label: str
    count: int

    @classmethod
    def from_domain(cls, item: LabelCount) -> "LabelCountResponse":
        return cls(label=item.label, count=item.count)


class DashboardCardsResponse(BaseModel):
    active: int
    inactive: int
    technical: int
    medical: int
    active_mom_percent: float | None
    inactive_mom_percent: float | None

    @classmethod
    def from_domain(cls, cards: DashboardCards) -> "DashboardCardsResponse":
        return cls(
            active=cards.active,
            inactive=cards.inactive,
            technical=cards.technical,
            medical=cards.medical,
            active_mom_percent=_percent(cards.active_mom_percent),
            inactive_mom_percent=_percent(cards.inactive_mom_percent),
        )


class PaymentStatusResponse(BaseModel):
    al_dia: int
    pendiente: int

    @classmethod
    def from_domain(cls, payments: PaymentStatusTotals) -> "PaymentStatusResponse":
        return cls(al_dia=payments.al_dia, pendiente=payments.pendiente)


class IncomeMonthResponse(BaseModel):
    month: int
    memberships: str
    courses: str
    reservations: str

    @classmethod
    def from_domain(cls, item: IncomeMonth) -> "IncomeMonthResponse":
        return cls(
            month=item.month,
            memberships=money_str(item.memberships),
            courses=money_str(item.courses),
            reservations=money_str(item.reservations),
        )


class IncomeResponse(BaseModel):
    year: int
    available_years: list[int]
    months: list[IncomeMonthResponse]

    @classmethod
    def from_domain(cls, income: IncomeSnapshot) -> "IncomeResponse":
        return cls(
            year=income.year,
            available_years=income.available_years,
            months=[IncomeMonthResponse.from_domain(item) for item in income.months],
        )


class DemographicsResponse(BaseModel):
    gender: list[LabelCountResponse]
    province: list[LabelCountResponse]
    city: list[LabelCountResponse]
    age_range: list[LabelCountResponse]
    blood_type: list[LabelCountResponse]
    profile_type: list[LabelCountResponse]

    @classmethod
    def from_domain(cls, demographics: DemographicsSnapshot) -> "DemographicsResponse":
        return cls(
            gender=[LabelCountResponse.from_domain(item) for item in demographics.gender],
            province=[LabelCountResponse.from_domain(item) for item in demographics.province],
            city=[LabelCountResponse.from_domain(item) for item in demographics.city],
            age_range=[LabelCountResponse.from_domain(item) for item in demographics.age_range],
            blood_type=[LabelCountResponse.from_domain(item) for item in demographics.blood_type],
            profile_type=[LabelCountResponse.from_domain(item) for item in demographics.profile_type],
        )


class TitlesResponse(BaseModel):
    third_level: int
    fourth_level: int
    both: int
    none: int
    top_third: list[LabelCountResponse]
    top_fourth: list[LabelCountResponse]

    @classmethod
    def from_domain(cls, titles: TitlesSnapshot) -> "TitlesResponse":
        return cls(
            third_level=titles.third_level,
            fourth_level=titles.fourth_level,
            both=titles.both,
            none=titles.none,
            top_third=[LabelCountResponse.from_domain(item) for item in titles.top_third],
            top_fourth=[LabelCountResponse.from_domain(item) for item in titles.top_fourth],
        )


class PendingApprovalResponse(BaseModel):
    user_id: int
    names: str
    lastname: str
    identifier: str
    email: str
    date_register: str

    @classmethod
    def from_domain(cls, item: PendingApproval) -> "PendingApprovalResponse":
        return cls(
            user_id=item.user_id,
            names=item.names,
            lastname=item.lastname,
            identifier=item.identifier,
            email=item.email,
            date_register=item.date_register,
        )


class FeedNoticeResponse(BaseModel):
    id: int
    title: str
    excerpt: str
    description: str
    image: str
    importance: str
    published_at: datetime | None

    @classmethod
    def from_domain(cls, item: FeedNotice) -> "FeedNoticeResponse":
        return cls(
            id=item.id,
            title=item.title,
            excerpt=item.excerpt,
            description=item.description,
            image=item.image,
            importance=item.importance,
            published_at=item.published_at,
        )


class FeedBlogResponse(BaseModel):
    id: int
    title: str
    excerpt: str
    image: str
    created_at: datetime | None

    @classmethod
    def from_domain(cls, item: FeedBlog) -> "FeedBlogResponse":
        return cls(
            id=item.id,
            title=item.title,
            excerpt=item.excerpt,
            image=item.image,
            created_at=item.created_at,
        )


class FeedCourseResponse(BaseModel):
    id: int
    title: str
    image: str
    date_course: str
    type_modality: str | None
    location: str

    @classmethod
    def from_domain(cls, item: FeedCourse) -> "FeedCourseResponse":
        return cls(
            id=item.id,
            title=item.title,
            image=item.image,
            date_course=item.date_course,
            type_modality=item.type_modality,
            location=item.location,
        )


class FeedJobResponse(BaseModel):
    id: int
    title: str
    name_enterprise: str
    location: str
    type: str
    logo: str
    link: str

    @classmethod
    def from_domain(cls, item: FeedJob) -> "FeedJobResponse":
        return cls(
            id=item.id,
            title=item.title,
            name_enterprise=item.name_enterprise,
            location=item.location,
            type=item.type,
            logo=item.logo,
            link=item.link,
        )


class FeedDocumentResponse(BaseModel):
    document_key: str
    title: str
    file_path: str | None
    available: bool
    cover_path: str | None = None

    @classmethod
    def from_domain(cls, item: FeedDocument) -> "FeedDocumentResponse":
        return cls(
            document_key=item.document_key,
            title=item.title,
            file_path=item.file_path,
            available=item.available,
            cover_path=item.cover_path,
        )


class MemberDashboardResponse(BaseModel):
    notices: dict[str, list[FeedNoticeResponse]]
    blogs: list[FeedBlogResponse]
    courses: list[FeedCourseResponse]
    jobs: list[FeedJobResponse]
    documents: list[FeedDocumentResponse]

    @classmethod
    def from_domain(cls, snapshot: MemberDashboardSnapshot) -> "MemberDashboardResponse":
        return cls(
            notices={
                "high": [FeedNoticeResponse.from_domain(item) for item in snapshot.notices_high],
                "medium": [FeedNoticeResponse.from_domain(item) for item in snapshot.notices_medium],
                "low": [FeedNoticeResponse.from_domain(item) for item in snapshot.notices_low],
            },
            blogs=[FeedBlogResponse.from_domain(item) for item in snapshot.blogs],
            courses=[FeedCourseResponse.from_domain(item) for item in snapshot.courses],
            jobs=[FeedJobResponse.from_domain(item) for item in snapshot.jobs],
            documents=[FeedDocumentResponse.from_domain(item) for item in snapshot.documents],
        )


class UpcomingDueResponse(BaseModel):
    user_id: int
    names: str
    lastname: str
    coverage_until: str
    days_left: int

    @classmethod
    def from_domain(cls, item: UpcomingDue) -> "UpcomingDueResponse":
        return cls(
            user_id=item.user_id,
            names=item.names,
            lastname=item.lastname,
            coverage_until=item.coverage_until.isoformat(),
            days_left=item.days_left,
        )


class AdminDashboardResponse(BaseModel):
    cards: DashboardCardsResponse
    payments: PaymentStatusResponse
    income: IncomeResponse
    demographics: DemographicsResponse
    titles: TitlesResponse
    pending_approvals: list[PendingApprovalResponse]
    upcoming_dues: list[UpcomingDueResponse] = []

    @classmethod
    def from_domain(cls, snapshot: AdminDashboardSnapshot) -> "AdminDashboardResponse":
        return cls(
            cards=DashboardCardsResponse.from_domain(snapshot.cards),
            payments=PaymentStatusResponse.from_domain(snapshot.payments),
            income=IncomeResponse.from_domain(snapshot.income),
            demographics=DemographicsResponse.from_domain(snapshot.demographics),
            titles=TitlesResponse.from_domain(snapshot.titles),
            pending_approvals=[
                PendingApprovalResponse.from_domain(item) for item in snapshot.pending_approvals
            ],
            upcoming_dues=[UpcomingDueResponse.from_domain(item) for item in snapshot.upcoming_dues],
        )
