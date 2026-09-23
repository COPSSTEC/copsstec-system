from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.membership.domain.entities import (
    ENABLED_STATE_ID,
    GATE_DOCUMENTS,
    GATE_PAYMENT,
    GATE_PENDING_APPROVAL,
    MEMBER_ROLE_NAME,
    PAYMENT_APPROVED,
    PAYMENT_PENDING,
    PAYMENT_REVIEW,
    PENDING_ENABLE_STATE_ID,
    USER_MODEL_TYPE,
    membership_gate_from_payment,
    onboarding_documents_complete,
    MembershipInvoice,
    MembershipPayment,
    MembershipRegistrationData,
    MembershipStatus,
    RegisteredMember,
)
from app.modules.membership.domain.exceptions import MembershipNotFoundError, MembershipValidationError
from app.shared.infrastructure.sequences import sync_serial_sequence


class SqlAlchemyMembershipRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def find_conflict(self, identifier: str, email: str) -> str | None:
        row = self.session.execute(
            text(
                """
                SELECT
                    EXISTS(
                        SELECT 1 FROM profiles WHERE lower(identifier) = lower(:identifier)
                    ) AS identifier_taken,
                    EXISTS(
                        SELECT 1 FROM profiles WHERE lower(email) = lower(:email)
                    ) AS profile_email_taken,
                    EXISTS(
                        SELECT 1 FROM users WHERE lower(email) = lower(:email)
                    ) AS login_email_taken
                """,
            ),
            {"identifier": identifier, "email": email},
        ).mappings().first()
        if row is None:
            return None
        if row["identifier_taken"]:
            return "Ya existe un miembro con esa cédula."
        if row["profile_email_taken"] or row["login_email_taken"]:
            return "Ya existe un miembro con ese correo."
        return None

    def login_email_taken(self, email: str, exclude_user_id: int | None = None) -> bool:
        row = self.session.execute(
            text(
                """
                SELECT EXISTS(
                    SELECT 1 FROM users
                    WHERE lower(email) = lower(:email)
                      AND (:exclude_user_id IS NULL OR id <> :exclude_user_id)
                ) AS taken
                """,
            ),
            {"email": email, "exclude_user_id": exclude_user_id},
        ).mappings().first()
        return bool(row and row["taken"])

    def register_member(
        self,
        data: MembershipRegistrationData,
        password_hash: str,
        amount: str,
        bank_name: str,
        account_type: str,
        account_number: str,
        account_holder: str,
        account_ruc: str,
    ) -> RegisteredMember:
        now = datetime.now(UTC).replace(tzinfo=None)
        sync_serial_sequence(self.session, "users")
        sync_serial_sequence(self.session, "profiles")
        sync_serial_sequence(self.session, "membership_payments")
        full_name = f"{data.names.strip()} {data.lastname.strip()}".strip()
        today = f"{now.day:02d}/{now.month:02d}/{now.year}"
        fourth_title = (data.fourth_title or "").strip() or None
        senescyt_cuarto = (data.codigo_senescyt_cuarto or "").strip() or None

        user_id = self.session.execute(
            text(
                """
                INSERT INTO users (name, email, password, state_id, created_at, updated_at)
                VALUES (:name, :email, :password, :state_id, :now, :now)
                RETURNING id
                """,
            ),
            {
                "name": full_name,
                "email": data.email.strip().lower(),
                "password": password_hash,
                "state_id": PENDING_ENABLE_STATE_ID,
                "now": now,
            },
        ).scalar_one()

        role_id = self.session.execute(
            text("SELECT id FROM roles WHERE name = :name LIMIT 1"),
            {"name": MEMBER_ROLE_NAME},
        ).scalar_one()

        self.session.execute(
            text(
                """
                INSERT INTO model_has_roles (role_id, model_id, model_type)
                VALUES (:role_id, :model_id, :model_type)
                """,
            ),
            {"role_id": role_id, "model_id": user_id, "model_type": USER_MODEL_TYPE},
        )

        profile_id = self.session.execute(
            text(
                """
                INSERT INTO profiles (
                    user_id, names, lastname, identifier, email, birtday, blood_type,
                    mobile_phone, fixed_phone, title_academic, level_academic, cod_senescyt,
                    date_register, linkdink, want_notifications, is_work, foto_id,
                    province, city, street_principal, street_secondary, state_id,
                    type_profile, fourth_title, type_commision, codigo_senescyt_cuarto,
                    gender, created_at, updated_at
                )
                VALUES (
                    :user_id, :names, :lastname, :identifier, :email, :birtday, :blood_type,
                    :mobile_phone, :fixed_phone, :title_academic, :level_academic, :cod_senescyt,
                    :date_register, '', :want_notifications, false, '',
                    :province, :city, :street_principal, :street_secondary, :state_id,
                    'miembro', :fourth_title, 'NA', :codigo_senescyt_cuarto,
                    :gender, :now, :now
                )
                RETURNING id
                """,
            ),
            {
                "user_id": user_id,
                "names": data.names.strip(),
                "lastname": data.lastname.strip(),
                "identifier": data.identifier.strip(),
                "email": data.email.strip().lower(),
                "birtday": data.birtday.strip(),
                "blood_type": data.blood_type,
                "mobile_phone": data.mobile_phone.strip(),
                "fixed_phone": (data.fixed_phone or "").strip(),
                "title_academic": data.title_academic.strip(),
                "level_academic": data.title_academic.strip(),
                "cod_senescyt": data.cod_senescyt.strip(),
                "date_register": today,
                "want_notifications": data.accept_birthday_notifications,
                "province": data.province.strip(),
                "city": data.city.strip(),
                "street_principal": data.street_principal.strip(),
                "street_secondary": (data.street_secondary or "").strip(),
                "state_id": PENDING_ENABLE_STATE_ID,
                "fourth_title": fourth_title,
                "codigo_senescyt_cuarto": senescyt_cuarto if fourth_title else None,
                "gender": data.gender,
                "now": now,
            },
        ).scalar_one()

        payment_id = self.session.execute(
            text(
                """
                INSERT INTO membership_payments (
                    user_id, profile_id, amount, currency, bank_name, account_type,
                    account_number, account_holder, account_ruc, reference, status,
                    created_at, updated_at
                )
                VALUES (
                    :user_id, :profile_id, :amount, 'USD', :bank_name, :account_type,
                    :account_number, :account_holder, :account_ruc, :reference, :status,
                    :now, :now
                )
                RETURNING id
                """,
            ),
            {
                "user_id": user_id,
                "profile_id": profile_id,
                "amount": amount,
                "bank_name": bank_name,
                "account_type": account_type,
                "account_number": account_number,
                "account_holder": account_holder,
                "account_ruc": account_ruc or None,
                "reference": data.identifier.strip(),
                "status": PAYMENT_PENDING,
                "now": now,
            },
        ).scalar_one()

        self.session.commit()
        payment = self.get_payment(user_id)
        if payment is None:
            raise MembershipValidationError("No se pudo crear el pago de afiliación.")
        _ = payment_id
        return RegisteredMember(
            user_id=user_id,
            profile_id=profile_id,
            name=full_name,
            email=data.email.strip().lower(),
            state_id=PENDING_ENABLE_STATE_ID,
            payment=payment,
        )

    def update_photo(self, user_id: int, foto_id: str) -> None:
        now = datetime.now(UTC).replace(tzinfo=None)
        self.session.execute(
            text("UPDATE profiles SET foto_id = :foto_id, updated_at = :now WHERE user_id = :user_id"),
            {"foto_id": foto_id, "now": now, "user_id": user_id},
        )
        self.session.commit()

    def get_status(self, user_id: int) -> MembershipStatus | None:
        row = self.session.execute(
            text(
                """
                SELECT
                    u.id AS user_id,
                    u.state_id,
                    u.email AS login_email,
                    COALESCE(p.email, u.email) AS personal_email,
                    COALESCE(p.names, '') AS names,
                    COALESCE(p.lastname, '') AS lastname,
                    COALESCE(p.identifier, '') AS identifier,
                    COALESCE(p.city, '') AS city,
                    mp.status AS payment_status,
                    mp.signed_authorization_path,
                    mp.identity_document_path,
                    mp.signed_solicitud_path,
                    COALESCE(mp.accepted_affiliation_year, false) AS accepted_affiliation_year,
                    COALESCE(mp.member_account_type, '') AS member_account_type,
                    COALESCE(mp.member_account_number, '') AS member_account_number,
                    COALESCE(mp.member_bank_name, '') AS member_bank_name,
                    EXISTS(
                        SELECT 1 FROM membership_invoices mi WHERE mi.user_id = u.id
                    ) AS has_invoice,
                    ms.coverage_until,
                    COALESCE(ms.credit_balance, 0) AS credit_balance,
                    (
                        SELECT pay.status FROM payments pay
                        WHERE pay.user_id = u.id
                          AND lower(pay.type) IN ('membresía', 'membresia')
                          AND pay.status IN ('pending_payment', 'pending_review')
                        ORDER BY pay.id DESC
                        LIMIT 1
                    ) AS open_payment_status
                FROM users u
                LEFT JOIN profiles p ON p.user_id = u.id
                LEFT JOIN membership_payments mp ON mp.user_id = u.id
                LEFT JOIN member_subscriptions ms ON ms.user_id = u.id
                WHERE u.id = :user_id
                LIMIT 1
                """,
            ),
            {"user_id": user_id},
        ).mappings().first()
        if row is None:
            return None

        payment_status = row["payment_status"]
        state_id = int(row["state_id"])
        has_invoice = bool(row["has_invoice"])
        signed_path = row["signed_authorization_path"]
        identity_path = row["identity_document_path"]
        solicitud_path = row["signed_solicitud_path"]
        accepted_year = bool(row["accepted_affiliation_year"])
        has_signed = bool((signed_path or "").strip())
        has_identity = bool((identity_path or "").strip())
        has_solicitud = bool((solicitud_path or "").strip())
        documents_ok = onboarding_documents_complete(
            signed_path,
            identity_path,
            solicitud_path,
            accepted_year,
        )
        gate = membership_gate_from_payment(state_id, payment_status, has_invoice, documents_ok)
        return MembershipStatus(
            user_id=int(row["user_id"]),
            state_id=state_id,
            personal_email=row["personal_email"],
            login_email=row["login_email"],
            payment_status=payment_status,
            gate=gate,
            must_complete_payment=gate == GATE_PAYMENT,
            must_wait_approval=gate == GATE_PENDING_APPROVAL,
            has_invoice=has_invoice,
            names=row["names"],
            lastname=row["lastname"],
            identifier=row["identifier"],
            must_pay_subscription=False,
            coverage_until=row["coverage_until"],
            credit_balance=Decimal(str(row["credit_balance"] or 0)),
            days_overdue=0,
            open_payment_status=row["open_payment_status"],
            must_upload_documents=gate == GATE_DOCUMENTS,
            has_signed_authorization=has_signed,
            has_identity_document=has_identity,
            has_signed_solicitud=has_solicitud,
            accepted_affiliation_year=accepted_year,
            member_account_type=row["member_account_type"] or "",
            member_account_number=row["member_account_number"] or "",
            member_bank_name=row["member_bank_name"] or "",
            city=row["city"] or "",
        )

    def get_payment(self, user_id: int) -> MembershipPayment | None:
        row = self.session.execute(
            text(
                """
                SELECT id, user_id, profile_id, amount, currency, bank_name, account_type,
                       account_number, account_holder, account_ruc, reference, voucher_path,
                       status, reviewed_by, reviewed_at, signed_authorization_path,
                       identity_document_path, documents_uploaded_at, member_account_type,
                       member_account_number, member_bank_name, signed_solicitud_path,
                       COALESCE(accepted_affiliation_year, false) AS accepted_affiliation_year
                FROM membership_payments
                WHERE user_id = :user_id
                LIMIT 1
                """,
            ),
            {"user_id": user_id},
        ).mappings().first()
        if row is None:
            return None
        return self._to_payment(row)

    def save_voucher(self, user_id: int, voucher_path: str) -> MembershipPayment:
        now = datetime.now(UTC).replace(tzinfo=None)
        updated = self.session.execute(
            text(
                """
                UPDATE membership_payments
                SET voucher_path = :voucher_path,
                    status = :status,
                    updated_at = :now
                WHERE user_id = :user_id
                """,
            ),
            {
                "voucher_path": voucher_path,
                "status": PAYMENT_REVIEW,
                "now": now,
                "user_id": user_id,
            },
        ).rowcount
        if not updated:
            raise MembershipNotFoundError()
        self.session.commit()
        payment = self.get_payment(user_id)
        if payment is None:
            raise MembershipNotFoundError()
        return payment

    def save_bank_details(
        self,
        user_id: int,
        account_type: str,
        account_number: str,
        bank_name: str,
    ) -> MembershipPayment:
        now = datetime.now(UTC).replace(tzinfo=None)
        updated = self.session.execute(
            text(
                """
                UPDATE membership_payments
                SET member_account_type = :account_type,
                    member_account_number = :account_number,
                    member_bank_name = :bank_name,
                    updated_at = :now
                WHERE user_id = :user_id
                """,
            ),
            {
                "account_type": account_type,
                "account_number": account_number,
                "bank_name": bank_name,
                "now": now,
                "user_id": user_id,
            },
        ).rowcount
        if not updated:
            raise MembershipNotFoundError()
        self.session.commit()
        payment = self.get_payment(user_id)
        if payment is None:
            raise MembershipNotFoundError()
        return payment

    def save_onboarding_documents(
        self,
        user_id: int,
        signed_authorization_path: str | None,
        identity_document_path: str | None,
        signed_solicitud_path: str | None = None,
        accepted_affiliation_year: bool | None = None,
    ) -> MembershipPayment:
        now = datetime.now(UTC).replace(tzinfo=None)
        updated = self.session.execute(
            text(
                """
                UPDATE membership_payments
                SET signed_authorization_path = COALESCE(:signed_authorization_path, signed_authorization_path),
                    identity_document_path = COALESCE(:identity_document_path, identity_document_path),
                    signed_solicitud_path = COALESCE(:signed_solicitud_path, signed_solicitud_path),
                    accepted_affiliation_year = CASE
                        WHEN :accepted_affiliation_year IS NULL THEN accepted_affiliation_year
                        ELSE :accepted_affiliation_year
                    END,
                    documents_uploaded_at = CASE
                        WHEN COALESCE(:signed_authorization_path, signed_authorization_path) IS NOT NULL
                         AND COALESCE(:signed_authorization_path, signed_authorization_path) <> ''
                         AND COALESCE(:identity_document_path, identity_document_path) IS NOT NULL
                         AND COALESCE(:identity_document_path, identity_document_path) <> ''
                         AND COALESCE(:signed_solicitud_path, signed_solicitud_path) IS NOT NULL
                         AND COALESCE(:signed_solicitud_path, signed_solicitud_path) <> ''
                         AND COALESCE(:accepted_affiliation_year, accepted_affiliation_year, false) = true
                        THEN :now
                        ELSE documents_uploaded_at
                    END,
                    updated_at = :now
                WHERE user_id = :user_id
                """,
            ),
            {
                "signed_authorization_path": signed_authorization_path,
                "identity_document_path": identity_document_path,
                "signed_solicitud_path": signed_solicitud_path,
                "accepted_affiliation_year": accepted_affiliation_year,
                "now": now,
                "user_id": user_id,
            },
        ).rowcount
        if not updated:
            raise MembershipNotFoundError()
        self.session.commit()
        payment = self.get_payment(user_id)
        if payment is None:
            raise MembershipNotFoundError()
        return payment

    def get_invoice(self, user_id: int) -> MembershipInvoice | None:
        row = self.session.execute(
            text(
                """
                SELECT id, payment_id, user_id, number, amount, pdf_path, issued_at
                FROM membership_invoices
                WHERE user_id = :user_id
                LIMIT 1
                """,
            ),
            {"user_id": user_id},
        ).mappings().first()
        if row is None:
            return None
        return MembershipInvoice(
            id=int(row["id"]),
            payment_id=int(row["payment_id"]),
            user_id=int(row["user_id"]),
            number=row["number"],
            amount=Decimal(str(row["amount"])),
            pdf_path=row["pdf_path"],
            issued_at=row["issued_at"],
        )

    def next_invoice_number(self, year: int) -> str:
        row = self.session.execute(
            text(
                """
                SELECT number FROM membership_invoices
                WHERE number LIKE :prefix
                ORDER BY number DESC
                LIMIT 1
                """,
            ),
            {"prefix": f"AFI-{year}-%"},
        ).mappings().first()
        seq = 1
        if row and row["number"]:
            try:
                seq = int(str(row["number"]).split("-")[-1]) + 1
            except ValueError:
                seq = 1
        return f"AFI-{year}-{seq:04d}"

    def approve_member(
        self,
        user_id: int,
        corporate_email: str,
        password_hash: str,
        reviewed_by: int,
        invoice_number: str,
        invoice_pdf_path: str,
    ) -> RegisteredMember:
        now = datetime.now(UTC).replace(tzinfo=None)
        payment = self.get_payment(user_id)
        if payment is None:
            raise MembershipNotFoundError()
        sync_serial_sequence(self.session, "membership_invoices")

        self.session.execute(
            text(
                """
                UPDATE users
                SET email = :email, password = :password, state_id = :state_id,
                    must_change_password = true, updated_at = :now
                WHERE id = :user_id
                """,
            ),
            {
                "email": corporate_email,
                "password": password_hash,
                "state_id": ENABLED_STATE_ID,
                "now": now,
                "user_id": user_id,
            },
        )
        self.session.execute(
            text(
                """
                UPDATE profiles
                SET state_id = :state_id, updated_at = :now
                WHERE user_id = :user_id
                """,
            ),
            {"state_id": ENABLED_STATE_ID, "now": now, "user_id": user_id},
        )
        self.session.execute(
            text(
                """
                UPDATE membership_payments
                SET status = :status, reviewed_by = :reviewed_by, reviewed_at = :now, updated_at = :now
                WHERE user_id = :user_id
                """,
            ),
            {
                "status": PAYMENT_APPROVED,
                "reviewed_by": reviewed_by,
                "now": now,
                "user_id": user_id,
            },
        )
        self.session.execute(
            text(
                """
                INSERT INTO membership_invoices (
                    payment_id, user_id, number, amount, pdf_path, issued_at
                )
                VALUES (:payment_id, :user_id, :number, :amount, :pdf_path, :now)
                """,
            ),
            {
                "payment_id": payment.id,
                "user_id": user_id,
                "number": invoice_number,
                "amount": str(payment.amount),
                "pdf_path": invoice_pdf_path,
                "now": now,
            },
        )
        self.session.commit()

        status = self.get_status(user_id)
        approved_payment = self.get_payment(user_id)
        if status is None or approved_payment is None:
            raise MembershipNotFoundError()
        return RegisteredMember(
            user_id=user_id,
            profile_id=approved_payment.profile_id,
            name=f"{status.names} {status.lastname}".strip(),
            email=corporate_email,
            state_id=ENABLED_STATE_ID,
            payment=approved_payment,
        )

    def _to_payment(self, row: Any) -> MembershipPayment:
        return MembershipPayment(
            id=int(row["id"]),
            user_id=int(row["user_id"]),
            profile_id=int(row["profile_id"]),
            amount=Decimal(str(row["amount"])),
            currency=row["currency"],
            bank_name=row["bank_name"],
            account_type=row["account_type"],
            account_number=row["account_number"],
            account_holder=row["account_holder"],
            account_ruc=row["account_ruc"],
            reference=row["reference"],
            voucher_path=row["voucher_path"],
            status=row["status"],
            reviewed_by=int(row["reviewed_by"]) if row["reviewed_by"] is not None else None,
            reviewed_at=row["reviewed_at"],
            signed_authorization_path=row["signed_authorization_path"],
            identity_document_path=row["identity_document_path"],
            documents_uploaded_at=row["documents_uploaded_at"],
            member_account_type=row.get("member_account_type"),
            member_account_number=row.get("member_account_number"),
            member_bank_name=row.get("member_bank_name"),
            signed_solicitud_path=row.get("signed_solicitud_path"),
            accepted_affiliation_year=bool(row.get("accepted_affiliation_year")),
        )
