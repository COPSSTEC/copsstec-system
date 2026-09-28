-- Unique de cédula/correo solo en profiles vigentes. Los soft-delete no deben
-- impedir un nuevo registro con la misma cédula.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_identifier_unique;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_identifier_key;
DROP INDEX IF EXISTS profiles_identifier_unique;
DROP INDEX IF EXISTS profiles_identifier_key;
CREATE UNIQUE INDEX profiles_identifier_unique
    ON profiles (identifier)
    WHERE deleted_at IS NULL OR btrim(COALESCE(CAST(deleted_at AS text), '')) = '';

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
DROP INDEX IF EXISTS profiles_email_unique;
DROP INDEX IF EXISTS profiles_email_key;
CREATE UNIQUE INDEX profiles_email_unique
    ON profiles (email)
    WHERE deleted_at IS NULL OR btrim(COALESCE(CAST(deleted_at AS text), '')) = '';

-- Libera cédulas y correos ya borrados por si el unique legado sigue global.
-- identifier es varchar(255).
UPDATE profiles
SET identifier = 'd' || CAST(id AS text),
    email = left('d' || CAST(id AS text) || '@invalid.local', 255)
WHERE deleted_at IS NOT NULL
  AND btrim(COALESCE(CAST(deleted_at AS text), '')) <> ''
  AND (
      COALESCE(identifier, '') !~ '^d[0-9]+$'
      OR COALESCE(email, '') NOT ILIKE '%@invalid.local'
  );

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
  AND COALESCE(u.email, '') NOT ILIKE '%@invalid.local';
