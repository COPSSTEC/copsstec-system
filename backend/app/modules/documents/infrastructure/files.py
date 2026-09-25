from pathlib import Path
from uuid import uuid4

from app.modules.documents.domain.exceptions import InvalidDocumentFileError


ALLOWED_CONTENT_TYPES = {"application/pdf"}
ALLOWED_COVER_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
COVER_SUFFIXES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
MAX_PDF_BYTES = 20 * 1024 * 1024
MAX_COVER_BYTES = 5 * 1024 * 1024
MEDIA_PREFIX = "/media/member-documents/"


def document_file_size(file_path: str | None, base_path: str = "storage/member-documents") -> int | None:
    if not file_path or not file_path.startswith(MEDIA_PREFIX):
        return None
    relative = Path(file_path[len(MEDIA_PREFIX) :])
    if relative.is_absolute() or ".." in relative.parts:
        return None
    root = Path(base_path).resolve()
    target = (root / relative).resolve()
    if not str(target).startswith(str(root)) or not target.is_file():
        return None
    return target.stat().st_size


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

    def save_cover(self, document_key: str, filename: str, content: bytes, content_type: str) -> str:
        suffix = Path(filename or "").suffix.lower()
        resolved_type = content_type if content_type in ALLOWED_COVER_CONTENT_TYPES else COVER_SUFFIXES.get(suffix, "")
        if resolved_type not in ALLOWED_COVER_CONTENT_TYPES:
            raise InvalidDocumentFileError("La portada debe ser JPG, PNG o WEBP.")
        if len(content) > MAX_COVER_BYTES:
            raise InvalidDocumentFileError("La portada no puede superar 5 MB.")
        if not content:
            raise InvalidDocumentFileError("La imagen está vacía.")
        if suffix not in COVER_SUFFIXES:
            suffix = ".jpg"

        target_dir = self.base_path / document_key
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / f"cover-{uuid4().hex}{suffix}"
        target.write_bytes(content)
        return f"/media/member-documents/{document_key}/{target.name}"
