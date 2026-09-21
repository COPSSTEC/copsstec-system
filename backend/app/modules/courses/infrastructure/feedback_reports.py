from __future__ import annotations

import csv
import io
import math
import zlib
from typing import Any

SCORE_LABELS = {
    1: "Muy mala",
    2: "Mala",
    3: "Regular",
    4: "Buena",
    5: "Excelente",
}

SCORE_COLORS = (
    (185, 28, 28),
    (194, 65, 12),
    (217, 119, 6),
    (4, 120, 87),
    (29, 78, 216),
)

DIMENSIONS = (
    ("rating", "Calificacion general"),
    ("content_rating", "Contenido"),
    ("instructor_rating", "Capacitador"),
    ("platform_rating", "Logistica o plataforma"),
)

WHITE = (255, 255, 255)
SLATE = (226, 232, 240)
INK = (23, 32, 51)
MUTED = (100, 116, 139)
PRIMARY = (29, 78, 216)
SUCCESS = (4, 120, 87)
WARNING = (217, 119, 6)
DANGER = (185, 28, 28)


def _avg_text(value: float | None) -> str:
    return f"{value:.2f}" if value is not None else "Sin datos"


def _tone(percent: float) -> tuple[int, int, int]:
    if percent >= 70:
        return SUCCESS
    if percent >= 40:
        return WARNING
    if percent > 0:
        return DANGER
    return PRIMARY


def _distribution(stats: dict[str, Any], key: str) -> list[int]:
    buckets = stats["distributions"][key]
    return [int(buckets.get(score, buckets.get(str(score), 0))) for score in range(1, 6)]


