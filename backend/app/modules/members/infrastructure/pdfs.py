from __future__ import annotations

import io
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from app.modules.members.domain.entities import ENABLED_STATE_ID, Member

ASSETS_DIR = Path(__file__).resolve().parent / "assets"
BACKEND_ROOT = Path(__file__).resolve().parents[4]
CERTIFICATE_BG = ASSETS_DIR / "certificado.png"
COOKIE_FONT = ASSETS_DIR / "Cookie-Regular.ttf"
CARNET_ORG = "COLEGIO DE PROFESIONALES DE SEGURIDAD Y SALUD EN EL TRABAJO DEL ECUADOR"
NAVY = (0.0, 0.0, 0.20)
GOLD = (0.95, 0.76, 0.22)

_COOKIE_REGISTERED = False
_LOCAL_ORIGINS = (
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://localhost:8000",
)


def member_code(member: Member) -> str:
    raw = str(member.cod if member.cod is not None else "").strip()
    if raw.isdigit():
        suffix = raw.zfill(5)
    elif raw:
        suffix = raw
    else:
        suffix = f"{member.user_id:05d}"
    return f"2842018-{suffix}"


def format_register_month_year(value: str) -> str:
    parts = [part.strip() for part in (value or "").replace("-", "/").split("/") if part.strip()]
    if len(parts) != 3:
        return value or ""
    if len(parts[0]) == 4:
        year, month = parts[0], parts[1]
    else:
        month, year = parts[1], parts[2]
    months = {
        "01": "Enero",
        "02": "Febrero",
        "03": "Marzo",
        "04": "Abril",
        "05": "Mayo",
        "06": "Junio",
        "07": "Julio",
        "08": "Agosto",
        "09": "Septiembre",
        "10": "Octubre",
        "11": "Noviembre",
        "12": "Diciembre",
    }
    return f"{months.get(month.zfill(2), month)} de {year}"


def _storage_roots() -> list[Path]:
    return [Path("storage"), BACKEND_ROOT / "storage"]


def resolve_photo_path(foto_id: str) -> Path | None:
    value = (foto_id or "").strip()
    if not value:
        return None

    for origin in _LOCAL_ORIGINS:
        if value.startswith(origin):
            value = value[len(origin) :]
            break

    if value.startswith("http://") or value.startswith("https://"):
        return None

    relative = value.lstrip("/")
    if value.startswith("/media/members/"):
        relative = f"members/{value.removeprefix('/media/members/')}"
    elif value.startswith("/media/membership/"):
        relative = f"membership/{value.removeprefix('/media/membership/')}"
    elif value.startswith("/storage/"):
        relative = value.removeprefix("/storage/")

    candidates = [Path(value)] if not value.startswith("/") else []
    for root in _storage_roots():
        candidates.append(root / relative)
        if "/" not in relative:
            candidates.append(root / "members" / relative)
            candidates.append(root / "membership" / relative)

    for path in candidates:
        if path.is_file():
            return path
    return None


def _square_photo_reader(data: bytes | str) -> ImageReader:
    source: Path | io.BytesIO = io.BytesIO(data) if isinstance(data, bytes) else Path(data)
    try:
        from PIL import Image

        image = Image.open(source)
        image = image.convert("RGB")
        side = min(image.size)
        left = (image.width - side) // 2
        top = (image.height - side) // 2
        image = image.crop((left, top, left + side, top + side))
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=92)
        buffer.seek(0)
        return ImageReader(buffer)
    except Exception:
        return ImageReader(source)


def load_photo_reader(foto_id: str) -> ImageReader | None:
    path = resolve_photo_path(foto_id)
    if path is not None:
        return _square_photo_reader(str(path))

    value = (foto_id or "").strip()
    if value.startswith("http://") or value.startswith("https://"):
        try:
            from urllib.request import Request, urlopen

            data = urlopen(Request(value, headers={"User-Agent": "COPSSTEC"}), timeout=8).read()
            return _square_photo_reader(data)
        except Exception:
            return None
    return None


def _register_cookie() -> str:
    global _COOKIE_REGISTERED
    if COOKIE_FONT.is_file() and not _COOKIE_REGISTERED:
        pdfmetrics.registerFont(TTFont("Cookie", str(COOKIE_FONT)))
        _COOKIE_REGISTERED = True
    return "Cookie" if _COOKIE_REGISTERED else "Times-Italic"


def resolve_logo_path() -> Path | None:
    candidates = [
        ASSETS_DIR / "icon-short.png",
        BACKEND_ROOT.parent / "frontend" / "public" / "media" / "brand" / "icon-short.png",
    ]
    for path in candidates:
        if path.is_file():
            return path
    return None


def _qr_reader(url: str, box_size: int = 8) -> ImageReader:
    import qrcode

    qr = qrcode.QRCode(border=1, box_size=box_size)
    qr.add_data(url)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return ImageReader(buffer)


