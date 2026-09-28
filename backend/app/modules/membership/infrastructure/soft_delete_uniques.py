from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.orm import Session

# Unique parcial: la cédula/correo de un profile con deleted_at no bloquea un alta nueva.
ENSURE_PROFILE_SOFT_DELETE_UNIQUES_STATEMENTS = (
    "ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_identifier_unique",
    "ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_identifier_key",
    "DROP INDEX IF EXISTS profiles_identifier_unique",
    "DROP INDEX IF EXISTS profiles_identifier_key",
    """
    CREATE UNIQUE INDEX profiles_identifier_unique
        ON profiles (identifier)
        WHERE deleted_at IS NULL OR btrim(COALESCE(CAST(deleted_at AS text), '')) = ''
    """,
    "ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_unique",
    "ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key",
    "DROP INDEX IF EXISTS profiles_email_unique",
    "DROP INDEX IF EXISTS profiles_email_key",
    """
    CREATE UNIQUE INDEX profiles_email_unique
        ON profiles (email)
        WHERE deleted_at IS NULL OR btrim(COALESCE(CAST(deleted_at AS text), '')) = ''
    """,
    """
    UPDATE profiles
    SET identifier = 'd' || CAST(id AS text),
        email = left('d' || CAST(id AS text) || '@invalid.local', 255)
    WHERE deleted_at IS NOT NULL
      AND btrim(COALESCE(CAST(deleted_at AS text), '')) <> ''
      AND (
          COALESCE(identifier, '') !~ '^d[0-9]+$'
          OR COALESCE(email, '') NOT ILIKE '%@invalid.local'
      )
    """,
    """
    UPDATE users u
    SET email = left('deleted-' || CAST(u.id AS text) || '@invalid.local', 255)
    WHERE EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = u.id
              AND p.deleted_at IS NOT NULL
              AND btrim(COALESCE(CAST(p.deleted_at AS text), '')) <> ''
          )
      AND NOT EXISTS (
            SELECT 1 FROM profiles p2
            WHERE p2.user_id = u.id
              AND (p2.deleted_at IS NULL OR btrim(COALESCE(CAST(p2.deleted_at AS text), '')) = '')
          )
      AND COALESCE(u.email, '') NOT ILIKE '%@invalid.local'
    """,
)

_applied = False


def _engine_from(bind: Engine | Session | Connection) -> Engine:
    if isinstance(bind, Session):
        raw = bind.get_bind()
        return raw if isinstance(raw, Engine) else raw.engine
    if isinstance(bind, Connection):
        return bind.engine
    return bind


def ensure_profile_soft_delete_uniques(bind: Engine | Session | Connection) -> None:
    global _applied
    if _applied:
        return
    engine = _engine_from(bind)
    with engine.begin() as connection:
        for statement in ENSURE_PROFILE_SOFT_DELETE_UNIQUES_STATEMENTS:
            connection.execute(text(statement))
    _applied = True
