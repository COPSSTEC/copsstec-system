from typing import Protocol

from app.modules.documents.domain.entities import MemberDocument


class MemberDocumentRepository(Protocol):
    def list_all(self) -> list[MemberDocument]:
        ...

    def get_by_key(self, document_key: str) -> MemberDocument | None:
        ...

    def upsert_file(
        self,
        document_key: str,
        file_path: str,
        original_filename: str,
        updated_by: int,
    ) -> MemberDocument | None:
        ...

    def upsert_cover(
        self,
        document_key: str,
        cover_path: str,
        updated_by: int,
    ) -> MemberDocument | None:
        ...

    def update_style(
        self,
        document_key: str,
        overlay_color: str,
        overlay_opacity: int,
        updated_by: int,
    ) -> MemberDocument | None:
        ...


class MemberDocumentStorage(Protocol):
    def save(self, document_key: str, filename: str, content: bytes, content_type: str) -> str:
        ...

    def save_cover(self, document_key: str, filename: str, content: bytes, content_type: str) -> str:
        ...
