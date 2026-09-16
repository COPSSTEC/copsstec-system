from datetime import date, datetime

from pydantic import BaseModel, Field

from app.modules.votaciones.domain.entities import (
    CalendarEvent,
    Election,
    ElectionCandidate,
    ElectionList,
    ElectionNotice,
    ElectionPosition,
    ElectionReport,
    ElectionSummary,
    ElectionVoter,
    GuideStep,
    MemberPortal,
    MessageTemplate,
    ReportListRow,
    ReportTimelineItem,
    VoterListResult,
)


class PositionResponse(BaseModel):
    id: int
    election_id: int
    name: str
    sort_order: int
    is_active: bool
    photo_required: bool
    full_name_required: bool
    short_profile_required: bool
    profession_required: bool
    visible_to_members: bool

    @classmethod
    def from_domain(cls, item: ElectionPosition) -> "PositionResponse":
        return cls(**item.__dict__)


class CalendarEventResponse(BaseModel):
    id: int
    event_key: str
    title: str
    starts_on: date | None
    ends_on: date | None
    sort_order: int

    @classmethod
    def from_domain(cls, item: CalendarEvent) -> "CalendarEventResponse":
        return cls(
            id=item.id,
            event_key=item.event_key,
            title=item.title,
            starts_on=item.starts_on,
            ends_on=item.ends_on,
            sort_order=item.sort_order,
        )


class MessageTemplateResponse(BaseModel):
    id: int
    template_key: str
    title: str
    subject: str
    body: str
    channel_email: bool
    channel_portal: bool
    channel_internal: bool

    @classmethod
    def from_domain(cls, item: MessageTemplate) -> "MessageTemplateResponse":
        return cls(
            id=item.id,
            template_key=item.template_key,
            title=item.title,
            subject=item.subject,
            body=item.body,
            channel_email=item.channel_email,
            channel_portal=item.channel_portal,
            channel_internal=item.channel_internal,
        )


class CandidateResponse(BaseModel):
    id: int
    list_id: int
    position_id: int
    position_name: str
    full_name: str
    profession: str
    short_profile: str
    photo_url: str | None
    sort_order: int

    @classmethod
    def from_domain(cls, item: ElectionCandidate) -> "CandidateResponse":
        return cls(**item.__dict__)


class ListResponse(BaseModel):
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
    candidates: list[CandidateResponse]

    @classmethod
    def from_domain(cls, item: ElectionList) -> "ListResponse":
        return cls(
            id=item.id,
            election_id=item.election_id,
            name=item.name,
            slogan=item.slogan,
            color=item.color,
            logo_url=item.logo_url,
            description=item.description,
            work_plan_url=item.work_plan_url,
            work_plan_summary=item.work_plan_summary,
            backing_document_url=item.backing_document_url,
            status=item.status,
            sort_order=item.sort_order,
            candidates=[CandidateResponse.from_domain(c) for c in item.candidates],
        )


class GuideStepResponse(BaseModel):
    key: str
    label: str
    href: str
    done: bool

    @classmethod
    def from_domain(cls, item: GuideStep) -> "GuideStepResponse":
        return cls(key=item.key, label=item.label, href=item.href, done=item.done)


class ElectionSummaryResponse(BaseModel):
    id: int
    title: str
    status: str
    voting_starts_on: date | None
    voting_ends_on: date | None
    term_starts_on: date | None
    term_ends_on: date | None
    is_open: bool

    @classmethod
    def from_domain(cls, item: ElectionSummary) -> "ElectionSummaryResponse":
        return cls(
            id=item.id,
            title=item.title,
            status=item.status,
            voting_starts_on=item.voting_starts_on,
            voting_ends_on=item.voting_ends_on,
            term_starts_on=item.term_starts_on,
            term_ends_on=item.term_ends_on,
            is_open=item.is_open,
        )


