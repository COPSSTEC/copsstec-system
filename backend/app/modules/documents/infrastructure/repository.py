from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.documents.domain.entities import (
    DEFAULT_OVERLAY_COLOR,
    DEFAULT_OVERLAY_OPACITY,
    DOCUMENT_CATALOG,
    DOCUMENT_KEYS,
    MemberDocument,
)


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def ensure_member_documents_schema(session: Session) -> None:
    if getattr(session, "_member_documents_schema_v2", False):
        return
    session.execute(text("ALTER TABLE member_documents ADD COLUMN IF NOT EXISTS cover_path TEXT"))
    session.execute(
        text("ALTER TABLE member_documents ADD COLUMN IF NOT EXISTS overlay_color VARCHAR(16)"),
    )
    session.execute(
        text("ALTER TABLE member_documents ADD COLUMN IF NOT EXISTS overlay_opacity INTEGER"),
    )
    session.execute(
        text(
            """
            UPDATE member_documents
            SET overlay_color = COALESCE(overlay_color, '#0f172a'),
                overlay_opacity = COALESCE(overlay_opacity, 68)
            """,
        ),
    )
    now = _now()
    for key in DOCUMENT_KEYS:
        session.execute(
            text(
                """
                INSERT INTO member_documents (document_key, title, created_at, updated_at)
                VALUES (:document_key, :title, :created_at, :updated_at)
                ON CONFLICT (document_key) DO NOTHING
                """,
            ),
            {
                "document_key": key,
                "title": DOCUMENT_CATALOG[key],
                "created_at": now,
                "updated_at": now,
            },
        )
    session.commit()
    setattr(session, "_member_documents_schema_v2", True)


class SqlAlchemyMemberDocumentRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_all(self) -> list[MemberDocument]:
        self._ensure_schema()
        rows = self.session.execute(
            text(
                """
                SELECT *
                FROM member_documents
                ORDER BY id ASC
                """,
            ),
        ).mappings().all()
        return [self._build(row) for row in rows]

    def get_by_key(self, document_key: str) -> MemberDocument | None:
        self._ensure_schema()
        row = self.session.execute(
            text(
                """
                SELECT *
                FROM member_documents
                WHERE document_key = :document_key
                LIMIT 1
                """,
            ),
            {"document_key": document_key},
        ).mappings().first()
        return self._build(row) if row is not None else None

    def upsert_file(
        self,
        document_key: str,
        file_path: str,
        original_filename: str,
        updated_by: int,
    ) -> MemberDocument | None:
        row = self.session.execute(
            text(
                """
                UPDATE member_documents
                SET file_path = :file_path,
                    original_filename = :original_filename,
                    updated_by = :updated_by,
                    updated_at = :updated_at
                WHERE document_key = :document_key
                RETURNING *
                """,
            ),
            {
                "document_key": document_key,
                "file_path": file_path,
                "original_filename": original_filename,
                "updated_by": updated_by,
                "updated_at": _now(),
            },
        ).mappings().first()
        self.session.commit()
        return self._build(row) if row is not None else None

    def upsert_cover(
        self,
        document_key: str,
        cover_path: str,
        updated_by: int,
    ) -> MemberDocument | None:
        self._ensure_schema()
        row = self.session.execute(
            text(
                """
                UPDATE member_documents
                SET cover_path = :cover_path,
                    updated_by = :updated_by,
                    updated_at = :updated_at
                WHERE document_key = :document_key
                RETURNING *
                """,
            ),
            {
                "cover_path": cover_path,
                "updated_by": updated_by,
                "updated_at": _now(),
                "document_key": document_key,
            },
        ).mappings().first()
        self.session.commit()
        return self._build(row) if row is not None else None

    def update_style(
        self,
        document_key: str,
        overlay_color: str,
        overlay_opacity: int,
        updated_by: int,
    ) -> MemberDocument | None:
        self._ensure_schema()
        row = self.session.execute(
            text(
                """
                UPDATE member_documents
                SET overlay_color = :overlay_color,
                    overlay_opacity = :overlay_opacity,
                    updated_by = :updated_by,
                    updated_at = :updated_at
                WHERE document_key = :document_key
                RETURNING *
                """,
            ),
            {
                "overlay_color": overlay_color,
                "overlay_opacity": overlay_opacity,
                "updated_by": updated_by,
                "updated_at": _now(),
                "document_key": document_key,
            },
        ).mappings().first()
        self.session.commit()
        return self._build(row) if row is not None else None

    def _ensure_schema(self) -> None:
        ensure_member_documents_schema(self.session)

    def _build(self, row: object) -> MemberDocument:
        data = dict(row)  # type: ignore[arg-type]
        return MemberDocument(
            id=int(data["id"]),
            document_key=str(data["document_key"]),
            title=str(data["title"]),
            file_path=data["file_path"],
            original_filename=data["original_filename"],
            cover_path=data.get("cover_path"),
            overlay_color=str(data.get("overlay_color") or DEFAULT_OVERLAY_COLOR),
            overlay_opacity=int(data.get("overlay_opacity") or DEFAULT_OVERLAY_OPACITY),
            updated_by=int(data["updated_by"]) if data["updated_by"] is not None else None,
            created_at=data["created_at"],
            updated_at=data["updated_at"],
        )
