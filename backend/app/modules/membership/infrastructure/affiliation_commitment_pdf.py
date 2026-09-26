from __future__ import annotations

import calendar
import hashlib
import io
from datetime import date, datetime
from xml.sax.saxutils import escape

import qrcode

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.modules.members.domain.entities import Member
from app.modules.members.infrastructure.pdfs import _draw_solicitud_letterhead, member_code
from app.modules.membership.domain.entities import DEBIT_PLAN_OPTIONS

DOCUMENT_VERSION = "R-DIR-COPSSTEC-2026-003"
NAVY = HexColor("#1e3a8a")
LINE = HexColor("#94a3b8")


def _esc(value: str | None) -> str:
    return escape((value or "").strip())


def parse_register_date(value: str | None, fallback: date) -> date:
    raw = (value or "").strip().replace("-", "/")
    parts = [part for part in raw.split("/") if part]
    if len(parts) != 3:
        return fallback
    try:
        if len(parts[0]) == 4:
            return date(int(parts[0]), int(parts[1]), int(parts[2]))
        return date(int(parts[2]), int(parts[1]), int(parts[0]))
    except ValueError:
        return fallback


def add_months(value: date, months: int) -> date:
    month_index = value.month - 1 + months
    year = value.year + month_index // 12
    month = month_index % 12 + 1
    day = min(value.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def format_date(value: date) -> str:
    return value.strftime("%d/%m/%Y")


def debit_plan_label(plan: str | None) -> str:
    for key, label, amount in DEBIT_PLAN_OPTIONS:
        if key == (plan or "").strip():
            return f"{label.upper()} {amount}"
    return "MENSUAL $10,00"


def build_document_code(member: Member, issued_at: datetime) -> str:
    return f"COPS-AFI-{issued_at.year}-{member.user_id:05d}"


def build_integrity_hash(
    *,
    member: Member,
    document_code: str,
    start: date,
    end: date,
    debit_plan: str,
    issued_at: datetime,
) -> str:
    payload = "|".join(
        [
            document_code,
            str(member.user_id),
            (member.identifier or "").strip(),
            start.isoformat(),
            end.isoformat(),
            (debit_plan or "").strip(),
            issued_at.isoformat(timespec="seconds"),
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class AffiliationCommitmentPdfGenerator:
    def generate(
        self,
        member: Member,
        *,
        debit_plan: str = "",
        issued_at: datetime | None = None,
    ) -> bytes:
        now = issued_at or datetime.now()
        start = parse_register_date(member.date_register, now.date())
        end = add_months(start, 12)
        full_name = f"{(member.names or '').strip()} {(member.lastname or '').strip()}".strip()
        document_code = build_document_code(member, now)
        digest = build_integrity_hash(
            member=member,
            document_code=document_code,
            start=start,
            end=end,
            debit_plan=debit_plan,
            issued_at=now,
        )
        plan_label = debit_plan_label(debit_plan)
        member_number = member_code(member)

        title = ParagraphStyle(
            "CommitmentTitle",
            fontName="Times-Bold",
            fontSize=14,
            leading=18,
            alignment=TA_CENTER,
            textColor=NAVY,
            spaceAfter=4,
        )
        subtitle = ParagraphStyle(
            "CommitmentSubtitle",
            fontName="Times-Italic",
            fontSize=9,
            leading=12,
            alignment=TA_CENTER,
            textColor=HexColor("#475569"),
            spaceAfter=12,
        )
        section = ParagraphStyle(
            "CommitmentSection",
            fontName="Times-Bold",
            fontSize=11,
            leading=14,
            textColor=NAVY,
            spaceBefore=10,
            spaceAfter=6,
        )
        body = ParagraphStyle(
            "CommitmentBody",
            fontName="Times-Roman",
            fontSize=10,
            leading=13.5,
            alignment=TA_JUSTIFY,
            spaceAfter=6,
        )
        label = ParagraphStyle(
            "CommitmentLabel",
            fontName="Times-Bold",
            fontSize=9,
            leading=12,
            textColor=NAVY,
        )
        value = ParagraphStyle(
            "CommitmentValue",
            fontName="Times-Roman",
            fontSize=9,
            leading=12,
        )
        meta = ParagraphStyle(
            "CommitmentMeta",
            fontName="Times-Roman",
            fontSize=8.5,
            leading=11,
            alignment=TA_LEFT,
        )
        sign = ParagraphStyle(
            "CommitmentSign",
            fontName="Times-Bold",
            fontSize=9,
            leading=12,
            alignment=TA_CENTER,
            textColor=NAVY,
        )

        rows = [
            ("Nombres y apellidos", full_name),
            ("Cédula / Pasaporte", member.identifier),
            ("Correo electrónico", member.email),
            ("Teléfono", member.mobile_phone or member.fixed_phone),
            ("Número de socio", member_number),
            ("Fecha efectiva de afiliación", format_date(start)),
            ("Fecha de cumplimiento de 12 meses", format_date(end)),
            ("Modalidad de aportación", plan_label),
        ]
        data_table = Table(
            [
                [Paragraph(_esc(field), label), Paragraph(_esc(content), value)]
                for field, content in rows
            ],
            colWidths=[7.2 * cm, 10.2 * cm],
        )
        data_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("LINEBELOW", (0, 0), (-1, -2), 0.3, LINE),
                    ("BACKGROUND", (0, 0), (-1, -1), HexColor("#f8fafc")),
                ]
            )
        )

        qr_box = qrcode.QRCode(border=1, box_size=4)
        qr_box.add_data(f"{document_code}|{digest}")
        qr_box.make(fit=True)
        qr_buffer = io.BytesIO()
        qr_box.make_image(fill_color="black", back_color="white").convert("RGB").save(qr_buffer, format="PNG")
        qr_buffer.seek(0)
        qr = Image(qr_buffer, width=2.2 * cm, height=2.2 * cm)
        constancy = Table(
            [
                [
                    Paragraph(f"<b>Código de documento</b><br/>{_esc(document_code)}", meta),
                    Paragraph(
                        f"<b>Fecha y hora de emisión</b><br/>{_esc(now.strftime('%d/%m/%Y - %H:%M:%S'))}",
                        meta,
                    ),
                ],
                [
                    Paragraph(f"<b>Versión del documento</b><br/>{_esc(DOCUMENT_VERSION)}", meta),
                    Paragraph(f"<b>Número de socio</b><br/>{_esc(member_number)}", meta),
                ],
                [
                    Paragraph(
                        f"<b>Hash de integridad</b><br/>SHA-256: {_esc(digest)}",
                        meta,
                    ),
                    Paragraph("<b>Estado</b><br/>DOCUMENTO EMITIDO POR EL SISTEMA DE AFILIACIÓN COPSSTEC", meta),
                ],
            ],
            colWidths=[11.2 * cm, 6.2 * cm],
        )
        constancy.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 3),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 3),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("BOX", (0, 0), (-1, -1), 0.4, LINE),
                    ("INNERGRID", (0, 0), (-1, -1), 0.3, LINE),
                ]
            )
        )

        signatures = Table(
            [
                [
                    Paragraph("SOCIO / SOLICITANTE", sign),
                    Paragraph("SISTEMA DE AFILIACIÓN COPSSTEC", sign),
                ],
                [
                    Paragraph(_esc(full_name), meta),
                    Paragraph("Aceptación electrónica registrada", meta),
                ],
                [
                    Paragraph("Documento generado automáticamente", meta),
                    Paragraph("Hash y código de verificación", meta),
                ],
            ],
            colWidths=[8.7 * cm, 8.7 * cm],
        )
        signatures.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )

        story = [
            Paragraph("COMPROMISO DE AFILIACIÓN, PERMANENCIA Y CUMPLIMIENTO DE OBLIGACIONES", title),
            Paragraph(
                "Documento electrónico individual generado por el Sistema de Afiliación COPSSTEC",
                subtitle,
            ),
            Paragraph("1. DATOS DEL SOCIO", section),
            data_table,
            Paragraph("2. DECLARACIÓN DE AFILIACIÓN VOLUNTARIA", section),
            Paragraph(
                f"Yo, <b>{_esc(full_name)}</b>, declaro que he solicitado voluntariamente mi ingreso "
                "al Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador - COPSSTEC. "
                "Declaro conocer y aceptar el Estatuto, la Resolución de Directorio N.° "
                f"{DOCUMENT_VERSION} vigente y las condiciones contenidas en este documento.",
                body,
            ),
            Paragraph("3. COMPROMISO MÍNIMO ANUAL", section),
            Paragraph(
                f"De conformidad con la Resolución de Directorio N.° {DOCUMENT_VERSION}, acepto un "
                "compromiso mínimo institucional de doce (12) meses contado desde la fecha efectiva "
                "de mi afiliación. Durante dicho período me comprometo a cumplir oportunamente las "
                "obligaciones económicas correspondientes mientras mantenga la calidad de miembro "
                "activo y a conservar habilitado el mecanismo de pago registrado.",
                body,
            ),
            Paragraph(
                f"<b>Período de compromiso:</b> {format_date(start)} a {format_date(end)}",
                body,
            ),
            Paragraph("4. APORTES Y MODALIDAD DE PAGO", section),
            Paragraph(
                "Conozco que las modalidades vigentes de aportación son: mensual USD 10,00; "
                "trimestral USD 30,00; semestral USD 60,00; y anual USD 120,00. La modalidad "
                "seleccionada no modifica la duración del compromiso anual. Autorizo el registro "
                "y mantenimiento del mecanismo de cobro mediante débito bancario o autorización "
                "equivalente conforme a la normativa institucional vigente.",
                body,
            ),
            Paragraph("5. BENEFICIOS INSTITUCIONALES", section),
            Paragraph(
                "Conozco que, como socio activo, puedo acceder a beneficios institucionales y "
                "valores preferenciales en cursos, seminarios, congresos, certificaciones, "
                "convenios u otros servicios que el COPSSTEC determine. Entiendo que los "
                "beneficios económicos recibidos durante los primeros doce (12) meses se conceden "
                "considerando el compromiso anual asumido.",
                body,
            ),
            Paragraph("6. RETIRO VOLUNTARIO ANTES DE LOS DOCE MESES", section),
            Paragraph(
                "Conservo el derecho de presentar mi renuncia voluntaria en cualquier momento, "
                "conforme al Estatuto. Si solicito el retiro antes de completar el período inicial "
                "de doce (12) meses, el COPSSTEC no impedirá el trámite únicamente por el tiempo "
                "transcurrido. Para la emisión del Paz y Salvo, Tesorería verificará las "
                "obligaciones económicas devengadas hasta la fecha efectiva de retiro.",
                body,
            ),
            Paragraph(
                "Si durante ese período hubiera utilizado beneficios económicos exclusivos o "
                "tarifas preferenciales, acepto que el COPSSTEC pueda reliquidar únicamente la "
                "diferencia efectivamente obtenida entre la tarifa de socio y la tarifa general "
                "que habría correspondido a cada beneficio utilizado, sin multas, intereses "
                "punitivos ni penalidades adicionales. La reliquidación deberá ser detallada y "
                "verificable.",
                body,
            ),
            Paragraph("7. RETIRO VOLUNTARIO Y PAZ Y SALVO", section),
            Paragraph(
                "Para formalizar mi retiro presentaré una solicitud escrita dirigida a la "
                "Presidencia del Directorio. Una vez verificadas y, de ser el caso, regularizadas "
                "las obligaciones económicas y la reliquidación aplicable, Tesorería emitirá el "
                "Certificado de Paz y Salvo Económico y se procederá con el registro institucional "
                "de mi desvinculación.",
                body,
            ),
            Paragraph("8. ACEPTACIÓN ELECTRÓNICA", section),
            Paragraph(
                "Declaro haber leído y comprendido este documento. La selección de la casilla de "
                "aceptación y el envío de los documentos de afiliación constituyen constancia "
                "electrónica de mi manifestación de voluntad y de la aceptación de las "
                "condiciones aquí descritas.",
                body,
            ),
            Paragraph(
                "☑ HE LEÍDO Y ACEPTO EL COMPROMISO DE AFILIACIÓN, EL COMPROMISO MÍNIMO ANUAL "
                "Y LAS CONDICIONES DE RETIRO Y USO DE BENEFICIOS.",
                body,
            ),
            Paragraph("9. CONSTANCIA ELECTRÓNICA DE EMISIÓN", section),
            constancy,
            Spacer(1, 8),
        ]
        qr_table = Table([[qr]], colWidths=[2.4 * cm])
        qr_table.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "LEFT")]))
        story.extend(
            [
                qr_table,
                Paragraph("Código QR de verificación", meta),
                Paragraph("10. BASE INSTITUCIONAL", section),
                Paragraph(
                    "Estatuto del COPSSTEC y Resolución de Directorio N.° "
                    f"{DOCUMENT_VERSION} vigente, en su versión aprobada y suscrita por el Directorio.",
                    body,
                ),
                Spacer(1, 16),
                signatures,
            ]
        )

        buffer = io.BytesIO()
        document = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=48,
            rightMargin=48,
            topMargin=108,
            bottomMargin=48,
            title="COMPROMISO DE AFILIACIÓN COPSSTEC",
            author="COPSSTEC",
        )
        document.build(story, onFirstPage=_draw_solicitud_letterhead, onLaterPages=_draw_solicitud_letterhead)
        return buffer.getvalue()
