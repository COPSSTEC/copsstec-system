from app.modules.documents.application.ports import MemberDocumentRepository, MemberDocumentStorage
from app.modules.documents.domain.entities import DOCUMENT_KEYS, MemberDocument
from app.modules.documents.domain.exceptions import (
    DocumentNotFoundError,
    DocumentValidationError,
    InvalidDocumentFileError,
)


class ListMemberDocumentsUseCase:
    def __init__(self, repository: MemberDocumentRepository) -> None:
        self.repository = repository

    def execute(self) -> list[MemberDocument]:
        documents = {item.document_key: item for item in self.repository.list_all()}
        return [documents[key] for key in DOCUMENT_KEYS if key in documents]


class UploadMemberDocumentUseCase:
    def __init__(
        self,
        repository: MemberDocumentRepository,
        storage: MemberDocumentStorage,
    ) -> None:
        self.repository = repository
        self.storage = storage

    def execute(
        self,
        document_key: str,
        *,
        filename: str,
        content: bytes,
        content_type: str,
        updated_by: int,
    ) -> MemberDocument:
        if document_key not in DOCUMENT_KEYS:
            raise DocumentValidationError("El tipo de documento no es válido.")
        if self.repository.get_by_key(document_key) is None:
            raise DocumentNotFoundError()
        if not content:
            raise DocumentValidationError("Debes subir un archivo PDF.")

        try:
            file_path = self.storage.save(document_key, filename, content, content_type)
        except InvalidDocumentFileError as exc:
            raise DocumentValidationError(exc.message) from exc

        updated = self.repository.upsert_file(
            document_key,
            file_path,
            filename or "documento.pdf",
            updated_by,
        )
        if updated is None:
            raise DocumentNotFoundError()
        return updated


class UploadMemberDocumentCoverUseCase:
    def __init__(
        self,
        repository: MemberDocumentRepository,
        storage: MemberDocumentStorage,
    ) -> None:
        self.repository = repository
        self.storage = storage

    def execute(
        self,
        document_key: str,
        *,
        filename: str,
        content: bytes,
        content_type: str,
        updated_by: int,
    ) -> MemberDocument:
        if document_key not in DOCUMENT_KEYS:
            raise DocumentValidationError("El tipo de documento no es válido.")
        if self.repository.get_by_key(document_key) is None:
            raise DocumentNotFoundError()
        if not content:
            raise DocumentValidationError("Debes subir una imagen de portada.")

        try:
            cover_path = self.storage.save_cover(document_key, filename, content, content_type)
        except InvalidDocumentFileError as exc:
            raise DocumentValidationError(exc.message) from exc

        updated = self.repository.upsert_cover(document_key, cover_path, updated_by)
        if updated is None:
            raise DocumentNotFoundError()
        return updated
