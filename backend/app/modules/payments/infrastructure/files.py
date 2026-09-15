from pathlib import Path
from uuid import uuid4


ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_BYTES = 5 * 1024 * 1024
MEDIA_PREFIX = "/media/payments"


class InvalidPaymentFileError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class LocalPaymentFileStorage:
    def __init__(self, base_path: str = "storage/payments") -> None:
        self.base_path = Path(base_path)

    def save_voucher(self, user_id: int, filename: str, content: bytes, content_type: str) -> str:
        if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
            raise InvalidPaymentFileError("El comprobante debe ser JPG, PNG o WEBP.")
        if len(content) > MAX_FILE_BYTES:
            raise InvalidPaymentFileError("El comprobante no puede superar 5 MB.")
        if not content:
            raise InvalidPaymentFileError("El comprobante es obligatorio.")

        suffix = Path(filename or "").suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
            suffix = ".jpg"

        target_dir = self.base_path / str(user_id)
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / f"{uuid4().hex}{suffix}"
        target.write_bytes(content)
        return f"{MEDIA_PREFIX}/{user_id}/{target.name}"

    def resolve_path(self, voucher_path: str) -> Path | None:
        relative = (voucher_path or "").strip()
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
