from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, Response

from app.modules.auth.application.rbac import resolve_access_policy
from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import get_current_user, require_access
from app.modules.payments.application.use_cases import (
    ApprovePaymentUseCase,
    CreateAdminPaymentUseCase,
    CreatePaymentCommand,
    CreateRenewalUseCase,
    DeleteAdminPaymentUseCase,
    GetAdminMembershipDashboardUseCase,
    GetMemberPaymentsAdminUseCase,
    GetMyPaymentsUseCase,
    GetPaymentMediaUseCase,
    ListAdminPaymentsUseCase,
    RejectPaymentUseCase,
    UpdateAdminPaymentUseCase,
    UpdatePaymentCommand,
    UploadVoucherUseCase,
)
from app.modules.payments.domain.entities import AdminPaymentQuery, SubscriptionListQuery
from app.modules.payments.domain.exceptions import (
    PaymentConflictError,
    PaymentForbiddenError,
    PaymentNotFoundError,
    PaymentValidationError,
)
from app.modules.payments.infrastructure.files import InvalidPaymentFileError
from app.modules.payments.presentation.api.dependencies import (
    get_admin_membership_dashboard_use_case,
    get_approve_payment_use_case,
    get_create_admin_payment_use_case,
    get_create_renewal_use_case,
    get_delete_admin_payment_use_case,
    get_list_admin_payments_use_case,
    get_member_payments_admin_use_case,
    get_my_payments_use_case,
    get_payment_media_use_case,
    get_reject_payment_use_case,
    get_update_admin_payment_use_case,
    get_upload_voucher_use_case,
)
from app.modules.payments.presentation.api.schemas import (
    CreatePaymentRequest,
    MembershipDashboardResponse,
    MemberPaymentsResponse,
    MyPaymentsResponse,
    OpenPaymentResponse,
    PaymentItemResponse,
    PaymentListResponse,
    PaymentMutationResponse,
    RejectPaymentRequest,
    RenewalRequest,
)

router = APIRouter(prefix="/api/payments", tags=["payments"])


