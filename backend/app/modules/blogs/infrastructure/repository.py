from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.blogs.domain.entities import HIDDEN_STATE_ID, VISIBLE_STATE_ID, Blog


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class SqlAlchemyBlogRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_public(self) -> list[Blog]:
        rows = self.session.execute(
            text(
                """
                SELECT *
                FROM blogs
                WHERE state_id = :visible_state_id
                  AND deleted_at IS NULL
                ORDER BY id DESC
                """,
            ),
            {"visible_state_id": VISIBLE_STATE_ID},
        ).mappings().all()

        return [self._build(row) for row in rows]

    def list_admin(self) -> list[Blog]:
        rows = self.session.execute(
            text(
                """
                SELECT *
                FROM blogs
                WHERE deleted_at IS NULL
                ORDER BY id DESC
                """,
            ),
        ).mappings().all()

        return [self._build(row) for row in rows]

    def get(self, blog_id: int) -> Blog | None:
        row = self.session.execute(
            text(
                """
                SELECT *
                FROM blogs
                WHERE id = :blog_id
                  AND deleted_at IS NULL
                LIMIT 1
                """,
            ),
            {"blog_id": blog_id},
        ).mappings().first()

        return self._build(row) if row is not None else None

    def create(self, data: dict, created_by: int) -> Blog:
        now = _now()
        row = self.session.execute(
            text(
                """
                INSERT INTO blogs (
                    state_id, created_by, title, description, link, image,
                    created_at, updated_at
                )
                VALUES (
                    :state_id, :created_by, :title, :description, :link, :image,
                    :created_at, :updated_at
                )
                RETURNING *
                """,
            ),
            {**data, "created_by": created_by, "created_at": now, "updated_at": now},
        ).mappings().one()
        self.session.commit()
        return self._build(row)

    def update(self, blog_id: int, data: dict) -> Blog | None:
        current = self.get(blog_id)
        if current is None:
            return None

        row = self.session.execute(
            text(
                """
                UPDATE blogs
                SET title = :title,
                    description = :description,
                    state_id = :state_id,
                    link = :link,
                    image = :image,
                    updated_at = :updated_at
                WHERE id = :id
                  AND deleted_at IS NULL
                RETURNING *
                """,
            ),
            {**data, "id": blog_id, "updated_at": _now()},
        ).mappings().one()
        self.session.commit()
        return self._build(row)

    def update_image(self, blog_id: int, image: str) -> Blog | None:
        row = self.session.execute(
            text(
                """
                UPDATE blogs
                SET image = :image,
                    updated_at = :updated_at
                WHERE id = :blog_id
                  AND deleted_at IS NULL
                RETURNING *
                """,
            ),
            {"blog_id": blog_id, "image": image, "updated_at": _now()},
        ).mappings().first()
        self.session.commit()
        return self._build(row) if row is not None else None

    def set_visibility(self, blog_id: int, state_id: int) -> Blog | None:
        row = self.session.execute(
            text(
                """
                UPDATE blogs
                SET state_id = :state_id,
                    updated_at = :updated_at
                WHERE id = :blog_id
                  AND deleted_at IS NULL
                RETURNING *
                """,
            ),
            {"blog_id": blog_id, "state_id": state_id, "updated_at": _now()},
        ).mappings().first()
        self.session.commit()
        return self._build(row) if row is not None else None

    def soft_delete(self, blog_id: int, deleted_by: int) -> bool:
        result = self.session.execute(
            text(
                """
                UPDATE blogs
                SET state_id = :hidden_state_id,
                    deleted_at = :deleted_at,
                    deleted_by = :deleted_by,
                    updated_at = :updated_at
                WHERE id = :blog_id
                  AND deleted_at IS NULL
                """,
            ),
            {
                "blog_id": blog_id,
                "hidden_state_id": HIDDEN_STATE_ID,
                "deleted_at": _now().isoformat(),
                "deleted_by": str(deleted_by),
                "updated_at": _now(),
            },
        )
        self.session.commit()
        return result.rowcount > 0

    def slug_exists(self, slug: str, exclude_id: int | None = None) -> bool:
        query = """
            SELECT 1
            FROM blogs
            WHERE link = :slug
              AND deleted_at IS NULL
        """
        params: dict[str, object] = {"slug": slug}

        if exclude_id is not None:
            query += " AND id <> :exclude_id"
            params["exclude_id"] = exclude_id

        query += " LIMIT 1"
        row = self.session.execute(text(query), params).first()
        return row is not None

    def _build(self, row: object) -> Blog:
        data = dict(row)  # type: ignore[arg-type]
        return Blog(
            id=int(data["id"]),
            state_id=int(data["state_id"]),
            created_by=int(data["created_by"]),
            title=str(data["title"]),
            description=str(data["description"]),
            link=str(data["link"]),
            image=str(data["image"] or ""),
            deleted_at=data["deleted_at"],
            deleted_by=data["deleted_by"],
            created_at=data["created_at"],
            updated_at=data["updated_at"],
        )
