from json import dumps, loads
from pathlib import Path
from uuid import uuid4

from app.core.object_storage import (
    firebase_enabled,
    has_objects,
    read_latest_json,
    save_object,
)


ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_PDF_FOLDERS = {"authorization", "identity", "solicitud"}
MAX_FILE_BYTES = 8 * 1024 * 1024


class InvalidMembershipFileError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class LocalMembershipFileStorage:
    def __init__(self, base_path: str = "storage/membership") -> None:
        self.base_path = Path(base_path)

    def save_photo(self, user_id: int, filename: str, content: bytes, content_type: str) -> str:
        return self._save_image(user_id, filename, content, content_type, "photos", "/media/membership")

    def save_voucher(self, user_id: int, filename: str, content: bytes, content_type: str) -> str:
        return self._save_image(user_id, filename, content, content_type, "vouchers", "/media/membership")

    def save_invoice_pdf(self, user_id: int, number: str, content: bytes) -> str:
        safe_number = "".join(char if char.isalnum() or char in "-_" else "-" for char in number)
        filename = f"{safe_number}.pdf"
        if firebase_enabled():
            return save_object(
                module="membership",
                db_id=user_id,
                kind="invoices",
                filename=filename,
                content=content,
                content_type="application/pdf",
            )
        target_dir = self.base_path / str(user_id) / "invoices"
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / filename
        target.write_bytes(content)
        return f"/media/membership/{user_id}/invoices/{target.name}"

    def save_pdf(self, user_id: int, folder: str, filename: str, content: bytes, content_type: str) -> str:
        if folder not in ALLOWED_PDF_FOLDERS:
            raise InvalidMembershipFileError("El documento no corresponde a un tipo permitido.")
        normalized_type = (content_type or "").split(";")[0].strip().lower()
        if normalized_type not in {"application/pdf", "application/octet-stream", ""}:
            raise InvalidMembershipFileError("El archivo debe ser PDF.")
        if not content.startswith(b"%PDF"):
            raise InvalidMembershipFileError("El archivo debe ser PDF.")
        if len(content) > MAX_FILE_BYTES:
            raise InvalidMembershipFileError("El archivo no puede superar 8 MB.")

        suffix = Path(filename or "").suffix.lower()
        if suffix != ".pdf":
            suffix = ".pdf"

        filename = f"{uuid4().hex}{suffix}"
        if firebase_enabled():
            return save_object(
                module="membership",
                db_id=user_id,
                kind=folder,
                filename=filename,
                content=content,
                content_type="application/pdf",
            )
        target_dir = self.base_path / str(user_id) / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / filename
        target.write_bytes(content)
        return f"/media/membership/{user_id}/{folder}/{target.name}"

    def was_commitment_emailed(self, user_id: int) -> bool:
        if firebase_enabled():
            return has_objects(module="membership", db_id=user_id, kind="commitment-sent")
        return self._commitment_flag_path(user_id).is_file()

    def mark_commitment_emailed(self, user_id: int) -> None:
        if firebase_enabled():
            save_object(
                module="membership",
                db_id=user_id,
                kind="commitment-sent",
                filename="sent.txt",
                content=b"sent",
                content_type="text/plain",
            )
            return
        path = self._commitment_flag_path(user_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("sent", encoding="utf-8")

    def _commitment_flag_path(self, user_id: int) -> Path:
        return self.base_path / str(user_id) / "commitment-emailed.flag"

    def load_commitment_issuance(self, user_id: int) -> dict | None:
        if firebase_enabled():
            return read_latest_json(module="membership", db_id=user_id, kind="commitment")
        path = self._commitment_issued_path(user_id)
        if not path.is_file():
            return None
        try:
            data = loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None
        return data if isinstance(data, dict) else None

    def save_commitment_issuance(self, payload: dict) -> None:
        digest = _safe_commitment_hash(str(payload.get("hash") or ""))
        user_id = int(payload.get("user_id") or 0)
        if not digest or user_id <= 0:
            return
        body = dumps(payload, ensure_ascii=False, indent=2)
        if firebase_enabled():
            encoded = body.encode("utf-8")
            save_object(
                module="membership",
                db_id=user_id,
                kind="commitment",
                filename="issued.json",
                content=encoded,
                content_type="application/json",
            )
            save_object(
                module="membership",
                db_id=digest,
                kind="commitments",
                filename="issued.json",
                content=encoded,
                content_type="application/json",
            )
            return
        issued_path = self._commitment_issued_path(user_id)
        issued_path.parent.mkdir(parents=True, exist_ok=True)
        issued_path.write_text(body, encoding="utf-8")
        public_path = self._commitment_public_path(digest)
        public_path.parent.mkdir(parents=True, exist_ok=True)
        public_path.write_text(body, encoding="utf-8")

    def get_commitment_by_hash(self, digest: str) -> dict | None:
        cleaned = _safe_commitment_hash(digest)
        if not cleaned:
            return None
        if firebase_enabled():
            return read_latest_json(module="membership", db_id=cleaned, kind="commitments")
        path = self._commitment_public_path(cleaned)
        if not path.is_file():
            return None
        try:
            data = loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None
        return data if isinstance(data, dict) else None

    def _commitment_issued_path(self, user_id: int) -> Path:
        return self.base_path / str(user_id) / "commitment-issued.json"

    def _commitment_public_path(self, digest: str) -> Path:
        return self.base_path / "commitments" / f"{digest}.json"

    def _save_image(
        self,
        user_id: int,
        filename: str,
        content: bytes,
        content_type: str,
        folder: str,
        url_prefix: str,
    ) -> str:
        if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
            raise InvalidMembershipFileError("El archivo debe ser JPG, PNG o WEBP.")
        if len(content) > MAX_FILE_BYTES:
            raise InvalidMembershipFileError("El archivo no puede superar 8 MB.")

        suffix = Path(filename or "").suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
            suffix = ".jpg"

        filename = f"{uuid4().hex}{suffix}"
        if firebase_enabled():
            return save_object(
                module="membership",
                db_id=user_id,
                kind=folder,
                filename=filename,
                content=content,
                content_type=content_type,
            )
        target_dir = self.base_path / str(user_id) / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / filename
        target.write_bytes(content)
        return f"{url_prefix}/{user_id}/{folder}/{target.name}"


def _safe_commitment_hash(digest: str) -> str:
    cleaned = "".join(character for character in (digest or "").lower() if character in "0123456789abcdef")
    return cleaned if len(cleaned) == 64 else ""
