ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS applies_to_debt BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS membership_payment_plans (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    debit_agreement_id INTEGER REFERENCES membership_debit_agreements(id) ON DELETE SET NULL,
    debt_total NUMERIC(12, 2) NOT NULL CHECK (debt_total > 0),
    monthly_fee NUMERIC(12, 2) NOT NULL,
    installment_amount NUMERIC(12, 2) NOT NULL,
    start_period DATE NOT NULL,
    end_period DATE NOT NULL,
    debt_from_period DATE,
    debt_to_period DATE,
    status TEXT NOT NULL,
    bank_name TEXT NOT NULL DEFAULT '',
    account_type TEXT NOT NULL DEFAULT '',
    account_number TEXT NOT NULL DEFAULT '',
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    cancelled_at TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_membership_payment_plans_user_id
    ON membership_payment_plans (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_payment_plans_active
    ON membership_payment_plans (user_id)
    WHERE status = 'active';

CREATE TABLE IF NOT EXISTS membership_plan_installments (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES membership_payment_plans(id) ON DELETE CASCADE,
    period DATE NOT NULL,
    fee_amount NUMERIC(12, 2) NOT NULL,
    debt_amount NUMERIC(12, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL,
    fee_payment_id BIGINT REFERENCES payments(id) ON DELETE SET NULL,
    debt_payment_id BIGINT REFERENCES payments(id) ON DELETE SET NULL,
    confirmed_by BIGINT,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_membership_plan_installments_period UNIQUE (plan_id, period)
);

CREATE INDEX IF NOT EXISTS idx_membership_plan_installments_period
    ON membership_plan_installments (period);