class ElectionResponse(BaseModel):
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
    positions: list[PositionResponse]
    calendar: list[CalendarEventResponse]
    templates: list[MessageTemplateResponse]
    is_readonly: bool = False
    guide: list[GuideStepResponse] = Field(default_factory=list)
    periods: list[ElectionSummaryResponse] = Field(default_factory=list)

    @classmethod
    def from_domain(
        cls,
        item: Election,
        *,
        is_readonly: bool = False,
        guide: list[GuideStep] | None = None,
        periods: list[ElectionSummary] | None = None,
    ) -> "ElectionResponse":
        return cls(
            id=item.id,
            title=item.title,
            subtitle=item.subtitle,
            tagline=item.tagline,
            status=item.status,
            voting_starts_on=item.voting_starts_on,
            voting_ends_on=item.voting_ends_on,
            term_starts_on=item.term_starts_on,
            term_ends_on=item.term_ends_on,
            calendar_public=item.calendar_public,
            work_plan_required=item.work_plan_required,
            photo_required=item.photo_required,
            accept_position_required=item.accept_position_required,
            list_logo_enabled=item.list_logo_enabled,
            list_color_required=item.list_color_required,
            backing_document_required=item.backing_document_required,
            registration_deadline=item.registration_deadline,
            max_file_mb=item.max_file_mb,
            show_work_plan=item.show_work_plan,
            show_all_photos=item.show_all_photos,
            show_process_status=item.show_process_status,
            members_only=item.members_only,
            auto_publish_on_vote_start=item.auto_publish_on_vote_start,
            publish_from=item.publish_from,
            publish_until=item.publish_until,
            logo_url=item.logo_url,
            banner_url=item.banner_url,
            primary_color=item.primary_color,
            secondary_color=item.secondary_color,
            election_type=item.election_type,
            one_vote_per_member=item.one_vote_per_member,
            secret_vote=item.secret_vote,
            confirm_vote=item.confirm_vote,
            allow_blank_vote=item.allow_blank_vote,
            positions=[PositionResponse.from_domain(p) for p in item.positions],
            calendar=[CalendarEventResponse.from_domain(c) for c in item.calendar],
            templates=[MessageTemplateResponse.from_domain(t) for t in item.templates],
            is_readonly=is_readonly,
            guide=[GuideStepResponse.from_domain(s) for s in (guide or [])],
            periods=[ElectionSummaryResponse.from_domain(s) for s in (periods or [])],
        )


