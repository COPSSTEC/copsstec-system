from datetime import date

from app.modules.members.domain.entities import ENABLED_STATE_ID, Member
from app.modules.members.infrastructure.pdfs import (
    MemberDocumentGenerator,
    SOLICITUD_OBLIGATIONS,
    build_solicitud_body,
)
from app.modules.membership.application.use_cases import _validate_registration
from app.modules.membership.domain.cedula import CEDULA_INVALID_MESSAGE, is_valid_ecuadorian_cedula
from app.modules.membership.domain.entities import MembershipRegistrationData, onboarding_documents_complete
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
    assert "transversal" not in body.lower()
    assert "Teléfono fijo" not in body
    titles = [title for title, _ in SOLICITUD_OBLIGATIONS]
    assert titles == [
        "AFILIACIÓN Y OBLIGACIÓN DE LOS MIEMBROS",
        "SOCIOS CON VALORES PENDIENTES",
        "SOCIOS AL DÍA EN SUS OBLIGACIONES",
    ]
    assert any("artículo 13 literal a)" in paragraph for _, paragraphs in SOLICITUD_OBLIGATIONS for paragraph in paragraphs)
