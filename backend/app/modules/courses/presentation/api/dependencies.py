from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.modules.courses.application.use_cases import (
    AdminCourseUseCases,
    CourseFeedbackUseCase,
    CreateGuestInscriptionUseCase,
    CreateMemberInscriptionsUseCase,
    ListPublicCoursesUseCase,
    ManageCourseInscriptionsUseCase,
)
from app.modules.courses.infrastructure.certificates import SimplePdfCertificateGenerator
from app.modules.courses.infrastructure.files import LocalCourseFileStorage
from app.modules.courses.infrastructure.notifications import LogEmailNotifier
from app.modules.courses.infrastructure.repository import CourseRepository


def get_course_repository(
    session: Annotated[Session, Depends(get_db_session)],
) -> CourseRepository:
    return CourseRepository(session)


def get_file_storage() -> LocalCourseFileStorage:
    return LocalCourseFileStorage()


def get_notifier() -> LogEmailNotifier:
    return LogEmailNotifier()


def get_certificate_generator() -> SimplePdfCertificateGenerator:
    return SimplePdfCertificateGenerator()


def get_list_public_courses_use_case(
    repository: Annotated[CourseRepository, Depends(get_course_repository)],
) -> ListPublicCoursesUseCase:
    return ListPublicCoursesUseCase(repository)


def get_admin_course_use_cases(
    repository: Annotated[CourseRepository, Depends(get_course_repository)],
) -> AdminCourseUseCases:
    return AdminCourseUseCases(repository)


def get_create_guest_inscription_use_case(
    repository: Annotated[CourseRepository, Depends(get_course_repository)],
    notifier: Annotated[LogEmailNotifier, Depends(get_notifier)],
) -> CreateGuestInscriptionUseCase:
    return CreateGuestInscriptionUseCase(repository, notifier)


def get_create_member_inscriptions_use_case(
    repository: Annotated[CourseRepository, Depends(get_course_repository)],
    notifier: Annotated[LogEmailNotifier, Depends(get_notifier)],
) -> CreateMemberInscriptionsUseCase:
    return CreateMemberInscriptionsUseCase(repository, notifier)


def get_manage_course_inscriptions_use_case(
    repository: Annotated[CourseRepository, Depends(get_course_repository)],
    notifier: Annotated[LogEmailNotifier, Depends(get_notifier)],
    storage: Annotated[LocalCourseFileStorage, Depends(get_file_storage)],
    certificate_generator: Annotated[
        SimplePdfCertificateGenerator,
        Depends(get_certificate_generator),
    ],
) -> ManageCourseInscriptionsUseCase:
    return ManageCourseInscriptionsUseCase(
        repository=repository,
        notifier=notifier,
        storage=storage,
        certificate_generator=certificate_generator,
    )


def get_feedback_use_case(
    repository: Annotated[CourseRepository, Depends(get_course_repository)],
) -> CourseFeedbackUseCase:
    return CourseFeedbackUseCase(repository)
