from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.modules.payments.application.use_cases import (
    ApprovePaymentUseCase,
    CreateAdminPaymentUseCase,
    CreateRenewalUseCase,
    DeleteAdminPaymentUseCase,
    DownloadAdminAgreementDocumentUseCase,
    DownloadPublicAgreementPdfUseCase,
    GetAdminMembershipDashboardUseCase,
    GetAdminPaymentStatsUseCase,
    GetMemberPaymentsAdminUseCase,
    GetMyPaymentsUseCase,
    GetPaymentMediaUseCase,
    GetPublicAgreementUseCase,
    ListAdminPaymentsUseCase,
    RejectPaymentUseCase,
    SendDebitAgreementUseCase,
    UpdateAdminPaymentUseCase,
    UploadPublicAgreementDocumentsUseCase,
    UploadVoucherUseCase,
)
from app.modules.payments.infrastructure.adv_authorization_pdf import AdvDebitAuthorizationPdfGenerator
from app.modules.payments.infrastructure.agreement_files import LocalAgreementFileStorage
from app.modules.payments.infrastructure.email import PaymentsEmailSender
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


def get_admin_payment_stats_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
) -> GetAdminPaymentStatsUseCase:
    return GetAdminPaymentStatsUseCase(repository)


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


def get_agreement_storage() -> LocalAgreementFileStorage:
    return LocalAgreementFileStorage()


def get_agreement_email_sender() -> PaymentsEmailSender:
    return PaymentsEmailSender(raise_on_error=False)


def get_adv_pdf_generator() -> AdvDebitAuthorizationPdfGenerator:
    return AdvDebitAuthorizationPdfGenerator()


def get_send_debit_agreement_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
    email_sender: Annotated[PaymentsEmailSender, Depends(get_agreement_email_sender)],
) -> SendDebitAgreementUseCase:
    return SendDebitAgreementUseCase(repository, email_sender)


def get_public_agreement_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
) -> GetPublicAgreementUseCase:
    return GetPublicAgreementUseCase(repository)


def get_public_agreement_pdf_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
    pdf_generator: Annotated[AdvDebitAuthorizationPdfGenerator, Depends(get_adv_pdf_generator)],
) -> DownloadPublicAgreementPdfUseCase:
    return DownloadPublicAgreementPdfUseCase(repository, pdf_generator)


def get_upload_agreement_documents_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
    storage: Annotated[LocalAgreementFileStorage, Depends(get_agreement_storage)],
) -> UploadPublicAgreementDocumentsUseCase:
    return UploadPublicAgreementDocumentsUseCase(repository, storage)


def get_download_admin_agreement_document_use_case(
    repository: Annotated[SqlAlchemyPaymentsRepository, Depends(get_payments_repository)],
    storage: Annotated[LocalAgreementFileStorage, Depends(get_agreement_storage)],
) -> DownloadAdminAgreementDocumentUseCase:
    return DownloadAdminAgreementDocumentUseCase(repository, storage)
