from datetime import datetime

from pydantic import BaseModel

from app.modules.documents.domain.entities import MemberDocument
from app.modules.documents.infrastructure.files import document_file_size


class MemberDocumentResponse(BaseModel):
    document_key: str
    title: str
    file_path: str | None
    original_filename: str | None
    cover_path: str | None = None
    available: bool
    updated_at: datetime | None
    file_size: int | None = None

    @classmethod
    def from_domain(cls, document: MemberDocument) -> "MemberDocumentResponse":
        return cls(
            document_key=document.document_key,
            title=document.title,
            file_path=document.file_path,
            original_filename=document.original_filename,
            cover_path=document.cover_path,
            available=document.available,
            updated_at=document.updated_at,
            file_size=document_file_size(document.file_path),
        )
