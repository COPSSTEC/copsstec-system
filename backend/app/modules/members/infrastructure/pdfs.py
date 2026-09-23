from __future__ import annotations

import io
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

from app.modules.members.domain.entities import ENABLED_STATE_ID, Member

ASSETS_DIR = Path(__file__).resolve().parent / "assets"
BACKEND_ROOT = Path(__file__).resolve().parents[4]
CERTIFICATE_BG = ASSETS_DIR / "certificado.png"
COOKIE_FONT = ASSETS_DIR / "Cookie-Regular.ttf"
CARNET_ORG = "COLEGIO DE PROFESIONALES DE SEGURIDAD Y SALUD EN EL TRABAJO DEL ECUADOR"
NAVY = (0.0, 0.0, 0.20)
GOLD = (0.95, 0.76, 0.22)
SOLICITUD_NAVY = HexColor("#1e3a8a")
SOLICITUD_LINE = HexColor("#94a3b8")
SOLICITUD_MUTED = HexColor("#475569")
PORTAL_EMAIL = "administracion@copsstec.com"
PORTAL_PHONE = "+593 99 876 2480"
PORTAL_WEB = "www.copsstec.com"
PORTAL_ADDRESS = "Edificio Centro Amazonas, Gil Ramirez 1-46. Quito 170526"
SOLICITUD_SLOGAN = (
    "Unidos por un trabajo seguro y saludable para fortalecer la producción del país"
)

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


def _solicitud_value(value: str | None) -> str:
    text = (value or "").strip()
    return escape(text) if text else "—"


def _solicitud_upper(value: str | None) -> str:
    text = (value or "").strip()
    return escape(text.upper()) if text else "—"


def build_solicitud_body(member: Member) -> str:
    names = _solicitud_upper(member.names)
    lastname = _solicitud_upper(member.lastname)
    identifier = _solicitud_upper(member.identifier)
    address_parts = [
        "domiciliado en la "
        f"provincia de <font name='Times-Bold'>{_solicitud_upper(member.province)}</font> "
        f"Ciudad de <font name='Times-Bold'>{_solicitud_upper(member.city)}</font>",
    ]
    if (member.street_principal or "").strip():
        address_parts.append(
            f"en la calle <font name='Times-Bold'>{_solicitud_upper(member.street_principal)}</font>"
        )
    if (member.street_secondary or "").strip():
        address_parts.append(
            f"y transversal <font name='Times-Bold'>{_solicitud_upper(member.street_secondary)}</font>"
        )
    if (member.fixed_phone or "").strip():
        address_parts.append(
            f"Teléfono fijo <font name='Times-Bold'>{_solicitud_upper(member.fixed_phone)}</font>"
        )
    if (member.mobile_phone or "").strip():
        address_parts.append(
            f"Teléfono Móvil <font name='Times-Bold'>{_solicitud_upper(member.mobile_phone)}</font>"
        )
    return (
        f"Yo, <font name='Times-Bold'>{names} {lastname}</font>, titular de la cédula de "
        f"identidad Nro. <font name='Times-Bold'>{identifier}</font>, "
        f"{' '.join(address_parts)}, "
        "en consideración de ser un profesional de la seguridad y salud en el trabajo con mi "
        f"título de <font name='Times-Bold'>{_solicitud_upper(member.title_academic)}</font>, "
        "legalmente registrado en el Sistema Nacional de Información de la Educación Superior "
        f"del Ecuador, con el código: <font name='Times-Bold'>{_solicitud_upper(member.cod_senescyt)}</font>. "
        "Solicito a usted Sr. Presidente, se me incluya como miembro activo del "
        "<font name='Times-Bold'>COLEGIO DE PROFESIONALES DE SEGURIDAD Y SALUD EN EL TRABAJO "
        "DEL ECUADOR (COPSSTEC)</font>, asumiendo el compromiso de manera voluntaria de "
        "realizar mi aporte anual por el valor de $120 (ciento veinte dólares americanos); "
        "en la cuenta corriente No 48403590 del Banco de Guayaquil a nombre del Colegio de "
        "Profesionales de Seguridad y Salud en el Trabajo del Ecuador Ruc: 1792898633001, "
        "además declaro que estoy en conocimiento de los estatutos y apruebo mi aporte sea "
        "destinado a cumplir con los fines y objetivos planteados. Además, autorizo a que se "
        "registren mis datos ante el Ministerio de Trabajo, para lo cual adjunto la copia de "
        "mi cédula."
    )


def _certificate_name_lines(names: str, lastname: str) -> list[str]:
    first = (names or "").strip()
    second = (lastname or "").strip()
    if first and second:
        return [first, second]
    full = f"{first} {second}".strip()
    return [full] if full else ["—"]


