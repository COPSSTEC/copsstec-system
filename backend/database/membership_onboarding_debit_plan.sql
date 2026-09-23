ALTER TABLE membership_payments
    ADD COLUMN IF NOT EXISTS member_debit_plan TEXT;
