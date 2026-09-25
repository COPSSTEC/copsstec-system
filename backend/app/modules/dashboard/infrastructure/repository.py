from datetime import date, datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.dashboard.domain.classification import (
    canonicalize_income_type,
    dollars_from_course_amount,
    format_legacy_date,
    parse_legacy_date,
)
from app.modules.dashboard.domain.entities import (
    INCOME_TYPE_COURSE,
    MEMBER_ROLE_NAME,
    PAID_STATE_ID,
    PENDING_ENABLE_STATE_ID,
    USER_MODEL_TYPE,
    VISIBLE_FEED_STATE_ID,
    FeedBlog,
    FeedCourse,
    FeedDocument,
    FeedJob,
    FeedNotice,
    IncomeCharge,
    PendingApproval,
    RosterMember,
    feed_excerpt,
)
from app.modules.documents.infrastructure.repository import ensure_member_documents_schema
from app.modules.payments.domain.subscription import STATUS_APPROVED, dollars_from_cents

DATE_SQL = "^[0-9]{2}/[0-9]{2}/[0-9]{4}$"

ROSTER_FROM = """
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

ROSTER_SELECT = f"""
    SELECT
        u.id AS user_id,
        u.state_id,
        COALESCE(p.names, '') AS names,
        COALESCE(p.lastname, '') AS lastname,
        COALESCE(p.identifier, '') AS identifier,
        COALESCE(p.email, '') AS email,
        COALESCE(p.date_register, '') AS date_register,
        COALESCE(p.gender, '') AS gender,
        COALESCE(p.province, '') AS province,
        COALESCE(p.city, '') AS city,
        COALESCE(p.birtday, '') AS birtday,
        COALESCE(p.blood_type, '') AS blood_type,
        COALESCE(p.type_profile, '') AS type_profile,
        COALESCE(p.title_academic, '') AS title_academic,
        COALESCE(p.fourth_title, '') AS fourth_title,
        ms.coverage_until
    {ROSTER_FROM}
