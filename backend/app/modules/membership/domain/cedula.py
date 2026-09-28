CEDULA_INVALID_MESSAGE = "La cédula debe tener exactamente 10 dígitos."

# Solo profiles vigentes: cédula en dígitos, sin filas con deleted_at.
ACTIVE_PROFILE_CEDULA_SQL = """
    regexp_replace(COALESCE(identifier::text, ''), '[^0-9]', '', 'g') = :identifier
    AND :identifier <> ''
    AND deleted_at IS NULL
"""


def normalize_cedula(value: str) -> str:
    return "".join(character for character in (value or "") if character.isdigit())


def is_valid_ecuadorian_cedula(value: str) -> bool:
    raw = (value or "").strip()
    return raw.isdigit() and len(raw) == 10
