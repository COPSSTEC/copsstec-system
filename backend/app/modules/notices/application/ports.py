from datetime import datetime
from typing import Protocol

from app.modules.notices.domain.entities import Notice


class NoticeRepository(Protocol):
    def list_admin(self) -> list[Notice]:
        ...

    def list_published(self, now: datetime, limit: int = 12) -> list[Notice]:
        ...

    def get(self, notice_id: int) -> Notice | None:
        ...

    def create(self, data: dict, created_by: int) -> Notice:
        ...

    def update(self, notice_id: int, data: dict) -> Notice | None:
        ...

    def update_image(self, notice_id: int, image: str) -> Notice | None:
        ...

    def set_visibility(self, notice_id: int, state_id: int) -> Notice | None:
        ...

    def soft_delete(self, notice_id: int, deleted_by: int) -> bool:
        ...


class NoticeImageStorage(Protocol):
    def save(self, notice_id: int, filename: str, content: bytes, content_type: str) -> str:
        ...
