from __future__ import annotations

from dataclasses import dataclass

from app.core.config import get_settings
from app.modules.courses.domain.entities import (
    Course,
    CourseCertificate,
    CourseInscription,
    CourseNotFoundError,
    CourseUnavailableError,
    DuplicateInscriptionError,
    FeedbackTokenInvalidError,
    InvalidPaymentReviewError,
    VISIBLE_STATE_ID,
    VoucherRequiredError,
    AttendanceRequiredError,
)
from app.modules.courses.infrastructure.certificates import SimplePdfCertificateGenerator
from app.modules.courses.infrastructure.files import LocalCourseFileStorage
from app.modules.courses.infrastructure.notifications import EmailMessage, LogEmailNotifier
from app.modules.courses.infrastructure.repository import CourseRepository


def course_requires_payment(course: Course) -> bool:
    try:
        return float(course.value.replace(",", ".")) > 0
    except ValueError:
        return False


def _course_email_context(course: Course, inscription: CourseInscription, extra: dict | None = None) -> dict:
    dates = course.date_course
    if course.date_course_final:
        dates = f"{course.date_course} - {course.date_course_final}"
    payload = {
        "nombres": inscription.names,
        "course_title": course.title,
        "course_description": course.about,
        "capacitator": course.capacitator,
        "modality": course.type_modality or course.location,
        "date_course": dates,
        "hour_init": course.hour_init,
        "hour_final": course.hour_final,
        "course_link": course.link or "",
        "detail_url": f"{get_settings().frontend_origin}/cursos/{course.id}",
    }
    if extra:
        payload.update(extra)
    return payload


def _course_email(
    *,
    inscription: CourseInscription,
    course: Course | None,
    template_key: str,
    subject: str,
    body: str,
    extra: dict | None = None,
    attachment_path: str | None = None,
) -> EmailMessage:
    context = _course_email_context(course, inscription, extra) if course else {
        "nombres": inscription.names,
        **(extra or {}),
    }
    return EmailMessage(
        to=inscription.email,
        subject=subject,
        body=body,
        attachment_path=attachment_path,
        template_key=template_key,
        context=context,
    )


@dataclass(frozen=True)
class BulkResult:
    processed: int
    skipped: int
    errors: list[str]


class ListPublicCoursesUseCase:
    def __init__(self, repository: CourseRepository) -> None:
        self.repository = repository

    def execute(self) -> list[Course]:
        return self.repository.list_public_courses()


class GetPublicCourseUseCase:
    def __init__(self, repository: CourseRepository) -> None:
        self.repository = repository

    def execute(self, course_id: int) -> Course:
        course = self.repository.get_course(course_id)

        if course is None or course.state_id != VISIBLE_STATE_ID:
            raise CourseUnavailableError()

        return course


class AdminCourseUseCases:
    def __init__(self, repository: CourseRepository) -> None:
        self.repository = repository

    def list(self) -> list[dict]:
        return self.repository.list_admin_courses()

    def get(self, course_id: int) -> Course:
        course = self.repository.get_course(course_id)
        if course is None:
            raise CourseNotFoundError()

        return course

    def create(self, data: dict, created_by: int) -> Course:
        return self.repository.create_course(data, created_by)

    def update(self, course_id: int, data: dict) -> Course:
        course = self.repository.update_course(course_id, data)
        if course is None:
            raise CourseNotFoundError()

        return course

    def delete(self, course_id: int, deleted_by: int) -> None:
        deleted = self.repository.delete_course(course_id, deleted_by)
        if not deleted:
            raise CourseNotFoundError()

    def finish(self, course_id: int, user_id: int) -> Course:
        self.get(course_id)
        self.repository.finish_course(course_id, user_id)
        return self.get(course_id)


class CreateGuestInscriptionUseCase:
    def __init__(
        self,
        repository: CourseRepository,
        notifier: LogEmailNotifier,
    ) -> None:
        self.repository = repository
        self.notifier = notifier

    def execute(
        self,
        course_id: int,
        data: dict,
        voucher_path: str | None,
    ) -> CourseInscription:
        course = self.repository.get_course(course_id)

        if course is None or course.state_id != VISIBLE_STATE_ID:
            raise CourseUnavailableError()

        if course_requires_payment(course) and voucher_path is None:
            raise VoucherRequiredError()

        try:
            inscription = self.repository.create_guest_inscription(course, data, voucher_path)
        except ValueError as exc:
            raise DuplicateInscriptionError(str(exc)) from exc

        self.notifier.send(
            _course_email(
                inscription=inscription,
                course=course,
                template_key="course_inscription_received",
                subject=f"Inscripción recibida: {course.title}",
                body="Tu inscripción fue recibida. Si el curso requiere pago, será validado por administración.",
            ),
        )

        return inscription


