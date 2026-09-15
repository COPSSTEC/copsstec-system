from app.modules.blogs.application.ports import BlogImageStorage, BlogRepository
from app.modules.blogs.domain.entities import (
    HIDDEN_STATE_ID,
    TITLE_MAX_LENGTH,
    VISIBLE_STATE_ID,
    Blog,
    plain_text_from_html,
    slugify,
)
from app.modules.blogs.domain.exceptions import (
    BlogNotFoundError,
    BlogUnavailableError,
    BlogValidationError,
    InvalidBlogImageError,
)


def unique_slug(repository: BlogRepository, title: str, exclude_id: int | None = None) -> str:
    base = slugify(title)
    slug = base
    suffix = 2

    while repository.slug_exists(slug, exclude_id):
        slug = f"{base}-{suffix}"
        suffix += 1

    return slug


def validate_blog_payload(title: str, description: str, state_id: int) -> tuple[str, str, int]:
    clean_title = title.strip()
    if not clean_title:
        raise BlogValidationError("El título es obligatorio.")
    if len(clean_title) > TITLE_MAX_LENGTH:
        raise BlogValidationError("El título no puede superar 255 caracteres.")

    if not plain_text_from_html(description):
        raise BlogValidationError("El contenido del blog es obligatorio.")

    if state_id not in {VISIBLE_STATE_ID, HIDDEN_STATE_ID}:
        raise BlogValidationError("El estado del blog debe ser visible u oculto.")

    return clean_title, description, state_id


class ListPublicBlogsUseCase:
    def __init__(self, repository: BlogRepository) -> None:
        self.repository = repository

    def execute(self) -> list[Blog]:
        return self.repository.list_public()


class GetPublicBlogUseCase:
    def __init__(self, repository: BlogRepository) -> None:
        self.repository = repository

    def execute(self, blog_id: int) -> Blog:
        blog = self.repository.get(blog_id)
        if blog is None or not blog.is_visible:
            raise BlogUnavailableError()
        return blog


class ListAdminBlogsUseCase:
    def __init__(self, repository: BlogRepository) -> None:
        self.repository = repository

    def execute(self) -> list[Blog]:
        return self.repository.list_admin()


class GetAdminBlogUseCase:
    def __init__(self, repository: BlogRepository) -> None:
        self.repository = repository

    def execute(self, blog_id: int) -> Blog:
        blog = self.repository.get(blog_id)
        if blog is None:
            raise BlogNotFoundError()
        return blog


class CreateBlogUseCase:
    def __init__(self, repository: BlogRepository, storage: BlogImageStorage) -> None:
        self.repository = repository
        self.storage = storage

    def execute(
        self,
        *,
        title: str,
        description: str,
        state_id: int,
        created_by: int,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> Blog:
        clean_title, clean_description, clean_state = validate_blog_payload(
            title,
            description,
            state_id,
        )
        if not content:
            raise BlogValidationError("Debes subir una imagen de portada.")

        blog = self.repository.create(
            {
                "title": clean_title,
                "description": clean_description,
                "state_id": clean_state,
                "link": unique_slug(self.repository, clean_title),
                "image": "",
            },
            created_by,
        )

        try:
            image_path = self.storage.save(blog.id, filename, content, content_type)
        except InvalidBlogImageError as exc:
            self.repository.soft_delete(blog.id, created_by)
            raise BlogValidationError(exc.message) from exc

        updated = self.repository.update_image(blog.id, image_path)
        if updated is None:
            raise BlogNotFoundError()
        return updated


class UpdateBlogUseCase:
    def __init__(self, repository: BlogRepository, storage: BlogImageStorage) -> None:
        self.repository = repository
        self.storage = storage

    def execute(
        self,
        blog_id: int,
        *,
        title: str,
        description: str,
        state_id: int,
        filename: str | None,
        content: bytes | None,
        content_type: str | None,
    ) -> Blog:
        current = self.repository.get(blog_id)
        if current is None:
            raise BlogNotFoundError()

        clean_title, clean_description, clean_state = validate_blog_payload(
            title,
            description,
            state_id,
        )
        slug = current.link
        if current.title != clean_title:
            slug = unique_slug(self.repository, clean_title, exclude_id=blog_id)

        image = current.image
        if content:
            try:
                image = self.storage.save(
                    blog_id,
                    filename or "portada.jpg",
                    content,
                    content_type or "",
                )
            except InvalidBlogImageError as exc:
                raise BlogValidationError(exc.message) from exc

        updated = self.repository.update(
            blog_id,
            {
                "title": clean_title,
                "description": clean_description,
                "state_id": clean_state,
                "link": slug,
                "image": image,
            },
        )
        if updated is None:
            raise BlogNotFoundError()
        return updated


class SetBlogVisibilityUseCase:
    def __init__(self, repository: BlogRepository) -> None:
        self.repository = repository

    def execute(self, blog_id: int, state_id: int) -> Blog:
        if state_id not in {VISIBLE_STATE_ID, HIDDEN_STATE_ID}:
            raise BlogValidationError("El estado del blog debe ser visible u oculto.")

        if self.repository.get(blog_id) is None:
            raise BlogNotFoundError()

        updated = self.repository.set_visibility(blog_id, state_id)
        if updated is None:
            raise BlogNotFoundError()
        return updated


class DeleteBlogUseCase:
    def __init__(self, repository: BlogRepository) -> None:
        self.repository = repository

    def execute(self, blog_id: int, deleted_by: int) -> None:
        if self.repository.get(blog_id) is None:
            raise BlogNotFoundError()
        deleted = self.repository.soft_delete(blog_id, deleted_by)
        if not deleted:
            raise BlogNotFoundError()
