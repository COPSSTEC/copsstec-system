from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, Response

from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import get_current_user, require_access
from app.modules.courses.application.use_cases import (
    AdminCourseUseCases,
    CourseFeedbackUseCase,
    CreateGuestInscriptionUseCase,
    CreateMemberInscriptionsUseCase,
    ListPublicCoursesUseCase,
    ManageCourseInscriptionsUseCase,
)
from app.modules.courses.domain.entities import (
    AttendanceRequiredError,
    CourseNotFoundError,
    CourseUnavailableError,
    DuplicateInscriptionError,
    FeedbackTokenInvalidError,
    InvalidPaymentReviewError,
    VoucherRequiredError,
)
from app.modules.courses.infrastructure.files import InvalidUploadError, LocalCourseFileStorage
from app.modules.courses.presentation.api.dependencies import (
    get_admin_course_use_cases,
    get_create_guest_inscription_use_case,
    get_create_member_inscriptions_use_case,
    get_feedback_use_case,
    get_file_storage,
    get_list_public_courses_use_case,
    get_manage_course_inscriptions_use_case,
)
from app.modules.courses.presentation.api.schemas import (
    AdminCourseResponse,
    AttendanceRequest,
    BulkActionResponse,
    CertificateResponse,
    CourseCreateRequest,
    CourseInscriptionResponse,
    CourseResponse,
    CourseUpdateRequest,
    FeedbackContextResponse,
    FeedbackLinkResponse,
    FeedbackSubmitRequest,
    GuestInscriptionResponse,
    MemberInscriptionsRequest,
    MemberOptionResponse,
    MessageResponse,
    PaymentRejectionRequest,
    SendCertificatesRequest,
)

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("/public", response_model=list[CourseResponse])
def list_public_courses(
    use_case: Annotated[
        ListPublicCoursesUseCase,
        Depends(get_list_public_courses_use_case),
    ],
) -> list[CourseResponse]:
    return [CourseResponse.from_domain(course) for course in use_case.execute()]


@router.get("/public/{course_id}", response_model=CourseResponse)
def get_public_course(
    course_id: int,
    use_case: Annotated[AdminCourseUseCases, Depends(get_admin_course_use_cases)],
) -> CourseResponse:
    try:
        course = use_case.get(course_id)
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.") from exc

    if course.state_id != 4:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no disponible.")

    return CourseResponse.from_domain(course)


@router.post(
    "/public/{course_id}/guest-inscriptions",
    response_model=GuestInscriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_guest_inscription(
    course_id: int,
    use_case: Annotated[
        CreateGuestInscriptionUseCase,
        Depends(get_create_guest_inscription_use_case),
    ],
    storage: Annotated[LocalCourseFileStorage, Depends(get_file_storage)],
    names: str = Form(...),
    email: str = Form(...),
    identifier: str = Form(...),
    cellphone: str | None = Form(default=None),
    country: str | None = Form(default=None),
    province: str | None = Form(default=None),
    city: str | None = Form(default=None),
    organization: str | None = Form(default=None),
    payment_reference: str | None = Form(default=None),
    voucher: UploadFile | None = File(default=None),
) -> GuestInscriptionResponse:
    try:
        voucher_path = await storage.save_voucher(voucher, course_id) if voucher else None
        inscription = use_case.execute(
            course_id=course_id,
            data={
                "names": names,
                "email": email,
                "identifier": identifier,
                "cellphone": cellphone,
                "country": country,
                "province": province,
                "city": city,
                "organization": organization,
                "payment_reference": payment_reference,
            },
            voucher_path=voucher_path,
        )
    except InvalidUploadError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except VoucherRequiredError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debes adjuntar el voucher de pago.") from exc
    except DuplicateInscriptionError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc) or "Ya existe una inscripción para este curso.",
        ) from exc
    except CourseUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no disponible.") from exc

    return GuestInscriptionResponse(
        id=inscription.id,
        course_id=inscription.course_id,
        state_id=inscription.state_id,
        message="Inscripción recibida correctamente.",
    )


@router.get("/admin", response_model=list[AdminCourseResponse])
def list_admin_courses(
    use_case: Annotated[AdminCourseUseCases, Depends(get_admin_course_use_cases)],
    _: Annotated[User, Depends(require_access("admin"))],
) -> list[AdminCourseResponse]:
    return [AdminCourseResponse(**course) for course in use_case.list()]


@router.post("/admin", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    request: CourseCreateRequest,
    use_case: Annotated[AdminCourseUseCases, Depends(get_admin_course_use_cases)],
    user: Annotated[User, Depends(require_access("admin"))],
) -> CourseResponse:
    return CourseResponse.from_domain(use_case.create(request.model_dump(), user.id))