"""


class SqlAlchemyDashboardRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_roster(self) -> list[RosterMember]:
        rows = self.session.execute(
            text(ROSTER_SELECT),
            {"model_type": USER_MODEL_TYPE, "member_role": MEMBER_ROLE_NAME},
        ).mappings().all()
        return [self._to_roster(row) for row in rows]

    def list_income_charges(self) -> list[IncomeCharge]:
        payment_rows = self.session.execute(
            text(
                """
                SELECT
                    COALESCE(pr.names, '') AS names,
                    COALESCE(pr.lastname, '') AS lastname,
                    COALESCE(pr.identifier, '') AS identifier,
                    COALESCE(pr.email, '') AS email,
                    p.type,
                    p.total,
                    p.date_register
                FROM payments p
                LEFT JOIN profiles pr ON pr.user_id = p.user_id
                WHERE p.status = :status
                  AND lower(p.type) IN ('membresía', 'membresia', 'curso', 'reservaciones')
                """,
            ),
            {"status": STATUS_APPROVED},
        ).mappings().all()

        course_rows = self.session.execute(
            text(
                """
                SELECT
                    COALESCE(pr.names, ci.names, '') AS names,
                    COALESCE(pr.lastname, '') AS lastname,
                    COALESCE(pr.identifier, ci.identifier, '') AS identifier,
                    COALESCE(pr.email, ci.email, '') AS email,
                    cp.amount,
                    cp.created_at
                FROM course_payments cp
                INNER JOIN course_inscriptions ci ON ci.id = cp.course_inscription_id
                LEFT JOIN profiles pr ON pr.id = ci.profile_id
                WHERE cp.state_id = :paid_state_id
                  AND ci.deleted_at IS NULL
                """,
            ),
            {"paid_state_id": PAID_STATE_ID},
        ).mappings().all()

        charges = [self._to_payment_charge(row) for row in payment_rows]
        charges.extend(self._to_course_charge(row) for row in course_rows)
        return [charge for charge in charges if charge is not None]

    def list_pending_approvals(self) -> list[PendingApproval]:
        rows = self.session.execute(
            text(
                f"""
                SELECT
                    u.id AS user_id,
                    COALESCE(p.names, '') AS names,
                    COALESCE(p.lastname, '') AS lastname,
                    COALESCE(p.identifier, '') AS identifier,
                    COALESCE(p.email, '') AS email,
                    COALESCE(p.date_register, '') AS date_register
                {ROSTER_FROM}
                  AND u.state_id = :pending_state_id
                ORDER BY
                    CASE WHEN p.date_register ~ :date_pattern
                         THEN to_date(p.date_register, 'DD/MM/YYYY')
                    END DESC NULLS LAST,
                    u.id DESC
                """,
            ),
            {
                "model_type": USER_MODEL_TYPE,
                "member_role": MEMBER_ROLE_NAME,
                "pending_state_id": PENDING_ENABLE_STATE_ID,
                "date_pattern": DATE_SQL,
            },
        ).mappings().all()
        return [
            PendingApproval(
                user_id=int(row["user_id"]),
                names=row["names"] or "",
                lastname=row["lastname"] or "",
                identifier=row["identifier"] or "",
                email=row["email"] or "",
                date_register=row["date_register"] or "",
            )
            for row in rows
        ]

    def _to_roster(self, row) -> RosterMember:
        coverage = row["coverage_until"]
        if isinstance(coverage, datetime):
            coverage = coverage.date()
        return RosterMember(
            user_id=int(row["user_id"]),
            state_id=int(row["state_id"]),
            names=row["names"] or "",
            lastname=row["lastname"] or "",
            identifier=row["identifier"] or "",
            email=row["email"] or "",
            date_register=row["date_register"] or "",
            gender=row["gender"] or "",
            province=row["province"] or "",
            city=row["city"] or "",
            birtday=row["birtday"] or "",
            blood_type=row["blood_type"] or "",
            type_profile=row["type_profile"] or "",
            title_academic=row["title_academic"] or "",
            fourth_title=row["fourth_title"] or "",
            coverage_until=coverage,
        )

    def _to_payment_charge(self, row) -> IncomeCharge | None:
        tipo = canonicalize_income_type(row["type"])
        if tipo is None:
            return None
        parsed = parse_legacy_date(row["date_register"] or "")
        return IncomeCharge(
            names=row["names"] or "",
            lastname=row["lastname"] or "",
            identifier=row["identifier"] or "",
            email=row["email"] or "",
            tipo=tipo,
            amount=dollars_from_cents(row["total"]),
            fecha=row["date_register"] or "",
            year=parsed.year if parsed else None,
            month=parsed.month if parsed else None,
        )

    def _to_course_charge(self, row) -> IncomeCharge:
        created = row["created_at"]
        parsed: date | None = None
        fecha = ""
        if isinstance(created, datetime):
            parsed = created.date()
            fecha = format_legacy_date(parsed)
        elif isinstance(created, date):
            parsed = created
            fecha = format_legacy_date(parsed)
        return IncomeCharge(
            names=row["names"] or "",
            lastname=row["lastname"] or "",
            identifier=row["identifier"] or "",
            email=row["email"] or "",
            tipo=INCOME_TYPE_COURSE,
            amount=dollars_from_course_amount(row["amount"]),
            fecha=fecha,
            year=parsed.year if parsed else None,
            month=parsed.month if parsed else None,
        )

    def list_published_notices(self, now: datetime, limit: int) -> list[FeedNotice]:
        rows = self.session.execute(
            text(
                """
                SELECT id, title, description, image, importance, published_at
                FROM notices
                WHERE state_id = :visible_state_id
                  AND deleted_at IS NULL
                  AND (published_at IS NULL OR published_at <= :now)
                ORDER BY COALESCE(published_at, created_at) DESC, id DESC
                LIMIT :limit
                """,
            ),
            {"visible_state_id": VISIBLE_FEED_STATE_ID, "now": now, "limit": limit},
        ).mappings().all()
        return [
            FeedNotice(
                id=int(row["id"]),
                title=str(row["title"]),
                excerpt=feed_excerpt(str(row["description"] or "")),
                description=str(row["description"] or ""),
                image=str(row["image"] or ""),
                importance=str(row["importance"]),
                published_at=row["published_at"],
            )
            for row in rows
        ]

    def list_recent_blogs(self, limit: int) -> list[FeedBlog]:
        rows = self.session.execute(
            text(
                """
                SELECT id, title, description, image, created_at
                FROM blogs
                WHERE state_id = :visible_state_id
                  AND deleted_at IS NULL
                ORDER BY id DESC
                LIMIT :limit
                """,
            ),
            {"visible_state_id": VISIBLE_FEED_STATE_ID, "limit": limit},
        ).mappings().all()
        return [
            FeedBlog(
                id=int(row["id"]),
                title=str(row["title"]),
                excerpt=feed_excerpt(str(row["description"] or "")),
                image=str(row["image"] or ""),
                created_at=row["created_at"],
            )
            for row in rows
        ]

    def list_open_courses(self, limit: int) -> list[FeedCourse]:
        rows = self.session.execute(
            text(
                """
                SELECT id, title, image, date_course, type_modality, location
                FROM courses
                WHERE state_id = :visible_state_id
                  AND deleted_at IS NULL
                ORDER BY id DESC
                LIMIT :limit
                """,
            ),
            {"visible_state_id": VISIBLE_FEED_STATE_ID, "limit": limit},
        ).mappings().all()
        return [
            FeedCourse(
                id=int(row["id"]),
                title=str(row["title"]),
                image=str(row["image"] or ""),
                date_course=str(row["date_course"] or ""),
                type_modality=row["type_modality"],
                location=str(row["location"] or ""),
            )
            for row in rows
        ]

    def list_open_jobs(self, limit: int) -> list[FeedJob]:
        rows = self.session.execute(
            text(
                """
                SELECT id, title, name_enterprise, location, type, logo, link
                FROM job_centers
                WHERE state_id = :visible_state_id
                  AND deleted_at IS NULL
                ORDER BY id DESC
                LIMIT :limit
                """,
            ),
            {"visible_state_id": VISIBLE_FEED_STATE_ID, "limit": limit},
        ).mappings().all()
        return [
            FeedJob(
                id=int(row["id"]),
                title=str(row["title"]),
                name_enterprise=str(row["name_enterprise"] or ""),
                location=str(row["location"] or ""),
                type=str(row["type"] or ""),
                logo=str(row["logo"] or ""),
                link=str(row["link"] or ""),
            )
            for row in rows
        ]

    def list_member_documents(self) -> list[FeedDocument]:
        ensure_member_documents_schema(self.session)
        rows = self.session.execute(
            text(
                """
                SELECT document_key, title, file_path, cover_path, overlay_color, overlay_opacity
                FROM member_documents
                ORDER BY id ASC
                """,
            ),
        ).mappings().all()
        return [
            FeedDocument(
                document_key=str(row["document_key"]),
                title=str(row["title"]),
                file_path=row["file_path"],
                available=bool(row["file_path"]),
                cover_path=row.get("cover_path"),
                overlay_color=str(row.get("overlay_color") or "#0f172a"),
                overlay_opacity=int(row.get("overlay_opacity") or 68),
            )
            for row in rows
        ]
