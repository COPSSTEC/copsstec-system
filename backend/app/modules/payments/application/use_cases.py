from dataclasses import dataclass, replace
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from secrets import token_urlsafe

from app.core.config import get_settings
from app.modules.payments.application.ports import (
    AdvAuthorizationPdfGenerator,
    AgreementEmailSender,
    AgreementFileStorage,
    PaymentFileStorage,
    PaymentsRepository,
)
from app.modules.payments.domain.entities import (
    AdminPaymentQuery,
    BankTransferInfo,
    MembershipDashboard,
    MemberPaymentsView,
    MyPaymentsView,
    Payment,
    PaymentAdminStats,
    PaymentMutationResult,
    PublicAgreementView,
    SendAgreementResult,
    SubscriptionListQuery,
    UploadAgreementResult,
)
from app.modules.payments.domain.exceptions import (
    PaymentConflictError,
    PaymentForbiddenError,
    PaymentNotFoundError,
    PaymentValidationError,
)
from app.modules.payments.domain.subscription import (
    AGREEMENT_TOKEN_DAYS,
    AGREEMENT_UPLOADED,
    ENABLED_MEMBER_STATE_ID,
    MONTHLY_FEE,
    RENEWAL_REFERENCE,
    STATUS_APPROVED,
    STATUS_PENDING_PAYMENT,
    STATUS_PENDING_REVIEW,
    STATUS_REJECTED,
    agreement_status_from_documents,
    amount_for_plan,
    as_money,
    balance_status_from_pending,
    canonicalize_payment_type,
    days_overdue,
    first_renewal_date,
    format_register_date,
    is_coverage_current,
    money_str,
    parse_register_date,
    pending_membership_balance,
    subscription_status_label,
)


def _today() -> date:
    return date.today()


def _parse_amount(raw: Decimal | str | int) -> Decimal:
    try:
        amount = as_money(raw)
    except ValueError as exc:
        raise PaymentValidationError(str(exc)) from exc
    if amount <= 0:
        raise PaymentValidationError("El valor de pago debe ser mayor a 0.")
    return amount


def _parse_date(raw: str) -> str:
    try:
        parsed = parse_register_date(raw)
    except ValueError as exc:
        raise PaymentValidationError(str(exc)) from exc
    return format_register_date(parsed)


def _parse_type(raw: str) -> str:
    try:
        return canonicalize_payment_type(raw)
    except ValueError as exc:
        raise PaymentValidationError("El tipo de pago no es válido.") from exc


def _parse_description(raw: str) -> str:
    description = (raw or "").strip()
    if not description:
        raise PaymentValidationError("La descripción es obligatoria.")
    if len(description) > 255:
        raise PaymentValidationError("La descripción no puede superar 255 caracteres.")
    return description


def _require_payment(payment: Payment | None) -> Payment:
    if payment is None:
        raise PaymentNotFoundError()
    return payment


def _discard_stale_pending(repository: PaymentsRepository, user_id: int, today: date) -> None:
    subscription = repository.get_subscription(user_id)
    if subscription is None or not is_coverage_current(subscription.coverage_until, today):
        return
    repository.cancel_unused_pending_renewal(user_id)


def _with_subscription_view(subscription, today: date):
    if subscription is None:
        return None
    return replace(
        subscription,
        status=subscription_status_label(subscription.coverage_until, today),
        days_overdue=days_overdue(subscription.coverage_until, today),
    )


def _bank_info() -> BankTransferInfo:
    settings = get_settings()
    qr_payload = (
        f"COPSSTEC renovación de membresía\n"
        f"Banco: {settings.membership_bank_name}\n"
        f"Tipo: {settings.membership_account_type}\n"
        f"Cuenta: {settings.membership_account_number}\n"
        f"Titular: {settings.membership_account_holder}\n"
        f"Valor mensual: USD {MONTHLY_FEE:.2f}"
    )
    return BankTransferInfo(
        bank_name=settings.membership_bank_name,
        account_type=settings.membership_account_type,
        account_number=settings.membership_account_number,
        account_holder=settings.membership_account_holder,
        account_ruc=settings.membership_account_ruc,
        qr_payload=qr_payload,
    )