def generate_qr_png(url: str) -> bytes:
    import qrcode

    qr = qrcode.QRCode(border=1, box_size=10)
    qr.add_data(url)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class MemberDocumentGenerator:
    def generate_certificate(self, member: Member, verify_url: str) -> bytes:
        buffer = io.BytesIO()
        width, height = A4
        pdf = canvas.Canvas(buffer, pagesize=A4)
        if CERTIFICATE_BG.is_file():
            pdf.drawImage(str(CERTIFICATE_BG), 0, 0, width=width, height=height, preserveAspectRatio=False, mask="auto")

        full_name = f"{member.names} {member.lastname}".strip()
        font_name = _register_cookie()
        pdf.setFillColorRGB(0.10, 0.14, 0.49)
        pdf.setFont(font_name, 36)
        pdf.drawCentredString(width / 2, 558, full_name)

        pdf.setFillColorRGB(0.12, 0.14, 0.20)
        pdf.setFont("Times-Roman", 12)
        pdf.drawString(width / 2 + 72, 508, member.identifier or "")

        pdf.setFont("Times-Bold", 11)
        pdf.drawString(width / 2 + 14, 228, format_register_month_year(member.date_register))
        pdf.drawString(width / 2 + 58, 178, member_code(member))

        qr_size = 62
        pdf.drawImage(_qr_reader(verify_url), 36, 36, width=qr_size, height=qr_size, mask="auto")
        pdf.save()
        return buffer.getvalue()

    def generate_carnet(self, member: Member, verify_url: str) -> bytes:
        buffer = io.BytesIO()
        width, height = 396.0, 594.0
        pdf = canvas.Canvas(buffer, pagesize=(width, height))
        pdf.setFillColorRGB(*NAVY)
        pdf.rect(0, 0, width, height, fill=1, stroke=0)

        pdf.setFillColorRGB(*GOLD)
        pdf.rect(0, 0, 5, height, fill=1, stroke=0)

        divider_x = 132
        pdf.setStrokeColorRGB(1, 1, 1)
        pdf.setLineWidth(1.2)
        pdf.line(divider_x, 36, divider_x, height - 36)

        is_active = member.state_id == ENABLED_STATE_ID
        status = "MIEMBRO ACTIVO" if is_active else "MIEMBRO INACTIVO"
        code = member_code(member)

        pdf.setFillColorRGB(*GOLD)
        pdf.saveState()
        pdf.translate(26, 52)
        pdf.rotate(90)
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(0, 0, status)
        pdf.restoreState()

        pdf.setFillColorRGB(1, 1, 1)
        pdf.saveState()
        pdf.translate(26, height - 48)
        pdf.rotate(90)
        pdf.setFont("Helvetica-Bold", 9)
        pdf.drawRightString(0, 0, code)
        pdf.restoreState()

        pdf.saveState()
        pdf.translate(68, height / 2)
        pdf.rotate(90)
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawCentredString(0, 0, CARNET_ORG)
        pdf.restoreState()

        center_x = (divider_x + width) / 2
        logo_size = 78
        logo_path = resolve_logo_path()
        logo_y = height - 36 - logo_size
        if logo_path is not None:
            pdf.setFillColorRGB(1, 1, 1)
            pdf.circle(center_x, logo_y + logo_size / 2, logo_size / 2, fill=1, stroke=0)
            pdf.drawImage(
                str(logo_path),
                center_x - logo_size / 2,
                logo_y,
                width=logo_size,
                height=logo_size,
                mask="auto",
                preserveAspectRatio=True,
            )

        photo_size = 118
        photo_x = center_x - photo_size / 2
        photo_y = 318
        photo = load_photo_reader(member.foto_id)
        if photo is not None:
            pdf.drawImage(
                photo,
                photo_x,
                photo_y,
                width=photo_size,
                height=photo_size,
                preserveAspectRatio=True,
                mask="auto",
                anchor="c",
            )
        else:
            pdf.setFillColorRGB(1, 1, 1)
            pdf.rect(photo_x, photo_y, photo_size, photo_size, fill=1, stroke=0)

        pdf.setFillColorRGB(1, 1, 1)
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawCentredString(center_x, 296, (member.names or "").upper())
        pdf.drawCentredString(center_x, 280, (member.lastname or "").upper())

        qr_size = 100
        qr_x = center_x - qr_size / 2
        qr_y = 158
        pdf.setFillColorRGB(1, 1, 1)
        pdf.rect(qr_x, qr_y, qr_size, qr_size, fill=1, stroke=0)
        pdf.drawImage(_qr_reader(verify_url, box_size=6), qr_x, qr_y, width=qr_size, height=qr_size, mask="auto")

        pdf.setFillColorRGB(1, 1, 1)
        pdf.setFont("Helvetica-Bold", 9)
        pdf.drawCentredString(center_x, 136, "Tipo de sangre")
        pdf.setFont("Helvetica-Bold", 13)
        pdf.drawCentredString(center_x, 118, (member.blood_type or "—").upper())
        pdf.save()
        return buffer.getvalue()