@router.get("/admin/members", response_model=list[MemberOptionResponse])
def list_member_options(
    repository_use_case: Annotated[AdminCourseUseCases, Depends(get_admin_course_use_cases)],
    _: Annotated[User, Depends(require_access("admin"))],
    q: str | None = None,
) -> list[MemberOptionResponse]:
    return [
        MemberOptionResponse(**item)
        for item in repository_use_case.repository.list_member_options(q)
    ]


@router.get("/admin/{course_id}", response_model=CourseResponse)
def get_admin_course(
    course_id: int,
    use_case: Annotated[AdminCourseUseCases, Depends(get_admin_course_use_cases)],
    _: Annotated[User, Depends(require_access("admin"))],
) -> CourseResponse:
    try:
        return CourseResponse.from_domain(use_case.get(course_id))
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.") from exc


@router.put("/admin/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    request: CourseUpdateRequest,
    use_case: Annotated[AdminCourseUseCases, Depends(get_admin_course_use_cases)],
    _: Annotated[User, Depends(require_access("admin"))],
) -> CourseResponse:
    try:
        return CourseResponse.from_domain(use_case.update(course_id, request.model_dump()))
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.") from exc


@router.delete("/admin/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: int,
    use_case: Annotated[AdminCourseUseCases, Depends(get_admin_course_use_cases)],
    user: Annotated[User, Depends(require_access("admin"))],
) -> None:
    try:
        use_case.delete(course_id, user.id)
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.") from exc


@router.post("/admin/{course_id}/finish", response_model=CourseResponse)
def finish_course(
    course_id: int,
    use_case: Annotated[AdminCourseUseCases, Depends(get_admin_course_use_cases)],
    user: Annotated[User, Depends(require_access("admin"))],
) -> CourseResponse:
    try:
        return CourseResponse.from_domain(use_case.finish(course_id, user.id))
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.") from exc


@router.post("/admin/{course_id}/member-inscriptions", response_model=BulkActionResponse)
def create_member_inscriptions(
    course_id: int,
    request: MemberInscriptionsRequest,
    use_case: Annotated[
        CreateMemberInscriptionsUseCase,
        Depends(get_create_member_inscriptions_use_case),
    ],
    _: Annotated[User, Depends(require_access("admin"))],
) -> BulkActionResponse:
    try:
        result = use_case.execute(course_id, request.user_ids)
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.") from exc

    return BulkActionResponse(**result.__dict__)


@router.get("/admin/{course_id}/inscriptions", response_model=list[CourseInscriptionResponse])
def list_course_inscriptions(
    course_id: int,
    use_case: Annotated[
        ManageCourseInscriptionsUseCase,
        Depends(get_manage_course_inscriptions_use_case),
    ],
    _: Annotated[User, Depends(require_access("admin"))],
) -> list[CourseInscriptionResponse]:
    return [
        CourseInscriptionResponse.from_domain(inscription)
        for inscription in use_case.list(course_id)
    ]


@router.get("/admin/{course_id}/attendees-report", response_model=None)
def attendees_report(
    course_id: int,
    use_case: Annotated[
        ManageCourseInscriptionsUseCase,
        Depends(get_manage_course_inscriptions_use_case),
    ],
    _: Annotated[User, Depends(require_access("admin"))],
    format: str = "json",
) -> Response | list[CourseInscriptionResponse]:
    rows = [
        CourseInscriptionResponse.from_domain(inscription)
        for inscription in use_case.list(course_id)
    ]

    if format.lower() != "csv":
        return rows

    header = "id,names,email,identifier,participant_type,state_id,payment_state_id,attended,certificate_code\n"
    body = "".join(
        (
            f"{row.id},{row.names},{row.email},{row.identifier},{row.participant_type},"
            f"{row.state_id},{row.payment_state_id or ''},{bool(row.attended_at)},"
            f"{row.certificate_code or ''}\n"
        )
        for row in rows
    )

    return Response(
        content=header + body,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=curso-{course_id}-asistentes.csv"},
    )


@router.post("/admin/inscriptions/{inscription_id}/approve-payment", response_model=CourseInscriptionResponse)
def approve_payment(
    inscription_id: int,
    use_case: Annotated[
        ManageCourseInscriptionsUseCase,
        Depends(get_manage_course_inscriptions_use_case),
    ],
    user: Annotated[User, Depends(require_access("admin"))],
) -> CourseInscriptionResponse:
    try:
        return CourseInscriptionResponse.from_domain(
            use_case.approve_payment(inscription_id, user.id),
        )
    except InvalidPaymentReviewError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pudo aprobar el pago.") from exc


@router.post("/admin/inscriptions/{inscription_id}/reject-payment", response_model=CourseInscriptionResponse)
def reject_payment(
    inscription_id: int,
    request: PaymentRejectionRequest,
    use_case: Annotated[
        ManageCourseInscriptionsUseCase,
        Depends(get_manage_course_inscriptions_use_case),
    ],
    user: Annotated[User, Depends(require_access("admin"))],
) -> CourseInscriptionResponse:
    try:
        return CourseInscriptionResponse.from_domain(
            use_case.reject_payment(inscription_id, user.id, request.observation),
        )
    except InvalidPaymentReviewError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ingresa una observación válida.") from exc


