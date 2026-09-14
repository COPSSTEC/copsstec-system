from secrets import token_urlsafe

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password
from app.modules.auth.application.rbac import resolve_access_policy
from app.modules.membership.application.ports import (
    EmailPort,
    InvoiceGenerator,
    MailboxPort,
    MembershipFileStorage,
    MembershipRepository,
)
from app.modules.membership.domain.corporate_email import is_corporate_email, suggest_corporate_email
from app.modules.membership.domain.entities import (
    BLOOD_TYPES,
    ENABLED_STATE_ID,
    GATE_NONE,
    GENDERS,
    PAYMENT_APPROVED,
    PAYMENT_REVIEW,
    PENDING_ENABLE_STATE_ID,
    BankTransferInfo,
    MembershipPayment,
    MembershipRegistrationData,
    MembershipStatus,
    RegisteredMember,
)
from app.modules.membership.domain.exceptions import (
    MailboxError,
    MembershipConflictError,
    MembershipForbiddenError,
    MembershipNotFoundError,
    MembershipValidationError,
)


def _validate_registration(data: MembershipRegistrationData) -> None:
    required = {
        "nombres": data.names,
        "apellidos": data.lastname,
        "cédula": data.identifier,
        "correo": data.email,
        "fecha de nacimiento": data.birtday,
        "tipo de sangre": data.blood_type,
        "género": data.gender,
        "teléfono móvil": data.mobile_phone,
        "provincia": data.province,
        "ciudad": data.city,
        "calle principal": data.street_principal,
        "título de tercer nivel": data.title_academic,
        "código Senescyt": data.cod_senescyt,
    }
    missing = [name for name, value in required.items() if not str(value).strip()]
    if missing:
        raise MembershipValidationError(f"Campos obligatorios: {', '.join(missing)}.")

    if not data.accept_birthday_notifications or not data.accept_data_policy:
        raise MembershipValidationError("Debe aceptar las notificaciones de cumpleaños y la política de tratamiento de datos.")

    if data.blood_type not in BLOOD_TYPES:
        raise MembershipValidationError("Selecciona un tipo de sangre válido.")

    if data.gender not in GENDERS:
        raise MembershipValidationError("Selecciona un género válido.")

    fourth_title = (data.fourth_title or "").strip()
    senescyt_cuarto = (data.codigo_senescyt_cuarto or "").strip()
    if senescyt_cuarto and not fourth_title:
        raise MembershipValidationError(
            "El código Senescyt de cuarto nivel solo se registra si existe título de cuarto nivel.",
        )
    if fourth_title and not senescyt_cuarto:
        raise MembershipValidationError("El código Senescyt de cuarto nivel es obligatorio si tiene título de cuarto nivel.")


class RegisterMembershipUseCase:
    def __init__(self, repository: MembershipRepository, storage: MembershipFileStorage) -> None:
        self.repository = repository
        self.storage = storage

    def execute(
        self,
        data: MembershipRegistrationData,
        photo_filename: str,
        photo_content: bytes,
        photo_content_type: str,
    ) -> tuple[RegisteredMember, str]:
        _validate_registration(data)
        if not photo_content:
            raise MembershipValidationError("La foto de perfil es obligatoria.")
        if photo_content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise MembershipValidationError("La foto debe ser JPG, PNG o WEBP.")
        if len(photo_content) > 5 * 1024 * 1024:
            raise MembershipValidationError("La foto no puede superar 5 MB.")

        conflict = self.repository.find_conflict(data.identifier.strip(), data.email.strip())
        if conflict:
            raise MembershipConflictError(conflict)

        settings = get_settings()
        member = self.repository.register_member(
            data=data,
            password_hash=hash_password(token_urlsafe(24)),
            amount=settings.membership_fee,
            bank_name=settings.membership_bank_name,
            account_type=settings.membership_account_type,
            account_number=settings.membership_account_number,
            account_holder=settings.membership_account_holder,
            account_ruc=settings.membership_account_ruc,
        )
        foto_id = self.storage.save_photo(
            member.user_id,
            photo_filename,
            photo_content,
            photo_content_type,
        )
        self.repository.update_photo(member.user_id, foto_id)

        access_token = create_access_token(
            subject=member.user_id,
            roles=["miembro"],
            access_level="member",
        )
        return member, access_token


class GetMembershipStatusUseCase:
    def __init__(self, repository: MembershipRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int, roles: list[str]) -> MembershipStatus:
        policy = resolve_access_policy(roles)
        status = self.repository.get_status(user_id)
        if status is None:
            return MembershipStatus(
                user_id=user_id,
                state_id=ENABLED_STATE_ID,
                personal_email="",
                login_email="",
                payment_status=None,
                gate=GATE_NONE,
                must_complete_payment=False,
                must_wait_approval=False,
                has_invoice=False,
                names="",
                lastname="",
                identifier="",
            )

        if policy.access_level != "member":
            return MembershipStatus(
                user_id=status.user_id,
                state_id=status.state_id,
                personal_email=status.personal_email,
                login_email=status.login_email,
                payment_status=status.payment_status,
                gate=GATE_NONE,
                must_complete_payment=False,
                must_wait_approval=False,
                has_invoice=status.has_invoice,
                names=status.names,
                lastname=status.lastname,
                identifier=status.identifier,
            )
        return status


