from secrets import token_urlsafe
from dataclasses import replace
from datetime import date
from decimal import Decimal
from pathlib import Path

from app.core.config import get_settings, live_membership_transfer
from app.core.security import hash_password
from app.modules.auth.application.rbac import resolve_access_policy
from app.modules.auth.application.session import RefreshTokenWriter, issue_session_tokens
from app.modules.membership.application.ports import (
    AuthorizationPdfGenerator,
    EmailPort,
    InvoiceGenerator,
    MailboxPort,
    MembershipFileStorage,
    MembershipRepository,
    RecordAffiliationPaymentPort,
)
from app.modules.membership.domain.cedula import CEDULA_INVALID_MESSAGE, is_valid_ecuadorian_cedula
from app.modules.membership.domain.corporate_email import is_corporate_email, suggest_corporate_email
from app.modules.membership.domain.entities import (
    ACCOUNT_TYPES,
    DEBIT_PLANS,
    BLOOD_TYPES,
    ENABLED_STATE_ID,
    GATE_DOCUMENTS,
    GATE_NONE,
    GATE_PAYMENT,
    GATE_PENDING_APPROVAL,
    GATE_SUBSCRIPTION_DUE,
    GENDERS,
    PAYMENT_APPROVED,
    PAYMENT_REVIEW,
    PENDING_ENABLE_STATE_ID,
    BankTransferInfo,
    MembershipPayment,
    MembershipRegistrationData,
    MembershipStatus,
    RegisteredMember,
    membership_gate_from_payment,
    onboarding_documents_complete,
)
from app.modules.membership.domain.exceptions import (
    MailboxError,
    MembershipConflictError,
    MembershipForbiddenError,
    MembershipNotFoundError,
    MembershipValidationError,
)
from app.modules.payments.domain.subscription import apply_subscription_gate, days_overdue


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

    if not is_valid_ecuadorian_cedula(data.identifier):
        raise MembershipValidationError(CEDULA_INVALID_MESSAGE)

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
    def __init__(
        self,
        repository: MembershipRepository,
        storage: MembershipFileStorage,
        email_sender: EmailPort | None = None,
        *,
        token_store: RefreshTokenWriter,
    ) -> None:
        self.repository = repository
        self.storage = storage
        self.email_sender = email_sender
        self.token_store = token_store

    def execute(
        self,
        data: MembershipRegistrationData,
        photo_filename: str,
        photo_content: bytes,
        photo_content_type: str,
    ) -> tuple[RegisteredMember, str, str]:
        _validate_registration(data)
        if not photo_content:
            raise MembershipValidationError("La foto de perfil es obligatoria.")
        if photo_content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise MembershipValidationError("La foto debe ser JPG, PNG o WEBP.")
        if len(photo_content) > 5 * 1024 * 1024:
            raise MembershipValidationError("La foto no puede superar 5 MB.")

        conflict = self.repository.find_conflict(data.identifier.strip(), data.email.strip())
        if conflict:
            code = "identifier_taken" if "cédula" in conflict.lower() else "email_taken"
            raise MembershipConflictError(conflict, code=code)

        transfer = live_membership_transfer()
        member = self.repository.register_member(
            data=data,
            password_hash=hash_password(token_urlsafe(24)),
            amount=transfer.fee,
            bank_name=transfer.bank_name,
            account_type=transfer.account_type,
            account_number=transfer.account_number,
            account_holder=transfer.account_holder,
            account_ruc=transfer.account_ruc,
        )
        foto_id = self.storage.save_photo(
            member.user_id,
            photo_filename,
            photo_content,
            photo_content_type,
        )
        self.repository.update_photo(member.user_id, foto_id)

        access_token, refresh_token = issue_session_tokens(
            self.token_store,
            user_id=member.user_id,
            roles=["miembro"],
            access_level="member",
        )
        if self.email_sender:
            admin = get_settings().mail_admin_notifications
            if admin:
                self.email_sender.send_template(
                    admin,
                    "new_member_admin",
                    {
                        "nombres": f"{data.names} {data.lastname}".strip(),
                        "email": data.email,
                    },
                )
        return member, access_token, refresh_token


