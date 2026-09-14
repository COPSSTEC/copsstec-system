def _pdf_escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
        .encode("latin-1", "replace")
        .decode("latin-1")
    )


class MembershipInvoicePdfGenerator:
    def generate(self, *, number: str, member_name: str, identifier: str, amount: str) -> bytes:
        lines = [
            "FACTURA DE AFILIACION COPSSTEC",
            f"Numero: {number}",
            f"Miembro: {member_name}",
            f"Cedula: {identifier}",
            f"Valor: USD {amount}",
            "Concepto: Afiliacion de miembro COPSSTEC",
        ]
        commands = ["BT /F1 14 Tf 72 720 Td"]
        for index, line in enumerate(lines):
            prefix = "" if index == 0 else "0 -22 Td "
            commands.append(f"{prefix}({_pdf_escape(line)}) Tj")
        commands.append("ET")
        stream = " ".join(commands)

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
