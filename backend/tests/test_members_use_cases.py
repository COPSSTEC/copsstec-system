from dataclasses import replace

from app.core.security import hash_password, verify_password
from app.modules.auth.application.use_cases import (
    AffiliationPendingError,
    ChangePasswordUseCase,
    InvalidCredentialsError,
    LoginUseCase,
    MemberCorporateEmailRequiredError,
    PasswordReuseError,
)
from app.modules.auth.domain.entities import User
from app.modules.members.application.use_cases import (
    CreateMemberUseCase,
    ResendMemberCredentialsUseCase,
    SetMemberStateUseCase,
)
from app.modules.members.domain.entities import (
    DISABLED_STATE_ID,
    ENABLED_STATE_ID,
    Member,
    MemberListQuery,
    MemberListResult,
    MemberWriteData,
)
from app.modules.members.domain.exceptions import MemberConflictError, MemberValidationError
from app.modules.membership.domain.exceptions import MailboxError


class FakeMemberRepository:
    def __init__(self) -> None:
        self.members: dict[int, Member] = {}
        self.passwords: dict[int, str] = {}
        self.next_id = 1

    def list_members(self, query: MemberListQuery) -> MemberListResult:
        items = list(self.members.values())
        return MemberListResult(items=items, total=len(items), page=query.page, page_size=query.page_size)

    def get_member(self, user_id: int) -> Member | None:
        return self.members.get(user_id)

    def create_member(self, data: MemberWriteData, password_hash: str) -> Member:
        user_id = self.next_id
        self.next_id += 1
        member = Member(
            user_id=user_id,
            profile_id=user_id,
            name=f"{data.names} {data.lastname}",
            login_email=data.login_email,
            state_id=data.state_id,
            state_label="HABILITADO",
            last_conexion=None,
            names=data.names,
            lastname=data.lastname,
            identifier=data.identifier,
            email=data.email,
            birtday=data.birtday,
            blood_type=data.blood_type,
            mobile_phone=data.mobile_phone,
            fixed_phone=data.fixed_phone,
            title_academic=data.title_academic,
            level_academic=data.level_academic,
            cod_senescyt=data.cod_senescyt,
            date_register=data.date_register,
            linkdink=data.linkdink,
            want_notifications=data.want_notifications,
            is_work=data.is_work,
            foto_id=data.foto_id,
            province=data.province,
            city=data.city,
            street_principal=data.street_principal,
            street_secondary=data.street_secondary,
            type_profile=data.type_profile,
            date_exit=None,
            fourth_title=data.fourth_title,
            type_commision=data.type_commision,
            codigo_senescyt_cuarto=data.codigo_senescyt_cuarto,
            cod=None,
            gender=data.gender,
        )
        self.members[user_id] = member
        self.passwords[user_id] = password_hash
        return member

    def update_member(self, user_id: int, data: MemberWriteData) -> Member:
        return self.members[user_id]

    def soft_delete_member(self, user_id: int, deleted_by: int) -> None:
        del self.members[user_id]

    def set_member_state(self, user_id: int, state_id: int) -> Member:
        member = replace(self.members[user_id], state_id=state_id)
        self.members[user_id] = member
        return member

    def update_password(self, user_id: int, password_hash: str) -> Member:
        self.passwords[user_id] = password_hash
        return self.members[user_id]

    def find_conflict(
        self,
        *,
        identifier: str,
        email: str,
        login_email: str,
        exclude_user_id: int | None = None,
    ) -> str | None:
        for member in self.members.values():
            if exclude_user_id is not None and member.user_id == exclude_user_id:
                continue
            if member.identifier == identifier:
                return "Ya existe un miembro con esa cédula."
            if member.email == email:
                return "Ya existe un miembro con ese correo de contacto."
            if member.login_email == login_email:
                return "Ya existe un usuario con ese correo de acceso."
        return None


class FakeNotifier:
    def __init__(self) -> None:
        self.sent: list[tuple[str, str, str]] = []

    def notify_credentials(self, email: str, password: str, full_name: str) -> None:
        self.sent.append((email, password, full_name))