def _parse_payment_method(raw: str | None) -> str:
    value = (raw or "").strip().lower()
    if value in {"", "any", "na", "transferencia"}:
        return "any"
    if value in {"deposito", "depósito"}:
        return "deposito"
    if value in {"efectivo", "tarjeta"}:
        return value
    if value.isdigit() and 1 <= len(value) <= 4:
        return value
    return "any"


def _parse_trans_id(raw: str | None) -> str:
    value = (raw or "").strip()
    return value[:80] if value else "NA"


@dataclass(frozen=True)
class CreatePaymentCommand:
    member_id: int
    type: str
    description: str
    amount: Decimal | str
    date_register: str
    last_digits: str | None = None
    trans_id: str | None = None


@dataclass(frozen=True)
class UpdatePaymentCommand:
    payment_id: int
    type: str
    description: str
    amount: Decimal | str
    date_register: str
    last_digits: str | None = None
    trans_id: str | None = None


class ListAdminPaymentsUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, query: AdminPaymentQuery):
        return self.repository.list_admin_payments(query)


class GetAdminPaymentStatsUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self) -> PaymentAdminStats:
        return self.repository.get_admin_stats()


class GetAdminMembershipDashboardUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, query: SubscriptionListQuery, today: date | None = None) -> MembershipDashboard:
        today = today or _today()
        subscriptions = self.repository.list_subscriptions(query)
        items = [_with_subscription_view(item, today) for item in subscriptions.items]
        return MembershipDashboard(
            pending_vouchers=self.repository.list_pending_vouchers(),
            subscriptions=replace(subscriptions, items=items),
            affiliations=self.repository.list_affiliations(),
        )


class GetMemberPaymentsAdminUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, member_id: int, today: date | None = None) -> MemberPaymentsView:
        today = today or _today()
        member = self.repository.get_member_header(member_id)
        if member is None:
            raise PaymentNotFoundError()
        _discard_stale_pending(self.repository, member_id, today)
        subscription = _with_subscription_view(self.repository.get_subscription(member_id), today)
        context = self.repository.get_agreement_member_context(member_id)
        if subscription is not None and context is not None:
            pending = _pending_for_member(self.repository, member_id, context.enrolled_on, today)
            subscription = replace(
                subscription,
                enrolled_on=context.enrolled_on,
                first_renewal_on=first_renewal_date(context.enrolled_on) if context.enrolled_on else None,
                pending_balance=pending,
                balance_status=balance_status_from_pending(pending),
                email=context.email,
            )
        return MemberPaymentsView(
            member=member,
            items=self.repository.list_payments_for_user(member_id),
            subscription=subscription,
        )


class CreateAdminPaymentUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, command: CreatePaymentCommand, today: date | None = None) -> PaymentMutationResult:
        today = today or _today()
        if not self.repository.member_exists(command.member_id):
            raise PaymentNotFoundError()
        payment_type = _parse_type(command.type)
        payment = self.repository.create_payment(
            user_id=command.member_id,
            payment_type=payment_type,
            description=_parse_description(command.description),
            amount=_parse_amount(command.amount),
            date_register=_parse_date(command.date_register),
            status=STATUS_APPROVED,
            last_digits=_parse_payment_method(command.last_digits),
            trans_id=_parse_trans_id(command.trans_id),
        )
        _discard_stale_pending(self.repository, command.member_id, today)
        subscription = self.repository.get_subscription(command.member_id)
        return PaymentMutationResult(payment=payment, subscription=_with_subscription_view(subscription, today))


class UpdateAdminPaymentUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, command: UpdatePaymentCommand, today: date | None = None) -> PaymentMutationResult:
        today = today or _today()
        _require_payment(self.repository.get_payment(command.payment_id))
        payment = self.repository.update_payment(
            command.payment_id,
            payment_type=_parse_type(command.type),
            description=_parse_description(command.description),
            amount=_parse_amount(command.amount),
            date_register=_parse_date(command.date_register),
            last_digits=_parse_payment_method(command.last_digits) if command.last_digits is not None else None,
            trans_id=_parse_trans_id(command.trans_id) if command.trans_id is not None else None,
        )
        subscription = self.repository.get_subscription(payment.user_id)
        return PaymentMutationResult(payment=payment, subscription=_with_subscription_view(subscription, today))


class DeleteAdminPaymentUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, payment_id: int) -> None:
        self.repository.delete_payment(payment_id)


class ApprovePaymentUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, payment_id: int, reviewed_by: int, today: date | None = None) -> PaymentMutationResult:
        today = today or _today()
        payment = _require_payment(self.repository.get_payment(payment_id))
        if payment.status == STATUS_APPROVED:
            raise PaymentConflictError("Este pago ya fue aprobado.")
        if payment.status != STATUS_PENDING_REVIEW:
            raise PaymentValidationError("Solo se pueden aprobar pagos en revisión.")
        if not payment.voucher_path:
            raise PaymentValidationError("No se puede aprobar un pago sin comprobante.")
        date_register = payment.date_register.strip() if payment.date_register else ""
        if not date_register:
            date_register = format_register_date(today)
        else:
            date_register = _parse_date(date_register)
        approved = self.repository.approve_payment(payment_id, reviewed_by, date_register)
        _discard_stale_pending(self.repository, approved.user_id, today)
        subscription = self.repository.get_subscription(approved.user_id)
        return PaymentMutationResult(payment=approved, subscription=_with_subscription_view(subscription, today))


class RejectPaymentUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(
        self,
        payment_id: int,
        reviewed_by: int,
        observation: str,
        today: date | None = None,
    ) -> PaymentMutationResult:
        today = today or _today()
        payment = _require_payment(self.repository.get_payment(payment_id))
        note = (observation or "").strip()
        if not note:
            raise PaymentValidationError("La observación es obligatoria.")
        if len(note) > 500:
            raise PaymentValidationError("La observación no puede superar 500 caracteres.")
        if payment.status != STATUS_PENDING_REVIEW:
            raise PaymentValidationError("Solo se pueden rechazar pagos en revisión.")
        rejected, pending = self.repository.reject_payment(payment_id, reviewed_by, note)
        subscription = self.repository.get_subscription(rejected.user_id)
        return PaymentMutationResult(
            payment=rejected,
            open_payment=pending,
            subscription=_with_subscription_view(subscription, today),
        )


class GetMyPaymentsUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int, today: date | None = None) -> MyPaymentsView:
        today = today or _today()
        _discard_stale_pending(self.repository, user_id, today)
        subscription = _with_subscription_view(self.repository.get_subscription(user_id), today)
        items = self.repository.list_payments_for_user(user_id)
        return MyPaymentsView(
            items=items,
            open_payment=self.repository.get_open_membership_payment(user_id),
            subscription=subscription,
            payment_info=_bank_info(),
        )


class CreateRenewalUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int, plan: str, today: date | None = None) -> tuple[Payment, bool]:
        today = today or _today()
        try:
            amount = amount_for_plan(plan)
        except ValueError as exc:
            raise PaymentValidationError(str(exc)) from exc

        open_payment = self.repository.get_open_membership_payment(user_id)
        if open_payment is not None and open_payment.status == STATUS_PENDING_REVIEW:
            raise PaymentConflictError("Ya hay un comprobante en revisión. Espera la respuesta del administrador.")

        subscription = self.repository.get_subscription(user_id)
        if is_coverage_current(subscription.coverage_until if subscription else None, today):
            raise PaymentValidationError("No tienes una cuota pendiente por pagar.")

        if open_payment is not None and open_payment.status == STATUS_PENDING_PAYMENT:
            return self.repository.update_pending_renewal(open_payment.id, amount), False

        if subscription and subscription.coverage_until is not None:
            date_register = format_register_date(subscription.coverage_until + timedelta(days=1))
        else:
            date_register = format_register_date(today)
        created = self.repository.ensure_pending_renewal(
            user_id=user_id,
            amount=amount,
            date_register=date_register,
            reference=RENEWAL_REFERENCE,
        )
        return created, True


