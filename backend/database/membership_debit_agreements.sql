CREATE TABLE IF NOT EXISTS membership_debit_agreements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL UNIQUE,
    pending_balance_snapshot NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL,
    sent_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    signed_authorization_path TEXT,
    identity_document_path TEXT,
    documents_uploaded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_membership_debit_agreements_user_id
    ON membership_debit_agreements (user_id);

CREATE INDEX IF NOT EXISTS idx_membership_debit_agreements_current
    ON membership_debit_agreements (user_id)
    WHERE revoked_at IS NULL;
