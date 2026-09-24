CEDULA_INVALID_MESSAGE = "La cédula debe tener exactamente 10 dígitos."


def normalize_cedula(value: str) -> str:
    return "".join(character for character in (value or "") if character.isdigit())


def is_valid_ecuadorian_cedula(value: str) -> bool:
    raw = (value or "").strip()
    return raw.isdigit() and len(raw) == 10
