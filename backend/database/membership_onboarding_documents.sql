ALTER TABLE membership_payments
    ADD COLUMN IF NOT EXISTS signed_authorization_path TEXT,
    ADD COLUMN IF NOT EXISTS identity_document_path TEXT,
    ADD COLUMN IF NOT EXISTS documents_uploaded_at TIMESTAMP;
