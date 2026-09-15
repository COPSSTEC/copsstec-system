from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.modules.payments.application.use_cases import (
    ApprovePaymentUseCase,
    CreateAdminPaymentUseCase,
    CreateRenewalUseCase,
    DeleteAdminPaymentUseCase,
    GetAdminMembershipDashboardUseCase,
    GetMemberPaymentsAdminUseCase,
    GetMyPaymentsUseCase,
    GetPaymentMediaUseCase,
    ListAdminPaymentsUseCase,
    RejectPaymentUseCase,
    UpdateAdminPaymentUseCase,
    UploadVoucherUseCase,
)
from app.modules.payments.infrastructure.files import LocalPaymentFileStorage
from app.modules.payments.infrastructure.repository import SqlAlchemyPaymentsRepository


def get_payments_repository(
    session: Annotated[Session, Depends(get_db_session)],
) -> SqlAlchemyPaymentsRepository:
    return SqlAlchemyPaymentsRepository(session)


def get_payment_storage() -> LocalPaymentFileStorage:
    return LocalPaymentFileStorage()


def get_list_admin_payments_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
) -> ListAdminPaymentsUseCase:
    return ListAdminPaymentsUseCase(repository)


def get_admin_membership_dashboard_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
) -> GetAdminMembershipDashboardUseCase:
    return GetAdminMembershipDashboardUseCase(repository)


def get_member_payments_admin_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
) -> GetMemberPaymentsAdminUseCase:
    return GetMemberPaymentsAdminUseCase(repository)


def get_create_admin_payment_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
) -> CreateAdminPaymentUseCase:
    return CreateAdminPaymentUseCase(repository)


def get_update_admin_payment_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
) -> UpdateAdminPaymentUseCase:
    return UpdateAdminPaymentUseCase(repository)


def get_delete_admin_payment_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
) -> DeleteAdminPaymentUseCase:
    return DeleteAdminPaymentUseCase(repository)


def get_approve_payment_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
) -> ApprovePaymentUseCase:
    return ApprovePaymentUseCase(repository)


def get_reject_payment_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
) -> RejectPaymentUseCase:
    return RejectPaymentUseCase(repository)


def get_my_payments_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
) -> GetMyPaymentsUseCase:
    return GetMyPaymentsUseCase(repository)


def get_create_renewal_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
) -> CreateRenewalUseCase:
    return CreateRenewalUseCase(repository)


def get_upload_voucher_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
    storage: Annotated[LocalPaymentFileStorage, Depends(get_payment_storage)],
) -> UploadVoucherUseCase:
    return UploadVoucherUseCase(repository, storage)


def get_payment_media_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
    storage: Annotated[LocalPaymentFileStorage, Depends(get_payment_storage)],
) -> GetPaymentMediaUseCase:
    return GetPaymentMediaUseCase(repository, storage)
