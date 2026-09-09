from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.modules.auth.domain.entities import Profile, User


class AuthRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def get_user_by_email(self, email: str) -> User | None:
        user_row = self.session.execute(
            text(
                """
                SELECT id, name, email, password, state_id, email_verified_at, last_conexion
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
                SELECT id, name, email, password, state_id, email_verified_at, last_conexion
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
                SET password = :password_hash, updated_at = :now
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
