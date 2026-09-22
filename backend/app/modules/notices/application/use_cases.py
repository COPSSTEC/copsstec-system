from datetime import UTC, datetime

from app.modules.notices.application.ports import NoticeImageStorage, NoticeRepository
from app.modules.notices.domain.entities import (
    ALLOWED_IMPORTANCE,
    HIDDEN_STATE_ID,
    TITLE_MAX_LENGTH,
    VISIBLE_STATE_ID,
    Notice,
    plain_text_from_html,
)
from app.modules.notices.domain.exceptions import (
    InvalidNoticeImageError,
    NoticeNotFoundError,
    NoticeValidationError,
)


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def parse_published_at(value: str | None) -> datetime | None:
    if value is None:
        return None
    text = value.strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise NoticeValidationError("La fecha de publicación no es válida.") from exc
    if parsed.tzinfo is not None:
        return parsed.astimezone(UTC).replace(tzinfo=None)
    return parsed


def validate_notice_payload(
    title: str,
    description: str,
    state_id: int,
    importance: str,
) -> tuple[str, str, int, str]:
    clean_title = title.strip()
    if not clean_title:
        raise NoticeValidationError("El título es obligatorio.")
    if len(clean_title) > TITLE_MAX_LENGTH:
        raise NoticeValidationError("El título no puede superar 255 caracteres.")

    if not plain_text_from_html(description):
        raise NoticeValidationError("El contenido del aviso es obligatorio.")

    if state_id not in {VISIBLE_STATE_ID, HIDDEN_STATE_ID}:
        raise NoticeValidationError("El estado del aviso debe ser visible u oculto.")

    clean_importance = importance.strip().lower()
    if clean_importance not in ALLOWED_IMPORTANCE:
        raise NoticeValidationError("La importancia debe ser baja, media o alta.")

    return clean_title, description, state_id, clean_importance


class ListAdminNoticesUseCase:
    def __init__(self, repository: NoticeRepository) -> None:
        self.repository = repository

    def execute(self) -> list[Notice]:
        return self.repository.list_admin()


class GetAdminNoticeUseCase:
    def __init__(self, repository: NoticeRepository) -> None:
        self.repository = repository

    def execute(self, notice_id: int) -> Notice:
        notice = self.repository.get(notice_id)
        if notice is None:
            raise NoticeNotFoundError()
        return notice


class CreateNoticeUseCase:
    def __init__(self, repository: NoticeRepository, storage: NoticeImageStorage) -> None:
        self.repository = repository
        self.storage = storage

    def execute(
        self,
        *,
        title: str,
        description: str,
        state_id: int,
        importance: str,
        published_at: str | None,
        created_by: int,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> Notice:
        clean_title, clean_description, clean_state, clean_importance = validate_notice_payload(
            title,
            description,
            state_id,
            importance,
        )
        if not content:
            raise NoticeValidationError("Debes subir una imagen de portada.")

        notice = self.repository.create(
            {
                "title": clean_title,
                "description": clean_description,
                "state_id": clean_state,
                "importance": clean_importance,
                "published_at": parse_published_at(published_at),
                "image": "",
            },
            created_by,
        )

        try:
            image_path = self.storage.save(notice.id, filename, content, content_type)
        except InvalidNoticeImageError as exc:
            self.repository.soft_delete(notice.id, created_by)
            raise NoticeValidationError(exc.message) from exc

        updated = self.repository.update_image(notice.id, image_path)
        if updated is None:
            raise NoticeNotFoundError()
        return updated


class UpdateNoticeUseCase:
    def __init__(self, repository: NoticeRepository, storage: NoticeImageStorage) -> None:
        self.repository = repository
        self.storage = storage

    def execute(
        self,
        notice_id: int,
        *,
        title: str,
        description: str,
        state_id: int,
        importance: str,
        published_at: str | None,
        filename: str | None,
        content: bytes | None,
        content_type: str | None,
    ) -> Notice:
        current = self.repository.get(notice_id)
        if current is None:
            raise NoticeNotFoundError()

        clean_title, clean_description, clean_state, clean_importance = validate_notice_payload(
            title,
            description,
            state_id,
            importance,
        )

        image = current.image
        if content:
            try:
                image = self.storage.save(
                    notice_id,
                    filename or "portada.jpg",
                    content,
                    content_type or "",
                )
            except InvalidNoticeImageError as exc:
                raise NoticeValidationError(exc.message) from exc

        updated = self.repository.update(
            notice_id,
            {
                "title": clean_title,
                "description": clean_description,
                "state_id": clean_state,
                "importance": clean_importance,
                "published_at": parse_published_at(published_at),
                "image": image,
            },
        )
        if updated is None:
            raise NoticeNotFoundError()
        return updated


class SetNoticeVisibilityUseCase:
    def __init__(self, repository: NoticeRepository) -> None:
        self.repository = repository

    def execute(self, notice_id: int, state_id: int) -> Notice:
        if state_id not in {VISIBLE_STATE_ID, HIDDEN_STATE_ID}:
            raise NoticeValidationError("El estado del aviso debe ser visible u oculto.")

        if self.repository.get(notice_id) is None:
            raise NoticeNotFoundError()

        updated = self.repository.set_visibility(notice_id, state_id)
        if updated is None:
            raise NoticeNotFoundError()
        return updated


class DeleteNoticeUseCase:
    def __init__(self, repository: NoticeRepository) -> None:
        self.repository = repository

    def execute(self, notice_id: int, deleted_by: int) -> None:
        if self.repository.get(notice_id) is None:
            raise NoticeNotFoundError()
        deleted = self.repository.soft_delete(notice_id, deleted_by)
        if not deleted:
            raise NoticeNotFoundError()