class GetMembershipStatusUseCase:
    def __init__(self, repository: MembershipRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int, roles: list[str], today: date | None = None) -> MembershipStatus:
        today = today or date.today()
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
                must_pay_subscription=False,
                coverage_until=None,
                credit_balance=Decimal("0.00"),
                days_overdue=0,
                open_payment_status=None,
            )

        overdue = days_overdue(status.coverage_until, today)
        if policy.access_level != "member" and status.state_id != PENDING_ENABLE_STATE_ID:
            return replace(
                status,
                gate=GATE_NONE,
                must_complete_payment=False,
                must_wait_approval=False,
                must_upload_documents=False,
                must_pay_subscription=False,
                days_overdue=overdue,
            )

        gate = membership_gate_from_payment(
            status.state_id,
            status.payment_status,
            status.has_invoice,
            status.has_signed_authorization
            and status.has_identity_document
            and status.has_signed_solicitud
            and status.accepted_affiliation_year,
        )
        if gate == GATE_NONE:
            gate = apply_subscription_gate(
                GATE_NONE,
                status.coverage_until,
                status.credit_balance,
                today,
            )
        return replace(
            status,
            gate=gate,
            must_complete_payment=gate == GATE_PAYMENT,
            must_wait_approval=gate == GATE_PENDING_APPROVAL,
            must_upload_documents=gate == GATE_DOCUMENTS,
            must_pay_subscription=gate == GATE_SUBSCRIPTION_DUE,
            days_overdue=overdue,
        )


class GetPaymentInfoUseCase:
    def __init__(self, repository: MembershipRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int) -> BankTransferInfo:
        payment = self.repository.get_payment(user_id)
        if payment is None:
            raise MembershipNotFoundError()
        if payment.status == PAYMENT_APPROVED:
            raise MembershipForbiddenError("Tu afiliación ya fue aprobada.")

        transfer = live_membership_transfer()
        try:
            amount = Decimal(str(transfer.fee).strip())
        except Exception:
            amount = payment.amount
        qr_payload = (
            f"COPSSTEC afiliación\n"
            f"Banco: {transfer.bank_name}\n"
            f"Tipo: {transfer.account_type}\n"
            f"Cuenta: {transfer.account_number}\n"
            f"Titular: {transfer.account_holder}\n"
            f"Valor: {payment.currency} {amount}\n"
            f"Referencia: {payment.reference}"
        )
        return BankTransferInfo(
            amount=amount,
            currency=payment.currency,
            bank_name=transfer.bank_name,
            account_type=transfer.account_type,
            account_number=transfer.account_number,
            account_holder=transfer.account_holder,
            account_ruc=transfer.account_ruc or "",
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
            "signed_authorization_url": payment.signed_authorization_path,
            "identity_document_url": payment.identity_document_path,
            "signed_solicitud_url": payment.signed_solicitud_path,
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
        affiliation_payment: RecordAffiliationPaymentPort | None = None,
    ) -> None:
        self.repository = repository
        self.mailbox = mailbox
        self.email_sender = email_sender
        self.invoices = invoices
        self.storage = storage
        self.affiliation_payment = affiliation_payment

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
        if not onboarding_documents_complete(
            payment.signed_authorization_path,
            payment.identity_document_path,
            payment.signed_solicitud_path,
            payment.accepted_affiliation_year,
        ):
            raise MembershipValidationError(
                "Faltan la autorización firmada, la cédula, la solicitud firmada o la aceptación de afiliación por 1 año.",
            )

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

        if self.affiliation_payment is not None:
            self.affiliation_payment.record_affiliation_payment(
                user_id=user_id,
                amount=payment.amount,
                payment_date=date.today(),
            )

        personal = str(preview["personal_email"])
        self.email_sender.send_template(
            personal,
            "corporate_mailbox",
            {"nombres": full_name, "email": corporate, "password": password},
        )
        self.email_sender.send_template(
            corporate,
            "access_credentials",
            {"nombres": full_name, "email": corporate, "password": password},
        )
        return member


