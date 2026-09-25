from datetime import date
from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory

from app.core.config import live_membership_transfer
from app.modules.members.domain.entities import ENABLED_STATE_ID, Member
from app.modules.membership.infrastructure.files import InvalidMembershipFileError, LocalMembershipFileStorage
from app.modules.members.infrastructure.pdfs import (
    MemberDocumentGenerator,
    build_solicitud_body,
)
from app.modules.membership.application.use_cases import GetPaymentInfoUseCase, _validate_registration
from app.modules.membership.domain.cedula import CEDULA_INVALID_MESSAGE, is_valid_ecuadorian_cedula
from app.modules.membership.domain.entities import (
    MembershipPayment,
    MembershipRegistrationData,
    PAYMENT_PENDING,
    onboarding_documents_complete,
)
from app.modules.membership.domain.exceptions import MembershipValidationError
from app.modules.membership.infrastructure.authorization_pdf import (
    AuthorizationDebitPdfGenerator,
    build_account_phrase,
    _register_fonts,
)


def test_ecuadorian_cedula_valid_and_invalid() -> None:
    assert is_valid_ecuadorian_cedula("1710034065")
    assert is_valid_ecuadorian_cedula("1710034066")
    assert not is_valid_ecuadorian_cedula("1710034066a")
    assert not is_valid_ecuadorian_cedula("09140201855")
    assert not is_valid_ecuadorian_cedula("123")
    assert not is_valid_ecuadorian_cedula("")


def test_register_rejects_invalid_cedula() -> None:
    data = MembershipRegistrationData(
        names="Ana",
        lastname="Pérez",
        identifier="123456789",
        email="ana@example.com",
        birtday="01/01/1990",
        blood_type="O Rh+ (O positivo)",
        gender="Femenino",
        mobile_phone="0990000000",
        fixed_phone="",
        province="Pichincha",
        city="Quito",
        street_principal="Av. Amazonas",
        street_secondary="",
        title_academic="Ingeniera",
        cod_senescyt="12345",
        fourth_title="",
        codigo_senescyt_cuarto="",
        accept_birthday_notifications=True,
        accept_data_policy=True,
    )
    try:
        _validate_registration(data)
    except MembershipValidationError as exc:
        assert exc.message == CEDULA_INVALID_MESSAGE
    else:
        raise AssertionError("Expected invalid cedula to fail")


def test_save_pdf_accepts_solicitud_folder() -> None:
    with TemporaryDirectory() as tmp:
        storage = LocalMembershipFileStorage(tmp)
        stored = storage.save_pdf(7, "solicitud", "solicitud-firmada.pdf", b"%PDF-1.4 test", "application/pdf")
        assert stored.endswith(".pdf")
        assert "/solicitud/" in stored
        assert (Path(tmp) / "7" / "solicitud").is_dir()


def test_save_pdf_rejects_unknown_folder() -> None:
    with TemporaryDirectory() as tmp:
        storage = LocalMembershipFileStorage(tmp)
        try:
            storage.save_pdf(7, "unknown", "archivo.pdf", b"%PDF-1.4 test", "application/pdf")
        except InvalidMembershipFileError as exc:
            assert "tipo permitido" in exc.message
        else:
            raise AssertionError("Expected unknown folder to fail")


def test_onboarding_requires_solicitud_and_year() -> None:
    assert not onboarding_documents_complete("/a.pdf", "/c.pdf")
    assert not onboarding_documents_complete("/a.pdf", "/c.pdf", "/s.pdf", False)
    assert onboarding_documents_complete("/a.pdf", "/c.pdf", "/s.pdf", True)


def test_authorization_pdf_contains_bank_data() -> None:
    pdf = AuthorizationDebitPdfGenerator().generate(
        names="Ana",
        lastname="Pérez",
        identifier="1710034065",
        city="Quito",
        issued_on=date(2026, 9, 23),
        account_type="Ahorros",
        account_number="2211447788",
        bank_name="Banco Pichincha",
        debit_plan="monthly",
    )
    assert pdf.startswith(b"%PDF")
    _register_fonts()
    phrase = build_account_phrase("Ahorros", "2211447788", "Banco Pichincha")
    assert "2211447788" in phrase
    assert "Banco Pichincha" in phrase
    assert "Ahorros" in phrase


