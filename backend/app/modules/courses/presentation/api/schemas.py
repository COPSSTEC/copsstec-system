from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.modules.courses.domain.entities import Course, CourseCertificate, CourseInscription


class CourseBase(BaseModel):
    state_id: int = 4
    title: str = Field(min_length=1)
    value: str = Field(pattern=r"^\d+([.,]\d{1,2})?$")
    location: str = Field(min_length=1)
    capacitator: str = Field(min_length=1)
    capacitator_about: str = Field(min_length=1)
    date_course: str = Field(min_length=1)
    hour_init: str = Field(min_length=1)
    hour_final: str = Field(min_length=1)
    about: str = Field(min_length=1)
    image: str = Field(min_length=1)
    date_course_final: str = Field(min_length=1)
    type_modality: str | None = None
    link: str | None = None


class CourseCreateRequest(CourseBase):
    pass


class CourseUpdateRequest(CourseBase):
    pass


class CourseResponse(CourseBase):
    id: int
    created_by: int
    deleted_at: str | None
    deleted_by: str | None
    created_at: datetime | None
    updated_at: datetime | None
    finished_at: datetime | None = None

    @classmethod
    def from_domain(cls, course: Course) -> "CourseResponse":
        return cls(**course.__dict__)


class AdminCourseResponse(CourseResponse):
    inscriptions_count: int = 0
    attendees_count: int = 0
    pending_payments_count: int = 0
    certificates_sent_count: int = 0


class GuestInscriptionResponse(BaseModel):
    id: int
    course_id: int
    state_id: int
    message: str


class MemberInscriptionsRequest(BaseModel):
    user_ids: list[int] = Field(min_length=1)


class BulkActionResponse(BaseModel):
    processed: int
    skipped: int
    errors: list[str]


class MemberOptionResponse(BaseModel):
    id: int
    name: str
    email: str
    names: str | None
    lastname: str | None
    identifier: str | None


class CourseInscriptionResponse(BaseModel):
    id: int
    course_id: int
    state_id: int
    participant_type: str
    user_id: int | None
    profile_id: int | None
    names: str
    email: str
    identifier: str
    cellphone: str | None
    country: str | None
    province: str | None
    city: str | None
    organization: str | None
    attended_at: datetime | None
    completed_at: datetime | None
    deleted_at: str | None
    deleted_by: str | None
    created_at: datetime | None
    updated_at: datetime | None
    payment_state_id: int | None
    voucher_path: str | None
    certificate_id: int | None
    certificate_code: str | None
    certificate_sent_at: datetime | None

    @classmethod
    def from_domain(
        cls,
        inscription: CourseInscription,
    ) -> "CourseInscriptionResponse":
        return cls(**inscription.__dict__)


class PaymentRejectionRequest(BaseModel):
    observation: str = Field(min_length=1)


class AttendanceRequest(BaseModel):
    attended: bool


class SendCertificatesRequest(BaseModel):
    inscription_ids: list[int] = Field(min_length=1)


class CertificateResponse(BaseModel):
    id: int
    course_id: int
    course_inscription_id: int
    certificate_code: str
    pdf_path: str
    sent_at: datetime | None
    sent_by: int | None
    created_at: datetime | None
    updated_at: datetime | None

    @classmethod
    def from_domain(cls, certificate: CourseCertificate) -> "CertificateResponse":
        return cls(**certificate.__dict__)


class FeedbackLinkResponse(BaseModel):
    url: str
    token: str


class FeedbackContextResponse(BaseModel):
    course_title: str
    date_course: str
    participant_name: str


class FeedbackSubmitRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    content_rating: int | None = Field(default=None, ge=1, le=5)
    instructor_rating: int | None = Field(default=None, ge=1, le=5)
    platform_rating: int | None = Field(default=None, ge=1, le=5)
    comments: str | None = Field(default=None, max_length=2000)


class MessageResponse(BaseModel):
    message: str