class ElectionWriteRequest(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    tagline: str | None = None
    status: str | None = None
    voting_starts_on: date | None = None
    voting_ends_on: date | None = None
    term_starts_on: date | None = None
    term_ends_on: date | None = None
    work_plan_required: bool | None = None
    photo_required: bool | None = None
    accept_position_required: bool | None = None
    list_logo_enabled: bool | None = None
    list_color_required: bool | None = None
    backing_document_required: bool | None = None
    registration_deadline: date | None = None
    max_file_mb: int | None = None
    show_work_plan: bool | None = None
    show_all_photos: bool | None = None
    show_process_status: bool | None = None
    members_only: bool | None = None
    auto_publish_on_vote_start: bool | None = None
    publish_from: date | None = None
    publish_until: date | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    election_type: str | None = None
    secret_vote: bool | None = None
    confirm_vote: bool | None = None
    allow_blank_vote: bool | None = None


class PositionWriteRequest(BaseModel):
    name: str | None = None
    is_active: bool | None = None
    photo_required: bool | None = None
    full_name_required: bool | None = None
    short_profile_required: bool | None = None
    profession_required: bool | None = None
    visible_to_members: bool | None = None
    sort_order: int | None = None


class ReorderRequest(BaseModel):
    ids: list[int]


class CalendarEventWrite(BaseModel):
    event_key: str
    title: str | None = None
    starts_on: date | None = None
    ends_on: date | None = None


class CalendarWriteRequest(BaseModel):
    events: list[CalendarEventWrite]


class PublishRequest(BaseModel):
    public: bool


class ListWriteRequest(BaseModel):
    name: str | None = None
    slogan: str | None = None
    color: str | None = None
    description: str | None = None
    work_plan_summary: str | None = None
    status: str | None = None
    sort_order: int | None = None


class CandidateWriteRequest(BaseModel):
    position_id: int
    full_name: str
    profession: str = ""
    short_profile: str = ""
    sort_order: int | None = None


class VoterToggleRequest(BaseModel):
    voting_enabled: bool


class VoterResponse(BaseModel):
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

    @classmethod
    def from_domain(cls, item: ElectionVoter) -> "VoterResponse":
        return cls(**item.__dict__)


class VoterListResponse(BaseModel):
    items: list[VoterResponse]
    total: int
    enabled_count: int
    disabled_count: int
    pending_payment_count: int
    padro_total: int

    @classmethod
    def from_domain(cls, item: VoterListResult) -> "VoterListResponse":
        return cls(
            items=[VoterResponse.from_domain(v) for v in item.items],
            total=item.total,
            enabled_count=item.enabled_count,
            disabled_count=item.disabled_count,
            pending_payment_count=item.pending_payment_count,
            padro_total=item.padro_total,
        )


class MessagesWriteRequest(BaseModel):
    templates: list[MessageTemplateResponse]


class MessageActionRequest(BaseModel):
    template_key: str
    email: str | None = None


class VoteChoiceRequest(BaseModel):
    position_id: int | None = None
    list_id: int | None = None
    is_blank: bool = False


class VoteRequest(BaseModel):
    list_id: int | None = None
    is_blank: bool = False
    choices: list[VoteChoiceRequest] = Field(default_factory=list)


class ReportRowResponse(BaseModel):
    list_id: int | None
    name: str
    slogan: str
    color: str | None
    logo_url: str | None
    principal_name: str
    votes: int
    percentage: float
    result_status: str

    @classmethod
    def from_domain(cls, item: ReportListRow) -> "ReportRowResponse":
        return cls(**item.__dict__)


class TimelineResponse(BaseModel):
    key: str
    title: str
    occurred_at: datetime | None
    detail: str
    tone: str

    @classmethod
    def from_domain(cls, item: ReportTimelineItem) -> "TimelineResponse":
        return cls(**item.__dict__)


class ReportResponse(BaseModel):
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
    rows: list[ReportRowResponse]
    timeline: list[TimelineResponse]

    @classmethod
    def from_domain(cls, item: ElectionReport) -> "ReportResponse":
        return cls(
            election_id=item.election_id,
            title=item.title,
            status=item.status,
            eligible=item.eligible,
            votes_cast=item.votes_cast,
            participation=item.participation,
            blank_votes=item.blank_votes,
            blank_percentage=item.blank_percentage,
            lists_count=item.lists_count,
            updated_at=item.updated_at,
            rows=[ReportRowResponse.from_domain(r) for r in item.rows],
            timeline=[TimelineResponse.from_domain(t) for t in item.timeline],
        )


class NoticeResponse(BaseModel):
    id: int
    title: str
    body: str
    created_at: datetime

    @classmethod
    def from_domain(cls, item: ElectionNotice) -> "NoticeResponse":
        return cls(**item.__dict__)


class MemberPortalResponse(BaseModel):
    election: ElectionResponse
    lists: list[ListResponse]
    voting_enabled: bool
    has_voted: bool
    can_vote: bool
    notices: list[NoticeResponse]

    @classmethod
    def from_domain(cls, item: MemberPortal) -> "MemberPortalResponse":
        return cls(
            election=ElectionResponse.from_domain(item.election),
            lists=[ListResponse.from_domain(lista) for lista in item.lists],
            voting_enabled=item.voting_enabled,
            has_voted=item.has_voted,
            can_vote=item.can_vote,
            notices=[NoticeResponse.from_domain(n) for n in item.notices],
        )


class MediaResponse(BaseModel):
    url: str


class MessageCountResponse(BaseModel):
    sent: int


class PublicCalendarResponse(BaseModel):
    public: bool
    election: ElectionResponse | None = None
