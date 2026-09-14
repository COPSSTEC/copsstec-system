CREATE TABLE IF NOT EXISTS membership_payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    profile_id INTEGER NOT NULL REFERENCES profiles(id),
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    bank_name VARCHAR(120) NOT NULL,
    account_type VARCHAR(40) NOT NULL,
    account_number VARCHAR(64) NOT NULL,
    account_holder VARCHAR(180) NOT NULL,
    account_ruc VARCHAR(32),
    reference VARCHAR(64) NOT NULL,
    voucher_path TEXT,
    status VARCHAR(32) NOT NULL,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_membership_payments_status
    ON membership_payments (status);

CREATE TABLE IF NOT EXISTS membership_invoices (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER NOT NULL UNIQUE REFERENCES membership_payments(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    number VARCHAR(40) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    pdf_path TEXT NOT NULL,
    issued_at TIMESTAMP NOT NULL
);
