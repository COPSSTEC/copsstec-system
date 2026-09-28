CEDULA_INVALID_MESSAGE = "La cédula debe tener exactamente 10 dígitos."

def profile_is_active_sql(alias: str = "") -> str:
    column = f"{alias}.deleted_at" if alias else "deleted_at"
    return f"({column} IS NULL OR btrim(COALESCE({column}::text, '')) = '')"


def profile_is_deleted_sql(alias: str = "") -> str:
    column = f"{alias}.deleted_at" if alias else "deleted_at"
    return f"({column} IS NOT NULL AND btrim(COALESCE({column}::text, '')) <> '')"


PROFILE_IS_ACTIVE_SQL = profile_is_active_sql()
PROFILE_IS_DELETED_SQL = profile_is_deleted_sql()

# Solo profiles vigentes: cédula en dígitos.
ACTIVE_PROFILE_CEDULA_SQL = f"""
    regexp_replace(COALESCE(identifier::text, ''), '[^0-9]', '', 'g') = :identifier
    AND :identifier <> ''
    AND {PROFILE_IS_ACTIVE_SQL}
"""

# Libera la cédula de un profile eliminado. Cabe en varchar(10).
RELEASE_DELETED_PROFILE_CEDULA_SQL = f"""
    UPDATE profiles
    SET identifier = left('d' || id::text, 10),
        updated_at = :now
    WHERE {PROFILE_IS_DELETED_SQL}
      AND (
          regexp_replace(COALESCE(identifier::text, ''), '[^0-9]', '', 'g') = :identifier
          OR btrim(COALESCE(identifier::text, '')) = :identifier
      )
"""

RELEASE_DELETED_PROFILE_EMAIL_SQL = f"""
    UPDATE profiles
    SET email = left('d' || id::text || '@invalid.local', 255),
        updated_at = :now
    WHERE {PROFILE_IS_DELETED_SQL}
      AND lower(email) = lower(:email)
"""

RELEASE_DELETED_LOGIN_EMAIL_SQL = f"""
    UPDATE users u
    SET email = left('deleted-' || u.id::text || '@invalid.local', 255),
        updated_at = :now
    WHERE lower(u.email) = lower(:email)
      AND EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.user_id = u.id
            AND {profile_is_deleted_sql("p")}
      )
      AND NOT EXISTS (
          SELECT 1 FROM profiles p2
          WHERE p2.user_id = u.id
            AND {profile_is_active_sql("p2")}
      )
"""


def normalize_cedula(value: str) -> str:
    return "".join(character for character in (value or "") if character.isdigit())


def is_valid_ecuadorian_cedula(value: str) -> bool:
    raw = (value or "").strip()
    return raw.isdigit() and len(raw) == 10