class CreateMemberInscriptionsUseCase:
    def __init__(
        self,
        repository: CourseRepository,
        notifier: LogEmailNotifier,
    ) -> None:
        self.repository = repository
        self.notifier = notifier

    def execute(self, course_id: int, user_ids: list[int]) -> BulkResult:
        course = self.repository.get_course(course_id)
        if course is None:
            raise CourseNotFoundError()

        processed = 0
        skipped = 0
        errors: list[str] = []

        for user_id in user_ids:
            try:
                inscription = self.repository.create_member_inscription(course_id, user_id)
                processed += 1
                self.notifier.send(
                    _course_email(
                        inscription=inscription,
                        course=course,
                        template_key="course_inscription_confirmed",
                        subject=f"Inscripción confirmada: {course.title}",
                        body="Tu inscripción como miembro fue confirmada sin costo.",
                    ),
                )
            except ValueError as exc:
                skipped += 1
                errors.append(str(exc))

        return BulkResult(processed=processed, skipped=skipped, errors=errors)


class MemberCoursesUseCase:
    def __init__(
        self,
        repository: CourseRepository,
        notifier: LogEmailNotifier,
    ) -> None:
        self.repository = repository
        self.notifier = notifier

    def list_my_courses(self, user_id: int) -> list[dict]:
        return self.repository.list_member_courses(user_id)

    def list_available_courses(self, user_id: int) -> list[dict]:
        return self.repository.list_member_available_courses(user_id)

    def enroll_self(self, course_id: int, user_id: int) -> CourseInscription:
        course = self.repository.get_course(course_id)
        if course is None or course.state_id != VISIBLE_STATE_ID:
            raise CourseUnavailableError()

        try:
            inscription = self.repository.create_member_inscription(course_id, user_id)
        except ValueError as exc:
            raise DuplicateInscriptionError(str(exc)) from exc

        self.notifier.send(
            _course_email(
                inscription=inscription,
                course=course,
                template_key="course_inscription_confirmed",
                subject=f"Inscripción confirmada: {course.title}",
                body="Tu inscripción como miembro fue confirmada sin costo.",
            ),
        )

        return inscription

    def can_download_certificate(self, certificate_id: int, user_id: int) -> bool:
        return self.repository.certificate_belongs_to_member(certificate_id, user_id)