def _draw_fitted_centered_lines(
    pdf: canvas.Canvas,
    lines: list[str],
    font_name: str,
    max_width: float,
    center_x: float,
    y: float,
    max_size: float = 36,
    min_size: float = 16,
) -> None:
    visible = [line for line in lines if line]
    if not visible:
        return
    size = max_size
    while size > min_size:
        if all(pdf.stringWidth(line, font_name, size) <= max_width for line in visible):
            break
        size -= 0.5
    if any(pdf.stringWidth(line, font_name, size) > max_width for line in visible) and len(visible) == 1:
        words = visible[0].split()
        if len(words) > 1:
            mid = max(1, len(words) // 2)
            visible = [" ".join(words[:mid]), " ".join(words[mid:])]
            size = max_size
            while size > min_size:
                if all(pdf.stringWidth(line, font_name, size) <= max_width for line in visible):
                    break
                size -= 0.5
    pdf.setFont(font_name, size)
    if len(visible) == 1:
        pdf.drawCentredString(center_x, y, visible[0])
        return
    gap = size * 0.95
    start = y + gap * (len(visible) - 1) / 2
    for index, line in enumerate(visible):
        pdf.drawCentredString(center_x, start - index * gap, line)


def generate_qr_png(url: str) -> bytes:
    import qrcode

    qr = qrcode.QRCode(border=1, box_size=10)
    qr.add_data(url)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _draw_solicitud_icon(pdf: canvas.Canvas, kind: str, cx: float, cy: float, radius: float = 4.2) -> None:
    pdf.setFillColor(SOLICITUD_NAVY)
    pdf.circle(cx, cy, radius, fill=1, stroke=0)
    pdf.setStrokeColor(white)
    pdf.setFillColor(white)
    pdf.setLineWidth(0.7)
    pdf.setLineCap(1)
    pdf.setLineJoin(1)
    if kind == "mail":
        left, right = cx - 2.2, cx + 2.2
        bottom, top = cy - 1.4, cy + 1.3
        pdf.rect(left, bottom, right - left, top - bottom, fill=0, stroke=1)
        pdf.line(left, top, cx, cy - 0.1)
        pdf.line(right, top, cx, cy - 0.1)
        return
    if kind == "web":
        pdf.circle(cx, cy, 2.1, fill=0, stroke=1)
        pdf.ellipse(cx - 1.0, cy - 2.1, cx + 1.0, cy + 2.1, fill=0, stroke=1)
        pdf.line(cx - 2.1, cy, cx + 2.1, cy)
        return
    if kind == "phone":
        pdf.roundRect(cx - 1.15, cy - 2.1, 2.3, 4.2, 0.7, fill=0, stroke=1)
        pdf.line(cx - 0.55, cy + 1.55, cx + 0.55, cy + 1.55)
        return
    pdf.setLineWidth(0.8)
    pdf.circle(cx, cy + 0.55, 1.35, fill=0, stroke=1)
    pdf.line(cx, cy - 0.7, cx, cy - 2.0)


def _draw_solicitud_contacts(pdf: canvas.Canvas, width: float, y: float) -> None:
    items = [
        ("mail", PORTAL_EMAIL),
        ("web", PORTAL_WEB),
        ("phone", PORTAL_PHONE),
        ("pin", PORTAL_ADDRESS),
    ]
    pdf.setFont("Times-Roman", 7.2)
    gap = 10
    icon_gap = 5
    pieces: list[tuple[str, str, float]] = []
    total = 0.0
    for kind, label in items:
        text_w = pdf.stringWidth(label, "Times-Roman", 7.2)
        item_w = 8.4 + icon_gap + text_w
        pieces.append((kind, label, item_w))
        total += item_w
    total += gap * (len(pieces) - 1)
    x = (width - total) / 2
    for kind, label, item_w in pieces:
        _draw_solicitud_icon(pdf, kind, x + 4.2, y + 2.2)
        pdf.setFillColor(SOLICITUD_NAVY)
        pdf.setFont("Times-Roman", 7.2)
        pdf.drawString(x + 8.4 + icon_gap, y, label)
        x += item_w + gap


def _draw_solicitud_letterhead(pdf: canvas.Canvas, doc) -> None:
    width, height = A4
    bar = 16
    pdf.saveState()
    pdf.setFillColor(SOLICITUD_NAVY)
    pdf.rect(0, height - bar, width, bar, fill=1, stroke=0)
    pdf.rect(0, 0, width, bar, fill=1, stroke=0)

    logo_size = 46
    header_top = height - bar - 18
    left = 42
    logo_path = resolve_logo_path()
    if logo_path is not None:
        pdf.drawImage(
            str(logo_path),
            left,
            header_top - logo_size,
            width=logo_size,
            height=logo_size,
            mask="auto",
            preserveAspectRatio=True,
        )
        text_x = left + logo_size + 10
    else:
        text_x = left

    pdf.setFillColor(SOLICITUD_NAVY)
    pdf.setFont("Times-Bold", 11)
    pdf.drawString(text_x, header_top - 14, "Colegio de Profesionales de")
    pdf.drawString(text_x, header_top - 28, "Seguridad y Salud en el Trabajo")
    pdf.drawString(text_x, header_top - 42, "del Ecuador")

    slogan_width = 210
    slogan = Paragraph(
        SOLICITUD_SLOGAN,
        ParagraphStyle(
            "SolicitudSloganDraw",
            fontName="Times-Italic",
            fontSize=8,
            leading=10,
            alignment=TA_RIGHT,
            textColor=SOLICITUD_MUTED,
        ),
    )
    slogan.wrapOn(pdf, slogan_width, 40)
    slogan.drawOn(pdf, width - 42 - slogan_width, header_top - 38)

    line_y = header_top - logo_size - 10
    pdf.setStrokeColor(SOLICITUD_LINE)
    pdf.setLineWidth(0.7)
    pdf.line(42, line_y, width - 42, line_y)

    _draw_solicitud_contacts(pdf, width, bar + 10)
    pdf.restoreState()


class MemberDocumentGenerator:
    def generate_certificate(self, member: Member, verify_url: str) -> bytes:
        buffer = io.BytesIO()
        width, height = A4
        pdf = canvas.Canvas(buffer, pagesize=A4)
        if CERTIFICATE_BG.is_file():
            pdf.drawImage(str(CERTIFICATE_BG), 0, 0, width=width, height=height, preserveAspectRatio=False, mask="auto")

        font_name = _register_cookie()
        pdf.setFillColorRGB(0.10, 0.14, 0.49)
        _draw_fitted_centered_lines(
            pdf,
            _certificate_name_lines(member.names, member.lastname),
            font_name,
            max_width=width - 110,
            center_x=width / 2,
            y=558,
        )

        pdf.setFillColorRGB(0.12, 0.14, 0.20)
        pdf.setFont("Times-Roman", 12)
        pdf.drawString(width / 2 + 72, 508, member.identifier or "")

        pdf.setFont("Times-Bold", 11)
        pdf.drawString(width / 2 + 14, 228, format_register_month_year(member.date_register))

        qr_size = 68
        qr_x = (width - qr_size) / 2
        qr_y = 46
        pdf.drawImage(_qr_reader(verify_url), qr_x, qr_y, width=qr_size, height=qr_size, mask="auto")
        pdf.setFont("Times-Bold", 11)
        pdf.drawCentredString(width / 2, 32, member_code(member))
        pdf.save()
        return buffer.getvalue()

    def generate_solicitud(self, member: Member) -> bytes:
        buffer = io.BytesIO()
        document = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=48,
            rightMargin=48,
            topMargin=108,
            bottomMargin=58,
            title="SOLICITUD DE AFILIACIÓN",
            author="COPSSTEC",
        )

        section_style = ParagraphStyle(
            "SolicitudSection",
            fontName="Times-Bold",
            fontSize=16,
            leading=20,
            alignment=TA_CENTER,
            spaceBefore=8,
            spaceAfter=22,
            textColor=SOLICITUD_NAVY,
        )
        body_style = ParagraphStyle(
            "SolicitudBody",
            fontName="Times-Roman",
            fontSize=12,
            leading=17,
            alignment=TA_JUSTIFY,
            spaceBefore=6,
            spaceAfter=10,
        )
        sign_label_style = ParagraphStyle(
            "SolicitudSignLabel",
            fontName="Times-Roman",
            fontSize=11,
            leading=14,
            alignment=TA_CENTER,
            spaceBefore=4,
            spaceAfter=16,
        )
        footer_style = ParagraphStyle(
            "SolicitudFooter",
            fontName="Times-Roman",
            fontSize=11,
            leading=16,
            alignment=TA_LEFT,
            spaceAfter=2,
        )

        body = build_solicitud_body(member)
        footer_name = f"{_solicitud_value(member.lastname)} {_solicitud_value(member.names)}".strip()
        today = date.today().strftime("%d/%m/%Y")

        story = [
            Paragraph("SOLICITUD DE AFILIACIÓN", section_style),
            Paragraph(body, body_style),
            Paragraph("Atentamente:", body_style),
            Spacer(1, 28),
            HRFlowable(
                width=220,
                thickness=1,
                color=black,
                spaceBefore=0,
                spaceAfter=4,
                hAlign="CENTER",
            ),
            Paragraph("Firma del solicitante", sign_label_style),
            Paragraph(f"<b>Apellidos y nombres:</b> {footer_name}", footer_style),
            Paragraph(f"<b>Cédula:</b> {_solicitud_value(member.identifier)}", footer_style),
            Paragraph(f"<b>Fecha de solicitud:</b> {today}", footer_style),
        ]
        document.build(
            story,
            onFirstPage=_draw_solicitud_letterhead,
            onLaterPages=_draw_solicitud_letterhead,
        )
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
