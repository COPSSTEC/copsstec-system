from datetime import UTC, datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.documents.domain.entities import DOCUMENT_CATALOG, DOCUMENT_KEYS, MemberDocument


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class SqlAlchemyMemberDocumentRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_all(self) -> list[MemberDocument]:
        self._ensure_seeds()
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
        self._ensure_seeds()
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

    def _ensure_seeds(self) -> None:
        now = _now()
        for key in DOCUMENT_KEYS:
            self.session.execute(
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
        self.session.commit()

    def _build(self, row: object) -> MemberDocument:
        data = dict(row)  # type: ignore[arg-type]
        return MemberDocument(
            id=int(data["id"]),
            document_key=str(data["document_key"]),
            title=str(data["title"]),
            file_path=data["file_path"],
            original_filename=data["original_filename"],
            updated_by=int(data["updated_by"]) if data["updated_by"] is not None else None,
            created_at=data["created_at"],
            updated_at=data["updated_at"],
        )
