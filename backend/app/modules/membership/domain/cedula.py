CEDULA_INVALID_MESSAGE = "La cédula debe tener exactamente 10 dígitos."

# Solo profiles vigentes: cédula en dígitos, sin filas con deleted_at.
ACTIVE_PROFILE_CEDULA_SQL = """
    regexp_replace(COALESCE(identifier::text, ''), '[^0-9]', '', 'g') = :identifier
    AND :identifier <> ''
    AND deleted_at IS NULL
"""

# Libera la cédula de un profile eliminado para que el unique legado no bloquee el alta.
RELEASE_DELETED_PROFILE_CEDULA_SQL = """
    UPDATE profiles
    SET identifier = left(
            regexp_replace(COALESCE(identifier::text, ''), '[^0-9]', '', 'g')
            || '-del-'
            || id::text,
            255
        ),
        updated_at = :now
    WHERE deleted_at IS NOT NULL
      AND regexp_replace(COALESCE(identifier::text, ''), '[^0-9]', '', 'g') = :identifier
"""


def normalize_cedula(value: str) -> str:
    return "".join(character for character in (value or "") if character.isdigit())


def is_valid_ecuadorian_cedula(value: str) -> bool:
    raw = (value or "").strip()
    return raw.isdigit() and len(raw) == 10