class UploadVoucherUseCase:
    def __init__(self, repository: PaymentsRepository, storage: PaymentFileStorage) -> None:
        self.repository = repository
        self.storage = storage

    def execute(
        self,
        user_id: int,
        payment_id: int,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> Payment:
        payment = _require_payment(self.repository.get_payment(payment_id))
        if payment.user_id != user_id:
            raise PaymentForbiddenError("No puedes subir el comprobante de otro miembro.")
        if payment.status not in {STATUS_PENDING_PAYMENT, STATUS_REJECTED}:
            raise PaymentForbiddenError("Este pago no admite un nuevo comprobante.")
        if not content:
            raise PaymentValidationError("El comprobante es obligatorio.")
        voucher_path = self.storage.save_voucher(user_id, filename, content, content_type)
        return self.repository.save_voucher(payment_id, voucher_path)


class GetPaymentMediaUseCase:
    def __init__(self, repository: PaymentsRepository, storage: PaymentFileStorage) -> None:
        self.repository = repository
        self.storage = storage

    def execute(self, payment_id: int, user_id: int, is_admin: bool) -> tuple[str, str]:
        payment = _require_payment(self.repository.get_payment(payment_id))
        if not is_admin and payment.user_id != user_id:
            raise PaymentForbiddenError("No puedes ver el comprobante de otro miembro.")
        if not payment.voucher_path:
            raise PaymentNotFoundError()
        path = self.storage.resolve_path(payment.voucher_path)
        if path is None or not path.exists():
            raise PaymentNotFoundError()
        return str(path), path.name


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _pending_for_member(repository: PaymentsRepository, user_id: int, enrolled_on: date | None, today: date) -> Decimal:
    if enrolled_on is None:
        return Decimal("0.00")
    renewals = repository.list_approved_membership_payments([user_id]).get(user_id, [])
    return pending_membership_balance(enrolled_on, today, renewals)


class SendDebitAgreementUseCase:
    def __init__(
        self,
        repository: PaymentsRepository,
        email_sender: AgreementEmailSender,
    ) -> None:
        self.repository = repository
        self.email_sender = email_sender

    def execute(self, member_id: int, today: date | None = None) -> SendAgreementResult:
        today = today or _today()
        member = self.repository.get_agreement_member_context(member_id)
        if member is None:
            raise PaymentNotFoundError()
        if member.state_id != ENABLED_MEMBER_STATE_ID:
            raise PaymentValidationError("El miembro no está habilitado.")
        if not member.email.strip():
            raise PaymentValidationError("El miembro no tiene un correo electrónico.")

        pending = _pending_for_member(self.repository, member.user_id, member.enrolled_on, today)
        if pending <= 0:
            raise PaymentValidationError("El miembro no tiene saldo pendiente.")

        sent_at = _now()
        expires_at = sent_at + timedelta(days=AGREEMENT_TOKEN_DAYS)
        self.repository.revoke_current_agreement(member.user_id)
        token = token_urlsafe(32)
        agreement = self.repository.create_debit_agreement(
            user_id=member.user_id,
            token=token,
            pending_balance=pending,
            sent_at=sent_at,
            expires_at=expires_at,
        )

        settings = get_settings()
        origin = settings.frontend_origin.rstrip("/")
        url = f"{origin}/acuerdo-debito/{token}"
        message = "Acuerdo enviado al correo del miembro."
        try:
            self.email_sender.send_template(
                member.email,
                "debit_agreement",
                {
                    "nombres": member.member_name or member.names,
                    "pending_balance": money_str(pending),
                    "url": url,
                },
            )
        except Exception:
            message = "Acuerdo generado. No se pudo enviar el correo. El enlace quedó registrado."

        return SendAgreementResult(
            user_id=agreement.user_id,
            email=member.email,
            pending_balance=pending,
            agreement_status=agreement.status,
            expires_at=agreement.expires_at,
            message=message,
        )


class GetPublicAgreementUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, token: str) -> PublicAgreementView:
        view = self.repository.get_public_agreement(token)
        if view is None:
            raise PaymentNotFoundError()
        return view


