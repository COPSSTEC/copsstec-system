from pathlib import Path
from uuid import uuid4


ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
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
        target_dir = self.base_path / str(user_id) / "invoices"
        target_dir.mkdir(parents=True, exist_ok=True)
        safe_number = "".join(char if char.isalnum() or char in "-_" else "-" for char in number)
        target = target_dir / f"{safe_number}.pdf"
        target.write_bytes(content)
        return f"/media/membership/{user_id}/invoices/{target.name}"

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

        target_dir = self.base_path / str(user_id) / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / f"{uuid4().hex}{suffix}"
        target.write_bytes(content)
        return f"{url_prefix}/{user_id}/{folder}/{target.name}"
