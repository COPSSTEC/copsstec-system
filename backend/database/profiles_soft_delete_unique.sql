-- Unique de cédula/correo solo en profiles vigentes. Los soft-delete no deben
-- impedir un nuevo registro con la misma cédula.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_identifier_unique;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_identifier_key;
DROP INDEX IF EXISTS profiles_identifier_unique;
DROP INDEX IF EXISTS profiles_identifier_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_identifier_unique
    ON profiles (identifier)
    WHERE deleted_at IS NULL;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
DROP INDEX IF EXISTS profiles_email_unique;
DROP INDEX IF EXISTS profiles_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
    ON profiles (email)
    WHERE deleted_at IS NULL;

-- Libera cédulas y correos ya borrados por si el unique legado sigue global.
-- identifier es varchar(10): usar d{id}, nunca sufijos largos tipo -del-{id}.
UPDATE profiles
SET identifier = left('d' || id::text, 10),
    email = left('d' || id::text || '@invalid.local', 255)
WHERE deleted_at IS NOT NULL
  AND btrim(COALESCE(deleted_at::text, '')) <> ''
  AND (
      COALESCE(identifier, '') !~ '^d[0-9]+$'
      OR COALESCE(email, '') NOT ILIKE '%@invalid.local'
  );

UPDATE users u
SET email = left('deleted-' || u.id::text || '@invalid.local', 255)
WHERE EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = u.id
          AND p.deleted_at IS NOT NULL
          AND btrim(COALESCE(p.deleted_at::text, '')) <> ''
      )
  AND NOT EXISTS (
        SELECT 1 FROM profiles p2
        WHERE p2.user_id = u.id
          AND (p2.deleted_at IS NULL OR btrim(COALESCE(p2.deleted_at::text, '')) = '')
      )
  AND COALESCE(u.email, '') NOT ILIKE '%@invalid.local';
