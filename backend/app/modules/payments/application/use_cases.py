from dataclasses import dataclass, replace
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from secrets import token_urlsafe

from app.core.config import get_settings, live_membership_transfer
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
    ConfirmInstallmentsResult,
    CreatePaymentPlanResult,
    MembershipDashboard,
    MemberPaymentsView,
    MyPaymentsView,
    NewPaymentPlan,
    Payment,
    PaymentAdminStats,
    PaymentMutationResult,
    PaymentPlan,
    PaymentPlanPreview,
    PeriodInstallmentRow,
    PlanBankDetails,
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
    INSTALLMENT_CONFIRM_STATUSES,
    INSTALLMENT_DEBITED,
    INSTALLMENT_FAILED,
    INSTALLMENT_PENDING,
    MONTHLY_FEE,
    PAYMENT_TYPE_MEMBERSHIP,
    PLAN_ACTIVE,
    PLAN_COMPLETED,
    PLAN_DEBT_REFERENCE,
    PLAN_FEE_REFERENCE,
    PLAN_INSTALLMENT_OPTIONS,
    PLAN_MAX_START_OFFSET_MONTHS,
    RENEWAL_REFERENCE,
    STATUS_APPROVED,
    STATUS_PENDING_PAYMENT,
    STATUS_PENDING_REVIEW,
    STATUS_REJECTED,
    add_months,
    agreement_status_from_documents,
    amount_for_plan,
    as_money,
    balance_status_from_pending,
    build_plan_schedule,
    canonicalize_payment_type,
    days_overdue,
    debt_period_range,
    default_debit_period,
    first_renewal_date,
    format_register_date,
    is_coverage_current,
    month_label,
    month_start,
    money_str,
    parse_period,
    parse_register_date,
    pending_membership_balance,
    plan_debt_cutoff,
    remaining_plan_debt,
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
    transfer = live_membership_transfer()
    qr_payload = (
        f"COPSSTEC renovación de membresía\n"
        f"Banco: {transfer.bank_name}\n"
        f"Tipo: {transfer.account_type}\n"
        f"Cuenta: {transfer.account_number}\n"
        f"Titular: {transfer.account_holder}\n"
        f"Valor mensual: USD {MONTHLY_FEE:.2f}"
    )
    return BankTransferInfo(
        bank_name=transfer.bank_name,
        account_type=transfer.account_type,
        account_number=transfer.account_number,
        account_holder=transfer.account_holder,
        account_ruc=transfer.account_ruc,
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
            payment_plan=self.repository.get_current_payment_plan(user_id),
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
        from app.core.object_storage import is_remote_url, stored_filename

        if is_remote_url(payment.voucher_path):
            return payment.voucher_path, stored_filename(payment.voucher_path, "comprobante")
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
        from app.core.object_storage import is_remote_url

        filenames = {
            "authorization": "autorizacion-debito-adv-firmada.pdf",
            "identity": "cedula-adv.pdf",
        }
        if is_remote_url(stored):
            return stored, filenames[kind]
        path = self.storage.resolve_path(stored)
        if path is None or not path.exists():
            raise PaymentNotFoundError()
        return str(path), filenames[kind]


PLAN_EMAIL_TEMPLATE = "payment_plan_agreement"
ACCOUNT_TYPES = {"ahorros": "Ahorros", "corriente": "Corriente"}


@dataclass(frozen=True)
class PaymentPlanCommand:
    member_id: int
    installment_amount: Decimal | str
    start_period: str
    bank_name: str | None = None
    account_type: str | None = None
    account_number: str | None = None
    created_by: int | None = None


def _parse_installment(raw: Decimal | str | int) -> Decimal:
    try:
        amount = as_money(raw)
    except ValueError as exc:
        raise PaymentValidationError("El abono no es válido.") from exc
    if amount not in PLAN_INSTALLMENT_OPTIONS:
        raise PaymentValidationError("El abono mensual debe ser USD 20 o USD 30.")
    return amount


def _parse_start_period(raw: str, today: date) -> date:
    try:
        start = parse_period(raw)
    except ValueError as exc:
        raise PaymentValidationError(str(exc)) from exc
    current = month_start(today)
    if start < current or start > add_months(current, PLAN_MAX_START_OFFSET_MONTHS):
        raise PaymentValidationError(
            f"El mes de inicio debe estar entre {month_label(current)} y "
            f"{month_label(add_months(current, PLAN_MAX_START_OFFSET_MONTHS))}.",
        )
    return start


def _build_plan_preview(
    repository: PaymentsRepository,
    member_id: int,
    installment_raw: Decimal | str,
    start_raw: str,
    today: date,
) -> PaymentPlanPreview:
    context = repository.get_agreement_member_context(member_id)
    if context is None:
        raise PaymentNotFoundError()
    if context.state_id != ENABLED_MEMBER_STATE_ID:
        raise PaymentValidationError("El miembro no está habilitado.")
    if context.enrolled_on is None:
        raise PaymentValidationError("El miembro no tiene fecha de inscripción.")
    installment = _parse_installment(installment_raw)
    start = _parse_start_period(start_raw, today)
    cutoff = plan_debt_cutoff(start)
    debt = _pending_for_member(repository, member_id, context.enrolled_on, cutoff)
    if debt <= 0:
        raise PaymentValidationError("El miembro no tiene deuda pendiente antes del mes de inicio.")
    schedule = build_plan_schedule(debt, installment, start)
    debt_from, debt_to = debt_period_range(debt, cutoff, first_renewal_date(context.enrolled_on))
    return PaymentPlanPreview(
        user_id=member_id,
        member_name=context.member_name,
        email=context.email,
        debt_total=debt,
        monthly_fee=MONTHLY_FEE,
        installment_amount=installment,
        start_period=start,
        end_period=schedule[-1].period,
        debt_from_period=debt_from,
        debt_to_period=debt_to,
        schedule=tuple(schedule),
        bank=repository.get_payment_plan_bank_defaults(member_id),
    )


def _require_no_active_plan(repository: PaymentsRepository, member_id: int) -> None:
    current = repository.get_current_payment_plan(member_id)
    if current is not None and current.status == PLAN_ACTIVE:
        raise PaymentConflictError("El miembro ya tiene un convenio activo.")


def _parse_bank(command: PaymentPlanCommand, defaults: PlanBankDetails) -> PlanBankDetails:
    bank_name = (command.bank_name if command.bank_name is not None else defaults.bank_name).strip()
    account_number = (
        command.account_number if command.account_number is not None else defaults.account_number
    ).strip()
    raw_type = (command.account_type if command.account_type is not None else defaults.account_type).strip()
    account_type = ACCOUNT_TYPES.get(raw_type.lower())
    if not bank_name or not account_number or account_type is None:
        raise PaymentValidationError("Completa banco, tipo de cuenta (Ahorros o Corriente) y número de cuenta.")
    if len(bank_name) > 120 or len(account_number) > 40:
        raise PaymentValidationError("Los datos bancarios son demasiado largos.")
    return PlanBankDetails(bank_name=bank_name, account_type=account_type, account_number=account_number)


def _message_money(value: Decimal) -> str:
    amount = as_money(value)
    if amount == amount.to_integral_value():
        return str(int(amount))
    return money_str(amount)


def payment_plan_email_context(nombres: str, plan: PaymentPlan) -> dict:
    debt_items = [item for item in plan.installments if item.debt_amount > 0]
    last = debt_items[-1] if debt_items else None
    partial_last = last is not None and last.debt_amount < plan.installment_amount
    full_items = debt_items[:-1] if partial_last else debt_items
    regular_from = add_months(plan.end_period, 1)
    return {
        "nombres": nombres or "miembro",
        "debt_total": _message_money(plan.debt_total),
        "debt_from": month_label(plan.debt_from_period) if plan.debt_from_period else "",
        "debt_to": month_label(plan.debt_to_period) if plan.debt_to_period else "",
        "start": month_label(plan.start_period),
        "monthly_fee": _message_money(plan.monthly_fee),
        "installment": _message_money(plan.installment_amount),
        "monthly_total": _message_money(plan.monthly_fee + plan.installment_amount),
        "full_until": month_label(full_items[-1].period) if full_items else "",
        "has_full": bool(full_items),
        "partial_last": partial_last,
        "last_period": month_label(last.period) if last else "",
        "last_total": _message_money(last.total_amount) if last else "0",
        "last_debt": _message_money(last.debt_amount) if last else "0",
        "regular_from": month_label(regular_from),
        "debit_days": "primeros cinco días de cada mes",
    }


class PreviewPaymentPlanUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(
        self,
        member_id: int,
        installment_amount: Decimal | str,
        start_period: str,
        today: date | None = None,
    ) -> PaymentPlanPreview:
        today = today or _today()
        preview = _build_plan_preview(self.repository, member_id, installment_amount, start_period, today)
        _require_no_active_plan(self.repository, member_id)
        return preview


class CreatePaymentPlanUseCase:
    def __init__(self, repository: PaymentsRepository, email_sender: AgreementEmailSender) -> None:
        self.repository = repository
        self.email_sender = email_sender

    def execute(self, command: PaymentPlanCommand, today: date | None = None) -> CreatePaymentPlanResult:
        today = today or _today()
        preview = _build_plan_preview(
            self.repository,
            command.member_id,
            command.installment_amount,
            command.start_period,
            today,
        )
        _require_no_active_plan(self.repository, command.member_id)
        bank = _parse_bank(command, preview.bank)
        agreement = self.repository.get_current_agreement(command.member_id)
        plan = self.repository.create_payment_plan(
            NewPaymentPlan(
                user_id=command.member_id,
                debt_total=preview.debt_total,
                monthly_fee=preview.monthly_fee,
                installment_amount=preview.installment_amount,
                start_period=preview.start_period,
                end_period=preview.end_period,
                debt_from_period=preview.debt_from_period,
                debt_to_period=preview.debt_to_period,
                bank=bank,
                schedule=preview.schedule,
                created_by=command.created_by,
                debit_agreement_id=agreement.id if agreement else None,
            ),
        )

        email_sent = False
        message = "Convenio creado. Se envió el detalle al correo del miembro."
        if not preview.email.strip():
            message = "Convenio creado. El miembro no tiene correo registrado."
        else:
            context = payment_plan_email_context(preview.member_name, plan)
            context["url"] = f"{get_settings().frontend_origin.rstrip('/')}/mi-espacio/pagos"
            try:
                self.email_sender.send_template(preview.email, PLAN_EMAIL_TEMPLATE, context)
                email_sent = True
            except Exception:
                message = "Convenio creado. No se pudo enviar el correo."
        return CreatePaymentPlanResult(plan=plan, email=preview.email, email_sent=email_sent, message=message)


class GetPaymentPlanUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, member_id: int) -> PaymentPlan | None:
        if not self.repository.member_exists(member_id):
            raise PaymentNotFoundError()
        return self.repository.get_current_payment_plan(member_id)


class CancelPaymentPlanUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, plan_id: int) -> PaymentPlan:
        plan = self.repository.get_payment_plan(plan_id)
        if plan is None:
            raise PaymentNotFoundError()
        if plan.status != PLAN_ACTIVE:
            raise PaymentValidationError("Solo se pueden cancelar convenios activos.")
        return self.repository.cancel_payment_plan(plan_id)


class ListPlanInstallmentsUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, period: str | None, today: date | None = None) -> tuple[date, list[PeriodInstallmentRow]]:
        today = today or _today()
        if period and period.strip():
            try:
                target = parse_period(period)
            except ValueError as exc:
                raise PaymentValidationError(str(exc)) from exc
        else:
            target = default_debit_period(today)
        return target, self.repository.list_period_installments(target)


class ConfirmPlanInstallmentsUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, installment_ids: list[int], status: str, confirmed_by: int) -> ConfirmInstallmentsResult:
        if status not in INSTALLMENT_CONFIRM_STATUSES:
            raise PaymentValidationError("El estado debe ser debited o failed.")
        ids = list(dict.fromkeys(int(value) for value in installment_ids))
        if not ids:
            raise PaymentValidationError("Selecciona al menos una cuota.")
        if len(ids) > 500:
            raise PaymentValidationError("No se pueden confirmar más de 500 cuotas a la vez.")

        updated = 0
        for row in self.repository.get_installment_rows(ids):
            installment = row.installment
            if installment.status != INSTALLMENT_PENDING or row.plan_status not in (PLAN_ACTIVE, PLAN_COMPLETED):
                continue
            if status == INSTALLMENT_DEBITED:
                self._debit(row, confirmed_by)
            else:
                self._fail(row, confirmed_by)
            updated += 1
        return ConfirmInstallmentsResult(
            updated=updated,
            skipped=len(ids) - updated,
            items=self.repository.get_installment_rows(ids),
        )

    def _debit(self, row: PeriodInstallmentRow, confirmed_by: int) -> None:
        installment = row.installment
        date_register = format_register_date(installment.period)
        period_text = installment.period.strftime("%m/%Y")
        trans_id = f"CONVENIO-{installment.plan_id}"
        fee = self.repository.create_payment(
            user_id=row.user_id,
            payment_type=PAYMENT_TYPE_MEMBERSHIP,
            description=f"{PLAN_FEE_REFERENCE} {period_text}",
            amount=installment.fee_amount,
            date_register=date_register,
            status=STATUS_APPROVED,
            trans_id=trans_id,
            reviewed_by=confirmed_by,
        )
        debt_payment_id: int | None = None
        if installment.debt_amount > 0:
            debt = self.repository.create_payment(
                user_id=row.user_id,
                payment_type=PAYMENT_TYPE_MEMBERSHIP,
                description=f"{PLAN_DEBT_REFERENCE} {period_text}",
                amount=installment.debt_amount,
                date_register=date_register,
                status=STATUS_APPROVED,
                trans_id=trans_id,
                reviewed_by=confirmed_by,
                recalculate=False,
                applies_to_debt=True,
            )
            debt_payment_id = debt.id
        self.repository.mark_installment(
            installment.id,
            status=INSTALLMENT_DEBITED,
            confirmed_by=confirmed_by,
            fee_payment_id=fee.id,
            debt_payment_id=debt_payment_id,
        )
        plan = self.repository.get_payment_plan(installment.plan_id)
        if plan is None or plan.status != PLAN_ACTIVE:
            return
        settled = [
            (item.status, item.fee_amount, item.debt_amount)
            for item in plan.installments
            if item.status != INSTALLMENT_PENDING
        ]
        pending_debt = any(item.status == INSTALLMENT_PENDING and item.debt_amount > 0 for item in plan.installments)
        if not pending_debt and remaining_plan_debt(plan.debt_total, settled) <= 0:
            self.repository.complete_payment_plan(plan.id)

    def _fail(self, row: PeriodInstallmentRow, confirmed_by: int) -> None:
        installment = row.installment
        self.repository.mark_installment(installment.id, status=INSTALLMENT_FAILED, confirmed_by=confirmed_by)
        plan = self.repository.get_payment_plan(installment.plan_id)
        if plan is None or plan.status != PLAN_ACTIVE:
            return
        settled_items = [item for item in plan.installments if item.status != INSTALLMENT_PENDING]
        last_settled = max(item.period for item in settled_items)
        remaining = remaining_plan_debt(
            plan.debt_total,
            [(item.status, item.fee_amount, item.debt_amount) for item in settled_items],
        )
        earlier_pending = sum(
            (
                item.debt_amount
                for item in plan.installments
                if item.status == INSTALLMENT_PENDING and item.period <= last_settled
            ),
            Decimal("0.00"),
        )
        regen_debt = as_money(remaining - earlier_pending)
        schedule = (
            build_plan_schedule(regen_debt, plan.installment_amount, add_months(last_settled, 1), plan.monthly_fee)
            if regen_debt > 0
            else []
        )
        self.repository.replace_pending_installments(plan.id, last_settled, schedule)
