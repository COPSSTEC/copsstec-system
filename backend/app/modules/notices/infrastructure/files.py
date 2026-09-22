from pathlib import Path
from uuid import uuid4

from app.modules.notices.domain.exceptions import InvalidNoticeImageError


ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


class LocalNoticeImageStorage:
    def __init__(self, base_path: str = "storage/notices") -> None:
        self.base_path = Path(base_path)

    def save(self, notice_id: int, filename: str, content: bytes, content_type: str) -> str:
        resolved_type = content_type
        if resolved_type not in ALLOWED_IMAGE_CONTENT_TYPES:
            suffix = Path(filename or "").suffix.lower()
            resolved_type = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".webp": "image/webp",
            }.get(suffix, content_type)

        if resolved_type not in ALLOWED_IMAGE_CONTENT_TYPES:
            raise InvalidNoticeImageError("La portada debe ser JPG, PNG o WEBP.")

        if len(content) > MAX_IMAGE_BYTES:
            raise InvalidNoticeImageError("La portada no puede superar 5 MB.")

        suffix = Path(filename or "").suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
            suffix = ".jpg"

        target_dir = self.base_path / str(notice_id)
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / f"{uuid4().hex}{suffix}"
        target.write_bytes(content)

        return f"/media/notices/{notice_id}/{target.name}"
