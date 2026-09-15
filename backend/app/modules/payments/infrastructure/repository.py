from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.payments.domain.entities import (
    AdminPaymentQuery,
    AffiliationRow,
    MemberHeader,
    MemberSubscription,
    Payment,
    PaymentListResult,
    SubscriptionListQuery,
    SubscriptionListResult,
)
from app.modules.payments.domain.exceptions import PaymentConflictError, PaymentNotFoundError
from app.modules.payments.domain.subscription import (
    MEMBERSHIP_TYPE_ALIASES,
    PAYMENT_TYPE_MEMBERSHIP,
    STATUS_APPROVED,
    STATUS_PENDING_PAYMENT,
    STATUS_PENDING_REVIEW,
    STATUS_REJECTED,
    cents_from_dollars,
    dollars_from_cents,
    format_register_date,
    is_membership_type,
    parse_register_date,
    replay,
    subscription_status_label,
    days_overdue,
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
                    updated_at = :now
                WHERE id = :payment_id
                """,
            ),
            {
                "type": payment_type,
                "reference": description,
                "total": cents_from_dollars(amount),
                "date_register": date_register,
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

        from_sql = """
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

        count_row = self.session.execute(
            text(f"SELECT COUNT(*) AS total {from_sql} {filters}"),
            params,
        ).mappings().first()
        total = int(count_row["total"]) if count_row else 0

        rows = self.session.execute(
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
                LIMIT :limit OFFSET :offset
                """,
            ),
            {**params, "limit": page_size, "offset": offset},
        ).mappings().all()

        items = [self._to_subscription(row) for row in rows]
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
