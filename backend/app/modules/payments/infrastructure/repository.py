from datetime import UTC, date, datetime
from decimal import Decimal
from hashlib import sha256
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.payments.domain.entities import (
    AdminPaymentQuery,
    AffiliationRow,
    AgreementMemberContext,
    DebitAgreement,
    MemberHeader,
    MemberSubscription,
    Payment,
    PaymentAdminStats,
    PaymentListResult,
    PublicAgreementView,
    SubscriptionListQuery,
    SubscriptionListResult,
)
from app.modules.payments.domain.exceptions import PaymentConflictError, PaymentNotFoundError
from app.modules.payments.domain.subscription import (
    AGREEMENT_NONE,
    AGREEMENT_SENT,
    AGREEMENT_STATUSES,
    BALANCE_STATUSES,
    MEMBERSHIP_TYPE_ALIASES,
    PAYMENT_TYPE_MEMBERSHIP,
    STATUS_APPROVED,
    STATUS_PENDING_PAYMENT,
    STATUS_PENDING_REVIEW,
    STATUS_REJECTED,
    balance_status_from_pending,
    cents_from_dollars,
    days_overdue,
    dollars_from_cents,
    first_renewal_date,
    format_register_date,
    is_membership_type,
    parse_register_date,
    pending_membership_balance,
    replay,
    resolve_enrollment_date,
    subscription_status_label,
)
from app.shared.infrastructure.sequences import sync_serial_sequence

USER_MODEL_TYPE = r"App\Models\User"
MEMBER_ROLE_NAME = "miembro"

PAYMENT_SELECT = """
    SELECT
        p.id,
        p.user_id,
        COALESCE(pr.names, '') AS names,
        COALESCE(pr.lastname, '') AS lastname,
        COALESCE(pr.identifier, '') AS identifier,
        p.type,
        p.reference,
        p.total,
        p.date_register,
        p.last_digits,
        p.status,
        p.voucher_path,
        p.created_at,
        p.updated_at,
        p.reviewed_by,
        p.reviewed_at,
        p.admin_observation,
        p.trans_id,
        p.client_id
    FROM payments p
    LEFT JOIN profiles pr ON pr.user_id = p.user_id
"""

SORT_COLUMNS = {
    "date_register": (
        "CASE WHEN p.date_register ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' "
        "THEN to_date(p.date_register, 'DD/MM/YYYY') END"
    ),
    "total": "CASE WHEN p.total ~ '^[0-9]+(\\.[0-9]+)?$' THEN p.total::numeric ELSE 0 END",
    "created_at": "p.created_at",
    "names": "pr.names",
}

DATE_SQL = (
    "CASE WHEN p.date_register ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' "
    "THEN to_date(p.date_register, 'DD/MM/YYYY') END"
)


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _today() -> date:
    return date.today()


def _hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


class SqlAlchemyPaymentsRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_admin_payments(self, query: AdminPaymentQuery) -> PaymentListResult:
        filters, params = self._payment_filters(query)
        sort_sql = SORT_COLUMNS.get(query.sort_by, SORT_COLUMNS["date_register"])
        sort_dir = "DESC" if (query.sort_dir or "desc").lower() == "desc" else "ASC"
        page = max(query.page, 1)
        page_size = min(max(query.page_size, 1), 100)
        offset = (page - 1) * page_size

        count_row = self.session.execute(
            text(
                f"""
                SELECT COUNT(*) AS total
                FROM payments p
                LEFT JOIN profiles pr ON pr.user_id = p.user_id
                WHERE 1 = 1
                {filters}
                """,
            ),
            params,
        ).mappings().first()
        total = int(count_row["total"]) if count_row else 0

        rows = self.session.execute(
            text(
                f"""
                {PAYMENT_SELECT}
                WHERE 1 = 1
                {filters}
                ORDER BY {sort_sql} {sort_dir} NULLS LAST, p.id DESC
                LIMIT :limit OFFSET :offset
                """,
            ),
            {**params, "limit": page_size, "offset": offset},
        ).mappings().all()

        return PaymentListResult(
            items=[self._to_payment(row) for row in rows],
            page=page,
            page_size=page_size,
            total=total,
        )

    def get_payment(self, payment_id: int) -> Payment | None:
        row = self.session.execute(
            text(f"{PAYMENT_SELECT} WHERE p.id = :payment_id LIMIT 1"),
            {"payment_id": payment_id},
        ).mappings().first()
        if row is None:
            return None
        return self._to_payment(row)

    def member_exists(self, user_id: int) -> bool:
        row = self.session.execute(
            text("SELECT 1 FROM users WHERE id = :user_id LIMIT 1"),
            {"user_id": user_id},
        ).first()
        return row is not None

    def get_member_header(self, user_id: int) -> MemberHeader | None:
        row = self.session.execute(
            text(
                """
                SELECT
                    u.id AS user_id,
                    COALESCE(p.names, '') AS names,
                    COALESCE(p.lastname, '') AS lastname,
                    COALESCE(p.identifier, '') AS identifier
                FROM users u
                LEFT JOIN profiles p ON p.user_id = u.id
                WHERE u.id = :user_id
                LIMIT 1
                """,
            ),
            {"user_id": user_id},
        ).mappings().first()
        if row is None:
            return None
        return MemberHeader(
            user_id=int(row["user_id"]),
            names=row["names"],
            lastname=row["lastname"],
            identifier=row["identifier"],
        )

    def list_payments_for_user(self, user_id: int) -> list[Payment]:
        rows = self.session.execute(
            text(
                f"""
                {PAYMENT_SELECT}
                WHERE p.user_id = :user_id
                ORDER BY
                    {DATE_SQL} DESC NULLS LAST,
                    p.id DESC
                """,
            ),
            {"user_id": user_id},
        ).mappings().all()
        return [self._to_payment(row) for row in rows]

    def get_subscription(self, user_id: int) -> MemberSubscription | None:
        row = self.session.execute(
            text(
                """
                SELECT
                    ms.user_id,
                    ms.coverage_until,
                    ms.credit_balance,
                    ms.last_payment_at,
                    ms.updated_at,
                    COALESCE(p.names, '') AS names,
                    COALESCE(p.lastname, '') AS lastname,
                    COALESCE(p.identifier, '') AS identifier,
                    (
                        SELECT COUNT(*) FROM payments pay
                        WHERE pay.user_id = ms.user_id
                          AND lower(pay.type) IN ('membresía', 'membresia')
                          AND pay.status = :approved
                    ) AS payments_count,
                    (
                        SELECT pay.status FROM payments pay
                        WHERE pay.user_id = ms.user_id
                          AND lower(pay.type) IN ('membresía', 'membresia')
                          AND pay.status IN ('pending_payment', 'pending_review')
                        ORDER BY pay.id DESC
                        LIMIT 1
                    ) AS open_payment_status
                FROM member_subscriptions ms
                LEFT JOIN profiles p ON p.user_id = ms.user_id
                WHERE ms.user_id = :user_id
                LIMIT 1
                """,
            ),
            {"user_id": user_id, "approved": STATUS_APPROVED},
        ).mappings().first()
        if row is None:
            return MemberSubscription(
                user_id=user_id,
                coverage_until=None,
                credit_balance=Decimal("0.00"),
            )
        return self._to_subscription(row)

    def get_open_membership_payment(self, user_id: int) -> Payment | None:
        row = self.session.execute(
            text(
                f"""
                {PAYMENT_SELECT}
                WHERE p.user_id = :user_id
                  AND lower(p.type) IN ('membresía', 'membresia')
                  AND p.status IN ('pending_payment', 'pending_review')
                ORDER BY p.id DESC
                LIMIT 1
                """,
            ),
            {"user_id": user_id},
        ).mappings().first()
        if row is None:
            return None
        return self._to_payment(row)

    def cancel_unused_pending_renewal(self, user_id: int) -> None:
        self.session.execute(
            text(
                """
                DELETE FROM payments
                WHERE user_id = :user_id
                  AND lower(type) IN ('membresía', 'membresia')
                  AND status = :status
                  AND (voucher_path IS NULL OR voucher_path = '')
                """,
            ),
            {"user_id": user_id, "status": STATUS_PENDING_PAYMENT},
        )
        self.session.commit()

    def create_payment(
        self,
        *,
        user_id: int,
        payment_type: str,
        description: str,
        amount: Decimal,
        date_register: str,
        status: str,
        last_digits: str = "any",
        trans_id: str = "NA",
        client_id: str = "NA",
        voucher_path: str | None = None,
        admin_observation: str | None = None,
        reviewed_by: int | None = None,
        recalculate: bool = True,
    ) -> Payment:
        payment_id = self._insert_payment(
            user_id=user_id,
            payment_type=payment_type,
            description=description,
            amount=amount,
            date_register=date_register,
            status=status,
            last_digits=last_digits,
            trans_id=trans_id,
            client_id=client_id,
            voucher_path=voucher_path,
            admin_observation=admin_observation,
            reviewed_by=reviewed_by,
        )
        if recalculate and is_membership_type(payment_type) and status == STATUS_APPROVED:
            self._recalculate_subscription(user_id)
        self.session.commit()
        payment = self.get_payment(payment_id)
        if payment is None:
            raise PaymentNotFoundError()
        return payment

    def update_payment(
        self,
        payment_id: int,
        *,
        payment_type: str,
        description: str,
        amount: Decimal,
        date_register: str,
        last_digits: str | None = None,
        trans_id: str | None = None,
    ) -> Payment:
        current = self.get_payment(payment_id)
        if current is None:
            raise PaymentNotFoundError()
        now = _now()
        self.session.execute(
            text(
                """
                UPDATE payments
                SET type = :type,
                    reference = :reference,
                    total = :total,
                    date_register = :date_register,
                    last_digits = :last_digits,
                    trans_id = :trans_id,
                    updated_at = :now
                WHERE id = :payment_id
                """,
            ),
            {
                "type": payment_type,
                "reference": description,
                "total": cents_from_dollars(amount),
                "date_register": date_register,
                "last_digits": last_digits if last_digits is not None else current.last_digits,
                "trans_id": trans_id if trans_id is not None else current.trans_id,
                "now": now,
                "payment_id": payment_id,
            },
        )
        if (
            is_membership_type(current.type)
            or is_membership_type(payment_type)
        ) and current.status == STATUS_APPROVED:
            self._recalculate_subscription(current.user_id)
        self.session.commit()
        payment = self.get_payment(payment_id)
        if payment is None:
            raise PaymentNotFoundError()
        return payment

    def delete_payment(self, payment_id: int) -> Payment:
        current = self.get_payment(payment_id)
        if current is None:
            raise PaymentNotFoundError()
        self.session.execute(
            text("DELETE FROM payments WHERE id = :payment_id"),
            {"payment_id": payment_id},
        )
        if is_membership_type(current.type):
            self._recalculate_subscription(current.user_id)
        self.session.commit()
        return current

    def approve_payment(self, payment_id: int, reviewed_by: int, date_register: str) -> Payment:
        current = self.get_payment(payment_id)
        if current is None:
            raise PaymentNotFoundError()
        now = _now()
        self.session.execute(
            text(
                """
                UPDATE payments
                SET status = :status,
                    date_register = :date_register,
                    reviewed_by = :reviewed_by,
                    reviewed_at = :now,
                    updated_at = :now
                WHERE id = :payment_id
                """,
            ),
            {
                "status": STATUS_APPROVED,
                "date_register": date_register,
                "reviewed_by": reviewed_by,
                "now": now,
                "payment_id": payment_id,
            },
        )
        if is_membership_type(current.type):
            self._recalculate_subscription(current.user_id)
        self.session.commit()
        payment = self.get_payment(payment_id)
        if payment is None:
            raise PaymentNotFoundError()
        return payment

    def reject_payment(self, payment_id: int, reviewed_by: int, observation: str) -> tuple[Payment, Payment]:
        current = self.get_payment(payment_id)
        if current is None:
            raise PaymentNotFoundError()
        now = _now()
        self.session.execute(
            text(
                """
                UPDATE payments
                SET status = :status,
                    admin_observation = :observation,
                    reviewed_by = :reviewed_by,
                    reviewed_at = :now,
                    updated_at = :now
                WHERE id = :payment_id
                """,
            ),
            {
                "status": STATUS_REJECTED,
                "observation": observation,
                "reviewed_by": reviewed_by,
                "now": now,
                "payment_id": payment_id,
            },
        )
        pending_id = self._insert_payment(
            user_id=current.user_id,
            payment_type=current.type,
            description=current.description,
            amount=current.amount,
            date_register=current.date_register or format_register_date(_today()),
            status=STATUS_PENDING_PAYMENT,
        )
        self.session.commit()
        rejected = self.get_payment(payment_id)
        pending = self.get_payment(pending_id)
        if rejected is None or pending is None:
            raise PaymentNotFoundError()
        return rejected, pending

    def save_voucher(self, payment_id: int, voucher_path: str) -> Payment:
        current = self.get_payment(payment_id)
        if current is None:
            raise PaymentNotFoundError()
        now = _now()
        self.session.execute(
            text(
                """
                UPDATE payments
                SET voucher_path = :voucher_path,
                    status = :status,
                    admin_observation = NULL,
                    updated_at = :now
                WHERE id = :payment_id
                """,
            ),
            {
                "voucher_path": voucher_path,
                "status": STATUS_PENDING_REVIEW,
                "now": now,
                "payment_id": payment_id,
            },
        )
        self.session.commit()
        payment = self.get_payment(payment_id)
        if payment is None:
            raise PaymentNotFoundError()
        return payment

    def ensure_pending_renewal(
        self,
        user_id: int,
        amount: Decimal,
        date_register: str,
        reference: str,
    ) -> Payment:
        existing = self.get_open_membership_payment(user_id)
        if existing is not None and existing.status == STATUS_PENDING_REVIEW:
            raise PaymentConflictError("Ya hay un comprobante en revisión.")
        if existing is not None and existing.status == STATUS_PENDING_PAYMENT:
            return self.update_pending_renewal(existing.id, amount, date_register)
        payment = self.create_payment(
            user_id=user_id,
            payment_type=PAYMENT_TYPE_MEMBERSHIP,
            description=reference,
            amount=amount,
            date_register=date_register,
            status=STATUS_PENDING_PAYMENT,
            recalculate=False,
        )
        return payment

    def update_pending_renewal(
        self,
        payment_id: int,
        amount: Decimal,
        date_register: str | None = None,
    ) -> Payment:
        current = self.get_payment(payment_id)
        if current is None:
            raise PaymentNotFoundError()
        now = _now()
        self.session.execute(
            text(
                """
                UPDATE payments
                SET total = :total,
                    date_register = COALESCE(:date_register, date_register),
                    updated_at = :now
                WHERE id = :payment_id
                """,
            ),
            {
                "total": cents_from_dollars(amount),
                "date_register": date_register,
                "now": now,
                "payment_id": payment_id,
            },
        )
        self.session.commit()
        payment = self.get_payment(payment_id)
        if payment is None:
            raise PaymentNotFoundError()
        return payment

    def recalculate_subscription(self, user_id: int) -> MemberSubscription:
        self._recalculate_subscription(user_id)
        self.session.commit()
        subscription = self.get_subscription(user_id)
        if subscription is None:
            raise PaymentNotFoundError()
        return subscription

    def record_affiliation_payment(self, user_id: int, amount: Decimal, payment_date: date) -> None:
        date_register = format_register_date(payment_date)
        total = cents_from_dollars(amount)
        existing = self.session.execute(
            text(
                """
                SELECT 1
                FROM payments
                WHERE user_id = :user_id
                  AND lower(type) IN ('membresía', 'membresia')
                  AND total = :total
                  AND date_register = :date_register
                  AND status = :status
                LIMIT 1
                """,
            ),
            {
                "user_id": user_id,
                "total": total,
                "date_register": date_register,
                "status": STATUS_APPROVED,
            },
        ).first()
        if existing is not None:
            return
        self.create_payment(
            user_id=user_id,
            payment_type=PAYMENT_TYPE_MEMBERSHIP,
            description="Afiliación de membresía",
            amount=amount,
            date_register=date_register,
            status=STATUS_APPROVED,
        )

    def list_pending_vouchers(self) -> list[Payment]:
        rows = self.session.execute(
            text(
                f"""
                {PAYMENT_SELECT}
                WHERE lower(p.type) IN ('membresía', 'membresia')
                  AND p.status = :status
                ORDER BY p.created_at DESC, p.id DESC
                """,
            ),
            {"status": STATUS_PENDING_REVIEW},
        ).mappings().all()
        return [self._to_payment(row) for row in rows]

    def list_subscriptions(self, query: SubscriptionListQuery) -> SubscriptionListResult:
        page = max(query.page, 1)
        page_size = min(max(query.page_size, 1), 100)
        offset = (page - 1) * page_size
        filters = ""
        params: dict[str, Any] = {
            "model_type": USER_MODEL_TYPE,
            "member_role": MEMBER_ROLE_NAME,
            "approved": STATUS_APPROVED,
        }
        if query.q and query.q.strip():
            filters += """
                AND (
                    lower(COALESCE(p.names, '')) LIKE lower(:q)
                    OR lower(COALESCE(p.lastname, '')) LIKE lower(:q)
                    OR lower(COALESCE(p.identifier, '')) LIKE lower(:q)
                    OR lower(COALESCE(u.name, '')) LIKE lower(:q)
                )
            """
            params["q"] = f"%{query.q.strip()}%"
        status_sql = """
            CASE
                WHEN ms.coverage_until IS NULL THEN 'sin_historial'
                WHEN ms.coverage_until >= CURRENT_DATE THEN 'al_dia'
                WHEN ms.coverage_until + INTERVAL '5 days' >= CURRENT_DATE THEN 'gracia'
                ELSE 'vencida'
            END
        """
        if query.subscription_status:
            filters += f" AND ({status_sql}) = :subscription_status"
            params["subscription_status"] = query.subscription_status
        period = (query.period or "").strip()
        if period == "this_month":
            filters += " AND ms.last_payment_at >= date_trunc('month', CURRENT_DATE)::date"
        elif period == "this_year":
            filters += " AND ms.last_payment_at >= date_trunc('year', CURRENT_DATE)::date"
        agreement_status = (query.agreement_status or "").strip()
        if agreement_status == AGREEMENT_NONE:
            filters += " AND da.id IS NULL"
        elif agreement_status in AGREEMENT_STATUSES:
            filters += " AND da.status = :agreement_status"
            params["agreement_status"] = agreement_status

        from_sql = """
            FROM users u
            INNER JOIN model_has_roles mhr
                ON mhr.model_id = u.id
               AND mhr.model_type = :model_type
            INNER JOIN roles r ON r.id = mhr.role_id
            LEFT JOIN profiles p ON p.user_id = u.id
            LEFT JOIN member_subscriptions ms ON ms.user_id = u.id
            LEFT JOIN membership_debit_agreements da
                ON da.user_id = u.id AND da.revoked_at IS NULL
            WHERE r.name = :member_role
              AND p.deleted_at IS NULL
        """
        select_sql = f"""
                SELECT
                    u.id AS user_id,
                    ms.coverage_until,
                    COALESCE(ms.credit_balance, 0) AS credit_balance,
                    ms.last_payment_at,
                    ms.updated_at,
                    COALESCE(p.names, '') AS names,
                    COALESCE(p.lastname, '') AS lastname,
                    COALESCE(p.identifier, '') AS identifier,
                    COALESCE(p.date_register, '') AS profile_date_register,
                    u.created_at AS user_created_at,
                    COALESCE(NULLIF(TRIM(p.email), ''), NULLIF(TRIM(u.email), ''), '') AS email,
                    COALESCE(p.city, '') AS city,
                    da.status AS agreement_db_status,
                    da.sent_at AS agreement_sent_at,
                    da.signed_authorization_path,
                    da.identity_document_path,
                    (
                        SELECT COUNT(*) FROM payments pay
                        WHERE pay.user_id = u.id
                          AND lower(pay.type) IN ('membresía', 'membresia')
                          AND pay.status = :approved
                    ) AS payments_count,
                    (
                        SELECT pay.status FROM payments pay
                        WHERE pay.user_id = u.id
                          AND lower(pay.type) IN ('membresía', 'membresia')
                          AND pay.status IN ('pending_payment', 'pending_review')
                        ORDER BY pay.id DESC
                        LIMIT 1
                    ) AS open_payment_status,
                    {status_sql} AS computed_status
                {from_sql}
                {filters}
                ORDER BY ms.coverage_until DESC NULLS LAST, p.names ASC
        """

        balance_status = (query.balance_status or "").strip()
        filter_balance = balance_status in BALANCE_STATUSES
        if filter_balance:
            rows = self.session.execute(text(select_sql), params).mappings().all()
            items = self._subscriptions_with_balance(rows)
            items = [item for item in items if item.balance_status == balance_status]
            total = len(items)
            items = items[offset : offset + page_size]
            return SubscriptionListResult(items=items, page=page, page_size=page_size, total=total)

        count_row = self.session.execute(
            text(f"SELECT COUNT(*) AS total {from_sql} {filters}"),
            params,
        ).mappings().first()
        total = int(count_row["total"]) if count_row else 0

        rows = self.session.execute(
            text(f"{select_sql} LIMIT :limit OFFSET :offset"),
            {**params, "limit": page_size, "offset": offset},
        ).mappings().all()
        items = self._subscriptions_with_balance(rows)
        return SubscriptionListResult(items=items, page=page, page_size=page_size, total=total)

    def list_affiliations(self) -> list[AffiliationRow]:
        rows = self.session.execute(
            text(
                """
                SELECT
                    mp.user_id,
                    TRIM(CONCAT(COALESCE(p.names, ''), ' ', COALESCE(p.lastname, ''))) AS member_name,
                    mp.amount,
                    mp.status,
                    mp.voucher_path,
                    mp.created_at
                FROM membership_payments mp
                LEFT JOIN profiles p ON p.user_id = mp.user_id
                ORDER BY mp.created_at DESC, mp.id DESC
                """,
            ),
        ).mappings().all()
        return [
            AffiliationRow(
                user_id=int(row["user_id"]),
                member_name=(row["member_name"] or "").strip(),
                amount=Decimal(str(row["amount"])),
                status=row["status"],
                voucher_url=row["voucher_path"],
                created_at=row["created_at"],
            )
            for row in rows
        ]

    def get_admin_stats(self) -> PaymentAdminStats:
        payment_row = self.session.execute(
            text(
                f"""
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE p.status = :approved) AS approved,
                    COUNT(*) FILTER (
                        WHERE p.status IN (:pending_payment, :pending_review)
                    ) AS pending,
                    COUNT(*) FILTER (
                        WHERE p.status = :approved
                          AND {DATE_SQL} >= date_trunc('month', CURRENT_DATE)
                          AND {DATE_SQL} < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
                    ) AS approved_month,
                    COUNT(*) FILTER (
                        WHERE p.status = :approved
                          AND {DATE_SQL} >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                          AND {DATE_SQL} < date_trunc('month', CURRENT_DATE)
                    ) AS approved_prev,
                    COUNT(*) FILTER (
                        WHERE p.status IN (:pending_payment, :pending_review)
                          AND {DATE_SQL} >= date_trunc('month', CURRENT_DATE)
                    ) AS pending_month,
                    COUNT(*) FILTER (
                        WHERE p.status IN (:pending_payment, :pending_review)
                          AND {DATE_SQL} >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                          AND {DATE_SQL} < date_trunc('month', CURRENT_DATE)
                    ) AS pending_prev
                FROM payments p
                """,
            ),
            {
                "approved": STATUS_APPROVED,
                "pending_payment": STATUS_PENDING_PAYMENT,
                "pending_review": STATUS_PENDING_REVIEW,
            },
        ).mappings().first()

        status_sql = """
            CASE
                WHEN ms.coverage_until IS NULL THEN 'sin_historial'
                WHEN ms.coverage_until >= CURRENT_DATE THEN 'al_dia'
                WHEN ms.coverage_until + INTERVAL '5 days' >= CURRENT_DATE THEN 'gracia'
                ELSE 'vencida'
            END
        """
        member_from = """
            FROM users u
            INNER JOIN model_has_roles mhr
                ON mhr.model_id = u.id
               AND mhr.model_type = :model_type
            INNER JOIN roles r ON r.id = mhr.role_id
            LEFT JOIN profiles p ON p.user_id = u.id
            LEFT JOIN member_subscriptions ms ON ms.user_id = u.id
            WHERE r.name = :member_role
              AND p.deleted_at IS NULL
        """
        status_rows = self.session.execute(
            text(
                f"""
                SELECT {status_sql} AS status, COUNT(*) AS total
                {member_from}
                GROUP BY 1
                """,
            ),
            {"model_type": USER_MODEL_TYPE, "member_role": MEMBER_ROLE_NAME},
        ).mappings().all()
        status_counts = {str(row["status"]): int(row["total"]) for row in status_rows}

        balance_rows = self.session.execute(
            text(
                f"""
                SELECT
                    u.id AS user_id,
                    ms.coverage_until,
                    COALESCE(ms.credit_balance, 0) AS credit_balance,
                    ms.last_payment_at,
                    ms.updated_at,
                    COALESCE(p.names, '') AS names,
                    COALESCE(p.lastname, '') AS lastname,
                    COALESCE(p.identifier, '') AS identifier,
                    COALESCE(p.date_register, '') AS profile_date_register,
                    u.created_at AS user_created_at,
                    COALESCE(NULLIF(TRIM(p.email), ''), NULLIF(TRIM(u.email), ''), '') AS email,
                    NULL AS agreement_db_status,
                    NULL AS agreement_sent_at,
                    NULL AS signed_authorization_path,
                    NULL AS identity_document_path,
                    0 AS payments_count,
                    NULL AS open_payment_status,
                    {status_sql} AS computed_status
                {member_from}
                """,
            ),
            {"model_type": USER_MODEL_TYPE, "member_role": MEMBER_ROLE_NAME},
        ).mappings().all()
        pending_balance = sum(
            (item.pending_balance for item in self._subscriptions_with_balance(balance_rows)),
            Decimal("0.00"),
        )

        return PaymentAdminStats(
            payments_total=int(payment_row["total"]) if payment_row else 0,
            approved_count=int(payment_row["approved"]) if payment_row else 0,
            approved_month=int(payment_row["approved_month"]) if payment_row else 0,
            approved_prev_month=int(payment_row["approved_prev"]) if payment_row else 0,
            pending_count=int(payment_row["pending"]) if payment_row else 0,
            pending_month=int(payment_row["pending_month"]) if payment_row else 0,
            pending_prev_month=int(payment_row["pending_prev"]) if payment_row else 0,
            members_total=sum(status_counts.values()),
            members_al_dia=status_counts.get("al_dia", 0),
            members_gracia=status_counts.get("gracia", 0),
            members_vencidas=status_counts.get("vencida", 0),
            members_sin_historial=status_counts.get("sin_historial", 0),
            pending_balance_total=pending_balance,
        )

    def get_agreement_member_context(self, user_id: int) -> AgreementMemberContext | None:
        row = self.session.execute(
            text(
                """
                SELECT
                    u.id AS user_id,
                    u.state_id,
                    u.created_at AS user_created_at,
                    COALESCE(p.names, '') AS names,
                    COALESCE(p.lastname, '') AS lastname,
                    COALESCE(p.identifier, '') AS identifier,
                    COALESCE(NULLIF(TRIM(p.email), ''), NULLIF(TRIM(u.email), ''), '') AS email,
                    COALESCE(p.city, '') AS city,
                    COALESCE(p.date_register, '') AS profile_date_register
                FROM users u
                INNER JOIN model_has_roles mhr
                    ON mhr.model_id = u.id
                   AND mhr.model_type = :model_type
                INNER JOIN roles r ON r.id = mhr.role_id
                LEFT JOIN profiles p ON p.user_id = u.id
                WHERE u.id = :user_id
                  AND r.name = :member_role
                  AND p.deleted_at IS NULL
                LIMIT 1
                """,
            ),
            {
                "user_id": user_id,
                "model_type": USER_MODEL_TYPE,
                "member_role": MEMBER_ROLE_NAME,
            },
        ).mappings().first()
        if row is None:
            return None
        return AgreementMemberContext(
            user_id=int(row["user_id"]),
            names=row["names"] or "",
            lastname=row["lastname"] or "",
            identifier=row["identifier"] or "",
            email=(row["email"] or "").strip(),
            city=row["city"] or "",
            state_id=int(row["state_id"] or 0),
            enrolled_on=resolve_enrollment_date(row["profile_date_register"], row["user_created_at"]),
        )

    def list_approved_membership_payments(
        self,
        user_ids: list[int],
    ) -> dict[int, list[tuple[Decimal, date]]]:
        if not user_ids:
            return {}
        placeholders = ", ".join(f":uid_{index}" for index, _ in enumerate(user_ids))
        params: dict[str, Any] = {f"uid_{index}": user_id for index, user_id in enumerate(user_ids)}
        params["status"] = STATUS_APPROVED
        rows = self.session.execute(
            text(
                f"""
                SELECT user_id, total, date_register, created_at
                FROM payments
                WHERE user_id IN ({placeholders})
                  AND lower(type) IN ('membresía', 'membresia')
                  AND status = :status
                """,
            ),
            params,
        ).mappings().all()
        grouped: dict[int, list[tuple[Decimal, date]]] = {user_id: [] for user_id in user_ids}
        for row in rows:
            try:
                payment_date = parse_register_date(row["date_register"] or "")
            except ValueError:
                created = row["created_at"]
                payment_date = created.date() if created is not None else _today()
            grouped.setdefault(int(row["user_id"]), []).append(
                (dollars_from_cents(row["total"]), payment_date),
            )
        return grouped

    def get_current_agreement(self, user_id: int) -> DebitAgreement | None:
        row = self.session.execute(
            text(
                """
                SELECT *
                FROM membership_debit_agreements
                WHERE user_id = :user_id
                  AND revoked_at IS NULL
                ORDER BY id DESC
                LIMIT 1
                """,
            ),
            {"user_id": user_id},
        ).mappings().first()
        if row is None:
            return None
        return self._to_agreement(row)

    def get_public_agreement(self, token: str) -> PublicAgreementView | None:
        token_hash = _hash_token(token)
        row = self.session.execute(
            text(
                """
                SELECT
                    da.id,
                    da.user_id,
                    da.pending_balance_snapshot,
                    da.status,
                    da.expires_at,
                    da.signed_authorization_path,
                    da.identity_document_path,
                    COALESCE(p.names, '') AS names,
                    COALESCE(p.lastname, '') AS lastname,
                    COALESCE(p.identifier, '') AS identifier,
                    COALESCE(p.city, '') AS city
                FROM membership_debit_agreements da
                LEFT JOIN profiles p ON p.user_id = da.user_id
                WHERE da.token_hash = :token_hash
                  AND da.revoked_at IS NULL
                  AND da.expires_at > :now
                LIMIT 1
                """,
            ),
            {"token_hash": token_hash, "now": _now()},
        ).mappings().first()
        if row is None:
            return None
        names = (row["names"] or "").strip()
        lastname = (row["lastname"] or "").strip()
        signed = bool((row["signed_authorization_path"] or "").strip())
        identity = bool((row["identity_document_path"] or "").strip())
        return PublicAgreementView(
            member_name=f"{names} {lastname}".strip(),
            identifier=row["identifier"] or "",
            pending_balance=Decimal(str(row["pending_balance_snapshot"] or 0)),
            has_signed_authorization=signed,
            has_identity_document=identity,
            status=row["status"] or AGREEMENT_SENT,
            expires_at=row["expires_at"],
            names=names,
            lastname=lastname,
            city=row["city"] or "",
            user_id=int(row["user_id"]),
        )

    def revoke_current_agreement(self, user_id: int) -> None:
        self.session.execute(
            text(
                """
                UPDATE membership_debit_agreements
                SET revoked_at = :now,
                    updated_at = :now
                WHERE user_id = :user_id
                  AND revoked_at IS NULL
                """,
            ),
            {"user_id": user_id, "now": _now()},
        )

    def create_debit_agreement(
        self,
        *,
        user_id: int,
        token: str,
        pending_balance: Decimal,
        sent_at: datetime,
        expires_at: datetime,
    ) -> DebitAgreement:
        now = _now()
        agreement_id = self.session.execute(
            text(
                """
                INSERT INTO membership_debit_agreements (
                    user_id, token_hash, pending_balance_snapshot, status,
                    sent_at, expires_at, created_at, updated_at
                )
                VALUES (
                    :user_id, :token_hash, :pending_balance, :status,
                    :sent_at, :expires_at, :now, :now
                )
                RETURNING id
                """,
            ),
            {
                "user_id": user_id,
                "token_hash": _hash_token(token),
                "pending_balance": str(pending_balance),
                "status": AGREEMENT_SENT,
                "sent_at": sent_at,
                "expires_at": expires_at,
                "now": now,
            },
        ).scalar_one()
        self.session.commit()
        row = self.session.execute(
            text("SELECT * FROM membership_debit_agreements WHERE id = :id LIMIT 1"),
            {"id": agreement_id},
        ).mappings().first()
        if row is None:
            raise PaymentNotFoundError()
        return self._to_agreement(row)

    def save_agreement_documents(
        self,
        agreement_id: int,
        signed_authorization_path: str | None,
        identity_document_path: str | None,
        status: str,
        documents_uploaded_at: datetime | None,
    ) -> DebitAgreement:
        now = _now()
        self.session.execute(
            text(
                """
                UPDATE membership_debit_agreements
                SET signed_authorization_path = COALESCE(:signed_authorization_path, signed_authorization_path),
                    identity_document_path = COALESCE(:identity_document_path, identity_document_path),
                    status = :status,
                    documents_uploaded_at = COALESCE(:documents_uploaded_at, documents_uploaded_at),
                    updated_at = :now
                WHERE id = :agreement_id
                """,
            ),
            {
                "signed_authorization_path": signed_authorization_path,
                "identity_document_path": identity_document_path,
                "status": status,
                "documents_uploaded_at": documents_uploaded_at,
                "now": now,
                "agreement_id": agreement_id,
            },
        )
        self.session.commit()
        row = self.session.execute(
            text("SELECT * FROM membership_debit_agreements WHERE id = :id LIMIT 1"),
            {"id": agreement_id},
        ).mappings().first()
        if row is None:
            raise PaymentNotFoundError()
        return self._to_agreement(row)

    def _subscriptions_with_balance(self, rows: list[Any]) -> list[MemberSubscription]:
        user_ids = [int(row["user_id"]) for row in rows]
        renewals = self.list_approved_membership_payments(user_ids)
        today = _today()
        items: list[MemberSubscription] = []
        for row in rows:
            subscription = self._to_subscription(row)
            enrolled_on = resolve_enrollment_date(
                row.get("profile_date_register"),
                row.get("user_created_at"),
            )
            first_renewal = first_renewal_date(enrolled_on) if enrolled_on else None
            pending = (
                pending_membership_balance(enrolled_on, today, renewals.get(subscription.user_id, []))
                if enrolled_on
                else Decimal("0.00")
            )
            signed = bool((row.get("signed_authorization_path") or "").strip())
            identity = bool((row.get("identity_document_path") or "").strip())
            items.append(
                MemberSubscription(
                    user_id=subscription.user_id,
                    coverage_until=subscription.coverage_until,
                    credit_balance=subscription.credit_balance,
                    last_payment_at=subscription.last_payment_at,
                    updated_at=subscription.updated_at,
                    member_name=subscription.member_name,
                    identifier=subscription.identifier,
                    payments_count=subscription.payments_count,
                    open_payment_status=subscription.open_payment_status,
                    status=subscription.status,
                    days_overdue=subscription.days_overdue,
                    enrolled_on=enrolled_on,
                    first_renewal_on=first_renewal,
                    pending_balance=pending,
                    balance_status=balance_status_from_pending(pending),
                    agreement_status=row.get("agreement_db_status") or AGREEMENT_NONE,
                    agreement_sent_at=row.get("agreement_sent_at"),
                    has_signed_authorization=signed,
                    has_identity_document=identity,
                    email=(row.get("email") or "").strip(),
                )
            )
        return items

    def _to_agreement(self, row: Any) -> DebitAgreement:
        return DebitAgreement(
            id=int(row["id"]),
            user_id=int(row["user_id"]),
            token_hash=row["token_hash"],
            pending_balance_snapshot=Decimal(str(row["pending_balance_snapshot"] or 0)),
            status=row["status"],
            sent_at=row["sent_at"],
            expires_at=row["expires_at"],
            revoked_at=row["revoked_at"],
            signed_authorization_path=row["signed_authorization_path"],
            identity_document_path=row["identity_document_path"],
            documents_uploaded_at=row["documents_uploaded_at"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def _insert_payment(
        self,
        *,
        user_id: int,
        payment_type: str,
        description: str,
        amount: Decimal,
        date_register: str,
        status: str,
        last_digits: str = "any",
        trans_id: str = "NA",
        client_id: str = "NA",
        voucher_path: str | None = None,
        admin_observation: str | None = None,
        reviewed_by: int | None = None,
    ) -> int:
        now = _now()
        sync_serial_sequence(self.session, "payments")
        payment_id = self.session.execute(
            text(
                """
                INSERT INTO payments (
                    user_id, type, last_digits, total, reference, trans_id, client_id,
                    date_register, created_at, updated_at, status, voucher_path,
                    reviewed_by, reviewed_at, admin_observation
                )
                VALUES (
                    :user_id, :type, :last_digits, :total, :reference, :trans_id, :client_id,
                    :date_register, :now, :now, :status, :voucher_path,
                    :reviewed_by, :reviewed_at, :admin_observation
                )
                RETURNING id
                """,
            ),
            {
                "user_id": user_id,
                "type": payment_type,
                "last_digits": last_digits,
                "total": cents_from_dollars(amount),
                "reference": description,
                "trans_id": trans_id,
                "client_id": client_id,
                "date_register": date_register,
                "now": now,
                "status": status,
                "voucher_path": voucher_path,
                "reviewed_by": reviewed_by,
                "reviewed_at": now if reviewed_by is not None else None,
                "admin_observation": admin_observation,
            },
        ).scalar_one()
        return int(payment_id)

    def _recalculate_subscription(self, user_id: int) -> None:
        rows = self.session.execute(
            text(
                """
                SELECT id, total, date_register, created_at
                FROM payments
                WHERE user_id = :user_id
                  AND lower(type) IN ('membresía', 'membresia')
                  AND status = :status
                ORDER BY
                    CASE
                        WHEN date_register ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
                        THEN to_date(date_register, 'DD/MM/YYYY')
                        ELSE COALESCE(created_at::date, CURRENT_DATE)
                    END,
                    id
                """,
            ),
            {"user_id": user_id, "status": STATUS_APPROVED},
        ).mappings().all()

        events: list[tuple[Decimal, date]] = []
        last_payment_at: date | None = None
        for row in rows:
            amount = dollars_from_cents(row["total"])
            try:
                payment_date = parse_register_date(row["date_register"] or "")
            except ValueError:
                created = row["created_at"]
                payment_date = created.date() if created is not None else _today()
            events.append((amount, payment_date))
            last_payment_at = payment_date

        state = replay(events)
        now = _now()
        self.session.execute(
            text(
                """
                INSERT INTO member_subscriptions (
                    user_id, coverage_until, credit_balance, last_payment_at, updated_at
                )
                VALUES (
                    :user_id, :coverage_until, :credit_balance, :last_payment_at, :now
                )
                ON CONFLICT (user_id) DO UPDATE
                SET coverage_until = EXCLUDED.coverage_until,
                    credit_balance = EXCLUDED.credit_balance,
                    last_payment_at = EXCLUDED.last_payment_at,
                    updated_at = EXCLUDED.updated_at
                """,
            ),
            {
                "user_id": user_id,
                "coverage_until": state.coverage_until,
                "credit_balance": str(state.credit_balance),
                "last_payment_at": last_payment_at,
                "now": now,
            },
        )

    def _payment_filters(self, query: AdminPaymentQuery) -> tuple[str, dict[str, Any]]:
        filters = ""
        params: dict[str, Any] = {}
        if query.q and query.q.strip():
            filters += """
                AND (
                    lower(COALESCE(pr.names, '')) LIKE lower(:q)
                    OR lower(COALESCE(pr.lastname, '')) LIKE lower(:q)
                    OR lower(COALESCE(pr.identifier, '')) LIKE lower(:q)
                    OR lower(COALESCE(p.reference, '')) LIKE lower(:q)
                )
            """
            params["q"] = f"%{query.q.strip()}%"
        if query.payment_type:
            if query.payment_type.strip().lower() in MEMBERSHIP_TYPE_ALIASES:
                filters += " AND lower(p.type) IN ('membresía', 'membresia')"
            else:
                filters += " AND lower(p.type) = lower(:payment_type)"
                params["payment_type"] = query.payment_type.strip()
        if query.status:
            filters += " AND p.status = :status"
            params["status"] = query.status
        if query.user_id is not None:
            filters += " AND p.user_id = :user_id"
            params["user_id"] = query.user_id
        if query.date_from:
            try:
                date_from = parse_register_date(query.date_from)
                filters += f" AND {DATE_SQL} >= :date_from"
                params["date_from"] = date_from
            except ValueError:
                pass
        if query.date_to:
            try:
                date_to = parse_register_date(query.date_to)
                filters += f" AND {DATE_SQL} <= :date_to"
                params["date_to"] = date_to
            except ValueError:
                pass
        return filters, params

    def _to_payment(self, row: Any) -> Payment:
        names = (row["names"] or "").strip()
        lastname = (row["lastname"] or "").strip()
        member_name = f"{names} {lastname}".strip()
        return Payment(
            id=int(row["id"]),
            user_id=int(row["user_id"]),
            member_name=member_name,
            identifier=row["identifier"] or "",
            type=row["type"],
            description=row["reference"] or "",
            amount=dollars_from_cents(row["total"]),
            currency="USD",
            date_register=row["date_register"] or "",
            last_digits=row["last_digits"] or "any",
            status=row["status"] or STATUS_APPROVED,
            voucher_path=row["voucher_path"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            reviewed_by=int(row["reviewed_by"]) if row["reviewed_by"] is not None else None,
            reviewed_at=row["reviewed_at"],
            admin_observation=row["admin_observation"],
            trans_id=row["trans_id"] or "NA",
            client_id=row["client_id"] or "NA",
            total_cents=str(row["total"] or ""),
        )

    def _to_subscription(self, row: Any) -> MemberSubscription:
        names = (row.get("names") or "").strip()
        lastname = (row.get("lastname") or "").strip()
        coverage = row["coverage_until"]
        today = _today()
        return MemberSubscription(
            user_id=int(row["user_id"]),
            coverage_until=coverage,
            credit_balance=Decimal(str(row["credit_balance"] or 0)),
            last_payment_at=row["last_payment_at"],
            updated_at=row.get("updated_at"),
            member_name=f"{names} {lastname}".strip(),
            identifier=row.get("identifier") or "",
            payments_count=int(row["payments_count"] or 0) if row.get("payments_count") is not None else 0,
            open_payment_status=row.get("open_payment_status"),
            status=row.get("computed_status") or subscription_status_label(coverage, today),
            days_overdue=days_overdue(coverage, today),
        )
