from datetime import date
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.fonts import addMapping
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

_FONTS_DIR = Path(__file__).resolve().parents[3] / "shared" / "assets" / "fonts"
_REGULAR_NAME = "AuthorizationSans"
_BOLD_NAME = "AuthorizationSans-Bold"
_SYMBOL_NAME = "AuthorizationSymbols"
_WINGDINGS_NAME = "AuthorizationWingdings"
_FONTS_REGISTERED = False
_HAS_WINGDINGS = False
_RED = colors.HexColor("#FF0000")
_BLACK = colors.HexColor("#000000")

# Word: 11900 x 16840 twips, 20 twips = 1 pt.
_PAGE = (11900 / 20.0, 16840 / 20.0)
_LEFT = 1008 / 20.0
_RIGHT = 720 / 20.0
_TOP = 1008 / 20.0
_BOTTOM = 1074 / 20.0
_SIZE = 11
_LEADING = 13
_TWIP = inch / 1440.0
_COLEGIO = "Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador - COPSSTEC"
_COLEGIOS = "Colegios de Profesionales de Seguridad y Salud en el Trabajo del Ecuador - COPSSTEC"


def _font_pairs() -> list[tuple[Path, Path]]:
    return [
        (
            Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
            Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
        ),
        (
            Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
            Path("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
        ),
        (_FONTS_DIR / "DejaVuSans.ttf", _FONTS_DIR / "DejaVuSans-Bold.ttf"),
        (
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        ),
    ]


def _register_fonts() -> None:
    global _FONTS_REGISTERED, _HAS_WINGDINGS
    if _FONTS_REGISTERED:
        return
    for regular, bold in _font_pairs():
        if regular.is_file() and bold.is_file():
            pdfmetrics.registerFont(TTFont(_REGULAR_NAME, str(regular)))
            pdfmetrics.registerFont(TTFont(_BOLD_NAME, str(bold)))
            addMapping(_REGULAR_NAME, 0, 0, _REGULAR_NAME)
            addMapping(_REGULAR_NAME, 1, 0, _BOLD_NAME)
            addMapping(_REGULAR_NAME, 0, 1, _REGULAR_NAME)
            addMapping(_REGULAR_NAME, 1, 1, _BOLD_NAME)
            break
    else:
        raise FileNotFoundError("No se encontró Arial, Liberation Sans ni DejaVu Sans.")

    symbols = _FONTS_DIR / "DejaVuSans.ttf"
    if not symbols.is_file():
        symbols = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    if symbols.is_file():
        pdfmetrics.registerFont(TTFont(_SYMBOL_NAME, str(symbols)))
        addMapping(_SYMBOL_NAME, 0, 0, _SYMBOL_NAME)
        addMapping(_SYMBOL_NAME, 1, 0, _SYMBOL_NAME)
        addMapping(_SYMBOL_NAME, 0, 1, _SYMBOL_NAME)
        addMapping(_SYMBOL_NAME, 1, 1, _SYMBOL_NAME)

    wingdings = Path("/System/Library/Fonts/Supplemental/Wingdings 2.ttf")
    if wingdings.is_file():
        pdfmetrics.registerFont(TTFont(_WINGDINGS_NAME, str(wingdings)))
        addMapping(_WINGDINGS_NAME, 0, 0, _WINGDINGS_NAME)
        addMapping(_WINGDINGS_NAME, 1, 0, _WINGDINGS_NAME)
        addMapping(_WINGDINGS_NAME, 0, 1, _WINGDINGS_NAME)
        addMapping(_WINGDINGS_NAME, 1, 1, _WINGDINGS_NAME)
        _HAS_WINGDINGS = True

    _FONTS_REGISTERED = True


def _esc(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_account_phrase(account_type: str, account_number: str, bank_name: str) -> str:
    account_kind = account_type.strip().lower()
    corriente = _checkbox(account_kind == "corriente")
    ahorros = _checkbox(account_kind == "ahorros")
    account_label = _esc((account_number or "").strip() or "____________________")
    bank_label = _esc((bank_name or "").strip() or "(Entidad bancaria)")
    return (
        "Autorizo a ustedes a ordenar, en mi nombre, el débito de mi cuenta "
        f"{corriente} Corriente &nbsp;&nbsp; {ahorros} Ahorros Numero <u>{account_label}</u> "
        f"que mantengo en <u>{bank_label}</u>, en adelante simplemente "
        "denominado “IFI”, por los conceptos y valores que se detallan a continuación:"
    )


def _checkbox(checked: bool = False) -> str:
    if checked:
        if _HAS_WINGDINGS:
            return f'<font name="{_WINGDINGS_NAME}">&#xf052;</font>'
        return f'<font name="{_SYMBOL_NAME}">☑</font>'
    if _HAS_WINGDINGS:
        return f'<font name="{_WINGDINGS_NAME}">&#xf0a3;</font>'
    return f'<font name="{_SYMBOL_NAME}">☐</font>'


def _style(
    name: str,
    *,
    size: float = _SIZE,
    leading: float = _LEADING,
    align=TA_JUSTIFY,
    color=_BLACK,
    left_indent: float = 0,
) -> ParagraphStyle:
    return ParagraphStyle(
        name,
        fontName=_REGULAR_NAME,
        fontSize=size,
        leading=leading,
        alignment=align,
        textColor=color,
        spaceAfter=0,
        spaceBefore=0,
        leftIndent=left_indent,
    )


class AuthorizationDebitPdfGenerator:
    def generate(
        self,
        *,
        names: str,
        lastname: str,
        identifier: str,
        city: str,
        issued_on: date,
        account_type: str = "",
        account_number: str = "",
        bank_name: str = "",
        debit_plan: str = "",
    ) -> bytes:
        _register_fonts()
        payload, pages = self._render(
            names=names,
            lastname=lastname,
            identifier=identifier,
            city=city,
            issued_on=issued_on,
            account_type=account_type,
            account_number=account_number,
            bank_name=bank_name,
            debit_plan=debit_plan,
            line_scale=1.0,
            signature_lines=5,
        )
        if pages == 1:
            return payload
        for signature_lines, line_scale in ((3, 1.0), (2, 0.92), (1, 0.88), (1, 0.82)):
            payload, pages = self._render(
                names=names,
                lastname=lastname,
                identifier=identifier,
                city=city,
                issued_on=issued_on,
                account_type=account_type,
                account_number=account_number,
                bank_name=bank_name,
                debit_plan=debit_plan,
                line_scale=line_scale,
                signature_lines=signature_lines,
            )
            if pages == 1:
                return payload
        return payload

    def _render(
        self,
        *,
        names: str,
        lastname: str,
        identifier: str,
        city: str,
        issued_on: date,
        account_type: str,
        account_number: str,
        bank_name: str,
        debit_plan: str,
        line_scale: float,
        signature_lines: int,
    ) -> tuple[bytes, int]:
        leading = _LEADING * line_scale
        line = Spacer(1, leading)
        indent = 80 * _TWIP

        title = _style("AuthTitle", leading=leading, align=TA_CENTER)
        body = _style("AuthBody", leading=leading)
        body_indent = _style("AuthBodyIndent", leading=leading, left_indent=indent)
        option = _style("AuthOption", leading=leading, align=TA_LEFT, left_indent=360 * _TWIP)
        red = _style("AuthRed", leading=leading, color=_RED)
        sign = _style("AuthSign", leading=leading, align=TA_LEFT, left_indent=indent)
        header = _style("AuthHeader", leading=leading, align=TA_LEFT)

        full_name = _esc(f"{names.strip()} {lastname.strip()}".strip())
        identifier_label = _esc(identifier.strip())
        city_label = _esc(city.strip())
        issued = issued_on.strftime("%d/%m/%Y")
        monthly = _checkbox(debit_plan == "monthly")
        quarterly = _checkbox(debit_plan == "quarterly")
        semiannual = _checkbox(debit_plan == "semiannual")
        annual = _checkbox(debit_plan == "annual")

        header_table = Table(
            [
                [
                    Paragraph(f"Ciudad: {city_label}", header),
                    Paragraph(f"Fecha: {issued}", header),
                ]
            ],
            colWidths=[4449 * _TWIP, 4449 * _TWIP],
        )
        header_table.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.5, _BLACK),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, _BLACK),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 70 * _TWIP),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 70 * _TWIP),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("LEFTPADDING", (0, 0), (0, 0), 70 * _TWIP),
                ]
            )
        )
        header_table.hAlign = "LEFT"
        header_table.leftPadding = 0
        # Word tblInd = 80 twips from the left margin.
        header_wrap = Table([[header_table]], colWidths=[(4449 + 4449) * _TWIP + indent])
        header_wrap.setStyle(
            TableStyle(
                [
                    ("LEFTPADDING", (0, 0), (-1, -1), indent),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ("TOPPADDING", (0, 0), (-1, -1), 0),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        header_wrap.hAlign = "LEFT"

        story = [
            Paragraph("<b><u>AUTORIZACIÓN DE DÉBITO</u></b>", title),
            line,
            header_wrap,
            line,
            Paragraph(
                f"Señores <b><u>{_COLEGIO}</u></b><b>.</b>",
                body_indent,
            ),
            line,
            Paragraph(
                f"Yo {full_name} con Cedula de identidad Numero {identifier_label}.",
                body_indent,
            ),
            line,
            Paragraph(
                build_account_phrase(account_type, account_number, bank_name),
                body,
            ),
            line,
            Paragraph(
                "<b>CUOTAS Y/O APORTES VOLUNTARIOS DE MEMBRESÍA DE COPSSTEC</b> "
                "Autorizo el débito correspondiente a mi cuota y/o aporte voluntario de membresía de "
                "COPSSTEC, seleccionando la modalidad de débito que corresponda: "
                "<b>(Seleccione una sola modalidad):</b>",
                body,
            ),
            Paragraph(f"{monthly} <b>Mensual:</b> $10,00", option),
            Paragraph(f"{quarterly} <b>Trimestral:</b> $30,00", option),
            Paragraph(f"{semiannual} <b>Semestral:</b> $60,00", option),
            Paragraph(f"{annual} <b>Anual:</b> $120,00", option),
            Paragraph(
                "<b>El valor autorizado será aplicado exclusivamente "
                "al pago o abono de obligaciones económicas pendientes con </b>COPSSTEC"
                "<b> y se debitará conjuntamente con la cuota de membresía "
                "seleccionada.</b>",
                body,
            ),
            Paragraph(
                f"Este valor será debitado y acreditado a la cuenta que el "
                f"<b>{_COLEGIO}</b> designe.",
                body,
            ),
            line,
            Paragraph(
                "Me comprometo a mantener los fondos suficientes en mi cuenta referida, a fin "
                "de cubrir los valores cuyos debito autorizo a través de este instrumento.",
                body,
            ),
            line,
            Paragraph(
                f"Cualquier instrucción para dejar sin efecto esta autorización de débito me "
                f"obligo a presentarla al <b>{_COLEGIO}</b> con al menos "
                "30 días calendario de anticipación, quien la tramitará ante la IFI siempre y "
                f"cuando me encuentre al día en mis obligaciones para con "
                f"<b>{_COLEGIOS}</b>.",
                body,
            ),
            line,
            Paragraph(
                "Al igual autorizo a debitar de mi cuenta la comisión o costo que la IFI "
                "estipule en sus tarifarios vigentes por efecto de la prestación de servicio "
                "de intermediación de cobranza, así como también el valor resultante por "
                "cualquier modificación que a futuro se estableciere a dicho costo y que se "
                "incluya en el respectivo tarifario, valores que me obligo a pagar a la IFI "
                "y autorizo debitar de mi cuenta corriente o de ahorros antes referida, "
                "durante todo el tiempo que subsista la prestación del mencionado servicio.",
                red,
            ),
            line,
            Paragraph(
                "Eximo a la IFI de toda responsabilidad por los pagos que efectué al "
                f"<b><font color='#EE0000'>{_COLEGIOS}</font></b> "
                "en virtud de la presente Autorización de Débito, por lo que renuncio a "
                "presentar, por este concepto, cualquier acción legal, jurídica o "
                "extrajudicial en contra la Cooperativa Alianza del Valle.",
                red,
            ),
        ]
        story.extend([line] * signature_lines)
        story.extend(
            [
                Paragraph("______________________________________________", sign),
                Paragraph("Firma", sign),
                Paragraph(f"C.I. {identifier_label} _________________________________", sign),
                Paragraph("Fecha:", sign),
            ]
        )

        buffer = BytesIO()
        document = SimpleDocTemplate(
            buffer,
            pagesize=_PAGE,
            leftMargin=_LEFT,
            rightMargin=_RIGHT,
            topMargin=_TOP,
            bottomMargin=_BOTTOM,
            title="AUTORIZACIÓN DE DÉBITO",
            author="COPSSTEC",
        )
        pages = {"count": 0}

        def _track(canvas, _doc) -> None:
            pages["count"] = max(pages["count"], canvas.getPageNumber())

        document.build(story, onFirstPage=_track, onLaterPages=_track)
        return buffer.getvalue(), pages["count"]
