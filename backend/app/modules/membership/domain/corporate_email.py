import re
import unicodedata

from app.modules.membership.domain.entities import CORPORATE_EMAIL_DOMAIN


def _slug_token(value: str) -> str:
    normalized = unicodedata.normalize("NFD", (value or "").strip().lower())
    without_marks = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    without_marks = without_marks.replace("ñ", "n").replace("ü", "u")
    first_token = without_marks.split()[0] if without_marks.split() else ""
    return re.sub(r"[^a-z]", "", first_token)


def suggest_corporate_email(names: str, lastname: str, domain: str = CORPORATE_EMAIL_DOMAIN) -> str:
    first = _slug_token(names)
    last = _slug_token(lastname)
    if not first or not last:
        raise ValueError("No se pudo generar el correo corporativo con el nombre y apellido.")
    return f"{first}.{last}@{domain.lower()}"


def is_corporate_email(email: str, domain: str = CORPORATE_EMAIL_DOMAIN) -> bool:
    return (email or "").strip().lower().endswith(f"@{domain.lower()}")
