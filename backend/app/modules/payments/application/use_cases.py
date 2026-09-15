from dataclasses import dataclass, replace
from datetime import date, timedelta
from decimal import Decimal

from app.core.config import get_settings
from app.modules.payments.application.ports import PaymentFileStorage, PaymentsRepository
from app.modules.payments.domain.entities import (
    AdminPaymentQuery,
    BankTransferInfo,
    MembershipDashboard,
    MemberPaymentsView,
    MyPaymentsView,
    Payment,
    PaymentMutationResult,
    SubscriptionListQuery,
)
from app.modules.payments.domain.exceptions import (
    PaymentConflictError,
    PaymentForbiddenError,
    PaymentNotFoundError,
    PaymentValidationError,
)
from app.modules.payments.domain.subscription import (
    MONTHLY_FEE,
    RENEWAL_REFERENCE,
    STATUS_APPROVED,
    STATUS_PENDING_PAYMENT,
    STATUS_PENDING_REVIEW,
    STATUS_REJECTED,
    amount_for_plan,
    as_money,
    canonicalize_payment_type,
    format_register_date,
    is_coverage_expired,
    parse_register_date,
    subscription_status_label,
    days_overdue,
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


@dataclass(frozen=True)
class CreatePaymentCommand:
    member_id: int
    type: str
    description: str
    amount: Decimal | str
    date_register: str


@dataclass(frozen=True)
class UpdatePaymentCommand:
    payment_id: int
    type: str
    description: str
    amount: Decimal | str
    date_register: str


class ListAdminPaymentsUseCase:
    def __init__(self, repository: PaymentsRepository) -> None:
        self.repository = repository

    def execute(self, query: AdminPaymentQuery):
        return self.repository.list_admin_payments(query)


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
        return MemberPaymentsView(
            member=member,
            items=self.repository.list_payments_for_user(member_id),
            subscription=_with_subscription_view(self.repository.get_subscription(member_id), today),
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
        )
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
        subscription = _with_subscription_view(self.repository.get_subscription(user_id), today)
        open_payment = self.repository.get_open_membership_payment(user_id)
        if (
            subscription is not None
            and is_coverage_expired(subscription.coverage_until, today)
            and open_payment is None
            and subscription.coverage_until is not None
        ):
            due = subscription.coverage_until
            open_payment = self.repository.ensure_pending_renewal(
                user_id=user_id,
                amount=MONTHLY_FEE,
                date_register=format_register_date(due + timedelta(days=1)),
                reference=RENEWAL_REFERENCE,
            )
        items = self.repository.list_payments_for_user(user_id)
        return MyPaymentsView(
            items=items,
            open_payment=open_payment,
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
        if open_payment is not None and open_payment.status == STATUS_PENDING_PAYMENT:
            return self.repository.update_pending_renewal(open_payment.id, amount), False

        subscription = self.repository.get_subscription(user_id)
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
