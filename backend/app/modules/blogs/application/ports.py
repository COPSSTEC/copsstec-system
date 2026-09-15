from typing import Protocol

from app.modules.blogs.domain.entities import Blog


class BlogRepository(Protocol):
    def list_public(self) -> list[Blog]:
        ...

    def list_admin(self) -> list[Blog]:
        ...

    def get(self, blog_id: int) -> Blog | None:
        ...

    def create(self, data: dict, created_by: int) -> Blog:
        ...

    def update(self, blog_id: int, data: dict) -> Blog | None:
        ...

    def update_image(self, blog_id: int, image: str) -> Blog | None:
        ...

    def set_visibility(self, blog_id: int, state_id: int) -> Blog | None:
        ...

    def soft_delete(self, blog_id: int, deleted_by: int) -> bool:
        ...

    def slug_exists(self, slug: str, exclude_id: int | None = None) -> bool:
        ...


class BlogImageStorage(Protocol):
    def save(self, blog_id: int, filename: str, content: bytes, content_type: str) -> str:
        ...
