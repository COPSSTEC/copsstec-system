from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db_session
from app.modules.membership.application.use_cases import (
    ApproveMembershipUseCase,
    GetApprovalPreviewUseCase,
    GetMembershipInvoiceUseCase,
    GetMembershipStatusUseCase,
    GetPaymentInfoUseCase,
    RegisterMembershipUseCase,
    UploadPaymentVoucherUseCase,
)
from app.modules.membership.infrastructure.email import SmtpOrLogEmailSender
from app.modules.membership.infrastructure.files import LocalMembershipFileStorage
from app.modules.membership.infrastructure.invoices import MembershipInvoicePdfGenerator
from app.modules.membership.infrastructure.mailbox import MailInABoxMailbox
from app.modules.membership.infrastructure.repository import SqlAlchemyMembershipRepository
from app.modules.payments.infrastructure.repository import SqlAlchemyPaymentsRepository


def get_membership_repository(
    session: Annotated[Session, Depends(get_db_session)],
) -> SqlAlchemyMembershipRepository:
    return SqlAlchemyMembershipRepository(session)


def get_membership_storage() -> LocalMembershipFileStorage:
    return LocalMembershipFileStorage()


def get_register_membership_use_case(
    repository: Annotated[SqlAlchemyMembershipRepository, Depends(get_membership_repository)],
    storage: Annotated[LocalMembershipFileStorage, Depends(get_membership_storage)],
) -> RegisterMembershipUseCase:
    return RegisterMembershipUseCase(repository, storage)


def get_membership_status_use_case(
    repository: Annotated[SqlAlchemyMembershipRepository, Depends(get_membership_repository)],
) -> GetMembershipStatusUseCase:
    return GetMembershipStatusUseCase(repository)


def get_payment_info_use_case(
    repository: Annotated[SqlAlchemyMembershipRepository, Depends(get_membership_repository)],
) -> GetPaymentInfoUseCase:
    return GetPaymentInfoUseCase(repository)


def get_upload_voucher_use_case(
    repository: Annotated[SqlAlchemyMembershipRepository, Depends(get_membership_repository)],
    storage: Annotated[LocalMembershipFileStorage, Depends(get_membership_storage)],
) -> UploadPaymentVoucherUseCase:
    return UploadPaymentVoucherUseCase(repository, storage)


def get_invoice_use_case(
    repository: Annotated[SqlAlchemyMembershipRepository, Depends(get_membership_repository)],
) -> GetMembershipInvoiceUseCase:
    return GetMembershipInvoiceUseCase(repository)


def get_approval_preview_use_case(
    repository: Annotated[SqlAlchemyMembershipRepository, Depends(get_membership_repository)],
) -> GetApprovalPreviewUseCase:
    return GetApprovalPreviewUseCase(repository)


def get_approve_membership_use_case(
    repository: Annotated[SqlAlchemyMembershipRepository, Depends(get_membership_repository)],
    storage: Annotated[LocalMembershipFileStorage, Depends(get_membership_storage)],
    session: Annotated[Session, Depends(get_db_session)],
) -> ApproveMembershipUseCase:
    return ApproveMembershipUseCase(
        repository=repository,
        mailbox=MailInABoxMailbox(),
        email_sender=SmtpOrLogEmailSender(),
        invoices=MembershipInvoicePdfGenerator(),
        storage=storage,
        affiliation_payment=SqlAlchemyPaymentsRepository(session),
    )
