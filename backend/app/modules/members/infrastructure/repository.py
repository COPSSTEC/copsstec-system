from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.members.domain.entities import (
    BLOCKED_LOGIN_STATE_IDS,
    DISABLED_STATE_ID,
    ENABLED_STATE_ID,
    MEMBER_COLUMNS,
    MEMBER_ROLE_NAME,
    STATE_LABELS,
    USER_MODEL_TYPE,
    Member,
    MemberListQuery,
    MemberListResult,
    MemberWriteData,
)
from app.modules.members.domain.exceptions import MemberNotFoundError
from app.shared.infrastructure.sequences import sync_serial_sequence


SORT_COLUMNS: dict[str, str] = {
    "member": "p.names",
    "names": "p.names",
    "lastname": "p.lastname",
    "identifier": "p.identifier",
    "email": "p.email",
    "contacts": "p.email",
    "login_email": "u.email",
    "birtday": "CASE WHEN p.birtday ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN to_date(p.birtday, 'DD/MM/YYYY') END",
    "date_register": (
        "CASE WHEN p.date_register ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' "
        "THEN to_date(p.date_register, 'DD/MM/YYYY') END"
    ),
    "state": "u.state_id",
    "blood_type": "p.blood_type",
    "title_academic": "p.title_academic",
    "level_academic": "p.level_academic",
    "gender": "p.gender",
    "province": "p.province",
    "city": "p.city",
    "fixed_phone": "p.fixed_phone",
    "cod_senescyt": "p.cod_senescyt",
    "last_conexion": "u.last_conexion",
    "mobile_phone": "p.mobile_phone",
}

MEMBER_SELECT = """
    SELECT
        u.id AS user_id,
        p.id AS profile_id,
        u.name,
        u.email AS login_email,
        u.state_id,
        u.last_conexion,
        u.created_at,
        COALESCE(p.names, '') AS names,
        COALESCE(p.lastname, '') AS lastname,
        COALESCE(p.identifier, '') AS identifier,
        COALESCE(p.email, u.email) AS email,
        COALESCE(p.birtday, '') AS birtday,
        COALESCE(p.blood_type, '') AS blood_type,
        COALESCE(p.mobile_phone, '') AS mobile_phone,
        COALESCE(p.fixed_phone, '') AS fixed_phone,
        COALESCE(p.title_academic, '') AS title_academic,
        COALESCE(p.level_academic, '') AS level_academic,
        COALESCE(p.cod_senescyt, '') AS cod_senescyt,
        COALESCE(p.date_register, '') AS date_register,
        COALESCE(p.linkdink, '') AS linkdink,
        COALESCE(p.want_notifications, false) AS want_notifications,
        COALESCE(p.is_work, false) AS is_work,
        COALESCE(p.foto_id, '') AS foto_id,
        p.province,
        p.city,
        p.street_principal,
        p.street_secondary,
        p.type_profile,
        p.date_exit,
        p.fourth_title,
        p.type_commision,
        p.codigo_senescyt_cuarto,
        p.cod,
        p.gender
    FROM users u
    INNER JOIN model_has_roles mhr
        ON mhr.model_id = u.id
       AND mhr.model_type = :model_type
    INNER JOIN roles r ON r.id = mhr.role_id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE r.name = :member_role
      AND p.deleted_at IS NULL
"""


class SqlAlchemyMemberRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_members(self, query: MemberListQuery) -> MemberListResult:
        filters, params = self._build_filters(query)
        sort_sql = SORT_COLUMNS.get(query.sort_by, "p.names")
        sort_dir = "DESC" if query.sort_dir.lower() == "desc" else "ASC"
        page = max(query.page, 1)
        page_size = min(max(query.page_size, 1), 100)
        offset = (page - 1) * page_size

        count_row = self.session.execute(
            text(
                f"""
                SELECT COUNT(*) AS total
                FROM users u
                INNER JOIN model_has_roles mhr
                    ON mhr.model_id = u.id
                   AND mhr.model_type = :model_type
                INNER JOIN roles r ON r.id = mhr.role_id
                LEFT JOIN profiles p ON p.user_id = u.id
                WHERE r.name = :member_role
                  AND p.deleted_at IS NULL
                  {filters}
                """,
            ),
            params,
        ).mappings().first()

        rows = self.session.execute(
            text(
                f"""
                {MEMBER_SELECT}
                {filters}
                ORDER BY {sort_sql} {sort_dir} NULLS LAST, u.id ASC
                LIMIT :limit OFFSET :offset
                """,
            ),
            {**params, "limit": page_size, "offset": offset},
        ).mappings().all()

        return MemberListResult(
            items=[self._to_member(row) for row in rows],
            total=int(count_row["total"]) if count_row else 0,
            page=page,
            page_size=page_size,
            columns=MEMBER_COLUMNS,
        )

    def get_member(self, user_id: int) -> Member | None:
        row = self.session.execute(
            text(f"{MEMBER_SELECT} AND u.id = :user_id"),
            {
                "user_id": user_id,
                "model_type": USER_MODEL_TYPE,
                "member_role": MEMBER_ROLE_NAME,
            },
        ).mappings().first()

        if row is None:
            return None

        return self._to_member(row)

    def create_member(self, data: MemberWriteData, password_hash: str) -> Member:
        now = datetime.now(UTC).replace(tzinfo=None)
        sync_serial_sequence(self.session, "users")
        sync_serial_sequence(self.session, "profiles")
        full_name = f"{data.names} {data.lastname}".strip()

        user_id = self.session.execute(
            text(
                """
                INSERT INTO users (name, email, password, state_id, must_change_password, created_at, updated_at)
                VALUES (:name, :email, :password, :state_id, true, :now, :now)
                RETURNING id
                """,
            ),
            {
                "name": full_name,
                "email": data.login_email,
                "password": password_hash,
                "state_id": data.state_id,
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
            {
                "role_id": role_id,
                "model_id": user_id,
                "model_type": USER_MODEL_TYPE,
            },
        )

        self.session.execute(
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
                    :date_register, :linkdink, :want_notifications, :is_work, :foto_id,
                    :province, :city, :street_principal, :street_secondary, :state_id,
                    :type_profile, :fourth_title, :type_commision, :codigo_senescyt_cuarto,
                    :gender, :now, :now
                )
                """,
            ),
            self._profile_params(user_id, data, now),
        )
        self.session.commit()

        member = self.get_member(user_id)
        if member is None:
            raise MemberNotFoundError()
        return member

    def update_member(self, user_id: int, data: MemberWriteData) -> Member:
        now = datetime.now(UTC).replace(tzinfo=None)
        full_name = f"{data.names} {data.lastname}".strip()

        updated = self.session.execute(
            text(
                """
                UPDATE users
                SET name = :name, email = :email, updated_at = :now
                WHERE id = :user_id
                """,
            ),
            {
                "name": full_name,
                "email": data.login_email,
                "now": now,
                "user_id": user_id,
            },
        ).rowcount

        if not updated:
            raise MemberNotFoundError()

        existing_profile = self.session.execute(
            text("SELECT id FROM profiles WHERE user_id = :user_id LIMIT 1"),
            {"user_id": user_id},
        ).scalar_one_or_none()

        if existing_profile is None:
            self.session.execute(
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
                        :date_register, :linkdink, :want_notifications, :is_work, :foto_id,
                        :province, :city, :street_principal, :street_secondary, :state_id,
                        :type_profile, :fourth_title, :type_commision, :codigo_senescyt_cuarto,
                        :gender, :now, :now
                    )
                    """,
                ),
                self._profile_params(user_id, data, now),
            )
        else:
            self.session.execute(
                text(
                    """
                    UPDATE profiles
                    SET names = :names,
                        lastname = :lastname,
                        identifier = :identifier,
                        email = :email,
                        birtday = :birtday,
                        blood_type = :blood_type,
                        mobile_phone = :mobile_phone,
                        fixed_phone = :fixed_phone,
                        title_academic = :title_academic,
                        level_academic = :level_academic,
                        cod_senescyt = :cod_senescyt,
                        date_register = :date_register,
                        linkdink = :linkdink,
                        want_notifications = :want_notifications,
                        is_work = :is_work,
                        foto_id = :foto_id,
                        province = :province,
                        city = :city,
                        street_principal = :street_principal,
                        street_secondary = :street_secondary,
                        type_profile = :type_profile,
                        fourth_title = :fourth_title,
                        type_commision = :type_commision,
                        codigo_senescyt_cuarto = :codigo_senescyt_cuarto,
                        gender = :gender,
                        updated_at = :now,
                        deleted_at = NULL,
                        deleted_by = NULL
                    WHERE user_id = :user_id
                    """,
                ),
                self._profile_params(user_id, data, now),
            )

        self.session.commit()
        member = self.get_member(user_id)
        if member is None:
            raise MemberNotFoundError()
        return member

    def soft_delete_member(self, user_id: int, deleted_by: int) -> None:
        now = datetime.now(UTC).replace(tzinfo=None)
        member = self.get_member(user_id)
        if member is None:
            raise MemberNotFoundError()

        self.session.execute(
            text(
                """
                UPDATE users
                SET state_id = :state_id, updated_at = :now
                WHERE id = :user_id
                """,
            ),
            {"state_id": DISABLED_STATE_ID, "now": now, "user_id": user_id},
        )
        self.session.execute(
            text(
                """
                UPDATE profiles
                SET state_id = :state_id,
                    deleted_at = :deleted_at,
                    deleted_by = :deleted_by,
                    updated_at = :now
                WHERE user_id = :user_id
                """,
            ),
            {
                "state_id": DISABLED_STATE_ID,
                "deleted_at": now.isoformat(),
                "deleted_by": str(deleted_by),
                "now": now,
                "user_id": user_id,
            },
        )
        self.session.commit()

    def set_member_state(self, user_id: int, state_id: int) -> Member:
        now = datetime.now(UTC).replace(tzinfo=None)
        updated = self.session.execute(
            text(
                """
                UPDATE users
                SET state_id = :state_id, updated_at = :now
                WHERE id = :user_id
                """,
            ),
            {"state_id": state_id, "now": now, "user_id": user_id},
        ).rowcount

        if not updated:
            raise MemberNotFoundError()

        self.session.execute(
            text(
                """
                UPDATE profiles
                SET state_id = :state_id, updated_at = :now
                WHERE user_id = :user_id
                """,
            ),
            {"state_id": state_id, "now": now, "user_id": user_id},
        )
        self.session.commit()

        member = self.get_member(user_id)
        if member is None:
            raise MemberNotFoundError()
        return member

    def update_password(self, user_id: int, password_hash: str) -> Member:
        now = datetime.now(UTC).replace(tzinfo=None)
        updated = self.session.execute(
            text(
                """
                UPDATE users
                SET password = :password_hash, must_change_password = true, updated_at = :now
                WHERE id = :user_id
                """,
            ),
            {"password_hash": password_hash, "now": now, "user_id": user_id},
        ).rowcount

        if not updated:
            raise MemberNotFoundError()

        self.session.commit()
        member = self.get_member(user_id)
        if member is None:
            raise MemberNotFoundError()
        return member

    def update_photo(self, user_id: int, foto_id: str) -> Member:
        now = datetime.now(UTC).replace(tzinfo=None)
        updated = self.session.execute(
            text(
                """
                UPDATE profiles
                SET foto_id = :foto_id, updated_at = :now
                WHERE user_id = :user_id
                """,
            ),
            {"foto_id": foto_id, "now": now, "user_id": user_id},
        ).rowcount

        if not updated:
            raise MemberNotFoundError()

        self.session.commit()
        member = self.get_member(user_id)
        if member is None:
            raise MemberNotFoundError()
        return member

    def find_conflict(
        self,
        *,
        identifier: str,
        email: str,
        login_email: str,
        exclude_user_id: int | None = None,
    ) -> str | None:
        row = self.session.execute(
            text(
                """
                SELECT
                    EXISTS(
                        SELECT 1 FROM profiles
                        WHERE lower(identifier) = lower(:identifier)
                          AND (:exclude_user_id IS NULL OR user_id <> :exclude_user_id)
                    ) AS identifier_taken,
                    EXISTS(
                        SELECT 1 FROM profiles
                        WHERE lower(email) = lower(:email)
                          AND (:exclude_user_id IS NULL OR user_id <> :exclude_user_id)
                    ) AS profile_email_taken,
                    EXISTS(
                        SELECT 1 FROM users
                        WHERE lower(email) = lower(:login_email)
                          AND (:exclude_user_id IS NULL OR id <> :exclude_user_id)
                    ) AS login_email_taken
                """,
            ),
            {
                "identifier": identifier,
                "email": email,
                "login_email": login_email,
                "exclude_user_id": exclude_user_id,
            },
        ).mappings().first()

        if row is None:
            return None
        if row["identifier_taken"]:
            return "Ya existe un miembro con esa cédula."
        if row["profile_email_taken"]:
            return "Ya existe un miembro con ese correo de contacto."
        if row["login_email_taken"]:
            return "Ya existe un usuario con ese correo de acceso."
        return None

    def _build_filters(self, query: MemberListQuery) -> tuple[str, dict[str, Any]]:
        clauses: list[str] = []
        params: dict[str, Any] = {
            "model_type": USER_MODEL_TYPE,
            "member_role": MEMBER_ROLE_NAME,
        }

        if query.q:
            clauses.append(
                """
                (
                    lower(COALESCE(p.names, '')) LIKE lower(:q)
                    OR lower(COALESCE(p.lastname, '')) LIKE lower(:q)
                    OR lower(u.name) LIKE lower(:q)
                )
                """,
            )
            params["q"] = f"%{query.q.strip()}%"

        if query.names:
            clauses.append("lower(COALESCE(p.names, '')) LIKE lower(:names)")
            params["names"] = f"%{query.names.strip()}%"

        if query.lastname:
            clauses.append("lower(COALESCE(p.lastname, '')) LIKE lower(:lastname)")
            params["lastname"] = f"%{query.lastname.strip()}%"

        if query.identifier:
            clauses.append("lower(COALESCE(p.identifier, '')) LIKE lower(:identifier)")
            params["identifier"] = f"%{query.identifier.strip()}%"

        if query.email:
            clauses.append(
                """
                (
                    lower(COALESCE(p.email, '')) LIKE lower(:email)
                    OR lower(u.email) LIKE lower(:email)
                )
                """,
            )
            params["email"] = f"%{query.email.strip()}%"

        if query.state_id is not None:
            clauses.append("u.state_id = :state_id")
            params["state_id"] = query.state_id

        if query.login_email:
            clauses.append("lower(u.email) LIKE lower(:login_email)")
            params["login_email"] = f"%{query.login_email.strip()}%"

        text_filters = {
            "blood_type": ("p.blood_type", query.blood_type),
            "title_academic": ("p.title_academic", query.title_academic),
            "level_academic": ("p.level_academic", query.level_academic),
            "gender": ("p.gender", query.gender),
            "province": ("p.province", query.province),
            "city": ("p.city", query.city),
            "fixed_phone": ("p.fixed_phone", query.fixed_phone),
            "cod_senescyt": ("p.cod_senescyt", query.cod_senescyt),
        }

        for key, (column, value) in text_filters.items():
            if value:
                clauses.append(f"lower(COALESCE({column}, '')) LIKE lower(:{key})")
                params[key] = f"%{value.strip()}%"

        self._append_date_range(
            clauses,
            params,
            column="p.date_register",
            start=query.date_register_from,
            end=query.date_register_to,
            prefix="register",
        )
        self._append_date_range(
            clauses,
            params,
            column="p.birtday",
            start=query.birthday_from,
            end=query.birthday_to,
            prefix="birthday",
        )

        sql = "".join(f" AND {clause}" for clause in clauses)
        return sql, params

    def _append_date_range(
        self,
        clauses: list[str],
        params: dict[str, Any],
        *,
        column: str,
        start: str | None,
        end: str | None,
        prefix: str,
    ) -> None:
        parsed = (
            f"CASE WHEN {column} ~ '^[0-9]{{2}}/[0-9]{{2}}/[0-9]{{4}}$' "
            f"THEN to_date({column}, 'DD/MM/YYYY') END"
        )

        if start:
            clauses.append(f"{parsed} >= CAST(:{prefix}_from AS date)")
            params[f"{prefix}_from"] = start

        if end:
            clauses.append(f"{parsed} <= CAST(:{prefix}_to AS date)")
            params[f"{prefix}_to"] = end

    def _profile_params(self, user_id: int, data: MemberWriteData, now: datetime) -> dict[str, Any]:
        return {
            "user_id": user_id,
            "names": data.names.strip(),
            "lastname": data.lastname.strip(),
            "identifier": data.identifier.strip(),
            "email": data.email.strip(),
            "birtday": data.birtday.strip(),
            "blood_type": data.blood_type or "",
            "mobile_phone": data.mobile_phone.strip(),
            "fixed_phone": data.fixed_phone or "",
            "title_academic": data.title_academic or "",
            "level_academic": data.level_academic or "",
            "cod_senescyt": data.cod_senescyt or "",
            "date_register": data.date_register.strip(),
            "linkdink": data.linkdink or "",
            "want_notifications": data.want_notifications,
            "is_work": data.is_work,
            "foto_id": data.foto_id or "",
            "province": data.province,
            "city": data.city,
            "street_principal": data.street_principal,
            "street_secondary": data.street_secondary,
            "state_id": data.state_id,
            "type_profile": data.type_profile or "miembro",
            "fourth_title": data.fourth_title,
            "type_commision": data.type_commision,
            "codigo_senescyt_cuarto": data.codigo_senescyt_cuarto,
            "gender": data.gender,
            "now": now,
        }

    def _to_member(self, row: Any) -> Member:
        state_id = int(row["state_id"])
        return Member(
            user_id=int(row["user_id"]),
            profile_id=int(row["profile_id"]) if row["profile_id"] is not None else None,
            name=row["name"],
            login_email=row["login_email"],
            state_id=state_id,
            state_label=STATE_LABELS.get(state_id, f"ESTADO {state_id}"),
            last_conexion=row["last_conexion"],
            names=row["names"],
            lastname=row["lastname"],
            identifier=row["identifier"],
            email=row["email"],
            birtday=row["birtday"],
            blood_type=row["blood_type"],
            mobile_phone=row["mobile_phone"],
            fixed_phone=row["fixed_phone"],
            title_academic=row["title_academic"],
            level_academic=row["level_academic"],
            cod_senescyt=row["cod_senescyt"],
            date_register=row["date_register"],
            linkdink=row["linkdink"],
            want_notifications=bool(row["want_notifications"]),
            is_work=bool(row["is_work"]),
            foto_id=row["foto_id"],
            province=row["province"],
            city=row["city"],
            street_principal=row["street_principal"],
            street_secondary=row["street_secondary"],
            type_profile=row["type_profile"],
            date_exit=row["date_exit"],
            fourth_title=row["fourth_title"],
            type_commision=row["type_commision"],
            codigo_senescyt_cuarto=row["codigo_senescyt_cuarto"],
            cod=row["cod"],
            gender=row["gender"],
            created_at=row["created_at"],
        )


# Evita un import circular accidental en chequeos de login.
assert ENABLED_STATE_ID not in BLOCKED_LOGIN_STATE_IDS