class DownloadAuthorizationPdfUseCase:
    def __init__(
        self,
        repository: MembershipRepository,
        pdf_generator: AuthorizationPdfGenerator,
    ) -> None:
        self.repository = repository
        self.pdf_generator = pdf_generator

    def execute(self, user_id: int, today: date | None = None) -> bytes:
        payment = self.repository.get_payment(user_id)
        if payment is None:
            raise MembershipNotFoundError()
        if payment.status != PAYMENT_REVIEW:
            raise MembershipForbiddenError("La autorización solo está disponible después de subir el comprobante.")

        status = self.repository.get_status(user_id)
        if status is None:
            raise MembershipNotFoundError()

        account_type = (payment.member_account_type or "").strip()
        account_number = (payment.member_account_number or "").strip()
        bank_name = (payment.member_bank_name or "").strip()
        debit_plan = (payment.member_debit_plan or "").strip()
        if account_type not in ACCOUNT_TYPES or not account_number or not bank_name:
            raise MembershipValidationError(
                "Debes registrar el tipo de cuenta, el número y la entidad bancaria antes de descargar la autorización.",
            )
        if debit_plan not in DEBIT_PLANS:
            raise MembershipValidationError(
                "Debes elegir el valor de débito (mensual, trimestral, semestral o anual) antes de descargar la autorización.",
            )

        return self.pdf_generator.generate(
            names=status.names,
            lastname=status.lastname,
            identifier=status.identifier,
            city=status.city,
            issued_on=today or date.today(),
            account_type=account_type,
            account_number=account_number,
            bank_name=bank_name,
            debit_plan=debit_plan,
        )


class SaveBankDetailsUseCase:
    def __init__(self, repository: MembershipRepository) -> None:
        self.repository = repository

    def execute(
        self,
        user_id: int,
        account_type: str,
        account_number: str,
        bank_name: str,
        debit_plan: str,
    ) -> MembershipStatus:
        payment = self.repository.get_payment(user_id)
        if payment is None:
            raise MembershipNotFoundError()
        if payment.status == PAYMENT_APPROVED:
            raise MembershipForbiddenError("Tu afiliación ya fue aprobada.")
        if payment.status != PAYMENT_REVIEW:
            raise MembershipForbiddenError("Debes subir el comprobante de pago antes de registrar los datos bancarios.")

        kind = account_type.strip().capitalize()
        if kind == "Ahorro":
            kind = "Ahorros"
        if kind not in ACCOUNT_TYPES:
            raise MembershipValidationError("El tipo de cuenta debe ser Corriente o Ahorros.")
        number = "".join(character for character in account_number if character.isdigit() or character.isalnum())
        bank = bank_name.strip()
        if len(number) < 6:
            raise MembershipValidationError("El número de cuenta es obligatorio.")
        if len(bank) < 3:
            raise MembershipValidationError("La entidad bancaria es obligatoria.")
        plan = debit_plan.strip()
        if plan not in DEBIT_PLANS:
            raise MembershipValidationError(
                "Debes elegir el valor de débito: mensual, trimestral, semestral o anual.",
            )

        self.repository.save_bank_details(user_id, kind, number.strip(), bank, plan)
        status = self.repository.get_status(user_id)
        if status is None:
            raise MembershipNotFoundError()
        return status


class DownloadSolicitudPdfUseCase:
    def __init__(self, member_lookup, pdf_generator, membership_repository: MembershipRepository) -> None:
        self.member_lookup = member_lookup
        self.pdf_generator = pdf_generator
        self.membership_repository = membership_repository

    def execute(self, user_id: int) -> bytes:
        payment = self.membership_repository.get_payment(user_id)
        if payment is None:
            raise MembershipNotFoundError()
        if payment.status != PAYMENT_REVIEW:
            raise MembershipForbiddenError("La solicitud solo está disponible después de subir el comprobante.")
        member = self.member_lookup.get_member(user_id)
        if member is None:
            raise MembershipNotFoundError()
        return self.pdf_generator.generate_solicitud(member)


