from typing import Protocol

from app.modules.members.domain.entities import Member, MemberListQuery, MemberListResult, MemberWriteData


class MemberRepository(Protocol):
    def list_members(self, query: MemberListQuery) -> MemberListResult:
        ...

    def get_member(self, user_id: int) -> Member | None:
        ...

    def create_member(self, data: MemberWriteData, password_hash: str) -> Member:
        ...

    def update_member(self, user_id: int, data: MemberWriteData) -> Member:
        ...

    def soft_delete_member(self, user_id: int, deleted_by: int) -> None:
        ...

    def set_member_state(self, user_id: int, state_id: int) -> Member:
        ...

    def update_password(self, user_id: int, password_hash: str) -> Member:
        ...

    def update_photo(self, user_id: int, foto_id: str) -> Member:
        ...

    def find_conflict(
        self,
        *,
        identifier: str,
        email: str,
        login_email: str,
        exclude_user_id: int | None = None,
    ) -> str | None:
        ...

    def get_profile_by_user_id(self, user_id: int) -> Member | None:
        ...

    def get_profile_by_id(self, profile_id: int) -> Member | None:
        ...


class MemberNotifier(Protocol):
    def notify_credentials(self, email: str, password: str, full_name: str) -> None:
        ...


class MemberDocumentGenerator(Protocol):
    def generate_certificate(self, member: Member, verify_url: str) -> bytes:
        ...

    def generate_carnet(self, member: Member, verify_url: str) -> bytes:
        ...


class MemberPhotoStorage(Protocol):
    def save(self, user_id: int, filename: str, content: bytes, content_type: str) -> str:
        ...
