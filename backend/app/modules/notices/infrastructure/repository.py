from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.notices.domain.entities import HIDDEN_STATE_ID, VISIBLE_STATE_ID, Notice


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class SqlAlchemyNoticeRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_admin(self) -> list[Notice]:
        rows = self.session.execute(
            text(
                """
                SELECT *
                FROM notices
                WHERE deleted_at IS NULL
                ORDER BY id DESC
                """,
            ),
        ).mappings().all()
        return [self._build(row) for row in rows]

    def list_published(self, now: datetime, limit: int = 12) -> list[Notice]:
        rows = self.session.execute(
            text(
                """
                SELECT *
                FROM notices
                WHERE state_id = :visible_state_id
                  AND deleted_at IS NULL
                  AND (published_at IS NULL OR published_at <= :now)
                ORDER BY COALESCE(published_at, created_at) DESC, id DESC
                LIMIT :limit
                """,
            ),
            {"visible_state_id": VISIBLE_STATE_ID, "now": now, "limit": limit},
        ).mappings().all()
        return [self._build(row) for row in rows]

    def get(self, notice_id: int) -> Notice | None:
        row = self.session.execute(
            text(
                """
                SELECT *
                FROM notices
                WHERE id = :notice_id
                  AND deleted_at IS NULL
                LIMIT 1
                """,
            ),
            {"notice_id": notice_id},
        ).mappings().first()
        return self._build(row) if row is not None else None

    def create(self, data: dict, created_by: int) -> Notice:
        now = _now()
        row = self.session.execute(
            text(
                """
                INSERT INTO notices (
                    state_id, created_by, title, description, image, importance,
                    published_at, created_at, updated_at
                )
                VALUES (
                    :state_id, :created_by, :title, :description, :image, :importance,
                    :published_at, :created_at, :updated_at
                )
                RETURNING *
                """,
            ),
            {**data, "created_by": created_by, "created_at": now, "updated_at": now},
        ).mappings().one()
        self.session.commit()
        return self._build(row)

    def update(self, notice_id: int, data: dict) -> Notice | None:
        if self.get(notice_id) is None:
            return None

        row = self.session.execute(
            text(
                """
                UPDATE notices
                SET title = :title,
                    description = :description,
                    state_id = :state_id,
                    importance = :importance,
                    published_at = :published_at,
                    image = :image,
                    updated_at = :updated_at
                WHERE id = :id
                  AND deleted_at IS NULL
                RETURNING *
                """,
            ),
            {**data, "id": notice_id, "updated_at": _now()},
        ).mappings().one()
        self.session.commit()
        return self._build(row)

    def update_image(self, notice_id: int, image: str) -> Notice | None:
        row = self.session.execute(
            text(
                """
                UPDATE notices
                SET image = :image,
                    updated_at = :updated_at
                WHERE id = :notice_id
                  AND deleted_at IS NULL
                RETURNING *
                """,
            ),
            {"notice_id": notice_id, "image": image, "updated_at": _now()},
        ).mappings().first()
        self.session.commit()
        return self._build(row) if row is not None else None

    def set_visibility(self, notice_id: int, state_id: int) -> Notice | None:
        row = self.session.execute(
            text(
                """
                UPDATE notices
                SET state_id = :state_id,
                    updated_at = :updated_at
                WHERE id = :notice_id
                  AND deleted_at IS NULL
                RETURNING *
                """,
            ),
            {"notice_id": notice_id, "state_id": state_id, "updated_at": _now()},
        ).mappings().first()
        self.session.commit()
        return self._build(row) if row is not None else None

    def soft_delete(self, notice_id: int, deleted_by: int) -> bool:
        result = self.session.execute(
            text(
                """
                UPDATE notices
                SET state_id = :hidden_state_id,
                    deleted_at = :deleted_at,
                    deleted_by = :deleted_by,
                    updated_at = :updated_at
                WHERE id = :notice_id
                  AND deleted_at IS NULL
                """,
            ),
            {
                "notice_id": notice_id,
                "hidden_state_id": HIDDEN_STATE_ID,
                "deleted_at": _now().isoformat(),
                "deleted_by": str(deleted_by),
                "updated_at": _now(),
            },
        )
        self.session.commit()
        return result.rowcount > 0

    def _build(self, row: object) -> Notice:
        data = dict(row)  # type: ignore[arg-type]
        return Notice(
            id=int(data["id"]),
            state_id=int(data["state_id"]),
            created_by=int(data["created_by"]),
            title=str(data["title"]),
            description=str(data["description"]),
            image=str(data["image"] or ""),
            importance=str(data["importance"]),
            published_at=data["published_at"],
            deleted_at=data["deleted_at"],
            deleted_by=data["deleted_by"],
            created_at=data["created_at"],
            updated_at=data["updated_at"],
        )
