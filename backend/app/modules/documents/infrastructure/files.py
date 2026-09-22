from pathlib import Path
from uuid import uuid4

from app.modules.documents.domain.exceptions import InvalidDocumentFileError


ALLOWED_CONTENT_TYPES = {"application/pdf"}
MAX_PDF_BYTES = 20 * 1024 * 1024


class LocalMemberDocumentStorage:
    def __init__(self, base_path: str = "storage/member-documents") -> None:
        self.base_path = Path(base_path)

    def save(self, document_key: str, filename: str, content: bytes, content_type: str) -> str:
        suffix = Path(filename or "").suffix.lower()
        resolved_type = content_type or ""
        if resolved_type not in ALLOWED_CONTENT_TYPES and suffix != ".pdf":
            raise InvalidDocumentFileError("El archivo debe ser un PDF.")
        if suffix and suffix != ".pdf":
            raise InvalidDocumentFileError("El archivo debe ser un PDF.")
        if len(content) > MAX_PDF_BYTES:
            raise InvalidDocumentFileError("El PDF no puede superar 20 MB.")
        if not content:
            raise InvalidDocumentFileError("El archivo está vacío.")

        target_dir = self.base_path / document_key
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / f"{uuid4().hex}.pdf"
        target.write_bytes(content)
        return f"/media/member-documents/{document_key}/{target.name}"
