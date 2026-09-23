from datetime import date
from io import BytesIO
from pathlib import Path

from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

_FONTS_DIR = Path(__file__).resolve().parents[3] / "shared" / "assets" / "fonts"
_REGULAR_NAME = "DejaVuSans"
_BOLD_NAME = "DejaVuSans-Bold"
_FONTS_REGISTERED = False


def _font_candidates(filename: str) -> list[Path]:
    try:
        import reportlab

        reportlab_fonts = Path(reportlab.__file__).resolve().parent / "fonts"
    except Exception:
        reportlab_fonts = None

    vera_name = "VeraBd.ttf" if "Bold" in filename else "Vera.ttf"
    candidates = [
        _FONTS_DIR / filename,
        Path("/usr/share/fonts/truetype/dejavu") / filename,
        Path("/usr/share/fonts/dejavu") / filename,
        Path("/Library/Fonts") / filename,
    ]
    if reportlab_fonts is not None:
        candidates.extend(
            [
                reportlab_fonts / filename,
                reportlab_fonts / vera_name,
            ]
        )
    return candidates


def _resolve_font(filename: str) -> Path:
    for candidate in _font_candidates(filename):
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"No se encontró la fuente Unicode {filename}.")


def _register_fonts() -> None:
    global _FONTS_REGISTERED
    if _FONTS_REGISTERED:
        return
    pdfmetrics.registerFont(TTFont(_REGULAR_NAME, str(_resolve_font("DejaVuSans.ttf"))))
    pdfmetrics.registerFont(TTFont(_BOLD_NAME, str(_resolve_font("DejaVuSans-Bold.ttf"))))
    _FONTS_REGISTERED = True