@router.patch("/admin/inscriptions/{inscription_id}/attendance", response_model=CourseInscriptionResponse)
def update_attendance(
    inscription_id: int,
    request: AttendanceRequest,
    use_case: Annotated[
        ManageCourseInscriptionsUseCase,
        Depends(get_manage_course_inscriptions_use_case),
    ],
    _: Annotated[User, Depends(require_access("admin"))],
) -> CourseInscriptionResponse:
    try:
        return CourseInscriptionResponse.from_domain(
            use_case.update_attendance(inscription_id, request.attended),
        )
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inscripción no encontrada.") from exc


@router.post("/admin/inscriptions/{inscription_id}/certificate", response_model=CertificateResponse)
def generate_certificate(
    inscription_id: int,
    use_case: Annotated[
        ManageCourseInscriptionsUseCase,
        Depends(get_manage_course_inscriptions_use_case),
    ],
    _: Annotated[User, Depends(require_access("admin"))],
) -> CertificateResponse:
    try:
        return CertificateResponse.from_domain(use_case.generate_certificate(inscription_id))
    except AttendanceRequiredError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debes marcar asistencia antes de generar certificado.") from exc
    except CourseNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inscripción no encontrada.") from exc


@router.get("/admin/certificates/{certificate_id}/download")
def download_certificate(
    certificate_id: int,
    use_case: Annotated[
        ManageCourseInscriptionsUseCase,
        Depends(get_manage_course_inscriptions_use_case),
    ],
    _: Annotated[User, Depends(require_access("admin"))],
) -> FileResponse:
    certificate = use_case.repository.get_certificate(certificate_id)
    if certificate is None or not Path(certificate.pdf_path).exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificado no encontrado.")

    return FileResponse(
        certificate.pdf_path,
        media_type="application/pdf",
        filename=f"{certificate.certificate_code}.pdf",
    )


@router.post("/admin/{course_id}/certificates/send", response_model=BulkActionResponse)
def send_certificates(
    course_id: int,
    request: SendCertificatesRequest,
    use_case: Annotated[
        ManageCourseInscriptionsUseCase,
        Depends(get_manage_course_inscriptions_use_case),
    ],
    user: Annotated[User, Depends(require_access("admin"))],
) -> BulkActionResponse:
    result = use_case.send_certificates(course_id, request.inscription_ids, user.id)
    return BulkActionResponse(**result.__dict__)


@router.post("/admin/{course_id}/feedback-links/send", response_model=BulkActionResponse)
def send_feedback_links(
    course_id: int,
    request: SendCertificatesRequest,
    use_case: Annotated[
        ManageCourseInscriptionsUseCase,
        Depends(get_manage_course_inscriptions_use_case),
    ],
    _: Annotated[User, Depends(require_access("admin"))],
) -> BulkActionResponse:
    result = use_case.send_feedback_links(course_id, request.inscription_ids)
    return BulkActionResponse(**result.__dict__)


@router.post("/admin/inscriptions/{inscription_id}/feedback-link", response_model=FeedbackLinkResponse)
def generate_feedback_link(
    inscription_id: int,
    use_case: Annotated[
        ManageCourseInscriptionsUseCase,
        Depends(get_manage_course_inscriptions_use_case),
    ],
    _: Annotated[User, Depends(require_access("admin"))],
) -> FeedbackLinkResponse:
    try:
        token = use_case.generate_feedback_link(inscription_id)
    except AttendanceRequiredError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Solo asistentes pueden recibir encuesta.") from exc

    return FeedbackLinkResponse(token=token, url=f"/cursos/feedback/{token}")


@router.get("/feedback/{token}", response_model=FeedbackContextResponse)
def get_feedback_context(
    token: str,
    use_case: Annotated[CourseFeedbackUseCase, Depends(get_feedback_use_case)],
) -> FeedbackContextResponse:
    try:
        context = use_case.get_context(token)
    except FeedbackTokenInvalidError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link no disponible.") from exc

    return FeedbackContextResponse(
        course_title=context["title"],
        date_course=context["date_course"],
        participant_name=context["names"],
    )


@router.post("/feedback/{token}", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    token: str,
    request: FeedbackSubmitRequest,
    use_case: Annotated[CourseFeedbackUseCase, Depends(get_feedback_use_case)],
) -> MessageResponse:
    try:
        use_case.submit(token, request.model_dump())
    except FeedbackTokenInvalidError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link inválido o ya utilizado.") from exc

    return MessageResponse(message="Gracias por calificar tu experiencia.")
