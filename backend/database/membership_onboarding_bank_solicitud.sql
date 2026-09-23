ALTER TABLE membership_payments
    ADD COLUMN IF NOT EXISTS member_account_type TEXT,
    ADD COLUMN IF NOT EXISTS member_account_number TEXT,
    ADD COLUMN IF NOT EXISTS member_bank_name TEXT,
    ADD COLUMN IF NOT EXISTS signed_solicitud_path TEXT,
    ADD COLUMN IF NOT EXISTS accepted_affiliation_year BOOLEAN DEFAULT FALSE;
