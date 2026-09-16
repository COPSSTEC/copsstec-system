from pathlib import Path
from uuid import uuid4

from app.modules.votaciones.domain.exceptions import ElectionValidationError

IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
PDF_TYPES = {"application/pdf"}
KIND_RULES = {
    "logo": IMAGE_TYPES,
    "banner": IMAGE_TYPES,
    "list-logo": IMAGE_TYPES,
    "candidate-photo": IMAGE_TYPES,
    "list-work-plan": PDF_TYPES,
    "list-backing": PDF_TYPES,
}


class LocalElectionFileStorage:
    def __init__(self, base_path: str = "storage/votaciones") -> None:
        self.base_path = Path(base_path)

    def save(
        self,
        election_id: int,
        kind: str,
        filename: str,
        content: bytes,
        content_type: str,
        max_file_mb: int,
    ) -> str:
        allowed = KIND_RULES.get(kind)
        if allowed is None:
            raise ElectionValidationError("Tipo de archivo no soportado.")
        if content_type not in allowed:
            expected = "PDF" if allowed == PDF_TYPES else "JPG, PNG o WEBP"
            raise ElectionValidationError(f"El archivo debe ser {expected}.")
        limit = max(1, int(max_file_mb)) * 1024 * 1024
        if len(content) > limit:
            raise ElectionValidationError(f"El archivo no puede superar {max_file_mb} MB.")

        suffix = Path(filename or "").suffix.lower()
        if allowed == PDF_TYPES:
            suffix = ".pdf"
        elif suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
            suffix = ".jpg"

        target_dir = self.base_path / str(election_id) / kind
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / f"{uuid4().hex}{suffix}"
        target.write_bytes(content)
        return f"/media/votaciones/{election_id}/{kind}/{target.name}"

    def resolve_path(self, url: str) -> Path | None:
        prefix = "/media/votaciones/"
        if not url.startswith(prefix):
            return None
        relative = url[len(prefix) :]
        path = (self.base_path / relative).resolve()
        if not str(path).startswith(str(self.base_path.resolve())):
            return None
        return path if path.is_file() else None