def test_solicitud_omits_empty_optional_fields() -> None:
    member = Member(
        user_id=7,
        profile_id=12,
        name="Ana Pérez",
        login_email="ana@copsstec.com",
        state_id=ENABLED_STATE_ID,
        state_label="HABILITADO",
        last_conexion=None,
        names="Ana",
        lastname="Pérez",
        identifier="1710034065",
        email="ana@example.com",
        birtday="01/01/1990",
        blood_type="O+",
        mobile_phone="0990000000",
        fixed_phone="",
        title_academic="Ingeniera",
        level_academic="Ingeniera",
        cod_senescyt="12345",
        date_register="23/09/2026",
        linkdink="",
        want_notifications=True,
        is_work=True,
        foto_id="",
        province="Pichincha",
        city="Quito",
        street_principal="Av. Amazonas N12",
        street_secondary="",
        type_profile="miembro",
        date_exit=None,
        fourth_title=None,
        type_commision=None,
        codigo_senescyt_cuarto=None,
        cod="00007",
        gender="Femenino",
    )
    pdf = MemberDocumentGenerator().generate_solicitud(member)
    assert pdf.startswith(b"%PDF")
    body = build_solicitud_body(member)
    assert "AV. AMAZONAS N12" in body
    assert "0990000000" in body
    assert "cantón" in body
    assert "título de tercer nivel" in body
    assert "título de cuarto nivel" not in body
    assert "respectivamente" not in body
    assert "SENESCYT" in body
    assert "Banco de Guayaquil" not in body
    assert "$120" not in body
    assert "Ministerio del Trabajo" in body


def test_solicitud_includes_both_titles_when_present() -> None:
    member = Member(
        user_id=8,
        profile_id=13,
        name="Luis Mora",
        login_email="luis@copsstec.com",
        state_id=ENABLED_STATE_ID,
        state_label="HABILITADO",
        last_conexion=None,
        names="Luis",
        lastname="Mora",
        identifier="1710034065",
        email="luis@example.com",
        birtday="01/01/1988",
        blood_type="O+",
        mobile_phone="0981111111",
        fixed_phone="",
        title_academic="Ingeniero en SST",
        level_academic="Ingeniero",
        cod_senescyt="11111",
        date_register="23/09/2026",
        linkdink="",
        want_notifications=True,
        is_work=True,
        foto_id="",
        province="Guayas",
        city="Guayaquil",
        street_principal="Av. 9 de Octubre",
        street_secondary="Chimborazo",
        type_profile="miembro",
        date_exit=None,
        fourth_title="Magíster en SST",
        type_commision=None,
        codigo_senescyt_cuarto="99999",
        cod="00008",
        gender="Masculino",
    )
    body = build_solicitud_body(member)
    assert "título de tercer nivel" in body
    assert "INGENIERO EN SST" in body
    assert "título de cuarto nivel" in body
    assert "MAGÍSTER EN SST" in body
    assert "11111" in body
    assert "99999" in body
    assert "respectivamente" in body
    assert "CHIMBORAZO" in body


def test_payment_info_uses_live_account_not_payment_snapshot() -> None:
    transfer = live_membership_transfer()

    class _Repo:
        def get_payment(self, user_id: int) -> MembershipPayment:
            return MembershipPayment(
                id=1,
                user_id=user_id,
                profile_id=9,
                amount=Decimal("99.00"),
                currency="USD",
                bank_name="Banco Viejo",
                account_type="Corriente",
                account_number="SNAPSHOT-OLD-NUMBER",
                account_holder="TITULAR VIEJO",
                account_ruc="999",
                reference="17080081744",
                voucher_path=None,
                status=PAYMENT_PENDING,
                reviewed_by=None,
                reviewed_at=None,
            )

    info = GetPaymentInfoUseCase(_Repo()).execute(4)
    assert info.reference == "17080081744"
    assert info.account_number == transfer.account_number
    assert info.account_number != "SNAPSHOT-OLD-NUMBER"
    assert info.bank_name == transfer.bank_name
    assert info.account_holder == transfer.account_holder
    assert str(info.amount) == str(Decimal(transfer.fee))
