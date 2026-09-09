CREATE TABLE IF NOT EXISTS course_lifecycle (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id),
    finished_at TIMESTAMP WITHOUT TIME ZONE,
    finished_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT course_lifecycle_course_id_unique UNIQUE (course_id)
);

CREATE TABLE IF NOT EXISTS course_inscriptions (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id),
    state_id BIGINT NOT NULL REFERENCES states(id),
    participant_type VARCHAR(20) NOT NULL CHECK (participant_type IN ('member', 'guest')),
    user_id BIGINT REFERENCES users(id),
    profile_id BIGINT REFERENCES profiles(id),
    names TEXT NOT NULL,
    email TEXT NOT NULL,
    identifier TEXT NOT NULL,
    cellphone VARCHAR(100),
    country TEXT,
    province TEXT,
    city TEXT,
    organization VARCHAR(255),
    attended_at TIMESTAMP WITHOUT TIME ZONE,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    deleted_at VARCHAR(255),
    deleted_by VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS course_inscriptions_member_unique
    ON course_inscriptions (course_id, user_id)
    WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS course_inscriptions_guest_identifier_unique
    ON course_inscriptions (course_id, identifier)
    WHERE participant_type = 'guest' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS course_inscriptions_guest_email_unique
    ON course_inscriptions (course_id, lower(email))
    WHERE participant_type = 'guest' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS course_inscriptions_course_state_idx
    ON course_inscriptions (course_id, state_id);

CREATE TABLE IF NOT EXISTS course_payments (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id),
    course_inscription_id BIGINT NOT NULL REFERENCES course_inscriptions(id),
    state_id BIGINT NOT NULL REFERENCES states(id),
    voucher_path TEXT,
    amount VARCHAR(100) NOT NULL,
    reference VARCHAR(255),
    admin_observation TEXT,
    reviewed_by BIGINT REFERENCES users(id),
    reviewed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT course_payments_inscription_unique UNIQUE (course_inscription_id)
);

CREATE INDEX IF NOT EXISTS course_payments_state_idx
    ON course_payments (state_id);

CREATE TABLE IF NOT EXISTS course_certificates (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id),
    course_inscription_id BIGINT NOT NULL REFERENCES course_inscriptions(id),
    certificate_code VARCHAR(100) NOT NULL UNIQUE,
    pdf_path TEXT NOT NULL,
    sent_at TIMESTAMP WITHOUT TIME ZONE,
    sent_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT course_certificates_inscription_unique UNIQUE (course_inscription_id)
);

CREATE TABLE IF NOT EXISTS course_feedback_tokens (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id),
    course_inscription_id BIGINT NOT NULL REFERENCES course_inscriptions(id),
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITHOUT TIME ZONE,
    used_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT course_feedback_tokens_inscription_unique UNIQUE (course_inscription_id)
);

CREATE TABLE IF NOT EXISTS course_feedbacks (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id),
    course_inscription_id BIGINT NOT NULL REFERENCES course_inscriptions(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content_rating INTEGER CHECK (content_rating BETWEEN 1 AND 5),
    instructor_rating INTEGER CHECK (instructor_rating BETWEEN 1 AND 5),
    platform_rating INTEGER CHECK (platform_rating BETWEEN 1 AND 5),
    comments TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT course_feedbacks_inscription_unique UNIQUE (course_inscription_id)
);