class GetPaymentInfoUseCase:
    def __init__(self, repository: MembershipRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int) -> BankTransferInfo:
        payment = self.repository.get_payment(user_id)
        if payment is None:
            raise MembershipNotFoundError()
        if payment.status == PAYMENT_APPROVED:
            raise MembershipForbiddenError("Tu afiliación ya fue aprobada.")

        qr_payload = (
            f"COPSSTEC afiliación\n"
            f"Banco: {payment.bank_name}\n"
            f"Tipo: {payment.account_type}\n"
            f"Cuenta: {payment.account_number}\n"
            f"Titular: {payment.account_holder}\n"
            f"Valor: {payment.currency} {payment.amount}\n"
            f"Referencia: {payment.reference}"
        )
        return BankTransferInfo(
            amount=payment.amount,
            currency=payment.currency,
            bank_name=payment.bank_name,
            account_type=payment.account_type,
            account_number=payment.account_number,
            account_holder=payment.account_holder,
            account_ruc=payment.account_ruc or "",
            reference=payment.reference,
            qr_payload=qr_payload,
        )


class UploadPaymentVoucherUseCase:
    def __init__(self, repository: MembershipRepository, storage: MembershipFileStorage) -> None:
        self.repository = repository
        self.storage = storage

    def execute(
        self,
        user_id: int,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> MembershipPayment:
        payment = self.repository.get_payment(user_id)
        if payment is None:
            raise MembershipNotFoundError()
        if payment.status == PAYMENT_APPROVED:
            raise MembershipConflictError("El pago ya fue aprobado.")

        voucher_path = self.storage.save_voucher(user_id, filename, content, content_type)
        return self.repository.save_voucher(user_id, voucher_path)


class GetMembershipInvoiceUseCase:
    def __init__(self, repository: MembershipRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int) -> tuple[str, str]:
        invoice = self.repository.get_invoice(user_id)
        if invoice is None:
            raise MembershipNotFoundError()
        return invoice.number, invoice.pdf_path


class GetApprovalPreviewUseCase:
    def __init__(self, repository: MembershipRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int) -> dict[str, object]:
        status = self.repository.get_status(user_id)
        payment = self.repository.get_payment(user_id)
        if status is None or payment is None:
            raise MembershipNotFoundError()
        if status.state_id != PENDING_ENABLE_STATE_ID:
            raise MembershipValidationError("Este miembro no está pendiente de habilitar.")
        if payment.status != PAYMENT_REVIEW:
            raise MembershipValidationError("El miembro aún no ha subido el comprobante de pago.")

        try:
            suggested = suggest_corporate_email(status.names, status.lastname)
        except ValueError as exc:
            raise MembershipValidationError(str(exc)) from exc
        return {
            "user_id": status.user_id,
            "names": status.names,
            "lastname": status.lastname,
            "identifier": status.identifier,
            "personal_email": status.personal_email,
            "suggested_corporate_email": suggested,
            "payment_status": payment.status,
            "voucher_url": payment.voucher_path,
            "amount": str(payment.amount),
        }


class ApproveMembershipUseCase:
    def __init__(
        self,
        repository: MembershipRepository,
        mailbox: MailboxPort,
        email_sender: EmailPort,
        invoices: InvoiceGenerator,
        storage: MembershipFileStorage,
    ) -> None:
        self.repository = repository
        self.mailbox = mailbox
        self.email_sender = email_sender
        self.invoices = invoices
        self.storage = storage

    def execute(self, user_id: int, email_corp: str, reviewed_by: int) -> RegisteredMember:
        settings = get_settings()
        corporate = (email_corp or "").strip().lower()
        if not is_corporate_email(corporate, settings.corporate_email_domain):
            raise MembershipValidationError(
                f"El correo corporativo debe usar el dominio @{settings.corporate_email_domain}.",
            )

        if self.repository.login_email_taken(corporate, exclude_user_id=user_id):
            raise MembershipConflictError("Ya existe un usuario con ese correo corporativo.")

        preview = GetApprovalPreviewUseCase(self.repository).execute(user_id)
        payment = self.repository.get_payment(user_id)
        if payment is None:
            raise MembershipNotFoundError()

        from datetime import UTC, datetime

        password = token_urlsafe(8)[:10]
        year = datetime.now(UTC).year
        invoice_number = self.repository.next_invoice_number(year)
        full_name = f"{preview['names']} {preview['lastname']}".strip()
        pdf = self.invoices.generate(
            number=invoice_number,
            member_name=full_name,
            identifier=str(preview["identifier"]),
            amount=str(payment.amount),
        )
        pdf_path = self.storage.save_invoice_pdf(user_id, invoice_number, pdf)

        try:
            self.mailbox.create_mailbox(corporate, password)
        except MailboxError:
            raise

        member = self.repository.approve_member(
            user_id=user_id,
            corporate_email=corporate,
            password_hash=hash_password(password),
            reviewed_by=reviewed_by,
            invoice_number=invoice_number,
            invoice_pdf_path=pdf_path,
        )

        personal = str(preview["personal_email"])
        self.email_sender.send(
            personal,
            "Tu correo corporativo COPSSTEC",
            (
                f"Hola {full_name},\n\n"
                f"Tu afiliación fue aprobada. Tu correo corporativo es {corporate}\n"
                f"Contraseña temporal: {password}\n\n"
                "Ingresa al sistema con ese correo corporativo.\n"
            ),
        )
        self.email_sender.send(
            corporate,
            "Bienvenido a COPSSTEC",
            (
                f"Hola {full_name},\n\n"
                f"Tu cuenta corporativa fue creada.\n"
                f"Usuario: {corporate}\n"
                f"Contraseña temporal: {password}\n"
            ),
        )
        return member
