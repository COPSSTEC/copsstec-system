ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'approved',
    ADD COLUMN IF NOT EXISTS voucher_path TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS admin_observation TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_type ON payments (type);

CREATE TABLE IF NOT EXISTS member_subscriptions (
    user_id BIGINT PRIMARY KEY REFERENCES users(id),
    coverage_until DATE,
    credit_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    last_payment_at DATE,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_subscriptions_coverage
    ON member_subscriptions (coverage_until);

DO $$
DECLARE
    uid BIGINT;
    rec RECORD;
    v_coverage DATE;
    v_credit NUMERIC(12, 2);
    v_amount NUMERIC(12, 2);
    v_pay_date DATE;
    v_years INT;
    v_months INT;
    v_base DATE;
    v_last DATE;
BEGIN
    FOR uid IN
        SELECT DISTINCT user_id
        FROM payments
        WHERE lower(type) IN ('membresía', 'membresia')
          AND status = 'approved'
    LOOP
        v_coverage := NULL;
        v_credit := 0;
        v_last := NULL;

        FOR rec IN
            SELECT id, total, date_register, created_at
            FROM payments
            WHERE user_id = uid
              AND lower(type) IN ('membresía', 'membresia')
              AND status = 'approved'
            ORDER BY
                CASE
                    WHEN date_register ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
                    THEN to_date(date_register, 'DD/MM/YYYY')
                    ELSE COALESCE(created_at::date, CURRENT_DATE)
                END,
                id
        LOOP
            IF rec.total ~ '^[0-9]+(\.[0-9]+)?$' THEN
                v_amount := rec.total::numeric / 100;
            ELSE
                v_amount := 0;
            END IF;

            IF rec.date_register ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN
                v_pay_date := to_date(rec.date_register, 'DD/MM/YYYY');
            ELSE
                v_pay_date := COALESCE(rec.created_at::date, CURRENT_DATE);
            END IF;

            v_credit := v_credit + v_amount;
            v_years := floor(v_credit / 120)::int;
            v_credit := v_credit - (v_years * 120);
            v_months := floor(v_credit / 10)::int;
            v_credit := v_credit - (v_months * 10);

            IF v_coverage IS NOT NULL AND v_coverage >= v_pay_date THEN
                v_base := v_coverage;
            ELSE
                v_base := v_pay_date;
            END IF;

            v_coverage := (v_base + make_interval(years => v_years))::date;
            v_coverage := (v_coverage + make_interval(months => v_months))::date;
            v_last := v_pay_date;
        END LOOP;

        INSERT INTO member_subscriptions (
            user_id, coverage_until, credit_balance, last_payment_at, updated_at
        )
        VALUES (uid, v_coverage, v_credit, v_last, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET coverage_until = EXCLUDED.coverage_until,
            credit_balance = EXCLUDED.credit_balance,
            last_payment_at = EXCLUDED.last_payment_at,
            updated_at = EXCLUDED.updated_at;
    END LOOP;
END $$;
