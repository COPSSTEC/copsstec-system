from dataclasses import dataclass
from datetime import datetime


VISIBLE_STATE_ID = 4
HIDDEN_STATE_ID = 5
REJECTED_PAYMENT_STATE_ID = 7
PENDING_APPROVAL_STATE_ID = 8
REGISTERED_STATE_ID = 9
ATTENDED_STATE_ID = 11
PAID_STATE_ID = 14
CERTIFICATE_SENT_STATE_ID = 15


@dataclass(frozen=True)
class Course:
    id: int
    state_id: int
    created_by: int
    title: str
    value: str
    location: str
    capacitator: str
    capacitator_about: str
    date_course: str
    hour_init: str
    hour_final: str
    about: str
    image: str
    deleted_at: str | None
    deleted_by: str | None
    created_at: datetime | None
    updated_at: datetime | None
    date_course_final: str
    type_modality: str | None
    link: str | None
    finished_at: datetime | None = None


@dataclass(frozen=True)
class CourseInscription:
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
    payment_state_id: int | None = None
    voucher_path: str | None = None
    certificate_id: int | None = None
    certificate_code: str | None = None
    certificate_sent_at: datetime | None = None


@dataclass(frozen=True)
class CourseCertificate:
    id: int
    course_id: int
    course_inscription_id: int
    certificate_code: str
    pdf_path: str
    sent_at: datetime | None
    sent_by: int | None
    created_at: datetime | None
    updated_at: datetime | None


class CourseNotFoundError(Exception):
    pass


class CourseUnavailableError(Exception):
    pass


class DuplicateInscriptionError(Exception):
    pass


class VoucherRequiredError(Exception):
    pass


class InvalidPaymentReviewError(Exception):
    pass


class AttendanceRequiredError(Exception):
    pass


class FeedbackTokenInvalidError(Exception):
    pass
