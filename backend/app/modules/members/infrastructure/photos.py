from pathlib import Path
from uuid import uuid4


ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PHOTO_BYTES = 5 * 1024 * 1024


class InvalidMemberPhotoError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class LocalMemberPhotoStorage:
    def __init__(self, base_path: str = "storage/members") -> None:
        self.base_path = Path(base_path)

    def save(self, user_id: int, filename: str, content: bytes, content_type: str) -> str:
        if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
            raise InvalidMemberPhotoError("La foto debe ser JPG, PNG o WEBP.")

        if len(content) > MAX_PHOTO_BYTES:
            raise InvalidMemberPhotoError("La foto no puede superar 5 MB.")

        suffix = Path(filename or "").suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
            suffix = ".jpg"

        target_dir = self.base_path / str(user_id)
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / f"{uuid4().hex}{suffix}"
        target.write_bytes(content)

        return f"/media/members/{user_id}/{target.name}"
