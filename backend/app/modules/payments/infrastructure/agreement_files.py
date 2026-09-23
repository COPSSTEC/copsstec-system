from pathlib import Path
from uuid import uuid4


ALLOWED_PDF_CONTENT_TYPES = {"application/pdf", "application/octet-stream", ""}
MAX_FILE_BYTES = 8 * 1024 * 1024
MEDIA_PREFIX = "/media/agreements"
ALLOWED_FOLDERS = {"authorization", "identity"}


class InvalidAgreementFileError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class LocalAgreementFileStorage:
    def __init__(self, base_path: str = "storage/agreements") -> None:
        self.base_path = Path(base_path)

    def save_pdf(self, user_id: int, folder: str, filename: str, content: bytes, content_type: str) -> str:
        if folder not in ALLOWED_FOLDERS:
            raise InvalidAgreementFileError("El documento no corresponde a un tipo permitido.")
        normalized_type = (content_type or "").split(";")[0].strip().lower()
        if normalized_type not in ALLOWED_PDF_CONTENT_TYPES:
            raise InvalidAgreementFileError("El archivo debe ser PDF.")
        if not content.startswith(b"%PDF"):
            raise InvalidAgreementFileError("El archivo debe ser PDF.")
        if len(content) > MAX_FILE_BYTES:
            raise InvalidAgreementFileError("El archivo no puede superar 8 MB.")

        suffix = Path(filename or "").suffix.lower()
        if suffix != ".pdf":
            suffix = ".pdf"

        target_dir = self.base_path / str(user_id) / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / f"{uuid4().hex}{suffix}"
        target.write_bytes(content)
        return f"{MEDIA_PREFIX}/{user_id}/{folder}/{target.name}"

    def resolve_path(self, stored_path: str) -> Path | None:
        relative = (stored_path or "").strip()
        if relative.startswith(MEDIA_PREFIX + "/"):
            relative = relative[len(MEDIA_PREFIX) + 1 :]
        elif relative.startswith("/"):
            relative = relative.lstrip("/")
        if not relative or ".." in relative:
            return None
        path = (self.base_path / relative).resolve()
        try:
            path.relative_to(self.base_path.resolve())
        except ValueError:
            return None
        return path
