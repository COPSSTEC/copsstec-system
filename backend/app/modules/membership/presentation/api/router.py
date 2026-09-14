from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.modules.auth.domain.entities import User
from app.modules.auth.presentation.api.dependencies import get_current_user
from app.modules.membership.application.use_cases import (
    GetMembershipInvoiceUseCase,
    GetMembershipStatusUseCase,
    GetPaymentInfoUseCase,
    RegisterMembershipUseCase,
    UploadPaymentVoucherUseCase,
)
from app.modules.membership.domain.entities import MembershipRegistrationData
from app.modules.membership.domain.exceptions import (
    MembershipConflictError,
    MembershipForbiddenError,
    MembershipNotFoundError,
    MembershipValidationError,
)
from app.modules.membership.infrastructure.files import InvalidMembershipFileError
from app.modules.membership.presentation.api.dependencies import (
    get_invoice_use_case,
    get_membership_status_use_case,
    get_payment_info_use_case,
    get_register_membership_use_case,
    get_upload_voucher_use_case,
)
from app.modules.membership.presentation.api.schemas import (
    MembershipStatusResponse,
    PaymentInfoResponse,
    PaymentResponse,
    RegisterMembershipResponse,
)

router = APIRouter(prefix="/api/membership", tags=["membership"])


def _as_bool(value: str | bool) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "on", "yes", "si", "sí"}


def _http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, MembershipNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No se encontró la afiliación.")
    if isinstance(exc, MembershipConflictError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.message)
    if isinstance(exc, MembershipValidationError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    if isinstance(exc, MembershipForbiddenError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=exc.message)
    if isinstance(exc, InvalidMembershipFileError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.message)
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error interno.")


@router.post("/register", response_model=RegisterMembershipResponse, status_code=status.HTTP_201_CREATED)
async def register_membership(
    use_case: Annotated[RegisterMembershipUseCase, Depends(get_register_membership_use_case)],
    names: str = Form(...),
    lastname: str = Form(...),
    identifier: str = Form(...),
    email: str = Form(...),
    birtday: str = Form(...),
    blood_type: str = Form(...),
    gender: str = Form(...),
    mobile_phone: str = Form(...),
    province: str = Form(...),
    city: str = Form(...),
    street_principal: str = Form(...),
    title_academic: str = Form(...),
    cod_senescyt: str = Form(...),
    accept_birthday_notifications: str = Form(...),
    accept_data_policy: str = Form(...),
    photo: UploadFile = File(...),
    fixed_phone: str = Form(""),
    street_secondary: str = Form(""),
    fourth_title: str = Form(""),
    codigo_senescyt_cuarto: str = Form(""),
) -> RegisterMembershipResponse:
    data = MembershipRegistrationData(
        names=names,
        lastname=lastname,
        identifier=identifier,
        email=email,
        birtday=birtday,
        blood_type=blood_type,
        gender=gender,
        mobile_phone=mobile_phone,
        fixed_phone=fixed_phone,
        province=province,
        city=city,
        street_principal=street_principal,
        street_secondary=street_secondary,
        title_academic=title_academic,
        cod_senescyt=cod_senescyt,
        fourth_title=fourth_title,
        codigo_senescyt_cuarto=codigo_senescyt_cuarto,
        accept_birthday_notifications=_as_bool(accept_birthday_notifications),
        accept_data_policy=_as_bool(accept_data_policy),
    )
    try:
        member, access_token = use_case.execute(
            data=data,
            photo_filename=photo.filename or "foto.jpg",
            photo_content=await photo.read(),
            photo_content_type=photo.content_type or "",
        )
    except (MembershipValidationError, MembershipConflictError, InvalidMembershipFileError) as exc:
        raise _http_error(exc) from exc

    return RegisterMembershipResponse.from_domain(
        member,
        access_token,
        "Registro creado. Continúa con el pago de afiliación.",
    )


@router.get("/status", response_model=MembershipStatusResponse)
def membership_status(
    user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[GetMembershipStatusUseCase, Depends(get_membership_status_use_case)],
) -> MembershipStatusResponse:
    return MembershipStatusResponse.from_domain(use_case.execute(user.id, user.roles))


@router.get("/payment-info", response_model=PaymentInfoResponse)
def payment_info(
    user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[GetPaymentInfoUseCase, Depends(get_payment_info_use_case)],
) -> PaymentInfoResponse:
    try:
        return PaymentInfoResponse.from_domain(use_case.execute(user.id))
    except (MembershipNotFoundError, MembershipForbiddenError) as exc:
        raise _http_error(exc) from exc


@router.post("/payment-voucher", response_model=PaymentResponse)
async def upload_payment_voucher(
    user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[UploadPaymentVoucherUseCase, Depends(get_upload_voucher_use_case)],
    voucher: UploadFile = File(...),
) -> PaymentResponse:
    try:
        payment = use_case.execute(
            user_id=user.id,
            filename=voucher.filename or "comprobante.jpg",
            content=await voucher.read(),
            content_type=voucher.content_type or "",
        )
    except (
        MembershipNotFoundError,
        MembershipConflictError,
        MembershipValidationError,
        InvalidMembershipFileError,
    ) as exc:
        raise _http_error(exc) from exc

    return PaymentResponse.from_domain(
        payment,
        "Comprobante recibido. El administrador confirmará el pago antes de habilitar tu acceso.",
    )


@router.get("/invoice")
def download_invoice(
    user: Annotated[User, Depends(get_current_user)],
    use_case: Annotated[GetMembershipInvoiceUseCase, Depends(get_invoice_use_case)],
) -> FileResponse:
    try:
        number, pdf_path = use_case.execute(user.id)
    except MembershipNotFoundError as exc:
        raise _http_error(exc) from exc

    relative = pdf_path.replace("/media/membership/", "")
    file_path = Path("storage/membership") / relative
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La factura no está disponible.")

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=f"{number}.pdf",
    )
