from datetime import UTC, datetime
from hashlib import sha256
from secrets import token_urlsafe
from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.courses.domain.entities import (
    Course,
    CourseCertificate,
    CourseInscription,
    HIDDEN_STATE_ID,
    PAID_STATE_ID,
    PENDING_APPROVAL_STATE_ID,
    REGISTERED_STATE_ID,
    REJECTED_PAYMENT_STATE_ID,
    VISIBLE_STATE_ID,
)


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _money_to_float(value: str) -> float:
    try:
        return float(value.replace(",", "."))
    except ValueError:
        return 0.0


class CourseRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_public_courses(self) -> list[Course]:
        rows = self.session.execute(
            text(
                """
                SELECT c.*, cl.finished_at
                FROM courses c
                LEFT JOIN course_lifecycle cl ON cl.course_id = c.id
                WHERE c.state_id = :visible_state_id
                  AND c.deleted_at IS NULL
                ORDER BY c.id DESC
                """,
            ),
            {"visible_state_id": VISIBLE_STATE_ID},
        ).mappings().all()

        return [self._build_course(row) for row in rows]

    def list_admin_courses(self) -> list[dict[str, Any]]:
        rows = self.session.execute(
            text(
                """
                SELECT
                    c.*,
                    cl.finished_at,
                    COUNT(ci.id) AS inscriptions_count,
                    COUNT(ci.id) FILTER (WHERE ci.attended_at IS NOT NULL) AS attendees_count,
                    COUNT(cp.id) FILTER (WHERE cp.state_id = :pending_state_id) AS pending_payments_count,
                    COUNT(cc.id) FILTER (WHERE cc.sent_at IS NOT NULL) AS certificates_sent_count
                FROM courses c
                LEFT JOIN course_lifecycle cl ON cl.course_id = c.id
                LEFT JOIN course_inscriptions ci ON ci.course_id = c.id AND ci.deleted_at IS NULL
                LEFT JOIN course_payments cp ON cp.course_inscription_id = ci.id
                LEFT JOIN course_certificates cc ON cc.course_inscription_id = ci.id
                WHERE c.deleted_at IS NULL
                GROUP BY c.id, cl.finished_at
                ORDER BY c.id DESC
                """,
            ),
            {"pending_state_id": PENDING_APPROVAL_STATE_ID},
        ).mappings().all()

        return [dict(row) for row in rows]

    def list_member_courses(self, user_id: int) -> list[dict[str, Any]]:
        rows = self.session.execute(
            text(
                """
                SELECT
                    c.*,
                    cl.finished_at,
                    ci.id AS inscription_id,
                    ci.state_id AS inscription_state_id,
                    ci.attended_at,
                    ci.created_at AS inscription_created_at,
                    cc.id AS certificate_id,
                    cc.certificate_code,
                    cc.sent_at AS certificate_sent_at
                FROM course_inscriptions ci
                INNER JOIN courses c ON c.id = ci.course_id
                LEFT JOIN course_lifecycle cl ON cl.course_id = c.id
                LEFT JOIN course_certificates cc ON cc.course_inscription_id = ci.id
                WHERE ci.user_id = :user_id
                  AND ci.deleted_at IS NULL
                  AND c.deleted_at IS NULL
                ORDER BY COALESCE(cl.finished_at, c.created_at) DESC, c.id DESC
                """,
            ),
            {"user_id": user_id},
        ).mappings().all()

        return [dict(row) for row in rows]

    def list_member_available_courses(self, user_id: int) -> list[dict[str, Any]]:
        rows = self.session.execute(
            text(
                """
                SELECT
                    c.*,
                    cl.finished_at,
                    ci.id AS inscription_id,
                    ci.state_id AS inscription_state_id,
                    ci.attended_at,
                    ci.created_at AS inscription_created_at,
                    cc.id AS certificate_id,
                    cc.certificate_code,
                    cc.sent_at AS certificate_sent_at
                FROM courses c
                LEFT JOIN course_lifecycle cl ON cl.course_id = c.id
                LEFT JOIN course_inscriptions ci ON ci.course_id = c.id
                    AND ci.user_id = :user_id
                    AND ci.deleted_at IS NULL
                LEFT JOIN course_certificates cc ON cc.course_inscription_id = ci.id
                WHERE c.state_id = :visible_state_id
                  AND c.deleted_at IS NULL
                ORDER BY c.id DESC
                """,
            ),
            {"user_id": user_id, "visible_state_id": VISIBLE_STATE_ID},
        ).mappings().all()

        return [dict(row) for row in rows]

    def get_course(self, course_id: int) -> Course | None:
        row = self.session.execute(
            text(
                """
                SELECT c.*, cl.finished_at
                FROM courses c
                LEFT JOIN course_lifecycle cl ON cl.course_id = c.id
                WHERE c.id = :course_id
                  AND c.deleted_at IS NULL
                LIMIT 1
                """,
            ),
            {"course_id": course_id},
        ).mappings().first()

        return self._build_course(row) if row is not None else None

    def create_course(self, data: dict[str, Any], created_by: int) -> Course:
        now = _now()
        row = self.session.execute(
            text(
                """
                INSERT INTO courses (
                    state_id, created_by, title, value, location, capacitator,
                    capacitator_about, date_course, hour_init, hour_final, about,
                    image, date_course_final, type_modality, link, created_at, updated_at
                )
                VALUES (
                    :state_id, :created_by, :title, :value, :location, :capacitator,
                    :capacitator_about, :date_course, :hour_init, :hour_final, :about,
                    :image, :date_course_final, :type_modality, :link, :created_at, :updated_at
                )
                RETURNING *
                """,
            ),
            {**data, "created_by": created_by, "created_at": now, "updated_at": now},
        ).mappings().one()
        self.session.commit()

        return self._build_course({**dict(row), "finished_at": None})

    def update_course(self, course_id: int, data: dict[str, Any]) -> Course | None:
        current = self.get_course(course_id)
        if current is None:
            return None

        merged = {**current.__dict__, **data, "updated_at": _now()}
        row = self.session.execute(
            text(
                """
                UPDATE courses
                SET state_id = :state_id,
                    title = :title,
                    value = :value,
                    location = :location,
                    capacitator = :capacitator,
                    capacitator_about = :capacitator_about,
                    date_course = :date_course,
                    hour_init = :hour_init,
                    hour_final = :hour_final,
                    about = :about,
                    image = :image,
                    date_course_final = :date_course_final,
                    type_modality = :type_modality,
                    link = :link,
                    updated_at = :updated_at
                WHERE id = :id
                RETURNING *
                """,
            ),
            {**merged, "id": course_id},
        ).mappings().one()
        self.session.commit()

        return self._build_course({**dict(row), "finished_at": current.finished_at})

    def delete_course(self, course_id: int, deleted_by: int) -> bool:
        result = self.session.execute(
            text(
                """
                UPDATE courses
                SET state_id = :hidden_state_id,
                    deleted_at = :deleted_at,
                    deleted_by = :deleted_by,
                    updated_at = :updated_at
                WHERE id = :course_id AND deleted_at IS NULL
                """,
            ),
            {
                "course_id": course_id,
                "hidden_state_id": HIDDEN_STATE_ID,
                "deleted_at": _now().isoformat(),
                "deleted_by": str(deleted_by),
                "updated_at": _now(),
            },
        )
        self.session.commit()

        return result.rowcount > 0

    def finish_course(self, course_id: int, user_id: int) -> None:
        self.session.execute(
            text(
                """
                INSERT INTO course_lifecycle (course_id, finished_at, finished_by, created_at, updated_at)
                VALUES (:course_id, :finished_at, :finished_by, :now, :now)
                ON CONFLICT (course_id)
                DO UPDATE SET finished_at = EXCLUDED.finished_at,
                              finished_by = EXCLUDED.finished_by,
                              updated_at = EXCLUDED.updated_at
                """,
            ),
            {"course_id": course_id, "finished_at": _now(), "finished_by": user_id, "now": _now()},
        )
        self.session.commit()

    def list_member_options(self, query: str | None = None) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"member_role": "miembro", "query": f"%{query or ''}%"}
        rows = self.session.execute(
            text(
                """
                SELECT u.id, u.name, u.email, p.names, p.lastname, p.identifier
                FROM users u
                INNER JOIN model_has_roles mhr ON mhr.model_id = u.id
                    AND mhr.model_type = 'App\\Models\\User'
                INNER JOIN roles r ON r.id = mhr.role_id
                LEFT JOIN profiles p ON p.user_id = u.id
                WHERE r.name = :member_role
                  AND (
                    :query = '%%'
                    OR lower(u.name) LIKE lower(:query)
                    OR lower(u.email) LIKE lower(:query)
                    OR lower(COALESCE(p.identifier, '')) LIKE lower(:query)
                  )
                ORDER BY u.name
                LIMIT 50
                """,
            ),
            params,
        ).mappings().all()

        return [dict(row) for row in rows]

    def create_member_inscription(self, course_id: int, user_id: int) -> CourseInscription:
        row = self.session.execute(
            text(
                """
                SELECT u.id AS user_id, u.name, u.email, p.id AS profile_id, p.names,
                       p.lastname, p.identifier, p.mobile_phone, p.province, p.city
                FROM users u
                INNER JOIN model_has_roles mhr ON mhr.model_id = u.id
                    AND mhr.model_type = 'App\\Models\\User'
                INNER JOIN roles r ON r.id = mhr.role_id
                LEFT JOIN profiles p ON p.user_id = u.id
                WHERE u.id = :user_id AND r.name = 'miembro'
                LIMIT 1
                """,
            ),
            {"user_id": user_id},
        ).mappings().first()

        if row is None:
            raise ValueError("El usuario no existe o no tiene rol miembro.")

        duplicate = self._find_duplicate_member_inscription(course_id, user_id)
        if duplicate is not None:
            return duplicate

        names = " ".join(
            part for part in [row["names"] or row["name"], row["lastname"]] if part
        )
        inserted = self.session.execute(
            text(
                """
                INSERT INTO course_inscriptions (
                    course_id, state_id, participant_type, user_id, profile_id,
                    names, email, identifier, cellphone, province, city, created_at, updated_at
                )
                VALUES (
                    :course_id, :state_id, 'member', :user_id, :profile_id,
                    :names, :email, :identifier, :cellphone, :province, :city, :now, :now
                )
                RETURNING *
                """,
            ),
            {
                "course_id": course_id,
                "state_id": REGISTERED_STATE_ID,
                "user_id": user_id,
                "profile_id": row["profile_id"],
                "names": names,
                "email": row["email"],
                "identifier": row["identifier"] or f"user-{user_id}",
                "cellphone": row["mobile_phone"],
                "province": row["province"],
                "city": row["city"],
                "now": _now(),
            },
        ).mappings().one()
        self.session.commit()

        return self._build_inscription(inserted)

    def create_guest_inscription(
        self,
        course: Course,
        data: dict[str, Any],
        voucher_path: str | None,
    ) -> CourseInscription:
        duplicate_field = self.find_guest_duplicate_field(
            course_id=course.id,
            email=data["email"],
            identifier=data["identifier"],
        )
        if duplicate_field == "email":
            raise ValueError("Ya existe una inscripción con este correo para este curso.")
        if duplicate_field == "identifier":
            raise ValueError("Ya existe una inscripción con esta cédula/RUC/pasaporte para este curso.")

        requires_payment = _money_to_float(course.value) > 0
        state_id = PENDING_APPROVAL_STATE_ID if requires_payment else REGISTERED_STATE_ID
        try:
            inserted = self.session.execute(
                text(
                    """
                    INSERT INTO course_inscriptions (
                        course_id, state_id, participant_type, names, email, identifier,
                        cellphone, country, province, city, organization, created_at, updated_at
                    )
                    VALUES (
                        :course_id, :state_id, 'guest', :names, :email, :identifier,
                        :cellphone, :country, :province, :city, :organization, :now, :now
                    )
                    RETURNING *
                    """,
                ),
                {**data, "course_id": course.id, "state_id": state_id, "now": _now()},
            ).mappings().one()

            if requires_payment:
                self.session.execute(
                    text(
                        """
                        INSERT INTO course_payments (
                            course_id, course_inscription_id, state_id, voucher_path,
                            amount, reference, created_at, updated_at
                        )
                        VALUES (
                            :course_id, :inscription_id, :state_id, :voucher_path,
                            :amount, :reference, :now, :now
                        )
                        """,
                    ),
                    {
                        "course_id": course.id,
                        "inscription_id": inserted["id"],
                        "state_id": PENDING_APPROVAL_STATE_ID,
                        "voucher_path": voucher_path,
                        "amount": course.value,
                        "reference": data.get("payment_reference"),
                        "now": _now(),
                    },
                )

            self.session.commit()
        except IntegrityError as exc:
            self.session.rollback()
            raise ValueError("Ya existe una inscripción con este correo o cédula para este curso.") from exc

        return self.get_inscription(int(inserted["id"])) or self._build_inscription(inserted)

    def list_inscriptions(self, course_id: int) -> list[CourseInscription]:
        rows = self.session.execute(
            text(
                """
                SELECT ci.*, cp.state_id AS payment_state_id, cp.voucher_path,
                       cc.id AS certificate_id, cc.certificate_code,
                       cc.sent_at AS certificate_sent_at
                FROM course_inscriptions ci
                LEFT JOIN course_payments cp ON cp.course_inscription_id = ci.id
                LEFT JOIN course_certificates cc ON cc.course_inscription_id = ci.id
                WHERE ci.course_id = :course_id
                  AND ci.deleted_at IS NULL
                ORDER BY ci.created_at DESC, ci.id DESC
                """,
            ),
            {"course_id": course_id},
        ).mappings().all()

        return [self._build_inscription(row) for row in rows]

    def get_inscription(self, inscription_id: int) -> CourseInscription | None:
        row = self.session.execute(
            text(
                """
                SELECT ci.*, cp.state_id AS payment_state_id, cp.voucher_path,
                       cc.id AS certificate_id, cc.certificate_code,
                       cc.sent_at AS certificate_sent_at
                FROM course_inscriptions ci
                LEFT JOIN course_payments cp ON cp.course_inscription_id = ci.id
                LEFT JOIN course_certificates cc ON cc.course_inscription_id = ci.id
                WHERE ci.id = :inscription_id
                  AND ci.deleted_at IS NULL
                LIMIT 1
                """,
            ),
            {"inscription_id": inscription_id},
        ).mappings().first()

        return self._build_inscription(row) if row is not None else None

    def approve_payment(self, inscription_id: int, reviewed_by: int) -> CourseInscription | None:
        now = _now()
        self.session.execute(
            text(
                """
                UPDATE course_payments
                SET state_id = :paid_state_id,
                    reviewed_by = :reviewed_by,
                    reviewed_at = :now,
                    updated_at = :now
                WHERE course_inscription_id = :inscription_id
                """,
            ),
            {
                "paid_state_id": PAID_STATE_ID,
                "reviewed_by": reviewed_by,
                "now": now,
                "inscription_id": inscription_id,
            },
        )
        self.session.execute(
            text(
                """
                UPDATE course_inscriptions
                SET state_id = :paid_state_id, updated_at = :now
                WHERE id = :inscription_id
                """,
            ),
            {"paid_state_id": PAID_STATE_ID, "now": now, "inscription_id": inscription_id},
        )
        self.session.commit()

        return self.get_inscription(inscription_id)

    def reject_payment(
        self,
        inscription_id: int,
        reviewed_by: int,
        observation: str,
    ) -> CourseInscription | None:
        now = _now()
        self.session.execute(
            text(
                """
                UPDATE course_payments
                SET state_id = :rejected_state_id,
                    reviewed_by = :reviewed_by,
                    reviewed_at = :now,
                    admin_observation = :observation,
                    updated_at = :now
                WHERE course_inscription_id = :inscription_id
                """,
            ),
            {
                "rejected_state_id": REJECTED_PAYMENT_STATE_ID,
                "reviewed_by": reviewed_by,
                "now": now,
                "observation": observation,
                "inscription_id": inscription_id,
            },
        )
        self.session.execute(
            text(
                """
                UPDATE course_inscriptions
                SET state_id = :rejected_state_id, updated_at = :now
                WHERE id = :inscription_id
                """,
            ),
            {
                "rejected_state_id": REJECTED_PAYMENT_STATE_ID,
                "now": now,
                "inscription_id": inscription_id,
            },
        )
        self.session.commit()

        return self.get_inscription(inscription_id)

    def update_attendance(self, inscription_id: int, attended: bool) -> CourseInscription | None:
        attended_at = _now() if attended else None
        self.session.execute(
            text(
                """
                UPDATE course_inscriptions
                SET attended_at = :attended_at,
                    state_id = CASE WHEN :attended THEN :attended_state_id ELSE state_id END,
                    updated_at = :now
                WHERE id = :inscription_id
                """,
            ),
            {
                "attended_at": attended_at,
                "attended": attended,
                "attended_state_id": 11,
                "now": _now(),
                "inscription_id": inscription_id,
            },
        )
        self.session.commit()

        return self.get_inscription(inscription_id)

    def upsert_certificate(
        self,
        course_id: int,
        inscription_id: int,
        certificate_code: str,
        pdf_path: str,
    ) -> CourseCertificate:
        existing = self.get_certificate_by_inscription(inscription_id)
        if existing is not None:
            return existing

        row = self.session.execute(
            text(
                """
                INSERT INTO course_certificates (
                    course_id, course_inscription_id, certificate_code,
                    pdf_path, created_at, updated_at
                )
                VALUES (
                    :course_id, :inscription_id, :certificate_code,
                    :pdf_path, :now, :now
                )
                RETURNING *
                """,
            ),
            {
                "course_id": course_id,
                "inscription_id": inscription_id,
                "certificate_code": certificate_code,
                "pdf_path": pdf_path,
                "now": _now(),
            },
        ).mappings().one()
        self.session.commit()

        return self._build_certificate(row)

    def mark_certificate_sent(self, certificate_id: int, sent_by: int) -> CourseCertificate | None:
        row = self.session.execute(
            text(
                """
                UPDATE course_certificates
                SET sent_at = COALESCE(sent_at, :now),
                    sent_by = COALESCE(sent_by, :sent_by),
                    updated_at = :now
                WHERE id = :certificate_id
                RETURNING *
                """,
            ),
            {"certificate_id": certificate_id, "sent_by": sent_by, "now": _now()},
        ).mappings().first()
        self.session.commit()

        return self._build_certificate(row) if row is not None else None

    def get_certificate_by_inscription(self, inscription_id: int) -> CourseCertificate | None:
        row = self.session.execute(
            text(
                """
                SELECT *
                FROM course_certificates
                WHERE course_inscription_id = :inscription_id
                LIMIT 1
                """,
            ),
            {"inscription_id": inscription_id},
        ).mappings().first()

        return self._build_certificate(row) if row is not None else None

    def get_certificate(self, certificate_id: int) -> CourseCertificate | None:
        row = self.session.execute(
            text("SELECT * FROM course_certificates WHERE id = :certificate_id LIMIT 1"),
            {"certificate_id": certificate_id},
        ).mappings().first()

        return self._build_certificate(row) if row is not None else None

    def certificate_belongs_to_member(
        self,
        certificate_id: int,
        user_id: int,
    ) -> bool:
        row = self.session.execute(
            text(
                """
                SELECT cc.id
                FROM course_certificates cc
                INNER JOIN course_inscriptions ci ON ci.id = cc.course_inscription_id
                WHERE cc.id = :certificate_id
                  AND ci.user_id = :user_id
                  AND ci.attended_at IS NOT NULL
                  AND ci.deleted_at IS NULL
                LIMIT 1
                """,
            ),
            {"certificate_id": certificate_id, "user_id": user_id},
        ).first()

        return row is not None

    def create_feedback_token(self, inscription_id: int) -> str:
        inscription = self.get_inscription(inscription_id)
        if inscription is None:
            raise ValueError("Inscripción no encontrada.")

        token = token_urlsafe(32)
        token_hash = sha256(token.encode("utf-8")).hexdigest()
        self.session.execute(
            text(
                """
                INSERT INTO course_feedback_tokens (
                    course_id, course_inscription_id, token_hash, created_at, updated_at
                )
                VALUES (:course_id, :inscription_id, :token_hash, :now, :now)
                ON CONFLICT (course_inscription_id)
                DO UPDATE SET token_hash = EXCLUDED.token_hash,
                              used_at = NULL,
                              updated_at = EXCLUDED.updated_at
                """,
            ),
            {
                "course_id": inscription.course_id,
                "inscription_id": inscription.id,
                "token_hash": token_hash,
                "now": _now(),
            },
        )
        self.session.commit()

        return token

    def get_feedback_context(self, token: str) -> dict[str, Any] | None:
        token_hash = sha256(token.encode("utf-8")).hexdigest()
        row = self.session.execute(
            text(
                """
                SELECT c.title, c.date_course, ci.names, cft.used_at, cft.expires_at
                FROM course_feedback_tokens cft
                INNER JOIN courses c ON c.id = cft.course_id
                INNER JOIN course_inscriptions ci ON ci.id = cft.course_inscription_id
                WHERE cft.token_hash = :token_hash
                LIMIT 1
                """,
            ),
            {"token_hash": token_hash},
        ).mappings().first()

        return dict(row) if row is not None else None

    def submit_feedback(self, token: str, data: dict[str, Any]) -> bool:
        token_hash = sha256(token.encode("utf-8")).hexdigest()
        token_row = self.session.execute(
            text(
                """
                SELECT *
                FROM course_feedback_tokens
                WHERE token_hash = :token_hash
                  AND used_at IS NULL
                  AND (expires_at IS NULL OR expires_at > :now)
                LIMIT 1
                """,
            ),
            {"token_hash": token_hash, "now": _now()},
        ).mappings().first()

        if token_row is None:
            return False

        self.session.execute(
            text(
                """
                INSERT INTO course_feedbacks (
                    course_id, course_inscription_id, rating, content_rating,
                    instructor_rating, platform_rating, comments, created_at, updated_at
                )
                VALUES (
                    :course_id, :inscription_id, :rating, :content_rating,
                    :instructor_rating, :platform_rating, :comments, :now, :now
                )
                """,
            ),
            {
                **data,
                "course_id": token_row["course_id"],
                "inscription_id": token_row["course_inscription_id"],
                "now": _now(),
            },
        )
        self.session.execute(
            text(
                """
                UPDATE course_feedback_tokens
                SET used_at = :now, updated_at = :now
                WHERE id = :id
                """,
            ),
            {"id": token_row["id"], "now": _now()},
        )
        self.session.commit()

        return True

    def _find_duplicate_member_inscription(
        self,
        course_id: int,
        user_id: int,
    ) -> CourseInscription | None:
        row = self.session.execute(
            text(
                """
                SELECT *
                FROM course_inscriptions
                WHERE course_id = :course_id
                  AND user_id = :user_id
                  AND deleted_at IS NULL
                LIMIT 1
                """,
            ),
            {"course_id": course_id, "user_id": user_id},
        ).mappings().first()

        return self._build_inscription(row) if row is not None else None

    def find_guest_duplicate_field(
        self,
        course_id: int,
        email: str,
        identifier: str,
    ) -> str | None:
        row = self.session.execute(
            text(
                """
                SELECT email, identifier
                FROM course_inscriptions
                WHERE course_id = :course_id
                  AND participant_type = 'guest'
                  AND deleted_at IS NULL
                  AND (lower(email) = lower(:email) OR identifier = :identifier)
                LIMIT 1
                """,
            ),
            {"course_id": course_id, "email": email, "identifier": identifier},
        ).mappings().first()

        if row is None:
            return None
        if row["identifier"] == identifier:
            return "identifier"
        if row["email"].lower() == email.lower():
            return "email"

        return "inscription"

    def _build_course(self, row: Any) -> Course:
        return Course(**dict(row))

    def _build_inscription(self, row: Any) -> CourseInscription:
        data = dict(row)
        data.setdefault("payment_state_id", None)
        data.setdefault("voucher_path", None)
        data.setdefault("certificate_id", None)
        data.setdefault("certificate_code", None)
        data.setdefault("certificate_sent_at", None)
        return CourseInscription(**data)

    def _build_certificate(self, row: Any) -> CourseCertificate:
        return CourseCertificate(**dict(row))