class UploadOnboardingDocumentsUseCase:
    def __init__(self, repository: MembershipRepository, storage: MembershipFileStorage) -> None:
        self.repository = repository
        self.storage = storage

    def execute(
        self,
        user_id: int,
        signed_authorization: tuple[str, bytes, str] | None,
        identity_document: tuple[str, bytes, str] | None,
        signed_solicitud: tuple[str, bytes, str] | None = None,
        accepted_affiliation_year: bool | None = None,
    ) -> tuple[MembershipPayment, MembershipStatus]:
        payment = self.repository.get_payment(user_id)
        if payment is None:
            raise MembershipNotFoundError()
        if payment.status == PAYMENT_APPROVED:
            raise MembershipForbiddenError("Tu afiliación ya fue aprobada.")
        if payment.status != PAYMENT_REVIEW:
            raise MembershipForbiddenError("Debes subir el comprobante de pago antes de enviar los documentos.")

        auth_upload = signed_authorization if signed_authorization and signed_authorization[1] else None
        identity_upload = identity_document if identity_document and identity_document[1] else None
        solicitud_upload = signed_solicitud if signed_solicitud and signed_solicitud[1] else None
        if auth_upload is None and identity_upload is None and solicitud_upload is None and accepted_affiliation_year is None:
            raise MembershipValidationError("Debe adjuntar al menos un archivo PDF o aceptar la afiliación de 1 año.")

        has_signed = bool((payment.signed_authorization_path or "").strip())
        has_identity = bool((payment.identity_document_path or "").strip())
        has_solicitud = bool((payment.signed_solicitud_path or "").strip())
        if not has_signed and auth_upload is None:
            raise MembershipValidationError("La autorización firmada es obligatoria.")
        if not has_identity and identity_upload is None:
            raise MembershipValidationError("La copia de cédula es obligatoria.")
        if not has_solicitud and solicitud_upload is None:
            raise MembershipValidationError("La solicitud firmada a mano es obligatoria.")
        if not payment.accepted_affiliation_year and not accepted_affiliation_year:
            raise MembershipValidationError("Debes aceptar permanecer afiliado 1 año al colegio.")

        signed_path = None
        identity_path = None
        solicitud_path = None
        if auth_upload is not None:
            filename, content, content_type = auth_upload
            signed_path = self.storage.save_pdf(user_id, "authorization", filename, content, content_type)
        if identity_upload is not None:
            filename, content, content_type = identity_upload
            identity_path = self.storage.save_pdf(user_id, "identity", filename, content, content_type)
        if solicitud_upload is not None:
            filename, content, content_type = solicitud_upload
            solicitud_path = self.storage.save_pdf(user_id, "solicitud", filename, content, content_type)

        updated = self.repository.save_onboarding_documents(
            user_id,
            signed_path,
            identity_path,
            solicitud_path,
            True if accepted_affiliation_year else None,
        )
        status = self.repository.get_status(user_id)
        if status is None:
            raise MembershipNotFoundError()
        return updated, status


class DownloadOnboardingDocumentUseCase:
    def __init__(self, repository: MembershipRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int, kind: str) -> tuple[str, Path]:
        if kind not in {"authorization", "identity", "voucher", "solicitud"}:
            raise MembershipValidationError("Documento no válido.")
        payment = self.repository.get_payment(user_id)
        if payment is None:
            raise MembershipNotFoundError()
        stored = {
            "authorization": payment.signed_authorization_path,
            "identity": payment.identity_document_path,
            "voucher": payment.voucher_path,
            "solicitud": payment.signed_solicitud_path,
        }[kind]
        if not (stored or "").strip():
            raise MembershipNotFoundError()

        relative = stored.replace("/media/membership/", "").lstrip("/")
        candidates = [
            Path("storage/membership") / relative,
            Path(__file__).resolve().parents[4] / "storage" / "membership" / relative,
            Path(stored),
        ]
        file_path = next((path for path in candidates if path.is_file()), None)
        if file_path is None:
            raise MembershipNotFoundError()

        suffix = file_path.suffix or ".pdf"
        filenames = {
            "authorization": f"autorizacion-firmada{suffix}",
            "identity": f"cedula{suffix}",
            "voucher": f"comprobante{suffix}",
            "solicitud": f"solicitud-firmada{suffix}",
        }
        return filenames[kind], file_path
