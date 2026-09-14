from secrets import token_urlsafe

from app.core.config import get_settings
from app.core.security import hash_password
from app.modules.members.application.ports import (
    BlankPdfGenerator,
    MemberNotifier,
    MemberPhotoStorage,
    MemberRepository,
)
from app.modules.membership.application.ports import EmailPort, MailboxPort
from app.modules.membership.domain.corporate_email import is_corporate_email
from app.modules.members.domain.entities import (
    DISABLED_STATE_ID,
    ENABLED_STATE_ID,
    Member,
    MemberListQuery,
    MemberListResult,
    MemberWriteData,
)
from app.modules.members.domain.exceptions import MemberConflictError, MemberNotFoundError, MemberValidationError


def generate_temporary_password() -> str:
    return token_urlsafe(9)


class ListMembersUseCase:
    def __init__(self, repository: MemberRepository) -> None:
        self.repository = repository

    def execute(self, query: MemberListQuery) -> MemberListResult:
        return self.repository.list_members(query)


class GetMemberUseCase:
    def __init__(self, repository: MemberRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int) -> Member:
        member = self.repository.get_member(user_id)
        if member is None:
            raise MemberNotFoundError()
        return member


class CreateMemberUseCase:
    def __init__(self, repository: MemberRepository, notifier: MemberNotifier) -> None:
        self.repository = repository
        self.notifier = notifier

    def execute(self, data: MemberWriteData) -> tuple[Member, str]:
        _validate(data)
        conflict = self.repository.find_conflict(
            identifier=data.identifier,
            email=data.email,
            login_email=data.login_email,
        )
        if conflict:
            raise MemberConflictError(conflict)

        password = generate_temporary_password()
        member = self.repository.create_member(data, hash_password(password))
        self.notifier.notify_credentials(member.login_email, password, member.name)
        return member, password


class UpdateMemberUseCase:
    def __init__(self, repository: MemberRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int, data: MemberWriteData) -> Member:
        if self.repository.get_member(user_id) is None:
            raise MemberNotFoundError()

        _validate(data)
        conflict = self.repository.find_conflict(
            identifier=data.identifier,
            email=data.email,
            login_email=data.login_email,
            exclude_user_id=user_id,
        )
        if conflict:
            raise MemberConflictError(conflict)

        return self.repository.update_member(user_id, data)


class DeleteMemberUseCase:
    def __init__(self, repository: MemberRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int, deleted_by: int) -> None:
        if self.repository.get_member(user_id) is None:
            raise MemberNotFoundError()
        self.repository.soft_delete_member(user_id, deleted_by)


class SetMemberStateUseCase:
    def __init__(self, repository: MemberRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int, enabled: bool) -> Member:
        if self.repository.get_member(user_id) is None:
            raise MemberNotFoundError()
        state_id = ENABLED_STATE_ID if enabled else DISABLED_STATE_ID
        return self.repository.set_member_state(user_id, state_id)


class ResendMemberCredentialsUseCase:
    def __init__(
        self,
        repository: MemberRepository,
        mailbox: MailboxPort,
        email_sender: EmailPort,
    ) -> None:
        self.repository = repository
        self.mailbox = mailbox
        self.email_sender = email_sender

    def execute(self, user_id: int) -> tuple[Member, str]:
        member = self.repository.get_member(user_id)
        if member is None:
            raise MemberNotFoundError()

        if member.state_id != ENABLED_STATE_ID or not is_corporate_email(
            member.login_email,
            get_settings().corporate_email_domain,
        ):
            raise MemberValidationError(
                "El miembro debe estar habilitado con correo corporativo.",
            )

        password = generate_temporary_password()[:10]
        self.mailbox.update_or_create_mailbox(member.login_email, password)
        member = self.repository.update_password(user_id, hash_password(password))

        personal = (member.email or "").strip()
        if personal:
            self.email_sender.send(
                personal,
                "Tus credenciales COPSSTEC",
                (
                    f"Hola {member.name},\n\n"
                    f"Se generó una nueva contraseña temporal.\n"
                    f"Correo corporativo: {member.login_email}\n"
                    f"Contraseña temporal: {password}\n\n"
                    "Ingresa al sistema con ese correo corporativo y cámbiala en el primer acceso.\n"
                ),
            )
        self.email_sender.send(
            member.login_email,
            "Bienvenido a COPSSTEC",
            (
                f"Hola {member.name},\n\n"
                f"Tu cuenta corporativa fue actualizada.\n"
                f"Usuario: {member.login_email}\n"
                f"Contraseña temporal: {password}\n"
            ),
        )
        return member, password


class DownloadMemberPdfUseCase:
    def __init__(self, repository: MemberRepository, pdf_generator: BlankPdfGenerator) -> None:
        self.repository = repository
        self.pdf_generator = pdf_generator

    def execute(self, user_id: int, kind: str) -> tuple[str, bytes]:
        member = self.repository.get_member(user_id)
        if member is None:
            raise MemberNotFoundError()

        filename = (
            f"certificado-miembro-{member.user_id}.pdf"
            if kind == "certificate"
            else f"miembro-{member.user_id}.pdf"
        )
        return filename, self.pdf_generator.generate(kind)


class UpdateMemberPhotoUseCase:
    def __init__(self, repository: MemberRepository, storage: MemberPhotoStorage) -> None:
        self.repository = repository
        self.storage = storage

    def execute(
        self,
        user_id: int,
        filename: str,
        content: bytes,
        content_type: str,
    ) -> Member:
        if self.repository.get_member(user_id) is None:
            raise MemberNotFoundError()

        foto_id = self.storage.save(user_id, filename, content, content_type)
        return self.repository.update_photo(user_id, foto_id)


def _validate(data: MemberWriteData) -> None:
    required = {
        "names": data.names,
        "lastname": data.lastname,
        "identifier": data.identifier,
        "email": data.email,
        "login_email": data.login_email,
        "birtday": data.birtday,
        "mobile_phone": data.mobile_phone,
        "date_register": data.date_register,
    }

    missing = [name for name, value in required.items() if not str(value).strip()]
    if missing:
        raise MemberValidationError(f"Campos obligatorios: {', '.join(missing)}.")

    if (data.codigo_senescyt_cuarto or "").strip() and not (data.fourth_title or "").strip():
        raise MemberValidationError(
            "El código Senescyt de cuarto nivel solo se registra si existe título de cuarto nivel.",
        )
