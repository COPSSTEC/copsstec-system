-- Unique de cédula/correo solo en profiles vigentes. Los soft-delete no deben
-- impedir un nuevo registro con la misma cédula.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_identifier_unique;
DROP INDEX IF EXISTS profiles_identifier_unique;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_identifier_unique
    ON profiles (identifier)
    WHERE deleted_at IS NULL;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;
DROP INDEX IF EXISTS profiles_email_unique;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
    ON profiles (email)
    WHERE deleted_at IS NULL;
