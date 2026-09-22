from dataclasses import replace
from pathlib import Path

from app.modules.members.application.use_cases import public_verify_url
from app.modules.members.domain.entities import ENABLED_STATE_ID, Member
from app.modules.members.infrastructure.pdfs import (
    MemberDocumentGenerator,
    format_register_month_year,
    member_code,
    resolve_logo_path,
    resolve_photo_path,
)


def _member() -> Member:
    return Member(
        user_id=7,
        profile_id=12,
        name="Franz Guzmán",
        login_email="franz@copsstec.com",
        state_id=ENABLED_STATE_ID,
        state_label="HABILITADO",
        last_conexion=None,
        names="Franz Paulul",
        lastname="Guzmán Galarza",
        identifier="1707191068",
        email="franzpguzmang@gmail.com",
        birtday="08/01/1968",
        blood_type="O-",
        mobile_phone="0983056998",
        fixed_phone="",
        title_academic="Magíster en Seguridad Salud y Ambiente",
        level_academic="Maestría",
        cod_senescyt="",
        date_register="01/04/2018",
        linkdink="",
        want_notifications=True,
        is_work=True,
        foto_id="",
        province="Pichincha",
        city="Quito",
        street_principal=None,
        street_secondary=None,
        type_profile="miembro",
        date_exit=None,
        fourth_title=None,
        type_commision=None,
        codigo_senescyt_cuarto=None,
        cod="00006",
        gender=None,
    )


def test_member_code_uses_profile_cod() -> None:
    assert member_code(_member()) == "2842018-00006"


def test_member_code_pads_numeric_cod() -> None:
    assert member_code(replace(_member(), cod="6")) == "2842018-00006"


def test_resolve_photo_path_reads_membership_media(tmp_path: Path, monkeypatch) -> None:
    photo = tmp_path / "storage" / "membership" / "7" / "photos" / "face.jpg"
    photo.parent.mkdir(parents=True)
    photo.write_bytes(b"jpg")
    monkeypatch.chdir(tmp_path)
    assert resolve_photo_path("/media/membership/7/photos/face.jpg") == photo


def test_format_register_month_year() -> None:
    assert format_register_month_year("01/04/2018") == "Abril de 2018"


def test_public_verify_url_uses_profile_id() -> None:
    url = public_verify_url(_member())
    assert url.endswith("/perfil/12")


def test_certificate_pdf_is_valid() -> None:
    pdf = MemberDocumentGenerator().generate_certificate(_member(), "http://localhost:3000/perfil/12")
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 20_000


def test_carnet_pdf_is_valid() -> None:
    pdf = MemberDocumentGenerator().generate_carnet(_member(), "http://localhost:3000/perfil/12")
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 5_000


def test_resolve_logo_path_finds_brand_icon() -> None:
    path = resolve_logo_path()
    assert path is not None
    assert path.is_file()