class DownloadPublicAgreementPdfUseCase:
    def __init__(
        self,
        repository: PaymentsRepository,
        pdf_generator: AdvAuthorizationPdfGenerator,
    ) -> None:
        self.repository = repository
        self.pdf_generator = pdf_generator

    def execute(self, token: str, today: date | None = None) -> bytes:
        today = today or _today()
        view = self.repository.get_public_agreement(token)
        if view is None:
            raise PaymentNotFoundError()
        return self.pdf_generator.generate(
            names=view.names,
            lastname=view.lastname,
            identifier=view.identifier,
            city=view.city,
            issued_on=today,
        )


class UploadPublicAgreementDocumentsUseCase:
    def __init__(
        self,
        repository: PaymentsRepository,
        storage: AgreementFileStorage,
    ) -> None:
        self.repository = repository
        self.storage = storage

    def execute(
        self,
        token: str,
        signed_authorization: tuple[str, bytes, str] | None,
        identity_document: tuple[str, bytes, str] | None,
    ) -> UploadAgreementResult:
        view = self.repository.get_public_agreement(token)
        if view is None:
            raise PaymentNotFoundError()

        auth_upload = signed_authorization if signed_authorization and signed_authorization[1] else None
        identity_upload = identity_document if identity_document and identity_document[1] else None
        if auth_upload is None and identity_upload is None:
            raise PaymentValidationError("Debe adjuntar al menos un archivo PDF.")

        has_signed = view.has_signed_authorization
        has_identity = view.has_identity_document
        if not has_signed and auth_upload is None:
            raise PaymentValidationError("La autorización firmada es obligatoria.")
        if not has_identity and identity_upload is None:
            raise PaymentValidationError("La copia de cédula es obligatoria.")

        agreement = self.repository.get_current_agreement(view.user_id)
        if agreement is None:
            raise PaymentNotFoundError()

        signed_path = None
        identity_path = None
        if auth_upload is not None:
            filename, content, content_type = auth_upload
            signed_path = self.storage.save_pdf(view.user_id, "authorization", filename, content, content_type)
            has_signed = True
        if identity_upload is not None:
            filename, content, content_type = identity_upload
            identity_path = self.storage.save_pdf(view.user_id, "identity", filename, content, content_type)
            has_identity = True

        status = agreement_status_from_documents(has_signed, has_identity)
        uploaded_at = agreement.documents_uploaded_at
        if status == AGREEMENT_UPLOADED and uploaded_at is None:
            uploaded_at = _now()

        updated = self.repository.save_agreement_documents(
            agreement.id,
            signed_path,
            identity_path,
            status,
            uploaded_at,
        )
        return UploadAgreementResult(
            status=updated.status,
            has_signed_authorization=updated.has_signed_authorization,
            has_identity_document=updated.has_identity_document,
            message="Documentos recibidos. El administrador los revisará.",
        )


class DownloadAdminAgreementDocumentUseCase:
    def __init__(
        self,
        repository: PaymentsRepository,
        storage: AgreementFileStorage,
    ) -> None:
        self.repository = repository
        self.storage = storage

    def execute(self, member_id: int, kind: str) -> tuple[str, str]:
        if kind not in {"authorization", "identity"}:
            raise PaymentValidationError("Documento no válido.")
        if self.repository.get_agreement_member_context(member_id) is None:
            raise PaymentNotFoundError()
        agreement = self.repository.get_current_agreement(member_id)
        if agreement is None:
            raise PaymentNotFoundError()
        stored = (
            agreement.signed_authorization_path
            if kind == "authorization"
            else agreement.identity_document_path
        )
        if not (stored or "").strip():
            raise PaymentNotFoundError()
        path = self.storage.resolve_path(stored)
        if path is None or not path.exists():
            raise PaymentNotFoundError()
        filenames = {
            "authorization": "autorizacion-debito-adv-firmada.pdf",
            "identity": "cedula-adv.pdf",
        }
        return str(path), filenames[kind]
