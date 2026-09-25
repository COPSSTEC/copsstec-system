from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.modules.auth.domain.entities import (
    AffiliationResumeCode,
    Profile,
    StoredRefreshToken,
    User,
)


class AuthRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_user_by_email(self, email: str) -> User | None:
        user_row = self.session.execute(
            text(
                """
                SELECT id, name, email, password, state_id, email_verified_at, last_conexion,
                       COALESCE(must_change_password, false) AS must_change_password
                FROM users
                WHERE lower(email) = lower(:email)
                LIMIT 1
                """,
            ),
            {"email": email},
        ).mappings().first()

        if user_row is None:
            return None

        return self._build_user(user_row)

    def get_user_by_id(self, user_id: int) -> User | None:
        user_row = self.session.execute(
            text(
                """
                SELECT id, name, email, password, state_id, email_verified_at, last_conexion,
                       COALESCE(must_change_password, false) AS must_change_password
                FROM users
                WHERE id = :user_id
                LIMIT 1
                """,
            ),
            {"user_id": user_id},
        ).mappings().first()

        if user_row is None:
            return None

        return self._build_user(user_row)

    def update_last_connection(self, user_id: int) -> None:
        self.session.execute(
            text("UPDATE users SET last_conexion = :now, updated_at = :now WHERE id = :user_id"),
            {"user_id": user_id, "now": datetime.now(UTC).replace(tzinfo=None)},
        )
        self.session.commit()

    def upsert_password_reset_token(self, email: str, token_hash: str) -> None:
        self.session.execute(
            text(
                """
                INSERT INTO password_reset_tokens (email, token, created_at)
                VALUES (:email, :token, :created_at)
                ON CONFLICT (email)
                DO UPDATE SET token = EXCLUDED.token, created_at = EXCLUDED.created_at
                """,
            ),
            {
                "email": email,
                "token": token_hash,
                "created_at": datetime.now(UTC).replace(tzinfo=None),
            },
        )
        self.session.commit()

    def password_reset_token_is_valid(self, email: str, token_hash: str) -> bool:
        row = self.session.execute(
            text(
                """
                SELECT token, created_at
                FROM password_reset_tokens
                WHERE lower(email) = lower(:email)
                LIMIT 1
                """,
            ),
            {"email": email},
        ).mappings().first()

        if row is None or row["token"] != token_hash:
            return False

        created_at = row["created_at"]
        if created_at is None:
            return False

        settings = get_settings()
        expires_at = created_at + timedelta(
            minutes=settings.password_reset_expire_minutes,
        )

        return datetime.now() <= expires_at

    def update_password(self, email: str, password_hash: str) -> None:
        now = datetime.now(UTC).replace(tzinfo=None)
        self.session.execute(
            text(
                """
                UPDATE users
                SET password = :password_hash, must_change_password = false, updated_at = :now
                WHERE lower(email) = lower(:email)
                """,
            ),
            {
                "email": email,
                "password_hash": password_hash,
                "now": now,
            },
        )
        self.session.execute(
            text("DELETE FROM password_reset_tokens WHERE lower(email) = lower(:email)"),
            {"email": email},
        )
        self.session.commit()

    def create_refresh_token(
        self,
        user_id: int,
        token_hash: str,
        expires_at: datetime,
    ) -> None:
        self.session.execute(
            text(
                """
                INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
                VALUES (:user_id, :token_hash, :expires_at)
                """,
            ),
            {
                "user_id": user_id,
                "token_hash": token_hash,
                "expires_at": expires_at,
            },
        )
        self.session.commit()

    def get_valid_refresh_token(self, token_hash: str) -> StoredRefreshToken | None:
        now = datetime.now(UTC).replace(tzinfo=None)
        row = self.session.execute(
            text(
                """
                SELECT id, user_id, token_hash, expires_at, revoked_at, created_at
                FROM refresh_tokens
                WHERE token_hash = :token_hash
                  AND revoked_at IS NULL
                  AND expires_at > :now
                LIMIT 1
                """,
            ),
            {"token_hash": token_hash, "now": now},
        ).mappings().first()

        if row is None:
            return None

        return StoredRefreshToken(**dict(row))

    def revoke_refresh_token(self, token_hash: str) -> None:
        now = datetime.now(UTC).replace(tzinfo=None)
        self.session.execute(
            text(
                """
                UPDATE refresh_tokens
                SET revoked_at = :now
                WHERE token_hash = :token_hash
                  AND revoked_at IS NULL
                """,
            ),
            {"token_hash": token_hash, "now": now},
        )
        self.session.commit()

    def revoke_and_replace_refresh(
        self,
        old_token_hash: str,
        user_id: int,
        new_token_hash: str,
        expires_at: datetime,
    ) -> None:
        now = datetime.now(UTC).replace(tzinfo=None)
        self.session.execute(
            text(
                """
                UPDATE refresh_tokens
                SET revoked_at = :now
                WHERE token_hash = :token_hash
                  AND revoked_at IS NULL
                """,
            ),
            {"now": now, "token_hash": old_token_hash},
        )
        self.session.execute(
            text(
                """
                INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
                VALUES (:user_id, :token_hash, :expires_at)
                """,
            ),
            {
                "user_id": user_id,
                "token_hash": new_token_hash,
                "expires_at": expires_at,
            },
        )
        self.session.commit()

    def invalidate_open_resume_codes(self, email: str) -> None:
        now = datetime.now(UTC).replace(tzinfo=None)
        self.session.execute(
            text(
                """
                UPDATE affiliation_resume_codes
                SET consumed_at = :now
                WHERE lower(email) = lower(:email)
                  AND consumed_at IS NULL
                """,
            ),
            {"email": email, "now": now},
        )
        self.session.commit()

    def create_resume_code(
        self,
        user_id: int,
        email: str,
        code_hash: str,
        expires_at: datetime,
    ) -> None:
        self.session.execute(
            text(
                """
                INSERT INTO affiliation_resume_codes (user_id, email, code_hash, expires_at)
                VALUES (:user_id, :email, :code_hash, :expires_at)
                """,
            ),
            {
                "user_id": user_id,
                "email": email,
                "code_hash": code_hash,
                "expires_at": expires_at,
            },
        )
        self.session.commit()

    def get_latest_resume_code(self, email: str) -> AffiliationResumeCode | None:
        row = self.session.execute(
            text(
                """
                SELECT id, user_id, email, code_hash, attempts, expires_at, consumed_at, created_at
                FROM affiliation_resume_codes
                WHERE lower(email) = lower(:email)
                  AND consumed_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
                """,
            ),
            {"email": email},
        ).mappings().first()

        if row is None:
            return None

        return AffiliationResumeCode(**dict(row))

    def increment_resume_attempts(self, resume_id: int) -> int:
        row = self.session.execute(
            text(
                """
                UPDATE affiliation_resume_codes
                SET attempts = attempts + 1
                WHERE id = :id
                RETURNING attempts
                """,
            ),
            {"id": resume_id},
        ).mappings().first()
        self.session.commit()
        return int(row["attempts"]) if row is not None else 0

    def consume_resume_code(self, resume_id: int) -> None:
        now = datetime.now(UTC).replace(tzinfo=None)
        self.session.execute(
            text(
                """
                UPDATE affiliation_resume_codes
                SET consumed_at = :now
                WHERE id = :id
                  AND consumed_at IS NULL
                """,
            ),
            {"id": resume_id, "now": now},
        )
        self.session.commit()

    def count_recent_resume_codes(self, email: str, since: datetime) -> int:
        count = self.session.execute(
            text(
                """
                SELECT COUNT(*)
                FROM affiliation_resume_codes
                WHERE lower(email) = lower(:email)
                  AND created_at >= :since
                """,
            ),
            {"email": email, "since": since},
        ).scalar_one()
        return int(count)

    def update_own_password(self, user_id: int, password_hash: str) -> None:
        now = datetime.now(UTC).replace(tzinfo=None)
        self.session.execute(
            text(
                """
                UPDATE users
                SET password = :password_hash, must_change_password = false, updated_at = :now
                WHERE id = :user_id
                """,
            ),
            {
                "password_hash": password_hash,
                "now": now,
                "user_id": user_id,
            },
        )
        self.session.commit()

    def _build_user(self, row: Any) -> User:
        user_id = int(row["id"])

        return User(
            id=user_id,
            name=row["name"],
            email=row["email"],
            password_hash=row["password"],
            state_id=int(row["state_id"]),
            email_verified_at=row["email_verified_at"],
            last_conexion=row["last_conexion"],
            roles=self._get_roles(user_id),
            profile=self._get_profile(user_id),
            must_change_password=bool(row["must_change_password"]),
        )

    def _get_roles(self, user_id: int) -> list[str]:
        rows = self.session.execute(
            text(
                """
                SELECT r.name
                FROM model_has_roles mhr
                INNER JOIN roles r ON r.id = mhr.role_id
                WHERE mhr.model_id = :user_id
                  AND mhr.model_type = 'App\\Models\\User'
                ORDER BY r.id
                """,
            ),
            {"user_id": user_id},
        ).mappings().all()

        return [row["name"] for row in rows]

    def _get_profile(self, user_id: int) -> Profile | None:
        row = self.session.execute(
            text(
                """
                SELECT
                    id,
                    user_id,
                    names,
                    lastname,
                    identifier,
                    email,
                    birtday,
                    blood_type,
                    mobile_phone,
                    fixed_phone,
                    title_academic,
                    level_academic,
                    cod_senescyt,
                    date_register,
                    linkdink,
                    want_notifications,
                    is_work,
                    foto_id,
                    province,
                    city,
                    street_principal,
                    street_secondary,
                    state_id,
                    type_profile,
                    date_exit,
                    fourth_title,
                    type_commision,
                    codigo_senescyt_cuarto,
                    cod,
                    gender
                FROM profiles
                WHERE user_id = :user_id
                LIMIT 1
                """,
            ),
            {"user_id": user_id},
        ).mappings().first()

        if row is None:
            return None

        return Profile(**dict(row))
