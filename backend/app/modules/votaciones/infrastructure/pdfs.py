from app.modules.votaciones.domain.entities import Election, ElectionReport


def _latin(text: str) -> str:
    cleaned = (
        (text or "")
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
        .replace("Á", "A")
        .replace("É", "E")
        .replace("Í", "I")
        .replace("Ó", "O")
        .replace("Ú", "U")
        .replace("ñ", "n")
        .replace("Ñ", "N")
        .replace("ü", "u")
    )
    return "".join(ch if 32 <= ord(ch) < 127 else " " for ch in cleaned)


def _escape(text: str) -> str:
    return _latin(text).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def build_text_pdf(title: str, lines: list[str]) -> bytes:
    commands = ["BT", "/F1 16 Tf", "50 750 Td", f"({_escape(title)}) Tj", "/F1 11 Tf"]
    for line in lines:
        commands.append("0 -16 Td")
        commands.append(f"({_escape(line)}) Tj")
    commands.append("ET")
    stream = "\n".join(commands)
    objects = [
        "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
        "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
        (
            "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj"
        ),
        "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
        f"5 0 obj << /Length {len(stream)} >> stream\n{stream}\nendstream endobj",
    ]
    content = "%PDF-1.4\n"
    offsets = [0]
    for obj in objects:
        offsets.append(len(content.encode("latin-1")))
        content += obj + "\n"
    xref_start = len(content.encode("latin-1"))
    content += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    for offset in offsets[1:]:
        content += f"{offset:010d} 00000 n \n"
    content += (
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_start}\n%%EOF\n"
    )
    return content.encode("latin-1")


class ElectionPdfRenderer:
    def calendar_pdf(self, election: Election) -> bytes:
        lines = [
            f"Estado: {election.status}",
            f"Periodo de votacion: {_fmt(election.voting_starts_on)} - {_fmt(election.voting_ends_on)}",
            f"Periodo de gestion: {_fmt(election.term_starts_on)} - {_fmt(election.term_ends_on)}",
            "",
            "Cronograma",
        ]
        for event in election.calendar:
            span = _fmt(event.starts_on)
            if event.ends_on and event.ends_on != event.starts_on:
                span = f"{span} - {_fmt(event.ends_on)}"
            lines.append(f"{event.sort_order}. {event.title}: {span}")
        return build_text_pdf(f"Cronograma - {election.title}", lines)

    def report_pdf(self, report: ElectionReport) -> bytes:
        lines = [
            f"Periodo #{report.election_id} - {report.status}",
            f"Habilitados: {report.eligible}",
            f"Votos emitidos: {report.votes_cast}",
            f"Participacion: {report.participation:.1f}%",
            f"Votos en blanco: {report.blank_votes}",
            f"Listas: {report.lists_count}",
            "",
            "Resultados",
        ]
        for row in report.rows:
            lines.append(
                f"{row.name} | {row.principal_name} | {row.votes} | {row.percentage:.1f}% | {row.result_status}"
            )
        return build_text_pdf(f"Reporte de votacion - {report.title}", lines)

    def acta_pdf(self, report: ElectionReport) -> bytes:
        lines = [
            "Acta oficial de escrutinio",
            f"Periodo #{report.election_id}",
            f"Estado: {report.status}",
            "",
            f"Padron habilitado: {report.eligible}",
            f"Sufragios: {report.votes_cast}",
            f"Participacion: {report.participation:.1f}%",
            "",
        ]
        for row in report.rows:
            lines.append(f"{row.result_status}: {row.name} - {row.votes} votos ({row.percentage:.1f}%)")
        lines.append("")
        lines.append("Documento generado automaticamente por COPSSTEC.")
        return build_text_pdf(f"Acta electoral - {report.title}", lines)


def _fmt(value) -> str:
    return value.strftime("%d/%m/%Y") if value else "-"