class ManageCourseInscriptionsUseCase:
    def __init__(
        self,
        repository: CourseRepository,
        notifier: LogEmailNotifier,
        storage: LocalCourseFileStorage,
        certificate_generator: SimplePdfCertificateGenerator,
    ) -> None:
        self.repository = repository
        self.notifier = notifier
        self.storage = storage
        self.certificate_generator = certificate_generator

    def list(self, course_id: int) -> list[CourseInscription]:
        return self.repository.list_inscriptions(course_id)

    def approve_payment(self, inscription_id: int, reviewed_by: int) -> CourseInscription:
        inscription = self.repository.approve_payment(inscription_id, reviewed_by)
        if inscription is None:
            raise InvalidPaymentReviewError()

        course = self.repository.get_course(inscription.course_id)
        self.notifier.send(
            _course_email(
                inscription=inscription,
                course=course,
                template_key="course_inscription_confirmed",
                subject="Pago aprobado",
                body=f"Tu pago fue aprobado para el curso {course.title if course else ''}.",
            ),
        )

        return inscription

    def reject_payment(
        self,
        inscription_id: int,
        reviewed_by: int,
        observation: str,
    ) -> CourseInscription:
        if not observation.strip():
            raise InvalidPaymentReviewError()

        inscription = self.repository.reject_payment(
            inscription_id=inscription_id,
            reviewed_by=reviewed_by,
            observation=observation.strip(),
        )
        if inscription is None:
            raise InvalidPaymentReviewError()

        course = self.repository.get_course(inscription.course_id)
        self.notifier.send(
            _course_email(
                inscription=inscription,
                course=course,
                template_key="course_payment_rejected",
                subject="Pago no validado",
                body=f"No fue posible validar tu pago. Observación: {observation.strip()}",
                extra={"observation": observation.strip()},
            ),
        )

        return inscription

    def update_attendance(self, inscription_id: int, attended: bool) -> CourseInscription:
        inscription = self.repository.update_attendance(inscription_id, attended)
        if inscription is None:
            raise CourseNotFoundError()

        return inscription

    def generate_certificate(self, inscription_id: int) -> CourseCertificate:
        inscription = self.repository.get_inscription(inscription_id)
        if inscription is None:
            raise CourseNotFoundError()
        if inscription.attended_at is None:
            raise AttendanceRequiredError()

        existing = self.repository.get_certificate_by_inscription(inscription_id)
        if existing is not None:
            return existing

        course = self.repository.get_course(inscription.course_id)
        if course is None:
            raise CourseNotFoundError()

        certificate_code = f"CUR-{course.id}-{inscription.id:06d}"
        pdf = self.certificate_generator.generate(course, inscription, certificate_code)
        pdf_path = self.storage.save_certificate_pdf(course.id, certificate_code, pdf)

        return self.repository.upsert_certificate(
            course_id=course.id,
            inscription_id=inscription.id,
            certificate_code=certificate_code,
            pdf_path=pdf_path,
        )

    def send_certificates(
        self,
        course_id: int,
        inscription_ids: list[int],
        sent_by: int,
    ) -> BulkResult:
        processed = 0
        skipped = 0
        errors: list[str] = []

        for inscription_id in inscription_ids:
            try:
                certificate = self.generate_certificate(inscription_id)
                inscription = self.repository.get_inscription(inscription_id)
                if inscription is None or inscription.course_id != course_id:
                    skipped += 1
                    continue

                course = self.repository.get_course(course_id)
                self.notifier.send(
                    _course_email(
                        inscription=inscription,
                        course=course,
                        template_key="course_certificate",
                        subject="Certificado de curso COPSSTEC",
                        body="Adjuntamos tu certificado de participación.",
                        attachment_path=certificate.pdf_path,
                    ),
                )
                self.repository.mark_certificate_sent(certificate.id, sent_by)
                processed += 1
            except Exception as exc:
                skipped += 1
                errors.append(f"Inscripción {inscription_id}: {exc}")

        return BulkResult(processed=processed, skipped=skipped, errors=errors)

    def generate_feedback_link(self, inscription_id: int) -> str:
        inscription = self.repository.get_inscription(inscription_id)
        if inscription is None or inscription.attended_at is None:
            raise AttendanceRequiredError()

        return self.repository.create_feedback_token(inscription_id)

    def send_feedback_links(
        self,
        course_id: int,
        inscription_ids: list[int],
    ) -> BulkResult:
        settings = get_settings()
        processed = 0
        skipped = 0
        errors: list[str] = []

        for inscription_id in inscription_ids:
            try:
                inscription = self.repository.get_inscription(inscription_id)
                if inscription is None or inscription.course_id != course_id:
                    skipped += 1
                    continue
                if inscription.attended_at is None:
                    skipped += 1
                    errors.append(f"Inscripción {inscription_id}: debe tener asistencia.")
                    continue

                token = self.repository.create_feedback_token(inscription_id)
                url = f"{settings.frontend_origin}/cursos/feedback/{token}"
                course = self.repository.get_course(course_id)
                self.notifier.send(
                    _course_email(
                        inscription=inscription,
                        course=course,
                        template_key="course_feedback",
                        subject="Califica tu experiencia en el curso",
                        body=f"Gracias por asistir. Califica tu experiencia aquí: {url}",
                        extra={"url": url},
                    ),
                )
                processed += 1
            except Exception as exc:
                skipped += 1
                errors.append(f"Inscripción {inscription_id}: {exc}")

        return BulkResult(processed=processed, skipped=skipped, errors=errors)


class CourseFeedbackUseCase:
    def __init__(self, repository: CourseRepository) -> None:
        self.repository = repository

    def get_context(self, token: str) -> dict:
        context = self.repository.get_feedback_context(token)
        if context is None or context.get("used_at") is not None:
            raise FeedbackTokenInvalidError()

        return context

    def submit(self, token: str, data: dict) -> None:
        submitted = self.repository.submit_feedback(token, data)
        if not submitted:
            raise FeedbackTokenInvalidError()
