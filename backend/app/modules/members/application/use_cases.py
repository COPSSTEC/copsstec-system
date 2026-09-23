from secrets import token_urlsafe

from app.core.security import hash_password
from app.core.config import get_settings
from app.modules.members.application.ports import (
    MemberDocumentGenerator,
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
    ProfileSelfUpdate,
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
        context = {
            "nombres": member.name,
            "email": member.login_email,
            "password": password,
        }
        if personal:
            self.email_sender.send_template(personal, "corporate_mailbox", context)
        self.email_sender.send_template(member.login_email, "access_credentials", context)
        return member, password


def public_verify_url(member: Member) -> str:
    origin = get_settings().frontend_origin.rstrip("/")
    profile_id = member.profile_id or member.user_id
    return f"{origin}/perfil/{profile_id}"


class DownloadMemberPdfUseCase:
    def __init__(self, repository: MemberRepository, pdf_generator: MemberDocumentGenerator) -> None:
        self.repository = repository
        self.pdf_generator = pdf_generator

    def execute(self, user_id: int, kind: str) -> tuple[str, bytes]:
        member = self.repository.get_profile_by_user_id(user_id) or self.repository.get_member(user_id)
        if member is None:
            raise MemberNotFoundError()
        return self._render(member, kind)

    def execute_for_profile(self, profile_id: int, kind: str) -> tuple[str, bytes]:
        member = self.repository.get_profile_by_id(profile_id)
        if member is None:
            raise MemberNotFoundError()
        return self._render(member, kind)

    def _render(self, member: Member, kind: str) -> tuple[str, bytes]:
        verify_url = public_verify_url(member)
        if kind == "certificate":
            return (
                f"certificado-afiliacion-{member.user_id}.pdf",
                self.pdf_generator.generate_certificate(member, verify_url),
            )
        if kind == "solicitud":
            return (
                f"solicitud-afiliacion-{member.user_id}.pdf",
                self.pdf_generator.generate_solicitud(member),
            )
        return (
            f"carnet-miembro-{member.user_id}.pdf",
            self.pdf_generator.generate_carnet(member, verify_url),
        )


class UpdateMyProfileUseCase:
    def __init__(self, repository: MemberRepository) -> None:
        self.repository = repository

    def execute(self, user_id: int, patch: ProfileSelfUpdate) -> Member:
        member = self.repository.get_profile_by_user_id(user_id)
        if member is None:
            raise MemberNotFoundError()

        data = MemberWriteData(
            names=(patch.names if patch.names is not None else member.names).strip(),
            lastname=(patch.lastname if patch.lastname is not None else member.lastname).strip(),
            identifier=(patch.identifier if patch.identifier is not None else member.identifier).strip(),
            email=(patch.email if patch.email is not None else member.email).strip(),
            login_email=member.login_email,
            birtday=(patch.birtday if patch.birtday is not None else member.birtday).strip(),
            mobile_phone=(patch.mobile_phone if patch.mobile_phone is not None else member.mobile_phone).strip(),
            date_register=member.date_register,
            blood_type=patch.blood_type if patch.blood_type is not None else member.blood_type,
            fixed_phone=patch.fixed_phone if patch.fixed_phone is not None else member.fixed_phone,
            title_academic=patch.title_academic if patch.title_academic is not None else member.title_academic,
            level_academic=patch.level_academic if patch.level_academic is not None else member.level_academic,
            cod_senescyt=patch.cod_senescyt if patch.cod_senescyt is not None else member.cod_senescyt,
            linkdink=patch.linkdink if patch.linkdink is not None else member.linkdink,
            want_notifications=(
                patch.want_notifications if patch.want_notifications is not None else member.want_notifications
            ),
            is_work=patch.is_work if patch.is_work is not None else member.is_work,
            foto_id=member.foto_id,
            province=patch.province if patch.province is not None else member.province,
            city=patch.city if patch.city is not None else member.city,
            street_principal=patch.street_principal if patch.street_principal is not None else member.street_principal,
            street_secondary=patch.street_secondary if patch.street_secondary is not None else member.street_secondary,
            type_profile=member.type_profile,
            fourth_title=patch.fourth_title if patch.fourth_title is not None else member.fourth_title,
            type_commision=member.type_commision,
            codigo_senescyt_cuarto=(
                patch.codigo_senescyt_cuarto
                if patch.codigo_senescyt_cuarto is not None
                else member.codigo_senescyt_cuarto
            ),
            gender=patch.gender if patch.gender is not None else member.gender,
            state_id=member.state_id,
        )
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


class GetPublicMemberUseCase:
    def __init__(self, repository: MemberRepository) -> None:
        self.repository = repository

    def execute(self, profile_id: int) -> Member:
        member = self.repository.get_profile_by_id(profile_id)
        if member is None:
            raise MemberNotFoundError()
        return member


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
        if self.repository.get_profile_by_user_id(user_id) is None and self.repository.get_member(user_id) is None:
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