class AdvDebitAuthorizationPdfGenerator:
    def generate(
        self,
        *,
        names: str,
        lastname: str,
        identifier: str,
        city: str,
        issued_on: date,
    ) -> bytes:
        _register_fonts()
        buffer = BytesIO()
        document = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=2 * cm,
            rightMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm,
            title="AUTORIZACIÓN DE DÉBITO",
            author="COPSSTEC",
        )

        title_style = ParagraphStyle(
            "AdvAuthorizationTitle",
            fontName=_BOLD_NAME,
            fontSize=14,
            leading=18,
            alignment=TA_CENTER,
            spaceAfter=16,
        )
        meta_style = ParagraphStyle(
            "AdvAuthorizationMeta",
            fontName=_REGULAR_NAME,
            fontSize=11,
            leading=15,
            alignment=TA_LEFT,
            spaceAfter=4,
        )
        body_style = ParagraphStyle(
            "AdvAuthorizationBody",
            fontName=_REGULAR_NAME,
            fontSize=10.5,
            leading=15,
            alignment=TA_JUSTIFY,
            spaceAfter=10,
        )
        section_style = ParagraphStyle(
            "AdvAuthorizationSection",
            fontName=_BOLD_NAME,
            fontSize=10.5,
            leading=15,
            alignment=TA_LEFT,
            spaceBefore=4,
            spaceAfter=8,
        )
        option_style = ParagraphStyle(
            "AdvAuthorizationOption",
            fontName=_REGULAR_NAME,
            fontSize=10.5,
            leading=16,
            alignment=TA_LEFT,
            leftIndent=18,
            spaceAfter=2,
        )
        sign_style = ParagraphStyle(
            "AdvAuthorizationSign",
            fontName=_REGULAR_NAME,
            fontSize=11,
            leading=18,
            alignment=TA_LEFT,
            spaceAfter=6,
        )

        full_name = f"{names.strip()} {lastname.strip()}".strip()
        issued = issued_on.strftime("%d/%m/%Y")
        city_label = city.strip() or "________________"
        identifier_label = identifier.strip()

        story = [
            Paragraph("AUTORIZACIÓN DE DÉBITO", title_style),
            Paragraph(f"Ciudad: {city_label}", meta_style),
            Paragraph(f"Fecha: {issued}", meta_style),
            Spacer(1, 10),
            Paragraph(
                f"Yo {full_name} con Cédula de identidad Número {identifier_label}.",
                body_style,
            ),
            Paragraph(
                "Señores Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador - COPSSTEC.",
                body_style,
            ),
            Paragraph(
                "Autorizo a ustedes a ordenar, en mi nombre, el débito de mi cuenta "
                "☐ Corriente &nbsp;&nbsp; ☐ Ahorros Número ________ que mantengo en "
                "(Entidad bancaria) ________, en adelante simplemente denominado “IFI”, "
                "por los conceptos y valores que se detallan a continuación:",
                body_style,
            ),
            Paragraph("CUOTAS Y/O APORTES VOLUNTARIOS DE MEMBRESÍA DE COPSSTEC", section_style),
            Paragraph(
                "Autorizo el débito correspondiente a mi cuota y/o aporte voluntario de "
                "membresía de COPSSTEC, seleccionando la modalidad de débito que corresponda: "
                "(Seleccione una sola modalidad):",
                body_style,
            ),
            Paragraph("Modalidad de débito:", section_style),
            Paragraph("☐ Mensual: $10,00", option_style),
            Paragraph("☐ Trimestral: $30,00", option_style),
            Paragraph("☐ Semestral: $60,00", option_style),
            Paragraph("☐ Anual: $120,00", option_style),
            Spacer(1, 8),
            Paragraph("MIEMBROS CON DEUDA PENDIENTE", section_style),
            Paragraph(
                "En caso de mantener obligaciones económicas pendientes con COPSSTEC, "
                "autorizo adicionalmente el débito de un valor destinado al abono de mi "
                "saldo pendiente, el cual se debitará conjuntamente con la cuota de "
                "membresía seleccionada:",
                body_style,
            ),
            Paragraph("☐ USD $20,00 adicionales por período de débito", option_style),
            Paragraph("☐ USD $30,00 adicionales por período de débito", option_style),
            Paragraph("☐ No mantengo deuda pendiente", option_style),
            Spacer(1, 8),
            Paragraph(
                "El valor autorizado será aplicado exclusivamente al pago o abono "
                "de obligaciones económicas pendientes con COPSSTEC y se debitará "
                "conjuntamente con la cuota de membresía seleccionada.",
                body_style,
            ),
            Paragraph(
                "Este valor será debitado y acreditado a la cuenta que el Colegio de "
                "Profesionales de Seguridad y Salud en el Trabajo del Ecuador - COPSSTEC designe.",
                body_style,
            ),
            Paragraph(
                "Me comprometo a mantener los fondos suficientes en mi cuenta referida, a fin "
                "de cubrir los valores cuyos débito autorizo a través de este instrumento.",
                body_style,
            ),
            Paragraph(
                "Cualquier instrucción para dejar sin efecto esta autorización de débito me "
                "obligo a presentarla al Colegio de Profesionales de Seguridad y Salud en el "
                "Trabajo del Ecuador - COPSSTEC con al menos 30 días calendario de anticipación, "
                "quien la tramitará ante la IFI siempre y cuando me encuentre al día en mis "
                "obligaciones para con Colegios de Profesionales de Seguridad y Salud en el "
                "Trabajo del Ecuador - COPSSTEC.",
                body_style,
            ),
            Paragraph(
                "Al igual autorizo a debitar de mi cuenta la comisión o costo que la IFI "
                "estipule en sus tarifarios vigentes por efecto de la prestación de servicio "
                "de intermediación de cobranza, así como también el valor resultante por "
                "cualquier modificación que a futuro se estableciere a dicho costo y que se "
                "incluya en el respectivo tarifario, valores que me obligo a pagar a la IFI y "
                "autorizo debitar de mi cuenta corriente o de ahorros antes referida, durante "
                "todo el tiempo que subsista la prestación del mencionado servicio.",
                body_style,
            ),
            Paragraph(
                "Eximo a la IFI de toda responsabilidad por los pagos que efectué al Colegios "
                "de Profesionales de Seguridad y Salud en el Trabajo del Ecuador - COPSSTEC "
                "en virtud de la presente Autorización de Débito, por lo que renuncio a "
                "presentar, por este concepto, cualquier acción legal, jurídica o extrajudicial "
                "en contra la Cooperativa Alianza del Valle.",
                body_style,
            ),
            Spacer(1, 24),
            Paragraph("Firma ________", sign_style),
            Paragraph(f"C.I. {identifier_label}", sign_style),
            Paragraph("Fecha: ________", sign_style),
        ]

        document.build(story)
        return buffer.getvalue()