class FakeAuthRepository:
    def __init__(self, user: User) -> None:
        self.user = user

    def get_user_by_email(self, email: str) -> User | None:
        if email != self.user.email:
            return None
        return self.user

    def get_user_by_id(self, user_id: int) -> User | None:
        if user_id != self.user.id:
            return None
        return self.user

    def update_last_connection(self, user_id: int) -> None:
        return None

    def update_own_password(self, user_id: int, password_hash: str) -> None:
        self.user = replace(
            self.user,
            password_hash=password_hash,
            must_change_password=False,
        )


def _write_data(**overrides: object) -> MemberWriteData:
    data = MemberWriteData(
        names="Ana",
        lastname="Pérez",
        identifier="0102030405",
        email="ana@example.com",
        login_email="ana.login@example.com",
        birtday="01/01/1990",
        mobile_phone="0990000000",
        date_register="09/09/2026",
    )
    return replace(data, **overrides)  # type: ignore[arg-type]


def test_create_member_generates_password_and_notifies() -> None:
    repository = FakeMemberRepository()
    notifier = FakeNotifier()
    member, password = CreateMemberUseCase(repository, notifier).execute(_write_data())

    assert member.names == "Ana"
    assert password
    assert verify_password(password, repository.passwords[member.user_id])
    assert notifier.sent[0][0] == "ana.login@example.com"


def test_create_member_rejects_duplicate_identifier() -> None:
    repository = FakeMemberRepository()
    notifier = FakeNotifier()
    use_case = CreateMemberUseCase(repository, notifier)
    use_case.execute(_write_data())

    try:
        use_case.execute(_write_data(email="otra@example.com", login_email="otra@example.com"))
        raise AssertionError("Expected conflict")
    except MemberConflictError as exc:
        assert "cédula" in exc.message


def test_disable_member_changes_state() -> None:
    repository = FakeMemberRepository()
    notifier = FakeNotifier()
    member, _ = CreateMemberUseCase(repository, notifier).execute(_write_data())

    disabled = SetMemberStateUseCase(repository).execute(member.user_id, enabled=False)
    assert disabled.state_id == DISABLED_STATE_ID


def test_login_rejects_disabled_user() -> None:
    user = User(
        id=99,
        name="Miembro",
        email="miembro@example.com",
        password_hash=hash_password("secret123"),
        state_id=DISABLED_STATE_ID,
        email_verified_at=None,
        last_conexion=None,
        roles=["miembro"],
        profile=None,
    )

    try:
        LoginUseCase(FakeAuthRepository(user)).execute("miembro@example.com", "secret123")
        raise AssertionError("Expected invalid credentials")
    except InvalidCredentialsError:
        pass


def test_login_accepts_enabled_user() -> None:
    user = User(
        id=100,
        name="Miembro",
        email="habilitado@copsstec.com",
        password_hash=hash_password("secret123"),
        state_id=ENABLED_STATE_ID,
        email_verified_at=None,
        last_conexion=None,
        roles=["miembro"],
        profile=None,
    )

    result = LoginUseCase(FakeAuthRepository(user)).execute("habilitado@copsstec.com", "secret123")
    assert result.user.email == "habilitado@copsstec.com"


def test_login_enabled_member_rejects_non_copsstec_email() -> None:
    user = User(
        id=101,
        name="Miembro",
        email="miembro@gmail.com",
        password_hash=hash_password("secret123"),
        state_id=ENABLED_STATE_ID,
        email_verified_at=None,
        last_conexion=None,
        roles=["miembro"],
        profile=None,
    )

    try:
        LoginUseCase(FakeAuthRepository(user)).execute("miembro@gmail.com", "secret123")
        raise AssertionError("Expected corporate email restriction")
    except MemberCorporateEmailRequiredError:
        pass