def build_feedback_report_csv(stats: dict[str, Any]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Curso", stats["course_title"]])
    writer.writerow(["Respuestas", stats["responses"]])
    writer.writerow(["Encuestas enviadas", stats["surveys_sent"]])
    writer.writerow(["Asistentes", stats["attendees"]])
    writer.writerow(["Tasa de respuesta (%)", stats["response_rate"]])
    writer.writerow(["Satisfaccion (calificaciones 4-5, %)", stats["satisfaction_rate"]])
    writer.writerow([])
    writer.writerow(["Dimension", "Promedio"])
    averages = stats["averages"]
    for key, label in DIMENSIONS:
        writer.writerow([label, _avg_text(averages.get(key))])
    writer.writerow([])
    writer.writerow(["Dimension", "Nivel", "Etiqueta", "Cantidad"])
    for key, label in DIMENSIONS:
        for score in range(1, 6):
            writer.writerow(
                [
                    label,
                    score,
                    SCORE_LABELS[score],
                    stats["distributions"][key].get(score, 0),
                ],
            )
    writer.writerow([])
    writer.writerow(["Comentarios anonimos"])
    if stats["comments"]:
        for comment in stats["comments"]:
            writer.writerow([comment])
    else:
        writer.writerow(["Sin comentarios"])
    return buffer.getvalue().encode("utf-8-sig")


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


class _Canvas:
    def __init__(self, width: int, height: int, color: tuple[int, int, int] = WHITE) -> None:
        self.width = width
        self.height = height
        self.pixels = bytearray(width * height * 3)
        self.fill((0, 0, width, height), color)

    def _set(self, x: int, y: int, color: tuple[int, int, int]) -> None:
        if x < 0 or y < 0 or x >= self.width or y >= self.height:
            return
        index = (y * self.width + x) * 3
        self.pixels[index : index + 3] = bytes(color)

    def fill(self, box: tuple[int, int, int, int], color: tuple[int, int, int]) -> None:
        x0, y0, x1, y1 = box
        for y in range(max(0, y0), min(self.height, y1)):
            row = (y * self.width + max(0, x0)) * 3
            span = max(0, min(self.width, x1) - max(0, x0))
            self.pixels[row : row + span * 3] = bytes(color) * span

    def rounded_bar(self, x: int, y: int, width: int, height: int, color: tuple[int, int, int]) -> None:
        if width <= 0 or height <= 0:
            return
        radius = min(8, width // 2, height // 2)
        self.fill((x, y + radius, x + width, y + height - radius), color)
        self.fill((x + radius, y, x + width - radius, y + height), color)
        for dy in range(radius):
            for dx in range(radius):
                if dx * dx + dy * dy <= radius * radius:
                    self._set(x + radius - 1 - dx, y + radius - 1 - dy, color)
                    self._set(x + width - radius + dx, y + radius - 1 - dy, color)
                    self._set(x + radius - 1 - dx, y + height - radius + dy, color)
                    self._set(x + width - radius + dx, y + height - radius + dy, color)

    def donut(
        self,
        cx: int,
        cy: int,
        outer: int,
        inner: int,
        percent: float,
        color: tuple[int, int, int],
    ) -> None:
        limit = max(0.0, min(percent, 100.0)) * 3.6
        outer_sq = outer * outer
        inner_sq = inner * inner
        for y in range(cy - outer, cy + outer + 1):
            for x in range(cx - outer, cx + outer + 1):
                dx = x - cx
                dy = y - cy
                dist_sq = dx * dx + dy * dy
                if dist_sq > outer_sq or dist_sq < inner_sq:
                    continue
                angle = (math.degrees(math.atan2(dx, -dy)) + 360.0) % 360.0
                self._set(x, y, color if angle <= limit else SLATE)


def _draw_donuts(stats: dict[str, Any]) -> _Canvas:
    canvas = _Canvas(1040, 280)
    average = stats["averages"]["rating"]
    items = [
        (float(stats["response_rate"]), _tone(float(stats["response_rate"]))),
        (float(stats["response_rate"]), _tone(float(stats["response_rate"]))),
        (float(stats["satisfaction_rate"]), _tone(float(stats["satisfaction_rate"]))),
        ((float(average) / 5.0) * 100.0 if average is not None else 0.0, PRIMARY),
    ]
    for index, (percent, color) in enumerate(items):
        cx = 130 + index * 260
        canvas.donut(cx, 140, 88, 52, percent, color)
    return canvas


def _draw_bars(stats: dict[str, Any]) -> _Canvas:
    canvas = _Canvas(1040, 720, WHITE)
    for index, (key, _label) in enumerate(DIMENSIONS):
        col = index % 2
        row = index // 2
        left = 30 + col * 520
        top = 20 + row * 350
        canvas.fill((left, top, left + 490, top + 330), (247, 248, 251))
        counts = _distribution(stats, key)
        peak = max(counts + [1])
        plot_left = left + 40
        plot_bottom = top + 290
        plot_height = 210
        for tick in range(5):
            y = plot_bottom - int((tick / 4) * plot_height)
            canvas.fill((plot_left, y, left + 460, y + 1), SLATE)
        for score, count in enumerate(counts):
            if count <= 0:
                continue
            height = max(8, int((count / peak) * plot_height))
            x = plot_left + 30 + score * 80
            canvas.rounded_bar(x, plot_bottom - height, 42, height, SCORE_COLORS[score])
    return canvas


def build_feedback_report_pdf(stats: dict[str, Any]) -> bytes:
    donuts = _draw_donuts(stats)
    bars = _draw_bars(stats)
    averages = stats["averages"]
    page_one = [
        "BT",
        "/F1 18 Tf",
        "42 750 Td",
        f"({_escape('Satisfaccion del curso')}) Tj",
        "/F1 11 Tf",
        "0 -18 Td",
        f"({_escape(str(stats['course_title']))}) Tj",
        "0 -16 Td",
        "(Resultados agregados. No identifica a quienes calificaron.) Tj",
        "0 -22 Td",
        (
            f"(Respuestas: {stats['responses']}   Enviadas: {stats['surveys_sent']}   "
            f"Asistentes: {stats['attendees']}   Tasa: {stats['response_rate']}%   "
            f"Satisfaccion 4-5: {stats['satisfaction_rate']}%) Tj"
        ),
        "0 -18 Td",
        "(Donas: respuestas, tasa, satisfaccion y promedio general.) Tj",
        "ET",
        "q",
        "42 430 528 200 cm",
        "/Im1 Do",
        "Q",
        "BT",
        "/F1 8 Tf",
        "58 422 Td",
        "(Respuestas) Tj",
        "130 0 Td",
        "(Tasa) Tj",
        "130 0 Td",
        "(Satisfaccion) Tj",
        "130 0 Td",
        "(Promedio) Tj",
        "ET",
        "BT",
        "/F1 10 Tf",
        "42 412 Td",
        "(Barras: cantidad de calificaciones por nivel, de 1 Muy mala a 5 Excelente.) Tj",
        "ET",
        "q",
        "42 36 528 360 cm",
        "/Im2 Do",
        "Q",
        "BT",
        "/F1 9 Tf",
        "52 378 Td",
        "(Calificacion general) Tj",
        "260 0 Td",
        "(Contenido) Tj",
        "-260 -178 Td",
        "(Capacitador) Tj",
        "260 0 Td",
        "(Logistica o plataforma) Tj",
        "ET",
    ]
    comment_lines = stats["comments"][:8] if stats["comments"] else ["Sin comentarios"]
    page_two = [
        "BT",
        "/F1 16 Tf",
        "42 750 Td",
        "(Promedios y comentarios anonimos) Tj",
        "/F1 11 Tf",
    ]
    for key, label in DIMENSIONS:
        page_two.extend(["0 -18 Td", f"({_escape(f'{label}: {_avg_text(averages.get(key))} / 5')}) Tj"])
    page_two.extend(["0 -24 Td", "(Comentarios anonimos) Tj"])
    for comment in comment_lines:
        page_two.extend(["0 -16 Td", f"({_escape(f'- {comment}')}) Tj"])
    page_two.append("ET")

    return _build_image_pdf(
        [
            (" ".join(page_one), [donuts, bars]),
            (" ".join(page_two), []),
        ],
    )


def _pdf_object(object_id: int, body: bytes) -> bytes:
    return f"{object_id} 0 obj\n".encode("latin-1") + body + b"\nendobj\n"


def _build_image_pdf(pages: list[tuple[str, list[_Canvas]]]) -> bytes:
    by_id: dict[int, bytes] = {
        1: _pdf_object(1, b"<< /Type /Catalog /Pages 2 0 R >>"),
        3: _pdf_object(3, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
    }
    page_ids: list[int] = []
    next_id = 4

    for content, images in pages:
        xobjects: list[str] = []
        for index, image in enumerate(images, start=1):
            image_id = next_id
            next_id += 1
            xobjects.append(f"/Im{index} {image_id} 0 R")
            stream = zlib.compress(bytes(image.pixels), 9)
            header = (
                f"<< /Type /XObject /Subtype /Image /Width {image.width} "
                f"/Height {image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 "
                f"/Filter /FlateDecode /Length {len(stream)} >> stream\n"
            ).encode("latin-1")
            by_id[image_id] = (
                f"{image_id} 0 obj\n".encode("latin-1") + header + stream + b"\nendstream\nendobj\n"
            )

        content_id = next_id
        page_id = next_id + 1
        next_id += 2
        page_ids.append(page_id)
        resources = "/Font << /F1 3 0 R >>"
        if xobjects:
            resources += f" /XObject << {' '.join(xobjects)} >>"
        content_bytes = content.encode("latin-1")
        by_id[content_id] = (
            f"{content_id} 0 obj << /Length {len(content_bytes)} >> stream\n".encode("latin-1")
            + content_bytes
            + b"\nendstream endobj\n"
        )
        by_id[page_id] = _pdf_object(
            page_id,
            (
                f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
                f"/Resources << {resources} >> /Contents {content_id} 0 R >>"
            ).encode("latin-1"),
        )

    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    by_id[2] = _pdf_object(
        2,
        f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode("latin-1"),
    )

    content = b"%PDF-1.4\n"
    offsets = [0]
    for object_id in range(1, next_id):
        offsets.append(len(content))
        content += by_id[object_id]
    xref_start = len(content)
    content += f"xref\n0 {next_id}\n0000000000 65535 f \n".encode("latin-1")
    for offset in offsets[1:]:
        content += f"{offset:010d} 00000 n \n".encode("latin-1")
    content += (
        f"trailer << /Size {next_id} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n"
    ).encode("latin-1")
    return content
