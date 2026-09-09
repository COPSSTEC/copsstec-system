class BlankMemberPdfGenerator:
    def generate(self, title: str) -> bytes:
        stream = "BT /F1 12 Tf 72 720 Td () Tj ET"
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
        _ = title
        return content.encode("latin-1")