def test_login_admin_allows_non_copsstec_email() -> None:
    user = User(
        id=102,
        name="Admin",
        email="admin@gmail.com",
        password_hash=hash_password("secret123"),
        state_id=ENABLED_STATE_ID,
        email_verified_at=None,
        last_conexion=None,
        roles=["admin"],
        profile=None,
    )

    result = LoginUseCase(FakeAuthRepository(user)).execute("admin@gmail.com", "secret123")
    assert result.user.email == "admin@gmail.com"


def test_login_pending_member_rejects_until_approval() -> None:
    user = User(
        id=103,
        name="Aspirante",
        email="persona@gmail.com",
        password_hash=hash_password("secret123"),
        state_id=2,
        email_verified_at=None,
        last_conexion=None,
        roles=["miembro"],
        profile=None,
    )

    try:
        LoginUseCase(FakeAuthRepository(user)).execute("persona@gmail.com", "secret123")
        raise AssertionError("Expected affiliation pending")
    except AffiliationPendingError:
        pass


def test_change_password_clears_temporary_flag() -> None:
    user = User(
        id=104,
        name="Miembro",
        email="joel.gabriel@copsstec.com",
        password_hash=hash_password("temporal1"),
        state_id=ENABLED_STATE_ID,
        email_verified_at=None,
        last_conexion=None,
        roles=["miembro"],
        profile=None,
        must_change_password=True,
    )
    repository = FakeAuthRepository(user)
    updated = ChangePasswordUseCase(repository).execute(
        user=user,
        current_password="temporal1",
        password="nuevaClave9",
        confirmation="nuevaClave9",
    )
    assert updated.must_change_password is False
    assert verify_password("nuevaClave9", updated.password_hash)


def test_change_password_rejects_same_temporary() -> None:
    user = User(
        id=105,
        name="Miembro",
        email="joel.gabriel@copsstec.com",
        password_hash=hash_password("temporal1"),
        state_id=ENABLED_STATE_ID,
        email_verified_at=None,
        last_conexion=None,
        roles=["miembro"],
        profile=None,
        must_change_password=True,
    )
    try:
        ChangePasswordUseCase(FakeAuthRepository(user)).execute(
            user=user,
            current_password="temporal1",
            password="temporal1",
            confirmation="temporal1",
        )
        raise AssertionError("Expected password reuse")
    except PasswordReuseError:
        pass


class FakeMailbox:
    def __init__(self) -> None:
        self.updated: list[tuple[str, str]] = []
        self.fail = False

    def create_mailbox(self, email: str, password: str) -> None:
        self.updated.append((email, password))

    def update_or_create_mailbox(self, email: str, password: str) -> None:
        if self.fail:
            raise MailboxError("Error al actualizar credenciales en Mail-in-a-Box")
        self.updated.append((email, password))


class FakeEmailSender:
    def __init__(self) -> None:
        self.sent: list[tuple[str, str]] = []

    def send(self, to_email: str, subject: str, body: str) -> None:
        self.sent.append((to_email, subject))


def test_resend_credentials_updates_mailbox_for_enabled_member() -> None:
    repository = FakeMemberRepository()
    notifier = FakeNotifier()
    mailbox = FakeMailbox()
    email_sender = FakeEmailSender()
    member, _ = CreateMemberUseCase(repository, notifier).execute(
        _write_data(login_email="ana.perez@copsstec.com"),
    )

    member, password = ResendMemberCredentialsUseCase(repository, mailbox, email_sender).execute(
        member.user_id,
    )

    assert password
    assert mailbox.updated[0][0] == "ana.perez@copsstec.com"
    assert verify_password(password, repository.passwords[member.user_id])
    assert {item[0] for item in email_sender.sent} == {"ana@example.com", "ana.perez@copsstec.com"}


def test_resend_credentials_rejects_pending_member() -> None:
    repository = FakeMemberRepository()
    notifier = FakeNotifier()
    member, _ = CreateMemberUseCase(repository, notifier).execute(
        _write_data(state_id=2, login_email="ana.perez@copsstec.com"),
    )

    try:
        ResendMemberCredentialsUseCase(repository, FakeMailbox(), FakeEmailSender()).execute(member.user_id)
        raise AssertionError("Expected validation error")
    except MemberValidationError:
        pass
