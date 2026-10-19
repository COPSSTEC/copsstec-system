from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.object_storage import firebase_enabled, save_object

ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


class InvalidUploadError(Exception):
    pass


class LocalCourseFileStorage:
    def __init__(self, base_path: str = "storage/courses") -> None:
        self.base_path = Path(base_path)

    async def save_voucher(self, file: UploadFile, course_id: int) -> str:
        if file.content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
            raise InvalidUploadError("El voucher debe ser una imagen JPG, PNG o WEBP.")

        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
            suffix = ".jpg"

        filename = f"{uuid4().hex}{suffix}"
        content = await file.read()
        if firebase_enabled():
            return save_object(
                module="courses",
                db_id=course_id,
                kind="vouchers",
                filename=filename,
                content=content,
                content_type=file.content_type or "image/jpeg",
            )

        target_dir = self.base_path / "vouchers" / str(course_id)
        target_dir.mkdir(parents=True, exist_ok=True)

        target = target_dir / filename
        target.write_bytes(content)

        return str(target)

    def save_certificate_pdf(
        self,
        course_id: int,
        certificate_code: str,
        content: bytes,
    ) -> str:
        filename = f"{certificate_code}.pdf"
        if firebase_enabled():
            return save_object(
                module="courses",
                db_id=course_id,
                kind="certificates",
                filename=filename,
                content=content,
                content_type="application/pdf",
            )

        target_dir = self.base_path / "certificates" / str(course_id)
        target_dir.mkdir(parents=True, exist_ok=True)

        target = target_dir / filename
        target.write_bytes(content)

        return str(target)