def _http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, PaymentNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se encontró el pago o el miembro.")
    if isinstance(exc, PaymentConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message)
    if isinstance(exc, PaymentValidationError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    if isinstance(exc, PaymentForbiddenError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=exc.message)
    if isinstance(exc, InvalidPaymentFileError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno.")


@router.get("/admin", response_model=PaymentListResponse)
def list_admin_payments(
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[ListAdminPaymentsUseCase, Depends(get_list_admin_payments_use_case)],
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    q: str | None = None,
    type: str | None = None,
    status: str | None = None,
    user_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort_by: str = "date_register",
    sort_dir: str = "desc",
) -> PaymentListResponse:
    result = use_case.execute(
        AdminPaymentQuery(
            page=page,
            page_size=page_size,
            q=q,
            payment_type=type,
            status=status,
            user_id=user_id,
            date_from=date_from,
            date_to=date_to,
            sort_by=sort_by,
            sort_dir=sort_dir,
        ),
    )
    return PaymentListResponse.from_domain(result)


@router.get("/admin/membership", response_model=MembershipDashboardResponse)
def admin_membership_dashboard(
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[GetAdminMembershipDashboardUseCase, Depends(get_admin_membership_dashboard_use_case)],
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    q: str | None = None,
    subscription_status: str | None = None,
) -> MembershipDashboardResponse:
    dashboard = use_case.execute(
        SubscriptionListQuery(
            page=page,
            page_size=page_size,
            q=q,
            subscription_status=subscription_status,
        ),
    )
    return MembershipDashboardResponse.from_domain(dashboard)


@router.get("/admin/members/{member_id}", response_model=MemberPaymentsResponse)
def admin_member_payments(
    member_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[GetMemberPaymentsAdminUseCase, Depends(get_member_payments_admin_use_case)],
) -> MemberPaymentsResponse:
    try:
        return MemberPaymentsResponse.from_domain(use_case.execute(member_id))
    except PaymentNotFoundError as exc:
        raise _http_error(exc) from exc


@router.post(
    "/admin/members/{member_id}",
    response_model=PaymentMutationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_admin_payment(
    member_id: int,
    request: CreatePaymentRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[CreateAdminPaymentUseCase, Depends(get_create_admin_payment_use_case)],
) -> PaymentMutationResponse:
    try:
        result = use_case.execute(
            CreatePaymentCommand(
                member_id=member_id,
                type=request.type,
                description=request.description,
                amount=request.amount,
                date_register=request.date_register,
            ),
        )
    except (PaymentNotFoundError, PaymentValidationError) as exc:
        raise _http_error(exc) from exc
    return PaymentMutationResponse.from_domain(result)


@router.put("/admin/{payment_id}", response_model=PaymentMutationResponse)
def update_admin_payment(
    payment_id: int,
    request: CreatePaymentRequest,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[UpdateAdminPaymentUseCase, Depends(get_update_admin_payment_use_case)],
) -> PaymentMutationResponse:
    try:
        result = use_case.execute(
            UpdatePaymentCommand(
                payment_id=payment_id,
                type=request.type,
                description=request.description,
                amount=request.amount,
                date_register=request.date_register,
            ),
        )
    except (PaymentNotFoundError, PaymentValidationError) as exc:
        raise _http_error(exc) from exc
    return PaymentMutationResponse.from_domain(result)


@router.delete("/admin/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_payment(
    payment_id: int,
    _: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[DeleteAdminPaymentUseCase, Depends(get_delete_admin_payment_use_case)],
) -> Response:
    try:
        use_case.execute(payment_id)
    except PaymentNotFoundError as exc:
        raise _http_error(exc) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/admin/{payment_id}/approve", response_model=PaymentMutationResponse)
def approve_payment(
    payment_id: int,
    current_user: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[ApprovePaymentUseCase, Depends(get_approve_payment_use_case)],
) -> PaymentMutationResponse:
    try:
        result = use_case.execute(payment_id, current_user.id)
    except (PaymentNotFoundError, PaymentValidationError, PaymentConflictError) as exc:
        raise _http_error(exc) from exc
    return PaymentMutationResponse.from_domain(result)


@router.post("/admin/{payment_id}/reject", response_model=PaymentMutationResponse)
def reject_payment(
    payment_id: int,
    request: RejectPaymentRequest,
    current_user: Annotated[User, Depends(require_access("admin"))],
    use_case: Annotated[RejectPaymentUseCase, Depends(get_reject_payment_use_case)],
) -> PaymentMutationResponse:
    try:
        result = use_case.execute(payment_id, current_user.id, request.observation)
    except (PaymentNotFoundError, PaymentValidationError) as exc:
        raise _http_error(exc) from exc
    return PaymentMutationResponse.from_domain(result)


@router.get("/me", response_model=MyPaymentsResponse)
def my_payments(
    user: Annotated[User, Depends(require_access("member"))],
    use_case: Annotated[GetMyPaymentsUseCase, Depends(get_my_payments_use_case)],
) -> MyPaymentsResponse:
    return MyPaymentsResponse.from_domain(use_case.execute(user.id))


@router.post("/me/renewals", response_model=OpenPaymentResponse)
def create_renewal(
    request: RenewalRequest,
    user: Annotated[User, Depends(require_access("member"))],
    use_case: Annotated[CreateRenewalUseCase, Depends(get_create_renewal_use_case)],
    response: Response,
) -> OpenPaymentResponse:
    try:
        payment, created = use_case.execute(user.id, request.plan)
    except (PaymentValidationError, PaymentConflictError) as exc:
        raise _http_error(exc) from exc
    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    return OpenPaymentResponse.from_domain(payment)


@router.post("/me/{payment_id}/voucher", response_model=PaymentItemResponse)
async def upload_voucher(
    payment_id: int,
    user: Annotated[User, Depends(require_access("member"))],
    use_case: Annotated[UploadVoucherUseCase, Depends(get_upload_voucher_use_case)],
    voucher: UploadFile = File(...),
) -> PaymentItemResponse:

    try:
        payment = use_case.execute(
            user_id=user.id,
            payment_id=payment_id,
            filename=voucher.filename or "comprobante.jpg",
            content=await voucher.read(),
            content_type=voucher.content_type or "",
        )
    except (
        PaymentNotFoundError,
        PaymentForbiddenError,
        PaymentValidationError,
        InvalidPaymentFileError,
    ) as exc:
        raise _http_error(exc) from exc
    return PaymentItemResponse.from_domain(payment)


@router.get("/media/{payment_id}")
def payment_media(
    payment_id: int,
    user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[GetPaymentMediaUseCase, Depends(get_payment_media_use_case)],
) -> FileResponse:
    policy = resolve_access_policy(user.roles)
    try:
        path, filename = use_case.execute(payment_id, user.id, policy.access_level == "admin")
    except (PaymentNotFoundError, PaymentForbiddenError) as exc:
        raise _http_error(exc) from exc

    suffix = Path(filename).suffix.lower()
    media_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    return FileResponse(
        path=path,
        media_type=media_types.get(suffix, "application/octet-stream"),
        filename=filename,
    )
